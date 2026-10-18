import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { applyProCommand, applyManagedReviewCommand, proDesignationIssue, proDesignationPreview, proUsage, reconcilePro } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { addDays } from "../src/lib/pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewDesignationCopy, reviewSelectionHelp } from "../src/lib/review-list-presentation.ts"

const teacher = { role: "agency" as const, institutionId: "dokdo", name: "검증 선생님" }
const student = { role: "student" as const, studentId: "pro-demo-1", name: "검증 학생" }
const reviewId = "review-pro-apply-a", recordId = `${reviewId}-r1`
const save = { type: "save-feedback" as const, recordId, feedback: "책의 내용과 자신의 경험을 연결해 생각을 잘 정리했어요.", items: [], decision: "complete" as const }
const fixture = () => { const db = initializePro(emptyReviewDatabase()); db.pro!.clockMode = "test"; return reconcilePro(db) }

test("지정 전 확인은 조회만 하며, 지정 성공은 신청 가능 권수만 줄인다", () => {
  let db = fixture()
  const snapshot = structuredClone(db), member = db.pro!.members[0]
  const before = proUsage(db.pro!, member, db.pro!.clock)
  assert.equal(proDesignationIssue(db, reviewId), "")
  const preview = proDesignationPreview(db, reviewId)
  assert.deepEqual(preview, { issue: "", quota: { available: before.available, after: before.available - 1 } })
  assert.deepEqual(db, snapshot)
  db = applyProCommand(db, { type: "designate", reviewId }, teacher, "list-designate")
  const c = db.pro!.cases.find(c => c.reviewId === reviewId)!
  const after = proUsage(db.pro!, member, db.pro!.clock)
  assert.equal(c.selection, "teacher")
  assert.equal(c.lockedAt, undefined)
  assert.equal(after.available, before.available - 1)
  assert.equal(after.available, preview.quota!.after)
  assert.equal(after.used, before.used)
  assert.throws(() => applyProCommand(db, { type: "cancel", reviewId }, student, "student-cancel"), /본인이 신청/)
})

test("목록에서 지정한 글은 재지정 없이 저장·전송하고 전송 시 한 번 사용", () => {
  let db = fixture()
  const member = db.pro!.members[0], before = proUsage(db.pro!, member, db.pro!.clock)
  db = applyProCommand(db, { type: "designate", reviewId }, teacher, "list")
  member.limits[before.month] = before.used + before.pending + 1
  db.pro!.members[0].limits = member.limits
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).available, 0)
  db = applyManagedReviewCommand(db, save, teacher, "saved", db.pro!.clock)
  assert.ok(db.pro!.cases.find(c => c.reviewId === reviewId)!.lockedAt)
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).used, before.used)
  db = applyManagedReviewCommand(db, { type: "send", recordId }, teacher, "sent", db.pro!.clock)
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).used, before.used + 1)
  db = applyManagedReviewCommand(db, { type: "send", recordId }, teacher, "sent", db.pro!.clock)
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).used, before.used + 1)
})

test("확인창 이후 권수가 소진되어도 확정 시 다시 검사하고 지정하지 않는다", () => {
  const db = fixture()
  assert.equal(proDesignationIssue(db, reviewId), "")
  db.pro!.members[0].limits["2026-10"] = 0
  const snapshot = structuredClone(db)
  assert.match(proDesignationIssue(db, reviewId), /남은 신청 권수가 0권/)
  assert.equal(proDesignationPreview(db, reviewId).quota, undefined)
  assert.throws(() => applyProCommand(db, { type: "designate", reviewId }, teacher, "no-quota"), /남은 신청 권수가 0권/)
  assert.throws(() => applyManagedReviewCommand(db, { ...save, proDesignate: true }, teacher, "fallback-no-quota", db.pro!.clock), /남은 신청 권수가 0권/)
  assert.deepEqual(db, snapshot)
})

test("이전 주·미래 주·미제출·종료 학생은 불가 사유를 구분", () => {
  for (const scenario of ["past", "future", "draft", "ended"] as const) {
    const db = fixture(), c = db.pro!.cases.find(c => c.reviewId === reviewId)!
    if (scenario === "past") c.week = addDays(c.week, -7)
    if (scenario === "future") c.week = addDays(c.week, 7)
    if (scenario === "draft") db.records.find(r => r.id === recordId)!.writingStatus = "writing"
    if (scenario === "ended") db.pro!.members[0].status = "ended"
    const expected = { past: /이전 주/, future: /관리 주차가 시작/, draft: /제출을 완료/, ended: /이용이 종료/ }[scenario]
    assert.match(proDesignationIssue(db, reviewId), expected)
    assert.throws(() => applyProCommand(db, { type: "designate", reviewId }, teacher, scenario), expected)
  }
})

test("다른 기관 지정과 중복 지정을 막고 기존 선정 방식을 보존", () => {
  let db = fixture()
  assert.throws(() => applyProCommand(db, { type: "designate", reviewId }, { ...teacher, institutionId: "other" }, "wrong-agency"), /권한/)
  db = applyProCommand(db, { type: "apply", reviewId }, student, "student-first")
  assert.throws(() => applyProCommand(db, { type: "designate", reviewId }, teacher, "teacher-late"), /이미 피드백 대상으로 선정/)
  assert.equal(db.pro!.cases.find(c => c.reviewId === reviewId)!.selection, "student")
})

test("저장 실패는 지정·작성 시작 모두 미반영, AI 실행 접수는 실패 결과에도 작성 시작 유지", () => {
  let db = fixture()
  const snapshot = structuredClone(db)
  assert.throws(() => applyManagedReviewCommand(db, { ...save, proDesignate: true, feedback: "짧음" }, teacher, "invalid", db.pro!.clock))
  assert.deepEqual(db, snapshot)
  db = applyManagedReviewCommand(db, { type: "ai-start", recordId, proDesignate: true }, teacher, "ai-run", db.pro!.clock)
  db = applyManagedReviewCommand(db, { type: "ai-result", recordId, runId: "ai-run", error: "실패" }, teacher, "ai-result", db.pro!.clock)
  assert.ok(db.pro!.cases.find(c => c.reviewId === reviewId)!.lockedAt)
  assert.equal(db.records.find(r => r.id === recordId)!.aiUsed, 0)
  assert.equal(proUsage(db.pro!, db.pro!.members[0], db.pro!.clock).used, 0)
})

test("안내 문구는 선정 경로·예정·대상 아님·기존 기록을 구분하고 차감 시점을 설명", () => {
  assert.equal(reviewSelectionHelp.length, 6)
  assert.ok(reviewSelectionHelp.some(line => line.startsWith("대상 아님:")))
  assert.ok(reviewSelectionHelp.some(line => line.startsWith("-: 선정 경로")))
  assert.equal(reviewDesignationCopy.available, "현재 남은 신청 권수")
  assert.equal(reviewDesignationCopy.after, "지정 후 남은 신청 권수")
  assert.match(reviewDesignationCopy.usage, /1차 피드백을 학생에게 전송/)
})

test("지정 창 권수는 같은 달 이월을 포함하고 사용·선정 및 미래 주차를 제외", () => {
  const db = fixture(), pro = db.pro!, member = pro.members[0]
  pro.clock = "2026-10-13T03:00:00.000Z"
  member.assignedAt = member.effectiveAt = "2026-10-01T03:00:00.000Z"
  const c = pro.cases.find(c => c.reviewId === reviewId)!
  c.week = "2026-10-11T15:00:00.000Z"
  pro.cases = [c]
  assert.equal(proUsage(pro, member, pro.clock).limit, 4)
  assert.deepEqual(proDesignationPreview(db, reviewId).quota, { available: 3, after: 2 })
  pro.cases.push({ ...c, reviewId: "prior-pending", week: "2026-10-04T15:00:00.000Z", selectedAt: "2026-10-06T03:00:00.000Z" })
  assert.deepEqual(proDesignationPreview(db, reviewId).quota, { available: 2, after: 1 })
  pro.cases.push({ ...c, reviewId: "prior-used", week: "2026-09-27T15:00:00.000Z", selectedAt: "2026-10-01T03:00:00.000Z", firstSentAt: "2026-10-02T03:00:00.000Z" })
  assert.deepEqual(proDesignationPreview(db, reviewId).quota, { available: 1, after: 0 })
})

test("신청 가능 0권이어도 이미 관리 중인 글의 2차 피드백은 추가 차감 없이 처리", () => {
  let db = fixture()
  const actor = { ...student, studentId: "pro-demo-5" }
  for (const type of ["seen", "start-second"] as const) db = applyManagedReviewCommand(db, { type, recordId: "review-pro-second-r1" }, actor, type, db.pro!.clock)
  db = applyManagedReviewCommand(db, { type: "enter-rewrite", recordId: "review-pro-second-r2" }, actor, "rewrite", db.pro!.clock)
  db = applyManagedReviewCommand(db, { type: "submit", recordId: "review-pro-second-r2" }, actor, "submit", db.pro!.clock)
  const member = db.pro!.members.find(m => m.id === actor.studentId)!
  const before = proUsage(db.pro!, member, db.pro!.clock)
  member.limits[before.month] = before.used + before.pending
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).available, 0)
  db = applyManagedReviewCommand(db, { ...save, recordId: "review-pro-second-r2" }, teacher, "save-second", db.pro!.clock)
  db = applyManagedReviewCommand(db, { type: "send", recordId: "review-pro-second-r2" }, teacher, "send-second", db.pro!.clock)
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).used, before.used)
})
