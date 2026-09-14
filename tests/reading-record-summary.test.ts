import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node type stripping requires the explicit .ts extension.
import { latestDailyReadingRecords, readingRecordActivityTimestamp, sortExplorationTimelineItems } from "../src/lib/reading-record-summary.ts"

const row = (id: string, overrides = {}) => ({ id, workbookId: "reading-601-round-1", year: 2026, month: 9, day: 2, questions: "6/6", ...overrides })

test("같은 날 같은 책·회차의 첫 탐험/재탐험은 최근 결과 한 건만 표시한다", () => {
  const input = [row("latest", { questions: "5/6", attempt: "재탐험" }), row("older", { attempt: "재탐험" }), row("first", { attempt: "첫 탐험" })]
  const before = structuredClone(input)
  assert.deepEqual(latestDailyReadingRecords(input), [input[0]])
  assert.deepEqual(input, before, "원본 풀이 이력은 삭제하지 않는다")
})

test("다른 날짜·책·회차는 별도 기록을 유지한다", () => {
  const input = [row("today"), row("round2", { workbookId: "reading-601-round-2" }), row("other-book", { workbookId: "reading-576-round-1" }), row("yesterday", { day: 1 }), row("other-month", { month: 8 }), row("other-year", { year: 2025 })]
  assert.deepEqual(latestDailyReadingRecords(input), input)
  assert.deepEqual(latestDailyReadingRecords([]), [])
})

test("새 책 읽기 기록은 명시 시각을 사용하고 이전 기록은 id에서 시각을 복구한다", () => {
  assert.equal(readingRecordActivityTimestamp(row("live-reading-601-1788836400000-1", { occurredAt: "2026-09-08T05:00:00.000Z" })), Date.parse("2026-09-08T05:00:00.000Z"))
  assert.equal(readingRecordActivityTimestamp(row("live-reading-601-1788836400000-1")), 1788836400000)
})

test("같은 날짜의 전체 탐험 기록은 최신 활동순이며 같은 독후감은 2차가 먼저다", () => {
  const input = [
    { id: "review-first", activityAt: 100, sourceOrder: 0, reviewId: "review-a", round: 1 as const },
    { id: "review-second", activityAt: 100, sourceOrder: 1, reviewId: "review-a", round: 2 as const },
    { id: "latest-reading", activityAt: 200, sourceOrder: 2 },
  ]
  assert.deepEqual(sortExplorationTimelineItems(input).map(item => item.id), ["latest-reading", "review-second", "review-first"])
})
