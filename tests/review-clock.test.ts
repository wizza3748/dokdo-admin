import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TS directly.
import { initializePro, PRO_FIXTURE_CLOCK } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TS directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TS directly.
import { applyProCommand, applyManagedReviewCommand, reconcilePro } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TS directly.
import { reviewNow, atReviewTime, persistReviewTime } from "../src/lib/review-clock.ts"
// @ts-expect-error Node tests load TS directly.
import { studentProView } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TS directly.
import { studentCalendar, studentTodayLabel } from "../src/lib/student-calendar.ts"

const teacher = { role: "agency" as const, institutionId: "dokdo", name: "검증 선생님" }
const student = { role: "student" as const, studentId: "pro-demo-1", name: "프로 신청예시" }
const today = "2026-10-08T05:00:00.000Z"
const fixture = () => reconcilePro(atReviewTime(initializePro(emptyReviewDatabase()), today))
const viewAt = (at: string) => studentProView(reconcilePro(atReviewTime(fixture(), at)), student.studentId)!

test("모드 없는 과거·미래 저장 시각은 무시하고 서버 시각 사용", () => {
  const db = initializePro(emptyReviewDatabase())
  for (const stored of [PRO_FIXTURE_CLOCK, "2027-10-08T01:00:00.000Z"]) {
    db.pro!.clock = stored
    assert.equal(reviewNow(db, today), today)
    assert.equal(atReviewTime(db, today).pro!.clock, today)
    assert.equal(db.pro!.clock, stored)
  }
  db.pro!.clockMode = "test"
  assert.equal(reviewNow(db, today), db.pro!.clock)
})

test("실제 모드 폴링은 시각만 바뀌면 저장소를 다시 쓰지 않음", () => {
  const db = fixture()
  const next = reconcilePro(atReviewTime(structuredClone(db), "2026-10-08T05:00:04.000Z"))
  assert.equal(persistReviewTime(db, next), db)
})

test("신청 확인창 이후 서버에서 마감 경계 재검사, 실패 시 원본 보존", () => {
  const db = fixture(), before = structuredClone(db)
  const id = "review-pro-apply-a"
  assert.equal(viewAt("2026-10-10T14:59:59.999Z").cases.find(c => c.reviewId === id)!.canApply, true)
  assert.throws(() => applyProCommand(db, { type: "apply", reviewId: id }, student, "late", "2026-10-10T15:00:00.000Z"), /마감/)
  assert.deepEqual(db, before)
  assert.equal(viewAt("2026-10-10T15:00:00.001Z").cases.find(c => c.reviewId === id)!.canApply, false)
})

test("현재 주간 일정·권수와 목요일 기준 관리월 경계", () => {
  const oct8 = viewAt(today), oct12 = viewAt("2026-10-11T15:00:00.000Z")
  assert.equal(oct8.cutoff, "2026-10-10T15:00:00.000Z")
  assert.equal(oct8.due, "2026-10-11T14:59:00.000Z")
  assert.equal(oct12.cutoff, "2026-10-17T15:00:00.000Z")
  assert.equal(oct12.due, "2026-10-18T14:59:00.000Z")
  assert.equal(oct12.usage.elapsed, oct8.usage.elapsed + 1)
  assert.equal(oct12.usage.available, 1)
  assert.equal(viewAt("2026-11-01T14:59:59.999Z").usage.month, "2026-10")
  const nov = viewAt("2026-11-01T15:00:00.000Z")
  assert.equal(nov.usage.month, "2026-11")
  assert.equal(nov.usage.available, 1)
})

test("명시적 테스트 모드에서만 정지된 시각, 복귀 시 프로 원본 이력과 일반 변경 보존", () => {
  const original = fixture()
  let db = applyProCommand(original, { type: "clock", at: "2026-11-02T00:00:00.000Z" }, teacher, "clock", today)
  assert.equal(reviewNow(db, "2026-12-01T00:00:00.000Z"), "2026-11-02T00:00:00.000Z")
  assert.ok(db.proTestBaseline)
  db = applyManagedReviewCommand(db, { type: "save-feedback", recordId: "review-pro-normal-r1", feedback: "책을 읽고 자신의 경험을 연결한 점이 좋아요. 중요한 장면을 더 적어보세요.", items: [], decision: "complete" }, teacher, "normal-during-test", today)
  const ordinary = structuredClone(db.records.find(r => r.id === "review-pro-normal-r1"))
  const restored = applyProCommand(db, { type: "clock-real" }, teacher, "real", today)
  assert.equal(restored.pro!.clockMode, "real")
  assert.equal(reviewNow(restored, "2026-10-08T05:01:00.000Z"), "2026-10-08T05:01:00.000Z")
  assert.equal(restored.proTestBaseline, undefined)
  assert.deepEqual(restored.pro, original.pro)
  assert.deepEqual(restored.reviews.filter(r => r.id !== "review-pro-normal"), original.reviews.filter(r => r.id !== "review-pro-normal"))
  assert.deepEqual(restored.reviews.find(r => r.id === "review-pro-normal"), db.reviews.find(r => r.id === "review-pro-normal"))
  assert.deepEqual(restored.records.filter(r => r.id !== "review-pro-normal-r1"), original.records.filter(r => r.id !== "review-pro-normal-r1"))
  assert.deepEqual(restored.records.find(r => r.id === "review-pro-normal-r1"), ordinary)
})

test("학생 날짜·기본 조회월은 서버 KST, 사용자가 고른 과거 월은 고정", () => {
  const justBefore = "2026-10-31T14:59:59.999Z", boundary = "2026-10-31T15:00:00.000Z"
  assert.equal(studentCalendar(justBefore).month, 10)
  assert.deepEqual(studentCalendar(boundary), { year: 2026, month: 11, currentYear: 2026, currentMonth: 11, currentDay: 1 })
  assert.equal(studentCalendar(boundary, "2026-09").month, 9)
  assert.equal(studentTodayLabel(boundary), "11월 1일 일요일")
  assert.equal(studentCalendar(boundary, "2026-99").month, 11)
})

test("권한 없는 시각 전환은 차단", () => {
  assert.throws(() => applyProCommand(fixture(), { type: "clock-real" }, student, "bad", today), /기관관리자/)
  assert.throws(() => applyProCommand(fixture(), { type: "clock", at: today }, student, "bad", today))
})
