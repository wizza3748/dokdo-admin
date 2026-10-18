import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node test runner loads TS sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import { emptyReviewDatabase, canAccessReview } from "../src/lib/review-domain.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import { applyProCommand, applyManagedReviewCommand, reconcilePro, proUsage, weekdayFor } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import { caseParentLabel, proSnapshotAt, scopePro, studentProView, weeklyStudent, weeklyTaskBooks, proTasks } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import { midnight, weekStart, addDays } from "../src/lib/pro-calendar.ts"

const teacher = { role: "agency" as const, institutionId: "dokdo", name: "검증 선생님" }
const student = { role: "student" as const, studentId: "pro-demo-1", name: "프로 신청예시" }
const fixture = () => { const db = initializePro(emptyReviewDatabase()); db.pro!.clockMode = "test"; return reconcilePro(db) }

test("기관 공통 요일: 담당 선생님이 달라도 다음 주부터 같은 요일 적용", () => {
  let db = fixture()
  db.pro!.members[1].teacherId = "another-teacher"
  const week = weekStart(db.pro!.clock)
  db = applyProCommand(db, { type: "schedule", weekday: 3 }, teacher, "schedule-common")
  for (const member of db.pro!.members.filter(m => m.institutionId === "dokdo")) {
    assert.equal(weekdayFor(db.pro!, member, week), 7)
    assert.equal(weekdayFor(db.pro!, member, addDays(week, 7)), 3)
  }
  assert.ok(scopePro(db.pro!, "dokdo").audit.some(a => a.id === "schedule-common"))
  assert.ok(!scopePro(db.pro!, "other").audit.some(a => a.id === "schedule-common"))
})

test("학원 변경: 현재 매칭 기관만 열람/처리, 새 일정은 다음 주, 기존 차감 보존", () => {
  let db = fixture()
  const member = db.pro!.members.find(m => m.id === student.studentId)!
  const common = db.reviews.find(r => r.id === "review-pro-apply-a")!
  member.matchingHistory = [{ at: member.assignedAt!, institutionId: "dokdo" }, { at: db.pro!.clock, institutionId: "new-agency" }]
  member.institutionId = "new-agency"
  db.pro!.schedules.push({institutionId:"new-agency", teacherId:"", from:midnight("2026-09-28"), weekday:2})
  const week = weekStart(db.pro!.clock)
  assert.equal(weekdayFor(db.pro!, member, week), 7)
  assert.equal(weekdayFor(db.pro!, member, addDays(week,7)), 2)
  assert.equal(canAccessReview(common, teacher, db.pro), false)
  const nextTeacher = {...teacher, institutionId:"new-agency"}
  assert.equal(canAccessReview(common, nextTeacher, db.pro), true)
  assert.equal(scopePro(db.pro!, "dokdo").cases.some(c => c.studentId === member.id), false)
  assert.ok(scopePro(db.pro!, "new-agency").cases.some(c => c.studentId === member.id))
  assert.throws(() => applyProCommand(db, {type:"designate",reviewId:common.id}, teacher, "old"))
  db = applyProCommand(db, {type:"designate",reviewId:common.id}, nextTeacher, "new")
  assert.equal(db.pro!.cases.find(c => c.reviewId === common.id)!.selection, "teacher")
})

test("학생은 기관 지정 글을 취소할 수 없음, 미선정은 학부모 발송 대상 아님", () => {
  let db = fixture()
  const id = "review-pro-apply-a"
  assert.equal(caseParentLabel(db.pro!.cases.find(c => c.reviewId === id)), "-")
  db = applyProCommand(db, {type:"designate",reviewId:id}, teacher, "designate")
  assert.equal(studentProView(db, student.studentId)!.cases.find(c => c.reviewId === id)!.canCancel, false)
  assert.throws(() => applyProCommand(db, {type:"cancel",reviewId:id}, student, "cancel"), /본인이 신청/)
})

test("2차 반려는 제출 대기로 복귀, 첫 차감과 원래 기한 유지", () => {
  let db = fixture()
  const actor = {...student,studentId:"pro-demo-5"}
  for (const type of ["seen", "start-second"] as const) db = applyManagedReviewCommand(db, {type,recordId:"review-pro-second-r1"}, actor, type, db.pro!.clock)
  db = applyManagedReviewCommand(db, {type:"enter-rewrite",recordId:"review-pro-second-r2"}, actor, "rewrite", db.pro!.clock)
  db = applyManagedReviewCommand(db, {type:"submit",recordId:"review-pro-second-r2"}, actor, "submit", db.pro!.clock)
  const before = structuredClone(db.pro!.cases.find(c => c.reviewId === "review-pro-second")!)
  assert.ok(before.secondWeek)
  db = applyManagedReviewCommand(db, {type:"reject",recordId:"review-pro-second-r2"}, teacher, "reject", db.pro!.clock)
  const after = db.pro!.cases.find(c => c.reviewId === before.reviewId)!
  assert.equal(after.secondWeek, undefined); assert.equal(after.secondDue, undefined)
  assert.equal(after.secondDeadline, before.secondDeadline); assert.equal(after.firstSentAt, before.firstSentAt)
  assert.equal(weeklyStudent(db, db.pro!.members.find(m => m.id === actor.studentId)!, weekStart(db.pro!.clock)).waiting.length, 1)
})

test("발송 실패/재시도: 학생 전송과 차감 유지, 성공 이후 중복 발송 금지", () => {
  let db = fixture()
  db.pro!.cases.find(c => c.reviewId === "review-pro-overdue")!.parent.simulateFailureOnce = true
  db = applyManagedReviewCommand(db, {type:"send",recordId:"review-pro-overdue-r1"}, teacher, "send", db.pro!.clock)
  let c = db.pro!.cases.find(c => c.reviewId === "review-pro-overdue")!
  assert.equal(c.parent.status,"failed"); assert.equal(c.parent.attempts.length,1)
  const member = db.pro!.members.find(m => m.id === c.studentId)!
  assert.equal(proUsage(db.pro!,member,db.pro!.clock).used,1)
  db = applyProCommand(db,{type:"retry-parent",reviewId:c.reviewId},teacher,"retry")
  c = db.pro!.cases.find(item => item.reviewId === c.reviewId)!
  assert.equal(c.parent.status,"sent"); assert.equal(c.parent.attempts.length,2)
  assert.equal(proUsage(db.pro!,member,db.pro!.clock).used,1)
  assert.throws(() => applyProCommand(db,{type:"retry-parent",reviewId:c.reviewId},teacher,"again"))
})

test("할 일 필터는 해당 글만 포함하고 상담 필요에 예정일 경과도 포함", () => {
  let db = fixture()
  const member = db.pro!.members.find(m => m.id === "pro-demo-4")!
  const row = weeklyStudent(db,member,weekStart(db.pro!.clock))
  assert.equal(weeklyTaskBooks(row,weekStart(db.pro!.clock),db.pro!.clock,0).feedback.length,1)
  assert.equal(weeklyTaskBooks(row,weekStart(db.pro!.clock),db.pro!.clock,1).feedback.length,0)
  db = applyProCommand(db,{type:"clock",at:"2026-10-09T01:00:00.000Z"},teacher,"tomorrow")
  const next = weeklyStudent(db,member,weekStart(db.pro!.clock))
  assert.equal(next.tasks[4],1); assert.equal(next.consultationDue,true)
  assert.ok(proTasks(db).badge > proTasks(db).counts.slice(0,4).reduce((a,b) => a+b,0))
})

test("과거 조회에 미래 저장/잠금/전송 상태가 섞이지 않음", () => {
  let db = fixture()
  db = applyManagedReviewCommand(db,{type:"save-feedback",recordId:"review-pro-apply-a-r1",proDesignate:true,feedback:"책을 읽고 생각한 이유와 경험을 아주 자세히 잘 적었어요.",items:[],decision:"complete"},teacher,"save",db.pro!.clock)
  const prior = proSnapshotAt(db,"2026-10-06T00:00:00.000Z")
  const record = prior.records.find(r => r.id === "review-pro-apply-a-r1")!
  assert.equal(record.savedAt,undefined); assert.equal(record.feedbackStatus,"작성전")
  assert.equal(prior.pro!.cases.find(c => c.reviewId === record.reviewId)!.lockedAt,undefined)
})

test("차감 취소 이력은 실행월이 아니라 기존 차감월에 귀속", () => {
  let db = fixture()
  db = applyProCommand(db,{type:"clock",at:"2026-11-10T00:00:00.000Z"},teacher,"nov")
  db = applyProCommand(db,{type:"cancel-debit",reviewId:"review-pro-migrated-sent",reason:"기타",memo:"이전 월 차감 확인"},teacher,"cancel-old")
  const audit = db.pro!.audit.find(a => a.id === "cancel-old")!
  assert.equal(audit.month,"2026-10")
  assert.equal((audit.before as {month:string}).month,"2026-10")
  assert.equal((audit.after as {used:number}).used,0)
})
