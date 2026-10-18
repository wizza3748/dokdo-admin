import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources.
import { resetTodayProDemo, TODAY_DEMO_IDS } from "../src/lib/pro-today-demo.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { applyManagedReviewCommand, proUsage } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { weeklyRecord } from "../src/lib/pro-weekly-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { proStatuses, taskLabels, weeklyStudent, weeklyTaskBooks, proTasks } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { addDays, weekStart } from "../src/lib/pro-calendar.ts"

const now = "2026-10-13T05:00:00.000Z", week = weekStart(now)
const fixture = () => resetTodayProDemo(initializePro(emptyReviewDatabase()), now)
const teacher = { role: "agency" as const, institutionId: "dokdo", name: "범례 검증" }

test("2차만 제출한 주도 제출 완료, 2차 전송 후에는 피드백 전송으로 표시", () => {
  let db = fixture()
  const member = db.pro!.members.find(m => m.id === "pro-demo-second")!
  const recordId = "review-pro-today-second-r2"
  const before = weeklyRecord(db, member, week, now)
  assert.equal(before.label, "제출 완료")
  assert.equal(before.submitted, 1)
  assert.equal(before.sent, 0)
  const usage = proUsage(db.pro!, member, now)
  const items = db.records.find(r => r.id === recordId)!.itemFeedback.map(item => ({ ...item, visible: false }))
  db = applyManagedReviewCommand(db, { type: "save-feedback", recordId, feedback: "생각을 잘 정리했어요.", items, decision: "complete" }, teacher, "legend-save", now)
  db = applyManagedReviewCommand(db, { type: "send", recordId }, teacher, "legend-send", now)
  const info = weeklyRecord(db, member, week, now)
  assert.equal(info.firstSent, 0)
  assert.equal(info.secondSent, 1)
  assert.equal(info.sent, 1)
  assert.equal(info.submitted, 1)
  assert.equal(info.label, "피드백 전송")
  assert.equal(info.current, true)
  const prior = weeklyRecord(db, member, addDays(week, -7), now)
  assert.equal(prior.firstSent, 1)
  assert.equal(prior.secondSent, 0)
  assert.equal(prior.label, "피드백 전송")
  const future = addDays(now, 7)
  assert.equal(weeklyRecord(db, member, week, future).label, "피드백 전송")
  assert.deepEqual(proUsage(db.pro!, member, now), usage, "2차 전송으로 권수를 추가 차감하지 않음")
  db.pro!.clock = future
  assert.equal(weeklyStudent(db, member, weekStart(future)).missed, 0, "2차 제출이 있는 주는 연속 미제출에서도 제외")
})

test("1차·2차 제출을 합산하되 같은 차수의 중복 레코드는 한 건만 집계", () => {
  const db = fixture(), member = db.pro!.members.find(m => m.id === "pro-demo-second")!
  const secondCase = db.pro!.cases.find(c => c.reviewId === "review-pro-today-second")!
  secondCase.week = week
  const second = db.records.find(r => r.id === "review-pro-today-second-r2")!
  db.records.push({ ...second, id: `${second.id}-duplicate` })
  const info = weeklyRecord(db, member, week, now)
  assert.equal(info.submitted, 2)
  assert.equal(info.sent, 1)
  assert.equal(info.label, "피드백 전송", "기존 전송 기록 우선 표시 유지, 전체 처리 완료를 의미하지 않음")
})

test("2차 초안·반려·미래 제출은 제출 완료 표시와 건수에서 제외", () => {
  for (const state of ["writing", "rejected", "future"] as const) {
    let db = fixture()
    const member = db.pro!.members.find(m => m.id === "pro-demo-second")!
    const second = db.records.find(r => r.id === "review-pro-today-second-r2")!
    if (state === "future") second.submittedAt = addDays(now, 1)
    else if (state === "rejected") db = applyManagedReviewCommand(db, { type: "reject", recordId: second.id }, teacher, "legend-reject", now)
    else second.writingStatus = state
    const info = weeklyRecord(db, member, week, now)
    assert.equal(info.label, "-", state)
    assert.equal(info.submitted, 0, state)
    assert.equal(info.sent, 0, state)
  }
})

test("2차 제출만 있는 주는 다음 주에도 미제출로 바뀌지 않음", () => {
  const db = fixture(), member = db.pro!.members.find(m => m.id === "pro-demo-second")!
  const info = weeklyRecord(db, member, week, addDays(now, 7))
  assert.equal(info.label, "제출 완료")
  assert.equal(info.submitted, 1)
  assert.equal(info.current, false)
})

test("다음 관리월의 2차 기록을 표시해도 원래 월·주차·기한과 데이터는 변경하지 않음", () => {
  const db = fixture(), member = db.pro!.members.find(m => m.id === "pro-demo-second")!
  const c = db.pro!.cases.find(c => c.reviewId === "review-pro-today-second")!
  const second = db.records.find(r => r.id === "review-pro-today-second-r2")!
  const nextMonth = "2026-11-01T15:00:00.000Z"
  c.secondWeek = nextMonth
  second.submittedAt = nextMonth
  const snapshot = JSON.stringify(db)
  const info = weeklyRecord(db, member, nextMonth, addDays(nextMonth, 1))
  assert.equal(info.label, "제출 완료")
  assert.equal(info.submitted, 1)
  assert.equal(weeklyRecord(db, member, week, now).submitted, 0)
  assert.equal(JSON.stringify(db), snapshot)
})

test("지연 전송해도 1차 원래 주차 유지, 미래 전송은 과거 실적에서 제외", () => {
  let db = fixture()
  const member = db.pro!.members.find(m => m.id === "pro-demo-4")!
  const original = db.pro!.cases.find(c => c.reviewId === "review-pro-today-overdue")!
  const before = [original.week, original.month, original.due]
  db = applyManagedReviewCommand(db, { type: "send", recordId: "review-pro-today-overdue-r1" }, teacher, "legend-late-send", now)
  assert.equal(weeklyRecord(db, member, addDays(week,-7), now).firstSent, 1)
  assert.equal(weeklyRecord(db, member, week, now).firstSent, 0)
  const past = weeklyRecord(db, member, addDays(week,-7), new Date(Date.parse(week)-1).toISOString(), now)
  assert.equal(past.firstSent, 0)
  assert.equal(past.label, "제출 완료")
  assert.equal(past.current, false, "과거 조회 주를 현재 주 테두리로 표시하지 않음")
  const after = db.pro!.cases.find(c => c.reviewId === original.reviewId)!
  assert.deepEqual([after.week, after.month, after.due], before)
})

test("오늘 할 일 7종은 작업 단위, 상태 필터는 전체 + 대표 상태 7종이며 학생 중복 없음", () => {
  const db = fixture(), rows = db.pro!.members.filter(m => TODAY_DEMO_IDS.includes(m.id)).map(m => weeklyStudent(db,m,week))
  assert.deepEqual(taskLabels, ["지연된 피드백", "이번 주 피드백", "1차 제출 독려", "2차 제출 독려", "상담 필요", "이번 달 상담 미완료", "이번 달 소멸 예정"])
  assert.deepEqual(["전체", ...proStatuses], ["전체", "지연", "피드백 필요", "미제출", "2차 대기", "자동 선정 대기", "관리 완료", "한도 사용"])
  const buckets = proStatuses.map(status => rows.filter(r => r.status === status))
  assert.equal(buckets.flat().length, rows.length)
  assert.equal(new Set(buckets.flat().map(r => r.member.id)).size, rows.length)
  assert.deepEqual(proTasks(db).counts, taskLabels.map((_,i) => rows.reduce((sum,r) => sum+r.tasks[i],0)))
  for (const row of rows) {
    const delayed = weeklyTaskBooks(row, week, now, 0).feedback
    const upcoming = weeklyTaskBooks(row, week, now, 1).feedback
    assert.equal(delayed.length, row.tasks[0])
    assert.equal(upcoming.length, row.tasks[1])
    assert.ok(delayed.every(f => !upcoming.some(next => next.record.id === f.record.id)))
    for (const index of [2,3,4,5,6]) assert.ok(row.tasks[index] === 0 || row.tasks[index] === 1)
  }
  assert.ok(rows.some(r => r.tasks[1] > 0 && r.tasks[4] > 0), "다른 종류의 작업이 있으면 같은 학생이 각 할 일에 포함될 수 있음")
})
