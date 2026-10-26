import { test } from "node:test"
import assert from "node:assert/strict"
import type { ReviewDatabase, ReviewRecord } from "../src/lib/review-domain"
// @ts-expect-error Node native TS tests use explicit extensions.
import { PrototypeStore } from "../src/lib/prototype-store.ts"
// @ts-expect-error Node native TS tests use explicit extensions.
import { withSharedWorkbookDisplayNumbers } from "../src/lib/workbook-display-number-server.ts"

function fixture() {
  const values = new Map<string, { payload: string; digest: string }>()
  const writtenKeys: string[] = []
  let conflicts = 0
  const sql = async (query: string, parameters: unknown[]) => {
    const [key, first, second, third] = parameters.map(String)
    const current = values.get(key)
    if (query.startsWith("SELECT")) return current ? [{ digest: current.digest, payload: current.digest === first ? null : current.payload }] : []
    if (query.startsWith("INSERT") && !current) {
      values.set(key, { payload: first, digest: second }); writtenKeys.push(key); return [{ key }]
    }
    if (query.startsWith("UPDATE") && current?.digest === first) {
      values.set(key, { payload: second, digest: third }); writtenKeys.push(key); return [{ key }]
    }
    conflicts++
    return []
  }
  const env = { DOKDO_STATE_PROVIDER: "neon", DATABASE_URL: "postgresql://test:fixture-only@example.neon.tech/test", VERCEL: "1", DOKDO_STATE_NAMESPACE: "test-production" }
  return { values, writtenKeys, conflicts: () => conflicts, store: () => new PrototypeStore({ sql, env }) }
}
const database = (...ids: string[]): ReviewDatabase => ({ version: 1, reviews: [], records: ids.map(id => ({ id } as ReviewRecord)) })

test("번호표는 서버에 유지되며 브라우저·서버 인스턴스·레코드 순서와 무관하게 일치", async () => {
  const f = fixture(), full = database("waiting", "failed", "other")
  const first = await withSharedWorkbookDisplayNumbers(full, full, ["50000", "42784"], f.store())
  const reverse = { ...full, records: [...full.records].reverse() }
  const second = await withSharedWorkbookDisplayNumbers(reverse, reverse, ["42784", "50000"], f.store())
  assert.deepEqual(second.displayNumbers, first.displayNumbers)
  assert.equal(first.displayNumbers!["50000"], "50000")
  assert.equal(first.displayNumbers!["42784"], "42784")
  assert.equal(new Set(Object.values(first.displayNumbers!)).size, 5)
  assert.equal(f.writtenKeys.length, 1, "후속 조회는 저장값을 다시 쓰지 않음")
})

test("기존 공용 글·피드백·전용 테스트 결과는 변경하지 않고 번호표만 별도 저장", async () => {
  const f = fixture(), store = f.store(), full = database("waiting", "failed")
  await store.importIfEmpty("online-reviews", { ...full, custom: "작성 글과 피드백" })
  await store.importIfEmpty("student-test-owner-a", { result: "신청 결과" })
  await store.importIfEmpty("student-test-owner-b", { result: "다른 사람 결과" })
  const beforeValues = new Map(f.values), beforeFull = structuredClone(full)
  const result = await withSharedWorkbookDisplayNumbers(full, full, [], store)
  assert.deepEqual(full, beforeFull)
  assert.equal(result.records, full.records)
  assert.equal(result.reviews, full.reviews)
  for (const [key, value] of beforeValues) assert.deepEqual(f.values.get(key), value)
  assert.deepEqual(f.writtenKeys.slice(3), [store.key("workbook-display-numbers-v2")])
})

test("추가·필터·예시 초기화 후 재생성에도 이미 발급된 번호는 유지하고 숨겨진 기관 ID는 노출하지 않음", async () => {
  const f = fixture(), full = database("waiting", "hidden-other-agency")
  const first = await withSharedWorkbookDisplayNumbers(full, database("waiting"), [], f.store())
  assert.deepEqual(Object.keys(first.displayNumbers!), ["waiting"])
  const filtered = await withSharedWorkbookDisplayNumbers(database("new"), database("new"), [], f.store())
  const restored = await withSharedWorkbookDisplayNumbers(database("new", "waiting"), database("waiting", "new"), [], f.store())
  assert.equal(restored.displayNumbers!.waiting, first.displayNumbers!.waiting)
  assert.equal(restored.displayNumbers!.new, filtered.displayNumbers!.new)
  assert.notEqual(restored.displayNumbers!.new, restored.displayNumbers!.waiting)
})

test("서로 다른 서버의 동시 번호 발급도 유실·중복 없이 보존", async () => {
  const f = fixture(), first = database("first"), second = database("second")
  const [a, b] = await Promise.all([
    withSharedWorkbookDisplayNumbers(first, first, [], f.store()),
    withSharedWorkbookDisplayNumbers(second, second, [], f.store()),
  ])
  const all = database("first", "second")
  const result = await withSharedWorkbookDisplayNumbers(all, all, [], f.store())
  assert.equal(result.displayNumbers!.first, a.displayNumbers!.first)
  assert.equal(result.displayNumbers!.second, b.displayNumbers!.second)
  assert.notEqual(result.displayNumbers!.first, result.displayNumbers!.second)
  assert.ok(f.conflicts() > 0)
})
