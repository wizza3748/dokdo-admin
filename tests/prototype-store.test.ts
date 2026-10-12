import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createHash } from "node:crypto"
// @ts-expect-error Node's type stripping uses explicit .ts paths.
import { PrototypeStore } from "../src/lib/prototype-store.ts"

test("local JSON survives new instances and serializes simultaneous changes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "dokdo-store-test-"))
  try {
    await writeFile(path.join(directory, "records.json"), JSON.stringify({ count: 5 }))
    const store = new PrototypeStore({ directory, env: {} })
    await Promise.all(Array.from({ length: 15 }, () => store.update("records", () => ({ count: 0 }), state => ({ count: state.count + 1 }))))
    assert.deepEqual(await new PrototypeStore({ directory, env: {} }).read("records", () => ({ count: 0 })), { count: 20 })
    await writeFile(path.join(directory, "records.json"), "invalid-json")
    await assert.rejects(store.update("records", () => ({ count: 0 }), state => state))
    assert.equal(await readFile(path.join(directory, "records.json"), "utf8"), "invalid-json")
  } finally { await rm(directory, { recursive: true, force: true }) }
})

function redisFixture() {
  const values = new Map<string, string>()
  let conflicts = 0
  const commands: (string | number)[][] = []
  let responseBytes = 0
  const fetcher: typeof fetch = async (_url, options) => {
    assert.equal(options?.method, "POST")
    assert.equal((options?.headers as Record<string, string>).Authorization, "Bearer test-only-token")
    const args = JSON.parse(String(options?.body)) as (string | number)[]
    commands.push(args)
    let result: unknown = null
    if (args[0] === "GET") result = values.get(String(args[1])) ?? null
    if (args[0] === "SET" && !values.has(String(args[1]))) { values.set(String(args[1]), String(args[2])); result = "OK" }
    if (args[0] === "EVAL" && args.length === 5) {
      const current = values.get(String(args[3])) ?? null
      result = createHash("sha1").update(current ?? "").digest("hex") === args[4] ? [0] : [1, current]
    }
    if (args[0] === "EVAL" && args.length === 6) {
      const key = String(args[3])
      if ((values.get(key) ?? "") === args[4]) { values.set(key, String(args[5])); result = 1 }
      else { conflicts++; result = 0 }
    }
    responseBytes += Buffer.byteLength(JSON.stringify({ result }))
    return Response.json({ result })
  }
  const env = { UPSTASH_REDIS_REST_URL: "https://redis.example.test", UPSTASH_REDIS_REST_TOKEN: "test-only-token", VERCEL: "1" }
  return { values, env, fetcher, commands, bytes: () => responseBytes, conflicts: () => conflicts }
}

test("remote import never replaces existing data, and concurrent instances retain updates", async () => {
  const f = redisFixture()
  const first = new PrototypeStore(f), second = new PrototypeStore(f)
  assert.equal(await first.importIfEmpty("records", { count: 4 }), true)
  assert.equal(await first.importIfEmpty("records", { count: 0 }), false)
  await Promise.all([first, second].map(store => store.update("records", () => ({ count: 0 }), state => ({ count: state.count + 1 }))))
  assert.deepEqual(await second.read("records", () => ({ count: 0 })), { count: 6 })
  assert.ok(f.conflicts() > 0)
})

test("cloud configuration fails safely rather than losing changes in temporary filesystem", async () => {
  await assert.rejects(new PrototypeStore({ env: { VERCEL: "1" } }).read("records", () => []), /영구 저장소/)
  await assert.rejects(new PrototypeStore({ env: { KV_REST_API_URL: "https://redis.example.test" } }).read("records", () => []), /영구 저장소/)
  await assert.rejects(new PrototypeStore({ env: { KV_REST_API_URL: "http://redis.example.test", KV_REST_API_TOKEN: "test" } }).read("records", () => []), /HTTPS/)
  assert.throws(() => new PrototypeStore({ env: {} }).key("../records"))
})

test("중복 읽기 병합, 동일 데이터는 작은 확인 응답, 변경·삭제는 재조회", async () => {
  const f = redisFixture()
  let now = 0
  const store = new PrototypeStore({ ...f, now: () => now })
  const key = store.key("records"), value = { text: "가".repeat(100_000) }
  f.values.set(key, JSON.stringify(value))
  const first = await Promise.all(Array.from({ length: 10 }, () => store.read("records", () => null)))
  assert.deepEqual(first[0], value)
  assert.equal(f.commands.length, 1)
  const initialBytes = f.bytes()
  for (let i = 0; i < 100; i++) { now += 60_000; assert.deepEqual(await store.read("records", () => null), value) }
  assert.ok(f.bytes() - initialBytes < 2000, "변경 없는 100회 조회는 JSON 본문을 재전송하지 않음")
  f.values.set(key, JSON.stringify({ text: "changed" }))
  now += 60_000
  assert.deepEqual(await store.read("records", () => null), { text: "changed" })
  f.values.delete(key); now += 60_000
  assert.equal(await store.read("records", () => null), null)
})

test("조회 캐시가 있어도 명령은 다른 인스턴스의 최신 저장값으로 처리", async () => {
  const f = redisFixture(), first = new PrototypeStore(f), second = new PrototypeStore(f)
  await first.importIfEmpty("records", { count: 1 })
  await first.read("records", () => ({ count: 0 }))
  await second.update("records", () => ({ count: 0 }), () => ({ count: 10 }))
  const next = await first.update("records", () => ({ count: 0 }), state => ({ count: state.count + 1 }))
  assert.equal(next.count, 11)
  assert.equal(JSON.parse(f.values.get(first.key("records"))!).value.count, 11)
})

test("다른 인스턴스 저장 직후의 조회도 이전 스냅샷을 그대로 반환하지 않음", async () => {
  const f = redisFixture(), first = new PrototypeStore(f), second = new PrototypeStore(f)
  await first.importIfEmpty("records", { count: 1 })
  await second.update("records", () => ({ count: 0 }), () => ({ count: 10 }))
  const next = await first.read("records", () => ({ count: 0 }))
  assert.equal(next.count, 10)
})

test("저장소 제한 오류 후 요청 폭주 차단, 대기 후 복구 재확인", async () => {
  let now = 0, calls = 0
  const f = redisFixture()
  const store = new PrototypeStore({ ...f, now: () => now, fetcher: async () => {
    calls++
    return calls === 1 ? Response.json({ error: "quota exceeded" }) : Response.json({ result: null })
  } })
  await assert.rejects(store.read("records", () => []))
  await assert.rejects(store.read("records", () => []))
  assert.equal(calls, 1)
  now = 30_000
  assert.deepEqual(await store.read("records", () => []), [])
  assert.equal(calls, 2)
})
