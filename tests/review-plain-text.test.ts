import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources directly.
import { plainReviewText } from "../src/lib/review-domain.ts"

test("아직 작성하지 않은 답변은 빈 글로 처리한다", () => {
  assert.equal(plainReviewText(undefined), "")
  assert.equal(plainReviewText(null), "")
  assert.equal(plainReviewText(""), "")
})

test("신규 독후감과 일부 항목만 작성한 독후감의 작성 수를 안전하게 계산한다", () => {
  const items = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }]
  const empty: Record<string, string> = {}
  const partial: Record<string, string> = { "2": "<p>저장된 생각</p>", "4": "<p>&nbsp;</p>" }
  const original = structuredClone(partial)

  assert.equal(items.filter(item => plainReviewText(empty[item.id])).length, 0)
  assert.equal(items.filter(item => plainReviewText(partial[item.id])).length, 1)
  assert.deepEqual(empty, {})
  assert.deepEqual(partial, original, "원본 답변과 누락된 항목을 변경하지 않는다")
})

test("기존 글의 HTML 서식과 엔티티 변환을 유지한다", () => {
  assert.equal(plainReviewText('<p>가&nbsp;나<br />다</p><div>&lt;글&gt; &quot;생각&quot; &#39;마음&#39; &amp;</div>'), '가 나\n다\n<글> "생각" \'마음\' &')
})
