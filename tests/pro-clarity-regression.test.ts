import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TS sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TS sources directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TS sources directly.
import { applyManagedReviewCommand, applyProCommand, proUsage, reconcilePro } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TS sources directly.
import { studentProView } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TS sources directly.
import { proBookPresentation, proRolloverText, proSummaryText, studentProCopy } from "../src/lib/student-pro-presentation.ts"

const student = { role: "student" as const, studentId: "pro-demo-1", name: "학생" }
const teacher = { role: "agency" as const, institutionId: "dokdo", name: "선생님" }
const fixture = () => { const db = initializePro(emptyReviewDatabase()); db.pro!.clockMode = "test"; return reconcilePro(db) }
const usage = (db: ReturnType<typeof fixture>) => proUsage(db.pro!, db.pro!.members.find(m => m.id === student.studentId)!, db.pro!.clock)

test("현재 이월 잔여는 신청 시 먼저 줄고 취소 시 복원되며 주초 이월과 구분", () => {
  let db = fixture()
  assert.deepEqual([usage(db).available, usage(db).rollover, usage(db).rolloverAvailable], [2, 1, 1])
  assert.equal(proRolloverText(usage(db)), "(지난주에서 넘어온 1권 포함)")
  db = applyProCommand(db, { type: "apply", reviewId: "review-pro-apply-a" }, student, "apply-a")
  assert.deepEqual([usage(db).available, usage(db).rollover, usage(db).rolloverAvailable], [1, 1, 0])
  assert.equal(proRolloverText(usage(db)), "", "주초 이월이 남아 있어도 이미 신청한 이월분은 표시하지 않음")
  db = applyProCommand(db, { type: "apply", reviewId: "review-pro-apply-b" }, student, "apply-b")
  assert.deepEqual([usage(db).available, usage(db).rolloverAvailable], [0, 0])
  db = applyProCommand(db, { type: "cancel", reviewId: "review-pro-apply-a" }, student, "cancel-a")
  assert.deepEqual([usage(db).available, usage(db).rolloverAvailable], [1, 0])
  db = applyProCommand(db, { type: "cancel", reviewId: "review-pro-apply-b" }, student, "cancel-b")
  assert.deepEqual([usage(db).available, usage(db).rolloverAvailable], [2, 1])
  assert.equal(proRolloverText(usage(db)), "(지난주에서 넘어온 1권 포함)")
})

test("1차 전송은 대기를 사용 권수로 전환하며 차감 취소는 이월 잔여도 재계산", () => {
  let db = fixture()
  db = applyProCommand(db, { type: "apply", reviewId: "review-pro-apply-a" }, student, "apply")
  db = applyManagedReviewCommand(db, { type: "save-feedback", recordId: "review-pro-apply-a-r1", feedback: "친구의 생각을 구체적으로 적었어요.", items: [], decision: "complete" }, teacher, "save", db.pro!.clock)
  db = applyManagedReviewCommand(db, { type: "send", recordId: "review-pro-apply-a-r1" }, teacher, "send", db.pro!.clock)
  assert.deepEqual([usage(db).used, usage(db).pending, usage(db).available, usage(db).rolloverAvailable], [1, 0, 1, 0])
  db = applyProCommand(db, { type: "cancel-debit", reviewId: "review-pro-apply-a", reason: "기타", memo: "검증" }, teacher, "refund")
  assert.deepEqual([usage(db).used, usage(db).pending, usage(db).available, usage(db).rolloverAvailable], [0, 0, 2, 1])
})

test("이월 잔여는 현재 신청 가능 권수를 넘지 않고 과거 월·이용 종료에는 0", () => {
  const db = fixture(), pro = db.pro!, member = pro.members[0]
  for (const limit of [0, 1, 2, 4, 5]) {
    member.limits["2026-10"] = limit
    const value = proUsage(pro, member, pro.clock)
    assert.ok(value.rolloverAvailable >= 0 && value.rolloverAvailable <= value.available)
  }
  assert.equal(proUsage(pro, member, pro.clock, "2026-09").rolloverAvailable, 0)
  member.endedAt = pro.clock
  assert.equal(proUsage(pro, member, pro.clock).rolloverAvailable, 0)
})

test("자동 선정 후보는 신청하지 않아도 새 글 제출로 바뀌며 확정처럼 안내하지 않음", () => {
  let db = fixture()
  db.pro!.members[0].limits["2026-10"] = 1
  let view = studentProView(db, student.studentId)!
  assert.equal(view.cases.find(c => c.reviewId === "review-pro-apply-b")!.autoExpected, true)
  assert.equal(proBookPresentation(view, "review-pro-apply-b")?.status, "피드백 신청 가능")
  db = applyManagedReviewCommand(db, { type: "submit", recordId: "review-pro-writing-r1" }, student, "new-submission", db.pro!.clock)
  view = studentProView(db, student.studentId)!
  assert.equal(view.cases.find(c => c.reviewId === "review-pro-apply-b")!.autoExpected, false)
  assert.equal(view.cases.find(c => c.reviewId === "review-pro-writing")!.autoExpected, true)
  assert.equal(view.usage.pending, 0)
  assert.equal(view.usage.available, 1)
  assert.match(studentProCopy.selection, /이번 주 신청 가능한 독후감.*최근 제출한 것.*남은 신청 권수/)
})

test("월 권수를 모두 사용했어도 2차 피드백을 모두 받았다고 안내하지 않음", () => {
  const db = fixture(), member = db.pro!.members.find(m => m.id === "pro-demo-5")!
  member.limits["2026-10"] = 1
  const view = studentProView(db, member.id)!
  assert.equal(view.usage.used, view.usage.limit)
  assert.ok(view.cases.some(c => c.secondDeadline && !c.closed))
  assert.equal(proSummaryText(view), studentProCopy.monthUsed)
  assert.doesNotMatch(proSummaryText(view), /모두 받았어요/)
  assert.match(studentProCopy.usage, /선생님이 요청한 2차 독후감.*따로 신청하지 않아도.*추가로 쓰지/)
})

test("마감된 글은 이번 주로 혼동하지 않으며 취소 후 자동 선정 가능성 안내", () => {
  const view = studentProView(fixture(), student.studentId)!
  const c = view.cases.find(item => item.reviewId === "review-pro-apply-b")!
  view.now = c.cutoff
  assert.equal(proBookPresentation(view, c.reviewId)?.guide, studentProCopy.expired)
  assert.doesNotMatch(studentProCopy.expired, /이번 주/)
  assert.equal(studentProCopy.cancelNotice, "신청을 취소한 글도 마감 때 자동으로 선정될 수 있어요.")
})

test("이용 종료는 상단 권수 영역을 숨기되 월 한도 사용 완료와 구분하고 진행 건은 유지", () => {
  const db = fixture(), member = db.pro!.members.find(m => m.id === "pro-demo-5")!
  member.limits["2026-10"] = 1
  const active = studentProView(db, member.id)!
  assert.equal(active.usage.used, active.usage.limit)
  assert.equal(active.active, true, "월 한도 소진만으로 프로 이용을 종료하지 않음")
  member.endedAt = db.pro!.clock
  member.status = "ended"
  const ended = studentProView(db, member.id)!
  assert.equal(ended.active, false)
  assert.equal(ended.usage.available, 0)
  assert.ok(ended.cases.some(c => c.secondDeadline && !c.closed), "기존 2차 작성 요청 유지")
  assert.ok(ended.cases.some(c => c.firstSent), "기존 피드백 조회 데이터 유지")
  const source = readFileSync(new URL("../src/components/student/pro-feedback-status.tsx", import.meta.url), "utf8")
  const usageComponent = source.slice(source.indexOf("export function ProFeedbackUsage"), source.indexOf("export function ProFeedbackStatus"))
  assert.match(usageComponent, /if \(!view\?\.active\) return null/)
})
