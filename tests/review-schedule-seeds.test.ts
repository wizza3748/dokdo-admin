import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyReviewDatabase } from "../src/lib/review-domain"
import { initializePro } from "../src/lib/pro-seeds"
import { FEEDBACK_SCHEDULE_EXAMPLES, ensureLocalFeedbackScheduleExamples, localFeedbackScheduleExamplesEnabled, resetLocalFeedbackScheduleExamples } from "../src/lib/review-schedule-seeds"
import { resetTodayProDemo } from "../src/lib/pro-today-demo"
import { readFileSync } from "node:fs"
import { activeFeedbackSchedule } from "../src/lib/review-schedule"
import { applyManagedReviewCommand, claimDueFeedbackSchedules, executeFeedbackSchedule, proUsage } from "../src/lib/pro-domain"
import { reviewListRows } from "../src/lib/review-list-adapter"
import { weeklyStudent, weeklyTaskBooks } from "../src/lib/pro-selectors"
import { weekStart } from "../src/lib/pro-calendar"
import { atReviewTime } from "../src/lib/review-clock"
import { newStudentTestSession } from "../src/lib/student-test-store"

const now = "2026-10-26T04:00:00.000Z"
const env = { NODE_ENV: "development", DOKDO_STATE_PROVIDER: "local" }
const baseline = () => initializePro(emptyReviewDatabase())
const examples = (at = now) => ensureLocalFeedbackScheduleExamples(baseline(), at, env)
const recordId = (index: number) => `review-${FEEDBACK_SCHEDULE_EXAMPLES[index].id}-r1`

test("공용 예약 예시는 로컬 개발에서만 추가하며 운영·원격 저장소·지정일 상태는 보존", () => {
  assert.equal(localFeedbackScheduleExamplesEnabled(env), true)
  for (const disabled of [{ NODE_ENV: "test" }, { NODE_ENV: "production" }, { ...env, VERCEL: "1" },
    { ...env, DOKDO_STATE_PROVIDER: "neon" }, { ...env, DOKDO_STATE_PROVIDER: "redis" }, { ...env, UPSTASH_REDIS_REST_URL: "https://example.test" }]) {
    const db = baseline()
    assert.strictEqual(ensureLocalFeedbackScheduleExamples(db, now, disabled), db)
  }
  const db = baseline(); db.pro!.clockMode = "test"
  assert.strictEqual(ensureLocalFeedbackScheduleExamples(db, now, env), db)
})

test("예약 대기·실패 2건만 추가하고 기존 공용 데이터의 내용·순서·날짜를 모두 보존", () => {
  const original = baseline(), before = structuredClone(original)
  const result = ensureLocalFeedbackScheduleExamples(original, now, env)
  assert.deepEqual(original, before)
  assert.equal(result.reviews.length, before.reviews.length + 2)
  assert.equal(result.records.length, before.records.length + 2)
  assert.deepEqual(result.reviews.slice(0, before.reviews.length), before.reviews)
  assert.deepEqual(result.records.slice(0, before.records.length), before.records)
  for (const [key, value] of Object.entries(before.pro!)) {
    const actual = result.pro![key as keyof NonNullable<typeof result.pro>]
    assert.deepEqual(Array.isArray(value) ? (actual as unknown[]).slice(0, value.length) : actual, value, key)
  }
  assert.strictEqual(ensureLocalFeedbackScheduleExamples(result, "2026-10-27T06:00:00.000Z", env), result)
})

test("실제 도서·회차·양식과 저장 피드백·신청·권수·예약·실패 이력이 연결됨", () => {
  const db = atReviewTime(examples(), now)
  for (const [index, example] of FEEDBACK_SCHEDULE_EXAMPLES.entries()) {
    const review = db.reviews.find(r => r.studentId === example.id)!
    const record = db.records.find(r => r.id === recordId(index))!
    const member = db.pro!.members.find(m => m.id === example.id)!
    const c = db.pro!.cases.find(c => c.reviewId === review.id)!
    const schedule = activeFeedbackSchedule(record)!
    assert.equal(review.sourceBookId, example.bookId)
    assert.equal(review.sourceReadingRound, index === 0 ? 1 : 2)
    assert.equal(review.template.id, "56")
    assert.equal(review.level, member.level)
    assert.ok(review.bookCoverSrc)
    assert.equal(record.feedbackStatus, "작성완료")
    assert.equal(record.sentAt, undefined)
    assert.equal(c.closedAt, undefined)
    assert.equal(c.parent.status, "none")
    assert.equal(proUsage(db.pro!, member, now).used, 0)
    assert.equal(proUsage(db.pro!, member, now).pending, 1)
    assert.equal(schedule.status, example.status)
    assert.deepEqual(schedule.events.map(e => e.action), index === 0 ? ["registered"] : ["registered", "claimed", "failed"])
    assert.equal(schedule.snapshot.feedback, record.feedback)
    if (index === 0) assert.equal(schedule.scheduledAt, "2026-10-27T09:00:00.000Z")
    else {
      assert.match(schedule.failureReason!, /목 데이터 검증용/)
      assert.ok(db.pro!.audit.some(a => a.reviewId === review.id && a.kind === "예약 전송 실패"))
    }
    assert.equal(reviewListRows(db).find(r => r.id === record.id)!.feedbackSchedule!.status, example.status)
    const weekly = weeklyStudent(db, member, weekStart(now))
    const item = weeklyTaskBooks(weekly, weekStart(now), weekly.asOf, null).feedback.find(f => f.record.id === record.id)!
    assert.ok(item)
    assert.equal(activeFeedbackSchedule(item.record)!.status, example.status)
  }
})

test("취소·전송 이후 재조회해도 예시를 다시 만들거나 예약 시각을 갱신하지 않음", () => {
  let db = examples()
  const waiting = activeFeedbackSchedule(db.records.find(r => r.id === recordId(0)))!
  db = executeFeedbackSchedule(claimDueFeedbackSchedules(db, waiting.scheduledAt), recordId(0), waiting.id, waiting.scheduledAt)
  assert.equal(db.records.find(r => r.id === recordId(0))!.feedbackStatus, "전송완료")
  const failed = activeFeedbackSchedule(db.records.find(r => r.id === recordId(1)))!
  db = applyManagedReviewCommand(db, { type: "cancel-feedback-schedule", recordId: recordId(1), scheduleId: failed.id },
    { role: "agency", institutionId: "dokdo", name: "검증" }, "cancel-seed", waiting.scheduledAt)
  assert.strictEqual(ensureLocalFeedbackScheduleExamples(db, "2026-10-28T00:00:00.000Z", env), db)
  assert.equal(activeFeedbackSchedule(db.records.find(r => r.id === recordId(1))), undefined)
})

test("주말·월초·연초에도 기존 기관 요일 정책에 따라 유효한 예시 생성", () => {
  for (const at of ["2026-10-25T14:59:00.000Z", "2026-10-25T15:00:00.000Z", "2026-11-01T15:01:00.000Z", "2026-12-31T15:00:00.000Z"]) {
    const db = examples(at)
    assert.equal(activeFeedbackSchedule(db.records.find(r => r.id === recordId(0)))!.status, "waiting")
    assert.equal(activeFeedbackSchedule(db.records.find(r => r.id === recordId(1)))!.status, "failed")
  }
})

test("기존 식별자가 일부라도 존재하면 해당 예시는 덮어쓰거나 불완전하게 추가하지 않음", () => {
  const db = baseline()
  db.pro!.members.push({ ...db.pro!.members[0], id: FEEDBACK_SCHEDULE_EXAMPLES[0].id, name: "사용자가 수정한 이름" })
  const result = ensureLocalFeedbackScheduleExamples(db, now, env)
  assert.equal(result.pro!.members.find(m => m.id === FEEDBACK_SCHEDULE_EXAMPLES[0].id)!.name, "사용자가 수정한 이름")
  assert.equal(result.records.some(r => r.id === recordId(0)), false)
  assert.equal(result.records.length, db.records.length + 1)
})

test("브라우저 전용 테스트 결과는 공용 예시 추가와 독립적으로 유지", () => {
  const session = newStudentTestSession("schedule-first", now), before = structuredClone(session)
  const db = examples()
  assert.deepEqual(session, before)
  assert.ok(db.reviews.every(r => r.studentId !== session.db.pro!.members[0].id))
})

test("명시적 예시 초기화는 예약 대기·실패를 복원하고 다른 학생 결과는 보존", () => {
  let db = examples()
  const waiting = activeFeedbackSchedule(db.records.find(record => record.id === recordId(0)))!
  db = executeFeedbackSchedule(claimDueFeedbackSchedules(db, waiting.scheduledAt), recordId(0), waiting.id, waiting.scheduledAt)
  const failed = activeFeedbackSchedule(db.records.find(record => record.id === recordId(1)))!
  db = applyManagedReviewCommand(db, { type: "cancel-feedback-schedule", recordId: recordId(1), scheduleId: failed.id },
    { role: "agency", institutionId: "dokdo", name: "검증" }, "cancel-before-reset", waiting.scheduledAt)
  const before = structuredClone(db), nextDay = "2026-10-28T04:00:00.000Z"
  const reset = resetLocalFeedbackScheduleExamples(db, nextDay, env)
  assert.deepEqual(db, before)
  for (const [index, example] of FEEDBACK_SCHEDULE_EXAMPLES.entries()) {
    const record = reset.records.find(item => item.id === recordId(index))!
    assert.equal(record.feedbackStatus, "작성완료")
    assert.equal(record.sentAt, undefined)
    assert.equal(record.feedbackSchedules!.length, 1)
    assert.equal(activeFeedbackSchedule(record)!.status, example.status)
  }
  assert.equal(activeFeedbackSchedule(reset.records.find(record => record.id === recordId(0)))!.scheduledAt, "2026-10-29T09:00:00.000Z")
  const ids = new Set<string>(FEEDBACK_SCHEDULE_EXAMPLES.map(example => example.id))
  const otherReviews = before.reviews.filter(review => !ids.has(review.studentId))
  const otherReviewIds = new Set(otherReviews.map(review => review.id))
  assert.deepEqual(reset.reviews.filter(review => otherReviewIds.has(review.id)), otherReviews)
  assert.deepEqual(reset.records.filter(record => otherReviewIds.has(record.reviewId)), before.records.filter(record => otherReviewIds.has(record.reviewId)))
  const excludeExamples = (items: readonly { id?: string; studentId?: string }[]) => items.filter(item => !ids.has(item.studentId ?? item.id ?? ""))
  for (const key of ["members", "cases", "audit", "reminders", "consultations", "reminderSnapshots"] as const) {
    assert.deepEqual(excludeExamples(reset.pro![key]), excludeExamples(before.pro![key]))
  }
  assert.deepEqual(reset.pro!.schedules, before.pro!.schedules)
  assert.strictEqual(ensureLocalFeedbackScheduleExamples(reset, nextDay, env), reset)
  assert.strictEqual(resetLocalFeedbackScheduleExamples(db, nextDay, { NODE_ENV: "production" }), db)
  const combined = resetLocalFeedbackScheduleExamples(resetTodayProDemo(db, nextDay), nextDay, env)
  assert.equal(activeFeedbackSchedule(combined.records.find(record => record.id === recordId(0)))!.status, "waiting")
  const route = readFileSync("src/app/api/mock/pro-demo/route.ts", "utf8")
  assert.match(route, /resetLocalFeedbackScheduleExamples\(resetTodayProDemo\(initializePro\(state\), now\), now, process\.env\)/)
})
