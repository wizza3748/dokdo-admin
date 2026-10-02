import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
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
  const fetcher: typeof fetch = async (_url, options) => {
    assert.equal(options?.method, "POST")
    assert.equal((options?.headers as Record<string, string>).Authorization, "Bearer test-only-token")
    const args = JSON.parse(String(options?.body)) as (string | number)[]
    let result: unknown = null
    if (args[0] === "GET") result = values.get(String(args[1])) ?? null
    if (args[0] === "SET" && !values.has(String(args[1]))) { values.set(String(args[1]), String(args[2])); result = "OK" }
    if (args[0] === "EVAL") {
      const key = String(args[3])
      if ((values.get(key) ?? "") === args[4]) { values.set(key, String(args[5])); result = 1 }
      else { conflicts++; result = 0 }
    }
    return Response.json({ result })
  }
  const env = { UPSTASH_REDIS_REST_URL: "https://redis.example.test", UPSTASH_REDIS_REST_TOKEN: "test-only-token", VERCEL: "1" }
  return { values, env, fetcher, conflicts: () => conflicts }
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
