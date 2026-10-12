import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node test runner loads TS sources directly.
import { addDays, managementMonth, midnight, monthWeeks, secondDeadline, submissionPeriod, weekStart, weekSchedule, consultationDate } from "../src/lib/pro-calendar.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import { applyManagedReviewCommand, applyProCommand, migrateProRecords, proUsage, reconcilePro, weekdayFor } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import { emptyReviewDatabase, applyReviewCommand } from "../src/lib/review-domain.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import { studentProView, scopePro, weeklyStudent } from "../src/lib/pro-selectors.ts"
const teacher = { role: "agency" as const, institutionId: "dokdo", name: "검증 선생님" }
const student = { role: "student" as const, studentId: "pro-demo-1", name: "프로 신청예시" }
const fixture = () => {
  const db = initializePro(emptyReviewDatabase())
  db.pro!.clockMode = "test"
  return reconcilePro(db)
}
test("KST 주차·목요일 귀속월·월요일 피드백·자정 경계", () => {
  assert.equal(managementMonth(midnight("2026-09-28")), "2026-10")
  assert.equal(monthWeeks("2026-10").length, 5)
  assert.equal(submissionPeriod("2026-10-10T14:59:59.999Z", 7).week, midnight("2026-10-05"))
  assert.equal(submissionPeriod("2026-10-10T15:00:00.000Z", 7).week, midnight("2026-10-12"))
  assert.equal(submissionPeriod("2026-10-11T14:59:59.999Z", 1).week, midnight("2026-10-05"))
  assert.equal(weekSchedule(midnight("2026-10-05"), 1).due, "2026-10-12T14:59:00.000Z")
})
test("마지막 주 2차 기한은 다음 관리월 1주차 마감, 전송 기준월과 차감월 독립", () => {
  assert.equal(secondDeadline("2026-10-28T03:00:00.000Z", 7), "2026-11-07T15:00:00.000Z")
  assert.equal(secondDeadline("2026-10-20T03:00:00.000Z", 7), "2026-10-31T14:59:00.000Z")
  assert.equal(secondDeadline("2026-10-28T03:00:00.000Z", 1), "2026-11-08T15:00:00.000Z")
  assert.equal(consultationDate("2026-02", 5, 1, "15:00"), "2026-02-23T06:00:00.000Z")
})
test("신청·취소·잠금·1차 전송의 한 번 차감 및 부모 발송", () => {
  let db = fixture(); const member = db.pro!.members[0]
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).available, 2)
  db = applyProCommand(db, { type: "apply", reviewId: "review-pro-apply-a" }, student, "apply")
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).used, 0)
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).pending, 1)
  db = applyProCommand(db, { type: "cancel", reviewId: "review-pro-apply-a" }, student, "cancel")
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).available, 2)
  db = applyProCommand(db, { type: "apply", reviewId: "review-pro-apply-a" }, student, "apply2")
  db = applyManagedReviewCommand(db, { type: "save-feedback", recordId: "review-pro-apply-a-r1", feedback: "친구의 마음을 생각하며 책을 읽은 점이 좋았어요. 다음에도 구체적인 경험을 적어보세요.", items: [], decision: "complete" }, teacher, "save", db.pro!.clock)
  assert.throws(() => applyProCommand(db, { type: "cancel", reviewId: "review-pro-apply-a" }, student, "cancel2"), /취소/)
  const send = { type: "send" as const, recordId: "review-pro-apply-a-r1" }
  db = applyManagedReviewCommand(db, send, teacher, "send", db.pro!.clock)
  db = applyManagedReviewCommand(db, send, teacher, "send", db.pro!.clock)
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).used, 1)
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).pending, 0)
  assert.equal(db.pro!.cases.find(c => c.reviewId === "review-pro-apply-a")!.parent.attempts.length, 1)
  assert.throws(() => applyManagedReviewCommand(db, send, teacher, "different-send", db.pro!.clock))
  db = applyProCommand(db, { type: "cancel-debit", reviewId: "review-pro-apply-a", reason: "기타", memo: "예시 검증" }, teacher, "refund")
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).used, 0)
  assert.equal(proUsage(db.pro!, member, db.pro!.clock).pending, 0)
  assert.throws(() => applyProCommand(db, { type: "cancel-debit", reviewId: "review-pro-apply-a", reason: "기타", memo: "재시도" }, teacher, "refund2"))
})
test("승계는 일반 데이터 보존·기존 전송 한 번 차감·저장건 잠금·성공 부모 발송 재생성 없음", () => {
  const base = emptyReviewDatabase(), db = initializePro(base)
  const before = structuredClone(db)
  migrateProRecords(db); migrateProRecords(db)
  assert.deepEqual(db, before)
  const member = db.pro!.members.find(m => m.id === "pro-demo-6")!
  const u = proUsage(db.pro!, member, db.pro!.clock)
  assert.equal(u.used, 1); assert.equal(u.pending, 1); assert.equal(u.available, 0)
  const c = db.pro!.cases.find(c => c.reviewId === "review-pro-migrated-sent")!
  assert.equal(c.parent.status, "sent"); assert.equal(c.parent.attempts.length, 0)
  assert.ok(db.pro!.cases.find(c => c.reviewId === "review-pro-migrated-pending")!.lockedAt)
  assert.equal(db.pro!.cases.some(c => c.studentId === "pro-demo-9"), false)
})
test("늦은 조회 자동 선정은 원래 마감 시각, 반복 조회 중복 없음", () => {
  let db = fixture()
  db = applyProCommand(db, { type: "clock", at: "2026-10-13T00:00:00.000Z" }, teacher, "clock")
  const selected = db.pro!.cases.filter(c => c.studentId === student.studentId && c.selection === "auto")
  assert.equal(selected.length, 2)
  assert.ok(selected.every(c => c.selectedAt === "2026-10-10T15:00:00.000Z"))
  const auditCount = db.pro!.audit.length
  reconcilePro(db); assert.equal(db.pro!.audit.length, auditCount)
})
test("미제출 2차 종료 시각과 초안 보존·읽음 미생성·재차감 없음", () => {
  let db = fixture(), c = db.pro!.cases.find(c => c.reviewId === "review-pro-second")!
  const deadline = c.secondDeadline!
  db = applyManagedReviewCommand(db, { type: "seen", recordId: "review-pro-second-r1" }, { ...student, studentId: "pro-demo-5" }, "seen", db.pro!.clock)
  db = applyManagedReviewCommand(db, { type: "start-second", recordId: "review-pro-second-r1" }, { ...student, studentId: "pro-demo-5" }, "second-start", db.pro!.clock)
  db = applyProCommand(db, { type: "clock", at: addDays(deadline, 3) }, teacher, "expire-clock")
  c = db.pro!.cases.find(c => c.reviewId === "review-pro-second")!
  assert.equal(c.closedAt, deadline); assert.equal(c.parent.at, deadline)
  assert.equal(db.records.find(r => r.id === "review-pro-second-r2")!.writingStatus, "writing")
  assert.equal(db.records.find(r => r.id === "review-pro-second-r2")!.seenAt, undefined)
  assert.throws(() => applyManagedReviewCommand(db, { type: "submit", recordId: "review-pro-second-r2" }, { ...student, studentId: "pro-demo-5" }, "late", db.pro!.clock), /기한/)
})
test("기한 내 2차 제출은 월 변경 후 유지, 2차 전송 추가 차감 없음", () => {
  let db = fixture(); const actor = { ...student, studentId: "pro-demo-5" }
  for (const [type, id] of [["seen", "seen"], ["start-second", "second"]] as const) db = applyManagedReviewCommand(db, { type, recordId: "review-pro-second-r1" }, actor, id, db.pro!.clock)
  db = applyManagedReviewCommand(db, { type: "enter-rewrite", recordId: "review-pro-second-r2" }, actor, "rewrite", db.pro!.clock)
  db = applyManagedReviewCommand(db, { type: "submit", recordId: "review-pro-second-r2" }, actor, "submit", db.pro!.clock)
  db = applyProCommand(db, { type: "clock", at: "2026-11-10T00:00:00.000Z" }, teacher, "nov")
  assert.equal(db.pro!.cases.find(c => c.reviewId === "review-pro-second")!.closedAt, undefined)
  db = applyManagedReviewCommand(db, { type: "save-feedback", recordId: "review-pro-second-r2", feedback: "자신의 경험과 생각을 더 구체적으로 잘 적었어요. 한 단계 성장한 글입니다.", items: [] }, teacher, "save2", db.pro!.clock)
  db = applyManagedReviewCommand(db, { type: "send", recordId: "review-pro-second-r2" }, teacher, "send2", db.pro!.clock)
  const m = db.pro!.members.find(m => m.id === "pro-demo-5")!
  assert.equal(proUsage(db.pro!, m, db.pro!.clock, "2026-10").used, 1)
  assert.equal(proUsage(db.pro!, m, db.pro!.clock, "2026-11").used, 0)
})
test("학생/기관 스코프 및 읽기 전용 권한", () => {
  const db = fixture()
  const view = studentProView(db, student.studentId)!
  assert.equal(JSON.stringify(view).includes("institution"), false)
  assert.equal(JSON.stringify(view).includes("memo"), false)
  assert.ok(!scopePro(db.pro!, "dokdo").members.some(m => m.id === "pro-demo-10"))
  assert.throws(() => applyProCommand(db, { type: "apply", reviewId: "review-pro-other" }, student, "cross"))
  assert.throws(() => applyProCommand(db, { type: "limit", studentId: student.studentId, limit: 5, reason: "기타", memo: "확인" }, { role: "admin", name: "본사" }, "admin"))
})
test("일반 학생 저장 동작은 기존 도메인과 동일", () => {
  const db = fixture(), recordId = "review-pro-normal-r1", actor = { ...teacher }
  const command = { type: "save-feedback" as const, recordId, feedback: "책을 읽고 자신의 경험을 연결한 점이 좋아요. 중요한 장면을 더 적어보세요.", items: [], decision: "complete" as const }
  const a = applyReviewCommand(db, command, actor, "normal-save", db.pro!.clock)
  const b = applyManagedReviewCommand(db, command, actor, "normal-save", db.pro!.clock)
  assert.deepEqual(a.records.find(r => r.id === recordId), b.records.find(r => r.id === recordId))
  assert.deepEqual(a.pro, b.pro)
})
test("요일 변경은 다음 주부터, 이미 배정된 건 일정 보존", () => {
  let db = fixture(); const before = structuredClone(db.pro!.cases)
  db = applyProCommand(db, { type: "schedule", teacherId: "teacher-1", weekday: 1 }, teacher, "schedule")
  assert.deepEqual(db.pro!.cases, before)
  assert.equal(weekdayFor(db.pro!, db.pro!.members[0], weekStart(db.pro!.clock)), 7)
  assert.equal(weekdayFor(db.pro!, db.pro!.members[0], addDays(weekStart(db.pro!.clock), 7)), 1)
})

test("자동 선정은 최신 제출 우선이며 초과·미매칭·일반 학생은 제외", () => {
  let db = fixture()
  db = applyProCommand(db, { type: "limit", studentId: student.studentId, limit: 1, reason: "기타", memo: "한 자리 검증" }, teacher, "limit")
  db = applyProCommand(db, { type: "clock", at: "2026-10-12T00:00:00.000Z" }, teacher, "auto")
  assert.equal(db.pro!.cases.find(c => c.reviewId === "review-pro-apply-b")!.selection, "auto")
  assert.equal(db.pro!.cases.find(c => c.reviewId === "review-pro-apply-a")!.selectedAt, undefined)
  assert.ok(!db.pro!.cases.some(c => ["pro-demo-7", "pro-demo-9"].includes(c.studentId)))
})
test("미선정 일괄 처리는 거부, 명시한 선생님 지정·저장은 원자적으로 잠금", () => {
  let db = fixture()
  const command = { type: "save-feedback" as const, recordId: "review-pro-apply-a-r1", feedback: "자신의 경험을 담아 생각을 잘 정리했어요. 다음에는 이유를 더 써 보세요.", items: [], decision: "complete" as const }
  assert.throws(() => applyManagedReviewCommand(db, command, teacher, "bulk", db.pro!.clock), /선정/)
  assert.throws(() => applyManagedReviewCommand(db, { ...command, proDesignate: true, feedback: "짧음" }, teacher, "invalid", db.pro!.clock))
  assert.equal(db.pro!.cases.find(c => c.reviewId === "review-pro-apply-a")!.selectedAt, undefined)
  db = applyManagedReviewCommand(db, { ...command, proDesignate: true }, teacher, "designated", db.pro!.clock)
  assert.equal(db.pro!.cases.find(c => c.reviewId === "review-pro-apply-a")!.selection, "teacher")
  assert.ok(db.pro!.cases.find(c => c.reviewId === "review-pro-apply-a")!.lockedAt)
})
test("AI 실행 실패도 취소 잠금 유지하며 성공 횟수는 차감하지 않음", () => {
  let db = fixture()
  db = applyManagedReviewCommand(db, { type: "ai-start", recordId: "review-pro-apply-a-r1", proDesignate: true }, teacher, "ai-run", db.pro!.clock)
  assert.throws(() => applyProCommand(db, { type: "cancel", reviewId: "review-pro-apply-a" }, student, "cancel-ai"))
  assert.equal(db.records.find(r => r.id === "review-pro-apply-a-r1")!.aiUsed, 0)
})
test("독려 순서·당일 취소·상담 버전·중복 완료 집계", () => {
  let db = fixture(); const week = weekStart(db.pro!.clock)
  const base = { type: "reminder" as const, studentId: student.studentId, week, kind: "submission" as const }
  assert.throws(() => applyProCommand(db, { ...base, sequence: 2 }, teacher, "second-first"))
  db = applyProCommand(db, { ...base, sequence: 1 }, teacher, "remind1")
  db = applyProCommand(db, { ...base, sequence: 2 }, teacher, "remind2")
  assert.throws(() => applyProCommand(db, { type: "cancel-reminder", id: "remind1" }, teacher, "badcancel"))
  db = applyProCommand(db, { type: "cancel-reminder", id: "remind2" }, teacher, "cancel2")
  db = applyProCommand(db, { type: "cancel-reminder", id: "remind1" }, teacher, "cancel1")
  assert.equal(db.pro!.reminders.length, 2)
  const consult = { type: "consult" as const, studentId: student.studentId, month: "2026-10", result: "유선 상담 완료" as const, actualAt: db.pro!.clock, memo: "통화 내용" }
  db = applyProCommand(db, consult, teacher, "consult1")
  db = applyProCommand(db, { ...consult, previousId: "consult1", memo: "수정 내용" }, teacher, "consult2")
  assert.equal(db.pro!.consultations.length, 2)
  assert.equal(db.pro!.consultations[1].previousId, "consult1")
  assert.throws(() => applyProCommand(db, { type: "consult-schedule", studentId: student.studentId, nth: 2, weekday: 4, time: "15:00", month: "2026-10", override: midnight("2026-11-01") }, teacher, "wrong-month"))
})
test("늦은 1차 전송은 원래 차감월 유지, 2차 기한은 실제 전송월 기준", () => {
  let db = fixture()
  db = applyProCommand(db, { type: "clock", at: "2026-11-05T01:00:00.000Z" }, teacher, "late-month")
  db = applyManagedReviewCommand(db, { type: "save-feedback", recordId: "review-pro-overdue-r1", feedback: "경험을 잘 연결했어요. 피드백을 바탕으로 자신의 생각을 더 구체적으로 고쳐 보세요.", items: [], decision: "request" }, teacher, "late-save", db.pro!.clock)
  db = applyManagedReviewCommand(db, { type: "send", recordId: "review-pro-overdue-r1" }, teacher, "late-send", db.pro!.clock)
  const c = db.pro!.cases.find(c => c.reviewId === "review-pro-overdue")!, m = db.pro!.members.find(m => m.id === c.studentId)!
  assert.equal(c.month, "2026-10")
  assert.equal(c.secondDeadline, "2026-11-30T14:59:00.000Z")
  assert.equal(proUsage(db.pro!, m, db.pro!.clock, "2026-10").used, 1)
  assert.equal(proUsage(db.pro!, m, db.pro!.clock, "2026-11").used, 0)
  assert.equal(c.parent.status, "none")
})
test("학부모 연락처 누락은 학생 전송·차감 롤백 없이 별도 재시도", () => {
  let db = fixture(); db.records.find(r => r.id === "review-pro-overdue-r1")!.parentContact = false
  db = applyManagedReviewCommand(db, { type: "send", recordId: "review-pro-overdue-r1" }, teacher, "send-missing", db.pro!.clock)
  const c = db.pro!.cases.find(c => c.reviewId === "review-pro-overdue")!
  assert.equal(c.parent.status, "missing"); assert.ok(c.firstSentAt)
  db.records.find(r => r.id === "review-pro-overdue-r1")!.parentContact = true
  db = applyProCommand(db, { type: "retry-parent", reviewId: c.reviewId }, teacher, "retry")
  assert.equal(db.pro!.cases.find(item => item.reviewId === c.reviewId)!.parent.status, "sent")
  assert.throws(() => applyProCommand(db, { type: "retry-parent", reviewId: c.reviewId }, teacher, "retry-again"))
})
test("신규 프로 작성도 테스트 시각을 사용하고 기존 일반 기록 전체 보존", () => {
  const db = fixture(), ordinary = db.records.filter(r => r.reviewId === "review-pro-normal")
  const common = structuredClone(db.reviews.find(r => r.id === "review-pro-writing")!)
  common.id = "new-pro-clock"; common.sourceWorkbookId = "new-pro-clock"
  const next = applyManagedReviewCommand(db, { type: "create", common }, student, "new-create", "2030-01-01T00:00:00.000Z")
  assert.equal(next.reviews.find(c => c.id === common.id)!.createdAt, db.pro!.clock)
  assert.deepEqual(next.records.filter(r => r.reviewId === "review-pro-normal"), ordinary)
})

test("지난 주 현황은 전송 전 기록을 유지하고 지난달 미선정 권수는 소멸", () => {
  let db = fixture()
  const m = db.pro!.members.find(m => m.id === "pro-demo-4")!
  const week = midnight("2026-09-28")
  db = applyManagedReviewCommand(db, { type: "send", recordId: "review-pro-overdue-r1" }, teacher, "today-send", db.pro!.clock)
  assert.equal(weeklyStudent(db, m, week).feedback.length, 1)
  assert.equal(weeklyStudent(db, m, week).usage.used, 0)
  db = applyProCommand(db, { type: "clock", at: "2026-11-10T00:00:00.000Z" }, teacher, "nov-expiry")
  assert.equal(proUsage(db.pro!, m, db.pro!.clock, "2026-10").available, 0)
})
