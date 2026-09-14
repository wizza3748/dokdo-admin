import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node native TS tests require explicit extensions.
import { assignWorkbookDisplayNumbers } from "../src/lib/workbook-display-numbers.ts"

test("모든 고유번호는 중복 없는 숫자 5자리이고 차수별로 구분한다", () => {
  const ids = ["8", "42784", "50000", "review-demo-r1", "review-demo-r2"]
  const mapping = assignWorkbookDisplayNumbers(ids)
  assert.ok(Object.values(mapping).every(value => /^\d{5}$/.test(value)))
  assert.equal(new Set(Object.values(mapping)).size, ids.length)
  assert.equal(mapping["42784"], "42784")
  assert.equal(mapping["8"], "00008")
  assert.notEqual(mapping["review-demo-r1"], mapping["review-demo-r2"])
})
test("정렬·필터·새 레코드 추가 후 기존 표시 번호를 유지한다", () => {
  const ids = ["review-z-r1", "review-z-r2", "42784"]
  const mapping = assignWorkbookDisplayNumbers(ids)
  assert.deepEqual(assignWorkbookDisplayNumbers([...ids].reverse()), mapping)
  const updated = assignWorkbookDisplayNumbers(["review-a-r1", "review-z-r2"], mapping)
  for (const id of ids) assert.equal(updated[id], mapping[id])
  assert.equal(new Set(Object.values(updated)).size, Object.keys(updated).length)
})
