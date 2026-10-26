import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { applyManagedReviewCommand, applyProCommand, claimDueFeedbackSchedules, executeFeedbackSchedule, proUsage, reconcilePro } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { applyReviewCommand, assessmentCriteria, canAccessReview, canSendReview, emptyReviewDatabase, sampleReviewAi, type ReviewActor, type ReviewCommand, type ReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { activeFeedbackSchedule, feedbackScheduleRevision, validFeedbackScheduleTime } from "../src/lib/review-schedule.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { secondDeadline } from "../src/lib/pro-calendar.ts"

const now = "2026-10-08T01:00:00.000Z", due = "2026-10-08T01:01:00.000Z"
const teacher: ReviewActor = { role: "agency", institutionId: "dokdo", name: "예약 검증 선생님" }
const recordId = "review-pro-overdue-r1"
const fixture = () => {
  const db = initializePro(emptyReviewDatabase())
  db.pro!.clockMode = "real"; db.pro!.clock = now
  return reconcilePro(db, now)
}
const recordOf = (db: ReviewDatabase, id = recordId) => db.records.find(record => record.id === id)!
const commonOf = (db: ReviewDatabase, id = recordId) => db.reviews.find(common => common.id === recordOf(db, id).reviewId)!
const caseOf = (db: ReviewDatabase, id = recordId) => db.pro!.cases.find(c => c.reviewId === recordOf(db, id).reviewId)!
const usage = (db: ReviewDatabase, id = recordId, at = now) => proUsage(db.pro!, db.pro!.members.find(member => member.id === commonOf(db, id).studentId)!, at)
const registration = (db: ReviewDatabase, id = recordId, scheduledAt = due): ReviewCommand => ({ type: "schedule-feedback", recordId: id, scheduledAt, expectedRevision: feedbackScheduleRevision(commonOf(db, id), recordOf(db, id)) })
const register = (db = fixture(), id = recordId, scheduleId = "schedule", scheduledAt = due, at = now) => applyManagedReviewCommand(db, registration(db, id, scheduledAt), teacher, scheduleId, at)
const execute = (db: ReviewDatabase, id = recordId, at = due) => executeFeedbackSchedule(claimDueFeedbackSchedules(db, at), id, activeFeedbackSchedule(recordOf(db, id))!.id, at)

test("예약 등록은 저장 스냅샷과 작성자/기관/이력을 보존하고 권수·기한·전송은 변경하지 않음", () => {
  const original = fixture(), before = structuredClone(original), db = register(original)
  assert.deepEqual(original, before)
  assert.deepEqual(usage(db), usage(original))
  assert.equal(recordOf(db).feedbackStatus, "작성완료")
  assert.equal(recordOf(db).sentAt, undefined)
  assert.deepEqual(caseOf(db), caseOf(original))
  const schedule = activeFeedbackSchedule(recordOf(db))!
  assert.equal(schedule.status, "waiting")
  assert.equal(schedule.scheduledAt, due)
  assert.deepEqual(schedule.createdBy, teacher)
  assert.equal(schedule.institutionId, "dokdo")
  assert.equal(schedule.snapshot.feedback, recordOf(original).feedback)
  assert.equal(schedule.snapshot.secondDecision, "complete")
  assert.notEqual(schedule.snapshot.itemFeedback, recordOf(db).itemFeedback)
  assert.deepEqual(schedule.events.map(event => event.action), ["registered"])
  assert.equal(recordOf(db).history.at(-1)?.action, "schedule-feedback")
  assert.equal(db.pro!.audit.at(-1)?.kind, "예약 등록")
  assert.equal(canSendReview(commonOf(db), recordOf(db)), false)
  assert.deepEqual(applyManagedReviewCommand(db, registration(original), teacher, "schedule", now), db)
  assert.throws(() => register(db, recordId, "duplicate"), /이미 등록/)
})

test("현재 이후의 유효한 분 단위 절대 시각만 예약 가능하고 KST 선택 시각 보존", () => {
  assert.equal(validFeedbackScheduleTime("2026-10-08T10:01+09:00", now), true)
  assert.equal(activeFeedbackSchedule(recordOf(register(fixture(), recordId, "kst", "2026-10-08T10:01+09:00")))!.scheduledAt, due)
  for (const value of [now, "2026-10-08T00:59:00Z", "2026-10-08T01:01:01Z", "2026-10-08T01:01:00.001Z", "2026-10-08T10:01", "2027-02-30T10:01+09:00", "invalid"]) {
    assert.equal(validFeedbackScheduleTime(value, now), false, value)
    assert.throws(() => register(fixture(), recordId, "invalid", value), /예약 일시/)
  }
})

test("기관관리자·해당 관리 기관·외부 프로 선정 상태와 기존 전송 조건을 서버에서 재검사", () => {
  const db = fixture(), command = registration(db)
  for (const actor of [{ role: "admin", name: "본사" }, { ...teacher, role: "class" }, { ...teacher, institutionId: "other-agency" }, { role: "student", studentId: commonOf(db).studentId, name: "학생" }] as ReviewActor[]) {
    assert.throws(() => applyManagedReviewCommand(db, command, actor, "wrong-actor", now), /권한/)
  }
  for (const mutate of [
    (copy: ReviewDatabase) => { copy.pro!.members.find(member => member.id === commonOf(copy).studentId)!.external = false },
    (copy: ReviewDatabase) => { caseOf(copy).selectedAt = undefined },
    (copy: ReviewDatabase) => { caseOf(copy).closedAt = now },
    (copy: ReviewDatabase) => { recordOf(copy).feedbackStatus = "작성전" },
    (copy: ReviewDatabase) => { recordOf(copy).aiHistory.push({ requestId: "running", status: "running", at: now, actor: "선생님" }) },
    (copy: ReviewDatabase) => { recordOf(copy).aiDraft = { feedback: "생성 내용", items: [] } },
    (copy: ReviewDatabase) => { recordOf(copy).sentAt = now },
  ]) {
    const copy = structuredClone(db); mutate(copy)
    assert.throws(() => register(copy))
  }
  assert.throws(() => applyReviewCommand(db, command, teacher, "bypass", now), /지원하지 않는/)
})

test("모달을 연 이후 저장 내용·결정·보고서·전송 이력 변경은 예약 확정 차단", () => {
  const db = fixture(), command = registration(db)
  for (const mutate of [
    (copy: ReviewDatabase) => { recordOf(copy).feedback += " 추가 내용" },
    (copy: ReviewDatabase) => { commonOf(copy).secondDecision = "request" },
    (copy: ReviewDatabase) => { recordOf(copy).reportFeedback = "새 보고서용 총평" },
    (copy: ReviewDatabase) => { recordOf(copy).report = { version: 1, generatedAt: now, ai: 70, teacher: 80, score: 77 } },
    (copy: ReviewDatabase) => { recordOf(copy).history.push({ requestId: "past-send", action: "send", actor: "선생님", at: now }) },
  ]) {
    const copy = structuredClone(db); mutate(copy)
    assert.throws(() => applyManagedReviewCommand(copy, command, teacher, "stale", now))
    assert.equal(recordOf(copy).feedbackSchedules, undefined)
  }
})

test("대기·전송중·실패에는 저장·즉시전송·AI·반려를 차단하되 꽃 지급은 유지", () => {
  const registered = register()
  const commands: ReviewCommand[] = [
    { type: "save-feedback", recordId, feedback: "학생에게 전달할 새로운 총평입니다.", items: [], decision: "request" },
    { type: "send", recordId }, { type: "ai-start", recordId }, { type: "ai-result", recordId, runId: "unknown" }, { type: "reject", recordId },
  ]
  const claimed = claimDueFeedbackSchedules(registered, due)
  const failed = executeFeedbackSchedule(claimed, recordId, "schedule", due, { simulateFailure: "검증 실패" })
  for (const db of [registered, claimed, failed]) {
    for (const command of commands) {
      assert.throws(() => applyManagedReviewCommand(db, command, teacher, `blocked-${command.type}`, due), /예약/)
      assert.throws(() => applyReviewCommand(db, command, teacher, `direct-${command.type}`, due), /예약/)
    }
    const awarded = applyManagedReviewCommand(db, { type: "flower", recordId, amount: 5 }, teacher, "flowers", due)
    assert.equal(recordOf(awarded).flowers, 5)
    assert.equal(activeFeedbackSchedule(recordOf(awarded))!.status, activeFeedbackSchedule(recordOf(db))!.status)
  }
  const withFlowers = applyManagedReviewCommand(registered, { type: "flower", recordId, amount: 5 }, teacher, "flowers", now)
  assert.equal(recordOf(execute(withFlowers)).feedbackStatus, "전송완료", "꽃 지급은 저장 스냅샷의 변경이 아님")
})

test("예약 취소는 기존 피드백·선정·잠금·권수 유지, 재등록은 별도 이력 추가", () => {
  const db = register(), c = structuredClone(caseOf(db)), beforeUsage = usage(db)
  const cancelled = applyManagedReviewCommand(db, { type: "cancel-feedback-schedule", recordId, scheduleId: "schedule" }, teacher, "cancel", now)
  assert.equal(activeFeedbackSchedule(recordOf(cancelled)), undefined)
  assert.equal(recordOf(cancelled).feedbackSchedules![0].status, "cancelled")
  assert.equal(recordOf(cancelled).feedbackSchedules![0].cancelledBy, teacher.name)
  assert.deepEqual(recordOf(cancelled).feedbackSchedules![0].events.map(event => event.action), ["registered", "cancelled"])
  assert.deepEqual(caseOf(cancelled), c)
  assert.deepEqual(usage(cancelled), beforeUsage)
  assert.equal(recordOf(cancelled).feedback, recordOf(db).feedback)
  assert.equal(canSendReview(commonOf(cancelled), recordOf(cancelled)), true)
  assert.equal(claimDueFeedbackSchedules(cancelled, due), cancelled)
  const next = register(cancelled, recordId, "replacement")
  assert.equal(recordOf(next).feedbackSchedules!.length, 2)
  assert.equal(recordOf(next).feedbackSchedules![0].status, "cancelled")
  assert.equal(activeFeedbackSchedule(recordOf(next))!.id, "replacement")
})

test("시간 도달 시 선점 후 실행, 취소와 경합은 먼저 저장한 처리만 성공", () => {
  const registered = register()
  assert.equal(claimDueFeedbackSchedules(registered, now), registered)
  const claimed = claimDueFeedbackSchedules(registered, due)
  assert.equal(activeFeedbackSchedule(recordOf(claimed))!.status, "sending")
  assert.deepEqual(activeFeedbackSchedule(recordOf(claimed))!.events.map(event => event.action), ["registered", "claimed"])
  assert.equal(claimDueFeedbackSchedules(claimed, due), claimed)
  assert.throws(() => applyManagedReviewCommand(claimed, { type: "cancel-feedback-schedule", recordId, scheduleId: "schedule" }, teacher, "late-cancel", due), /처리 중/)
  assert.throws(() => applyManagedReviewCommand(registered, { type: "cancel-feedback-schedule", recordId, scheduleId: "other" }, teacher, "wrong-id", now), /변경/)
  const sent = executeFeedbackSchedule(claimed, recordId, "schedule", due)
  assert.equal(recordOf(sent).feedbackSchedules![0].status, "sent")
  assert.equal(recordOf(sent).sentAt, due)
  assert.equal(recordOf(sent).feedbackStatus, "전송완료")
  assert.equal(usage(sent, recordId, due).used, usage(registered, recordId, due).used + 1)
  assert.equal(caseOf(sent).parent.status, "sent")
  assert.equal(caseOf(sent).parent.attempts.length, 1)
  assert.equal(caseOf(sent).finalSnapshots.length, 1)
  assert.equal(executeFeedbackSchedule(sent, recordId, "schedule", due), sent)
  assert.equal(claimDueFeedbackSchedules(sent, due), sent)
  assert.equal(sent.records.filter(record => record.id !== recordId).length, registered.records.length - 1)
})

test("중단 후 저장된 전송중 건 재실행은 한 번만 전송·차감·학부모 발송", () => {
  const savedClaim = JSON.parse(JSON.stringify(claimDueFeedbackSchedules(register(), due))) as ReviewDatabase
  const late = "2026-10-08T03:00:00.000Z"
  const once = executeFeedbackSchedule(savedClaim, recordId, "schedule", late)
  const twice = executeFeedbackSchedule(once, recordId, "schedule", late)
  assert.deepEqual(twice, once)
  assert.equal(recordOf(once).sentAt, late, "예약 시각이 아니라 실제 전송 완료 시각")
  assert.equal(recordOf(once).history.filter(item => item.action === "send").length, 1)
  assert.equal(caseOf(once).parent.attempts.length, 1)
  assert.equal(recordOf(once).feedbackSchedules![0].executedAt, late)
})

test("실행 실패는 자동 재시도/차감/전송 없이 실패 사유 유지, 취소 후 새 예약 가능", () => {
  const registered = register(), claimed = claimDueFeedbackSchedules(registered, due)
  const failed = executeFeedbackSchedule(claimed, recordId, "schedule", due, { simulateFailure: "전용 예약 전송 실패 검증" })
  assert.equal(activeFeedbackSchedule(recordOf(failed))!.status, "failed")
  assert.equal(activeFeedbackSchedule(recordOf(failed))!.failureReason, "전용 예약 전송 실패 검증")
  assert.deepEqual(usage(failed), usage(registered))
  assert.deepEqual(caseOf(failed), caseOf(registered))
  assert.equal(recordOf(failed).sentAt, undefined)
  assert.equal(claimDueFeedbackSchedules(failed, due), failed)
  assert.equal(executeFeedbackSchedule(failed, recordId, "schedule", due), failed)
  assert.throws(() => register(failed, recordId, "retry"), /이미 등록/)
  const cancelled = applyManagedReviewCommand(failed, { type: "cancel-feedback-schedule", recordId, scheduleId: "schedule" }, teacher, "cancel-failed", due)
  const next = register(cancelled, recordId, "new", "2026-10-08T01:02:00.000Z", due)
  assert.equal(recordOf(next).feedbackSchedules![0].failureReason, "전용 예약 전송 실패 검증")
  assert.equal(activeFeedbackSchedule(recordOf(next))!.id, "new")
})

test("실행 요청 ID가 다른 작업 이력과 충돌하면 실제 전송 없이 예약 성공으로 확정하지 않음", () => {
  const scheduled = register()
  const before = applyManagedReviewCommand(scheduled, { type: "flower", recordId, amount: 5 }, teacher, "schedule:execute", now)
  const savedRecord = structuredClone(recordOf(before)), savedCase = structuredClone(caseOf(before))
  const failed = execute(before)
  const record = recordOf(failed), schedule = activeFeedbackSchedule(record)!
  assert.equal(schedule.status, "failed")
  assert.match(schedule.failureReason!, /전송 완료를 확인하지 못했습니다/)
  assert.deepEqual(schedule.snapshot, savedRecord.feedbackSchedules![0].snapshot)
  assert.equal(record.feedbackStatus, savedRecord.feedbackStatus)
  assert.equal(record.sentAt, undefined)
  assert.equal(record.feedback, savedRecord.feedback)
  assert.deepEqual(record.itemFeedback, savedRecord.itemFeedback)
  assert.deepEqual(record.report, savedRecord.report)
  assert.equal(record.flowers, 5)
  assert.equal(record.history.filter(item => item.action === "send").length, 0)
  assert.deepEqual(caseOf(failed), savedCase)
  assert.deepEqual(usage(failed), usage(before))
  assert.equal(executeFeedbackSchedule(failed, recordId, "schedule", due), failed)
})

test("실행 시 처리 권한·저장 스냅샷 변경·중복 전송을 재검사하고 저장 내용은 덮어쓰지 않음", () => {
  for (const mutate of [
    (db: ReviewDatabase) => { caseOf(db).institutionId = "other-agency" },
    (db: ReviewDatabase) => { recordOf(db).feedback = "다른 화면에서 변경한 내용을 그대로 보존합니다." },
    (db: ReviewDatabase) => { commonOf(db).secondDecision = "request" },
    (db: ReviewDatabase) => { recordOf(db).feedbackStatus = "전송완료"; recordOf(db).sentAt = now },
    (db: ReviewDatabase) => { caseOf(db).firstSentAt = now },
  ]) {
    const db = claimDueFeedbackSchedules(register(), due); mutate(db)
    const before = structuredClone(db), next = executeFeedbackSchedule(db, recordId, "schedule", due)
    assert.deepEqual(db, before)
    assert.equal(recordOf(next).feedbackSchedules![0].status, "failed")
    assert.ok(recordOf(next).feedbackSchedules![0].failureReason)
    assert.equal(recordOf(next).feedback, recordOf(before).feedback)
    assert.equal(recordOf(next).sentAt, recordOf(before).sentAt)
    assert.equal(commonOf(next).secondDecision, commonOf(before).secondDecision)
    assert.deepEqual(caseOf(next), caseOf(before))
  }
})

test("학생 연결 기관이 바뀌어도 선정 당시 관리 기관은 기존 예약 처리 권한 유지", () => {
  const db = register(), member = db.pro!.members.find(item => item.id === commonOf(db).studentId)!
  member.institutionId = "other-agency"
  member.matchingHistory = [{ at: member.assignedAt!, institutionId: "dokdo" }, { at: now, institutionId: "other-agency" }]
  const nextTeacher = { ...teacher, institutionId: "other-agency" }
  assert.equal(canAccessReview(commonOf(db), teacher, db.pro), true)
  assert.equal(canAccessReview(commonOf(db), nextTeacher, db.pro), true)
  assert.throws(() => applyManagedReviewCommand(db, { type: "cancel-feedback-schedule", recordId, scheduleId: "schedule" }, nextTeacher, "wrong-owner-cancel", now), /권한/)
  const cancelled = applyManagedReviewCommand(db, { type: "cancel-feedback-schedule", recordId, scheduleId: "schedule" }, teacher, "owner-cancel", now)
  for (const command of [
    { type: "send", recordId }, { type: "ai-start", recordId }, { type: "ai-result", recordId, runId: "unknown" },
    { type: "save-feedback", recordId, feedback: "새 기관은 과거 기관의 피드백을 수정할 수 없습니다.", items: [], decision: "complete" },
    { type: "flower", recordId, amount: 1 }, { type: "reject", recordId },
  ] as ReviewCommand[]) assert.throws(() => applyManagedReviewCommand(cancelled, command, nextTeacher, `readonly-${command.type}`, now), /권한/)
  const registered = register(cancelled, recordId, "owner-register")
  assert.equal(activeFeedbackSchedule(recordOf(registered))!.institutionId, "dokdo")
  recordOf(registered).parentContact = false
  const sent = execute(registered)
  assert.equal(recordOf(sent).feedbackStatus, "전송완료")
  assert.equal(caseOf(sent).institutionId, "dokdo")
  assert.equal(caseOf(sent).parent.status, "missing")
  recordOf(sent).parentContact = true
  assert.throws(() => applyProCommand(sent, { type: "retry-parent", reviewId: commonOf(sent).id }, nextTeacher, "new-owner-parent", due), /권한/)
  const retried = applyProCommand(sent, { type: "retry-parent", reviewId: commonOf(sent).id }, teacher, "old-owner-parent", due)
  assert.equal(caseOf(retried).parent.status, "sent")

  let unselected = fixture()
  const common = unselected.reviews.find(item => item.id === "review-pro-apply-a")!
  const moved = unselected.pro!.members.find(item => item.id === common.studentId)!
  moved.institutionId = "other-agency"
  moved.matchingHistory = [{ at: moved.assignedAt!, institutionId: "dokdo" }, { at: now, institutionId: "other-agency" }]
  assert.equal(canAccessReview(common, teacher, unselected.pro), false)
  assert.equal(canAccessReview(common, nextTeacher, unselected.pro), true)
  unselected = applyManagedReviewCommand(unselected, { type: "save-feedback", recordId: "review-pro-apply-a-r1", proDesignate: true, feedback: "이동한 기관에서 새로 선정한 피드백입니다.", items: [], decision: "request" }, nextTeacher, "new-owner-select", now)
  assert.equal(caseOf(unselected, "review-pro-apply-a-r1").institutionId, "other-agency")
  assert.equal(canAccessReview(common, teacher, unselected.pro), false)
  assert.equal(canAccessReview(common, nextTeacher, unselected.pro), true)
})

test("학부모 발송 실패는 예약 학생 전송 성공과 사용 권수를 되돌리지 않음", () => {
  const db = fixture(); recordOf(db).parentContact = false
  const sent = execute(register(db))
  assert.equal(recordOf(sent).feedbackSchedules![0].status, "sent")
  assert.equal(recordOf(sent).feedbackStatus, "전송완료")
  assert.equal(caseOf(sent).parent.status, "missing")
  assert.equal(usage(sent, recordId, due).used, usage(db, recordId, due).used + 1)
})

test("이용 종료·서비스 만료 후에도 이미 선정된 관리 건의 예약 등록·취소·실행은 유지", () => {
  for (const ended of [false, true]) {
    const db = fixture(), member = db.pro!.members.find(item => item.id === commonOf(db).studentId)!
    member.serviceEnd = "2026-10-07T14:59:59.999Z"
    if (ended) { member.status = "ended"; member.endedAt = "2026-10-07T14:59:59.999Z" }
    const registered = register(db)
    assert.equal(activeFeedbackSchedule(recordOf(registered))!.status, "waiting")
    assert.equal(usage(registered).available, 0)
    const cancelled = applyManagedReviewCommand(registered, { type: "cancel-feedback-schedule", recordId, scheduleId: "schedule" }, teacher, "ended-cancel", now)
    const sent = execute(register(cancelled, recordId, "ended-register"))
    assert.equal(recordOf(sent).feedbackStatus, "전송완료")
    assert.equal(caseOf(sent).closedAt, due)
  }
  const waiting = register(), member = waiting.pro!.members.find(item => item.id === commonOf(waiting).studentId)!
  member.status = "ended"; member.endedAt = now; member.serviceEnd = now
  assert.equal(recordOf(execute(waiting)).feedbackStatus, "전송완료")
})

test("늦은 1차 예약 전송도 원래 차감월 유지, 2차 기한은 실제 전송 완료일로 계산", () => {
  let db = fixture()
  db = applyManagedReviewCommand(db, { type: "save-feedback", recordId, feedback: recordOf(db).feedback, items: [], decision: "request" }, teacher, "request-second", now)
  db = register(db)
  const actual = "2026-11-05T01:15:00.000Z", sent = execute(db, recordId, actual)
  assert.equal(caseOf(sent).month, "2026-10")
  assert.equal(caseOf(sent).firstSentAt, actual)
  assert.equal(caseOf(sent).secondDeadline, secondDeadline(actual, caseOf(sent).weekday))
  assert.equal(caseOf(sent).closedAt, undefined)
  assert.equal(caseOf(sent).parent.status, "none")
  const member = sent.pro!.members.find(member => member.id === commonOf(sent).studentId)!
  assert.equal(proUsage(sent.pro!, member, actual, "2026-10").used, 1)
  assert.equal(proUsage(sent.pro!, member, actual, "2026-11").used, 0)
})

test("2차 예약은 추가 차감 없이 실행 완료 시 관리 종료·학부모 발송", () => {
  let db = fixture()
  const firstId = "review-pro-second-r1", secondId = "review-pro-second-r2"
  const student: ReviewActor = { role: "student", studentId: "pro-demo-5", name: "2차 학생" }
  for (const type of ["seen", "start-second"] as const) db = applyManagedReviewCommand(db, { type, recordId: firstId }, student, type, now)
  db = applyManagedReviewCommand(db, { type: "enter-rewrite", recordId: secondId }, student, "rewrite", now)
  db = applyManagedReviewCommand(db, { type: "submit", recordId: secondId }, student, "submit-second", now)
  db = applyManagedReviewCommand(db, { type: "save-feedback", recordId: secondId, feedback: "피드백을 반영하여 이유를 구체적으로 보완했어요. 정말 좋은 글입니다.", items: [] }, teacher, "save-second", now)
  const before = usage(db, secondId), first = structuredClone(recordOf(db, firstId))
  const scheduled = register(db, secondId, "schedule-second")
  const changedFirst = structuredClone(scheduled)
  recordOf(changedFirst, firstId).feedbackStatus = "작성완료"
  const rejected = execute(changedFirst, secondId)
  assert.equal(activeFeedbackSchedule(recordOf(rejected, secondId))!.status, "failed")
  assert.match(activeFeedbackSchedule(recordOf(rejected, secondId))!.failureReason!, /1차 피드백 전송 상태/)
  assert.equal(recordOf(rejected, secondId).sentAt, undefined)
  const moved = scheduled.pro!.members.find(item => item.id === commonOf(scheduled, secondId).studentId)!
  moved.institutionId = "other-agency"
  moved.matchingHistory = [{ at: moved.assignedAt!, institutionId: "dokdo" }, { at: now, institutionId: "other-agency" }]
  assert.equal(canAccessReview(commonOf(scheduled, secondId), teacher, scheduled.pro), true)
  assert.equal(canAccessReview(commonOf(scheduled, secondId), { ...teacher, institutionId: "other-agency" }, scheduled.pro), true)
  assert.throws(() => applyManagedReviewCommand(scheduled, { type: "cancel-feedback-schedule", recordId: secondId, scheduleId: "schedule-second" }, { ...teacher, institutionId: "other-agency" }, "new-owner-second-cancel", now), /권한/)
  const sent = execute(scheduled, secondId)
  assert.equal(recordOf(sent, secondId).feedbackSchedules![0].status, "sent")
  assert.equal(usage(sent, secondId, due).used, before.used)
  assert.equal(caseOf(sent, secondId).closeReason, "2차 완료 전송")
  assert.equal(caseOf(sent, secondId).closedAt, due)
  assert.equal(caseOf(sent, secondId).parent.status, "sent")
  assert.deepEqual(recordOf(sent, firstId), first)
})

test("평가 보고서 예약은 점수와 보고서 스냅샷 보존, 불완전한 평가는 등록 불가", () => {
  let db = fixture()
  const common = commonOf(db); common.reportEnabled = true; common.template.reportEnabled = true
  db = applyManagedReviewCommand(db, { type: "ai-start", recordId }, teacher, "ai-score", now)
  const result = sampleReviewAi(commonOf(db), recordOf(db))
  db = applyManagedReviewCommand(db, { type: "ai-result", recordId, runId: "ai-score", result }, teacher, "ai-score-result", now)
  const scores = Object.fromEntries(assessmentCriteria(4).map(item => [item.id, item.max]))
  db = applyManagedReviewCommand(db, { type: "save-feedback", recordId, feedback: result.feedback, reportFeedback: result.reportFeedback, items: result.items, scores, decision: "complete" }, teacher, "save-score", now)
  const before = structuredClone(recordOf(db)), scheduled = register(db), snapshot = activeFeedbackSchedule(recordOf(scheduled))!.snapshot
  assert.deepEqual(snapshot.report, before.report)
  assert.deepEqual(snapshot.aiScores, before.aiScores)
  assert.deepEqual(snapshot.teacherScores, before.teacherScores)
  assert.equal(recordOf(execute(scheduled)).feedbackStatus, "전송완료")
  const invalid = structuredClone(db); recordOf(invalid).teacherScores = undefined
  assert.throws(() => register(invalid), /평가 완료/)
})

test("지정일 테스트 시각은 실제 오늘과 분리하고 일반 학생 직접 전송은 기존과 동일", () => {
  const frozen = register(); frozen.pro!.clockMode = "test"; frozen.pro!.clock = now
  assert.equal(claimDueFeedbackSchedules(frozen, "2027-01-01T00:00:00.000Z"), frozen)
  frozen.pro!.clock = due
  assert.equal(activeFeedbackSchedule(recordOf(claimDueFeedbackSchedules(frozen, now)))!.status, "sending")
  const base = fixture(), id = "review-pro-normal-r1"
  const saved = applyManagedReviewCommand(base, { type: "save-feedback", recordId: id, feedback: "일반 학생의 기존 피드백 흐름을 그대로 유지합니다.", items: [], decision: "complete" }, teacher, "normal-save", now)
  const sent = applyManagedReviewCommand(saved, { type: "send", recordId: id }, teacher, "normal-send", now)
  assert.equal(recordOf(sent, id).feedbackStatus, "전송완료")
  assert.deepEqual(sent.pro, saved.pro)
  assert.equal(recordOf(sent, id).feedbackSchedules, undefined)
  assert.throws(() => applyManagedReviewCommand(saved, registration(saved, id), teacher, "normal-schedule", now), /외부 프로/)
  assert.throws(() => applyProCommand(register(), { type: "cancel", reviewId: "review-pro-overdue" }, { role: "student", studentId: "pro-demo-4", name: "학생" }, "student-cancel", now))
})
