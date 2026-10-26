import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node native TS tests require explicit extensions.
import { assignWorkbookDisplayNumbers, withWorkbookDisplayNumbers } from "../src/lib/workbook-display-numbers.ts"

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

test("공용 번호표가 있으면 브라우저의 서로 다른 기존 번호를 읽거나 덮어쓰지 않는다", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} })
    const rows = [{ id: "waiting" }, { id: "failed" }]
    const shared = { waiting: "50086", failed: "50085" }
    for (const browserNumbers of [{ waiting: "50068", failed: "50067" }, { waiting: "50086", failed: "50085" }, {}]) {
      let reads = 0, writes = 0
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
        getItem: () => { reads++; return JSON.stringify(browserNumbers) },
        setItem: () => { writes++ },
      } })
      assert.deepEqual(withWorkbookDisplayNumbers(rows, [], shared), [{ id: "waiting", displayNumber: "50086" }, { id: "failed", displayNumber: "50085" }])
      assert.equal(reads, 0)
      assert.equal(writes, 0)
    }
    assert.deepEqual(shared, { waiting: "50086", failed: "50085" })
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
    else Reflect.deleteProperty(globalThis, "window")
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage)
    else Reflect.deleteProperty(globalThis, "localStorage")
  }
})
