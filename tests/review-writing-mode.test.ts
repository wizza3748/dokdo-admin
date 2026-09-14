import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node's native TypeScript tests require explicit extensions.
import { reviewActivityDate, reviewWritingMode, type ReviewTemplate } from "../src/lib/review-domain.ts"

const template: ReviewTemplate = { id: "20", title: "예술로 느껴봐요", items: [], reportEnabled: false, rewriteGuide: "하나의 글로 완성해 보세요." }
test("보기 모드는 고쳐쓰기 편집 여부가 아니라 템플릿 스냅샷을 따른다", () => {
  assert.equal(reviewWritingMode({ ...template, rewriteMode: "items" }), "items")
  assert.equal(reviewWritingMode({ ...template, rewriteMode: "continuous", rewriteGuide: "항목별 안내" }), "continuous")
})
test("이전 스냅샷은 안내 또는 연결된 템플릿으로 복원하며 원본을 바꾸지 않는다", () => {
  const original = structuredClone(template)
  assert.equal(reviewWritingMode(template), "continuous")
  assert.equal(reviewWritingMode({ ...template, rewriteGuide: "항목별로 모아 보여줍니다." }), "items")
  assert.equal(reviewWritingMode({ ...template, rewriteGuide: "" }, "continuous"), "continuous")
  assert.deepEqual(template, original)
})
test("온라인 독후감 목록 월은 서울 기준 생성 날짜를 따른다", () => {
  assert.deepEqual(reviewActivityDate({ createdAt: "2026-08-31T16:00:00.000Z", month: "2026-08" }), {
    year: 2026,
    month: 9,
    day: 1,
    monthKey: "2026-09",
  })
  assert.deepEqual(reviewActivityDate({ createdAt: "invalid", month: "2026-07" }), {
    year: 2026,
    month: 7,
    day: 1,
    monthKey: "2026-07",
  })
})
