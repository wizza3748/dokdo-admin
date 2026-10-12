import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TS directly.
import { ensureProAttentionExamples, PRO_ATTENTION_EXAMPLES } from "../src/lib/pro-attention-seeds.ts"
// @ts-expect-error Node tests load TS directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TS directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TS directly.
import { atReviewTime } from "../src/lib/review-clock.ts"
// @ts-expect-error Node tests load TS directly.
import { applyManagedReviewCommand, reconcilePro } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TS directly.
import { weeklyStudent, scopePro } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TS directly.
import { addDays, managementMonth, midnight, weekStart } from "../src/lib/pro-calendar.ts"

const now = "2026-10-08T06:00:00.000Z"
const fixture = () => reconcilePro(atReviewTime(ensureProAttentionExamples(initializePro(emptyReviewDatabase()), now), now))
const row = (db: ReturnType<typeof fixture>, id: string, week = weekStart(db.pro!.clock)) => weeklyStudent(db, db.pro!.members.find(m => m.id === id)!, week)

test("기존 프로·일반 학생과 이력·시각을 보존하며 예시 2명만 추가", () => {
  const original = initializePro(emptyReviewDatabase()), before = structuredClone(original)
  original.pro!.clock = "2027-01-01T00:00:00.000Z"
  before.pro!.clock = original.pro!.clock
  const next = ensureProAttentionExamples(original, now)
  assert.deepEqual(original, before)
  assert.deepEqual(next.pro, { ...before.pro, members: [...before.pro!.members, ...next.pro!.members.slice(-2)] })
  assert.deepEqual(next.reviews.slice(0, before.reviews.length), before.reviews)
  assert.deepEqual(next.records.slice(0, before.records.length), before.records)
  assert.equal(next.reviews.length, before.reviews.length + 2)
  assert.equal(next.pro!.members.at(-2)!.assignedAt, midnight("2026-09-21"))
  assert.equal(next.pro!.members.at(-1)!.assignedAt, midnight("2026-09-14"))
  assert.equal(ensureProAttentionExamples(next, addDays(now, 7)), next)
})

test("실제 오늘에 2주·3주 미제출 예시, 초안은 배지를 해제하지 않음", () => {
  const db = fixture()
  for (const example of PRO_ATTENTION_EXAMPLES) {
    assert.equal(row(db, example.id).missed, example.weeks)
    assert.equal(row(db, example.id).submissions.length, 0)
    assert.equal(db.records.find(r => r.reviewId === `review-${example.id}`)!.writingStatus, "writing")
  }
  assert.ok(scopePro(db.pro!, "dokdo").members.some(m => m.id === "pro-demo-attention"))
  assert.ok(!scopePro(db.pro!, "other-agency").members.some(m => m.id === "pro-demo-attention"))
})

for (const example of PRO_ATTENTION_EXAMPLES) test(`${example.weeks}주 미제출: 1차 제출 즉시 해제·재조회 유지·과거 주차 보존`, () => {
  let db = fixture()
  const actor = { role: "student" as const, studentId: example.id, name: example.name }
  db = applyManagedReviewCommand(db, { type: "submit", recordId: `review-${example.id}-r1` }, actor, `submit-${example.id}`, now)
  assert.equal(row(db, example.id).missed, 0)
  assert.equal(row(db, example.id).submissions.length, 1)
  assert.equal(row(db, example.id, midnight("2026-09-28")).missed, example.weeks - 1)
  const refreshed = reconcilePro(atReviewTime(ensureProAttentionExamples(db, addDays(now, 1)), addDays(now, 1)))
  assert.equal(row(refreshed, example.id).missed, 0)
  assert.equal(refreshed.pro!.members.filter(m => m.id === example.id).length, 1)
})

test("마감 후 다음 주로 귀속되는 1차 제출도 즉시 경고 해제", () => {
  const at = "2026-10-10T15:00:00.000Z", id = "pro-demo-hq-check"
  const db = applyManagedReviewCommand(fixture(), { type: "submit", recordId: `review-${id}-r1` }, { role: "student", studentId: id, name: "예시" }, "after-cutoff", at)
  assert.equal(row(db, id).submissions.length, 0)
  assert.equal(row(db, id).missed, 0)
  assert.equal(db.pro!.cases.find(c => c.studentId === id)!.week, midnight("2026-10-12"))
})

test("관리 시작 전과 월 한도 소진 주는 미제출 횟수에서 제외", () => {
  const db = fixture(), id = "pro-demo-hq-check", member = db.pro!.members.find(m => m.id === id)!
  member.limits["2026-09"] = 0
  assert.equal(row(db, id).missed, 1)
  member.limits["2026-10"] = 0
  assert.equal(row(db, id).missed, 0)
  member.limits = {}; member.assignedAt = weekStart(now)
  assert.equal(row(db, id).missed, 0)
})

test("2차 제출과 미래 제출은 1차 미제출 횟수를 해제하지 않음", () => {
  const db = fixture(), id = "pro-demo-hq-check", record = db.records.find(r => r.reviewId === `review-${id}`)!
  const reference = db.pro!.cases[0]
  db.pro!.cases.push({ ...reference, reviewId: record.reviewId, studentId: id, week: midnight("2026-09-28"), selectedAt: undefined, firstSentAt: undefined, closedAt: undefined })
  db.records.push({ ...record, id: `${record.id}-second-test`, round: 2, writingStatus: "submitted", submittedAt: now })
  assert.equal(row(db, id).missed, 3)
  record.writingStatus = "submitted"; record.submittedAt = addDays(now, 1)
  assert.equal(row(db, id).missed, 3)
})

test("월 변경에도 예시 기준일은 고정되고 월 귀속·횟수는 현재 주로 계산", () => {
  const db = fixture(), id = "pro-demo-hq-check", member = db.pro!.members.find(m => m.id === id)!
  const start = member.effectiveAt, at = midnight("2026-11-02")
  const next = reconcilePro(atReviewTime(ensureProAttentionExamples(db, at), at))
  assert.equal(next.pro!.members.find(m => m.id === id)!.effectiveAt, start)
  assert.equal(row(next, id).usage.month, managementMonth(at))
  assert.ok(row(next, id).missed > 3)
  assert.equal(next.pro!.clockMode, "real")
})

test("한국 월초 생성일을 사용하고 일부 예시가 이미 있으면 덮어쓰지 않음", () => {
  const first = ensureProAttentionExamples(initializePro(emptyReviewDatabase()), "2026-10-31T15:00:00.000Z")
  assert.equal(first.reviews.find(r => r.id === "review-pro-demo-attention")!.month, "2026-11")
  const member = first.pro!.members.find(m => m.id === "pro-demo-attention")!
  member.name = "사용자가 수정한 예시"
  first.pro!.members = first.pro!.members.filter(m => m.id !== "pro-demo-hq-check")
  first.reviews = first.reviews.filter(r => r.studentId !== "pro-demo-hq-check")
  first.records = first.records.filter(r => r.reviewId !== "review-pro-demo-hq-check")
  const next = ensureProAttentionExamples(first, now)
  assert.deepEqual(next.pro!.members.find(m => m.id === member.id), member)
  assert.equal(next.pro!.members.filter(m => m.id === "pro-demo-hq-check").length, 1)
})
