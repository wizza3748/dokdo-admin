import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { applyManagedReviewCommand, reconcilePro, proUsage } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { weeklyStudent, weeklyTaskBooks, feedbackActionLabel, proTasks } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { weekStart, weekSchedule } from "../src/lib/pro-calendar.ts"

export function mixedWeeklyFixture() {
  const db = initializePro(emptyReviewDatabase())
  db.pro!.clockMode = "test"
  const week = weekStart(db.pro!.clock), schedule = weekSchedule(week, 7)
  const old = db.pro!.cases.find(c => c.reviewId === "review-pro-overdue")!
  const common = structuredClone(db.reviews.find(r => r.id === old.reviewId)!)
  const record = structuredClone(db.records.find(r => r.reviewId === old.reviewId)!)
  const id = "review-qa-current"
  db.reviews.push({...common,id,sourceWorkbookId:id,bookTitle:"이번 주 함께 읽는 책",progress:"first-submitted",createdAt:"2026-10-07T03:00:00.000Z"})
  db.records.push({...record,id:`${id}-r1`,reviewId:id,submittedAt:"2026-10-07T03:00:00.000Z",savedAt:undefined,feedbackStatus:"작성전",feedback:"",history:[],aiHistory:[],aiUsed:0})
  db.pro!.cases.push({...structuredClone(old),reviewId:id,week,cutoff:schedule.cutoff,due:schedule.due,selection:"student",selectedAt:"2026-10-07T03:01:00.000Z",lockedAt:undefined})
  return reconcilePro(db)
}
test("학생 단위로 이전 주와 이번 주 피드백을 합치고 차수별 집계는 중복하지 않음", () => {
  const db = mixedWeeklyFixture(), pro = db.pro!, week = weekStart(pro.clock)
  const row = weeklyStudent(db,pro.members.find(m => m.id === "pro-demo-4")!,week)
  const books = weeklyTaskBooks(row,week,pro.clock,null)
  assert.equal(books.feedback.length,2)
  assert.equal(row.submissions.length,1)
  assert.equal(row.tasks[0],1); assert.equal(row.tasks[1],1)
  assert.equal(books.feedback[0].record.id,"review-pro-overdue-r1")
  assert.equal(feedbackActionLabel(books.feedback[0].record),"피드백 확인")
  assert.equal(feedbackActionLabel(books.feedback[1].record),"피드백 작성")
  assert.deepEqual(weeklyTaskBooks(row,week,pro.clock,0).feedback.map(f => f.record.id),["review-pro-overdue-r1"])
  assert.deepEqual(weeklyTaskBooks(row,week,pro.clock,1).feedback.map(f => f.record.id),["review-qa-current-r1"])
  assert.equal(weeklyTaskBooks(row,week,pro.clock,4).feedback.length,0)
})
test("한 건 전송 후 해당 차수만 빠지고 다른 미완료 건·원래 귀속·기한 유지", () => {
  let db = mixedWeeklyFixture()
  const pro = db.pro!, member = pro.members.find(m => m.id === "pro-demo-4")!, week = weekStart(pro.clock)
  const before = structuredClone(pro.cases.filter(c => c.studentId === member.id))
  const counts = proTasks(db).counts
  db = applyManagedReviewCommand(db,{type:"send",recordId:"review-pro-overdue-r1"},{role:"agency",institutionId:"dokdo",name:"분리 검증"},"qa-send-one",pro.clock)
  const row = weeklyStudent(db,member,week)
  assert.deepEqual(weeklyTaskBooks(row,week,pro.clock,null).feedback.map(f => f.record.id),["review-qa-current-r1"])
  assert.equal(proTasks(db).counts[0],counts[0]-1); assert.equal(proTasks(db).counts[1],counts[1])
  assert.equal(proUsage(db.pro!,member,pro.clock).used,1); assert.equal(proUsage(db.pro!,member,pro.clock).pending,1)
  for (const prior of before) {
    const after = db.pro!.cases.find(c => c.reviewId === prior.reviewId)!
    assert.deepEqual([after.month,after.week,after.due,after.cutoff],[prior.month,prior.week,prior.due,prior.cutoff])
  }
})
test("월요일 처리 기한인 이전 귀속 주의 글도 이번 주 피드백에 집계", () => {
  const db = mixedWeeklyFixture(), pro = db.pro!, week = weekStart(pro.clock)
  const old = pro.cases.find(c => c.reviewId === "review-pro-overdue")!
  old.due = "2026-10-05T14:59:59.999Z"
  pro.clock = "2026-10-05T01:00:00.000Z"
  const row = weeklyStudent(db,pro.members.find(m => m.id === old.studentId)!,week)
  assert.ok(weeklyTaskBooks(row,week,pro.clock,1).feedback.some(f => f.c.reviewId === old.reviewId))
  assert.equal(row.tasks[0],0)
})
