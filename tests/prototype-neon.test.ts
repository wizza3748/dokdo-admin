import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node's type stripping uses explicit .ts paths.
import { PrototypeStore } from "../src/lib/prototype-store.ts"

function fixture() {
  const values = new Map<string, { payload: string; digest: string }>()
  let conflicts = 0, bytes = 0, calls = 0
  const sql = async (query: string, parameters: unknown[]) => {
    calls++
    const [key, first, second, third] = parameters.map(String)
    const current = values.get(key)
    let rows: Record<string, unknown>[] = []
    if (query.startsWith("CREATE TABLE")) return rows
    if (query.startsWith("SELECT")) rows = current ? [{ digest: current.digest, payload: current.digest === first ? null : current.payload }] : []
    else if (query.startsWith("INSERT")) {
      if (!current) { values.set(key, { payload: first, digest: second }); rows = [{ key }] }
      else conflicts++
    } else if (query.startsWith("UPDATE")) {
      if (current?.digest === first) { values.set(key, { payload: second, digest: third }); rows = [{ key }] }
      else conflicts++
    } else throw new Error("Unexpected query")
    bytes += Buffer.byteLength(JSON.stringify(rows))
    return rows
  }
  const env = { DOKDO_STATE_PROVIDER: "neon", DATABASE_URL: "postgresql://test:fixture-only@example.neon.tech/test", VERCEL: "1", KV_REST_API_URL: "https://preserved-redis.test", KV_REST_API_TOKEN: "preserved-test" }
  const fetcher: typeof fetch = async () => { throw new Error("Neon 모드에서는 기존 Redis를 호출하면 안 됨") }
  return { env, sql, fetcher, values, bytes: () => bytes, calls: () => calls, conflicts: () => conflicts }
}

test("Neon 이전은 기존 키를 보존하고 동시 수정에도 내용이 유실되지 않음", async () => {
  const f = fixture(), first = new PrototypeStore(f), second = new PrototypeStore(f)
  await first.prepareNeon()
  assert.equal(await first.importIfEmpty("records", { count: 4 }), true)
  assert.equal(await first.importIfEmpty("records", { count: 0 }), false)
  await Promise.all([first, second].map(store => store.update("records", () => ({ count: 0 }), state => ({ count: state.count + 1 }))))
  assert.deepEqual(await second.read("records", () => null), { count: 6 })
  assert.ok(f.conflicts() > 0)
  const before = f.calls()
  await first.update("records", () => ({ count: 0 }), state => state)
  assert.equal(f.calls() - before, 1, "변경 없는 조회는 UPDATE하지 않음")
})

test("Neon 중복 조회 병합 및 변경 없는 응답은 본문 재전송 생략", async () => {
  const f = fixture(), store = new PrototypeStore(f), other = new PrototypeStore(f)
  const value = { text: "가".repeat(100_000) }
  await store.importIfEmpty("records", value)
  const beforeCalls = f.calls(), beforeBytes = f.bytes()
  await Promise.all(Array.from({ length: 10 }, () => store.read("records", () => null)))
  assert.equal(f.calls() - beforeCalls, 1)
  for (let i = 0; i < 100; i++) assert.deepEqual(await store.read("records", () => null), value)
  assert.ok(f.bytes() - beforeBytes < 12_000)
  await other.update("records", () => value, () => ({ text: "수정" }))
  assert.deepEqual(await store.read("records", () => null), { text: "수정" })
  f.values.delete(store.key("records"))
  assert.equal(await store.read("records", () => null), null)
})

test("Neon 운영·Preview 데이터 분리와 빈 키 동시 생성", async () => {
  const f = fixture()
  const production = new PrototypeStore({ ...f, env: { ...f.env, DOKDO_STATE_NAMESPACE: "production" } })
  const preview = new PrototypeStore({ ...f, env: { ...f.env, DOKDO_STATE_NAMESPACE: "preview" } })
  await production.importIfEmpty("records", { count: 8 })
  const instances = [preview, new PrototypeStore({ ...f, env: { ...f.env, DOKDO_STATE_NAMESPACE: "preview" } })]
  await Promise.all(instances.map(store => store.update("records", () => ({ count: 0 }), state => ({ count: state.count + 1 }))))
  assert.deepEqual(await production.read("records", () => null), { count: 8 })
  assert.deepEqual(await preview.read("records", () => null), { count: 2 })
})

test("Neon 오류는 로컬로 우회하지 않고 비밀값 숨김 및 재시도 제한", async () => {
  const f = fixture()
  let now = 0, calls = 0
  const store = new PrototypeStore({ ...f, now: () => now, sql: async () => {
    calls++
    if (calls === 1) throw new Error(f.env.DATABASE_URL)
    return []
  } })
  await assert.rejects(store.read("records", () => []), error => error instanceof Error && !error.message.includes("fixture-only") && error.message.includes("Neon"))
  await assert.rejects(store.read("records", () => []))
  assert.equal(calls, 1)
  now = 30_000
  assert.deepEqual(await store.read("records", () => []), [])
  await assert.rejects(new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "neon" } }).read("records", () => []), /연결 설정/)
  await assert.rejects(new PrototypeStore({ env: { VERCEL: "1", DOKDO_STATE_PROVIDER: "local" } }).read("records", () => []), /로컬 파일/)
  await assert.rejects(new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "redis" } }).read("records", () => []), /연결 설정/)
})
