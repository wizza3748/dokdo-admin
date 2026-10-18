import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TS directly.
import { ReviewReadCache } from "../src/lib/review-read-cache.ts"

test("같은 역할·학생·상세 URL은 병합하고 다른 URL은 분리", async () => {
  let now = 0, calls = 0
  const cache = new ReviewReadCache(() => now)
  const load = async () => ++calls
  assert.deepEqual(await Promise.all([cache.read("student-a", load), cache.read("student-a", load)]), [1, 1])
  assert.equal(await cache.read("student-b", load), 2)
  assert.equal(await cache.read("agency", load), 3)
  assert.equal(await cache.read("student-a", load), 1)
  now = 5000
  assert.equal(await cache.read("student-a", load), 4)
})

test("저장 알림 후 즉시 새 조회, 이전 응답은 새 캐시를 덮지 않음", async () => {
  const cache = new ReviewReadCache()
  let finish!: (value: number) => void
  const old = cache.read("student", () => new Promise<number>(resolve => { finish = resolve }))
  cache.invalidate()
  assert.equal(await cache.read("student", async () => 2), 2)
  finish(1)
  assert.equal(await old, 1)
  assert.equal(await cache.read("student", async () => 3), 2)
})

test("오류는 30초부터 최대 5분까지 재시도 간격 확대, 성공하면 해제", async () => {
  let now = 0, calls = 0
  const cache = new ReviewReadCache(() => now)
  const fail = async () => { calls++; throw new Error("offline") }
  await assert.rejects(cache.read("student", fail))
  await assert.rejects(cache.read("student", fail)); assert.equal(calls, 1)
  now = 30_000
  await assert.rejects(cache.read("student", fail)); assert.equal(calls, 2)
  now = 89_999
  await assert.rejects(cache.read("student", fail)); assert.equal(calls, 2)
  now = 90_000
  assert.equal(await cache.read("student", async () => "recovered"), "recovered")
})

test("지정 확인의 최신 조회는 유효한 캐시도 갱신하고 다른 조회는 유지", async () => {
  const cache = new ReviewReadCache()
  assert.equal(await cache.read("agency", async () => 3), 3)
  assert.equal(await cache.read("student", async () => 9), 9)
  assert.equal(await cache.read("agency", async () => 2, { fresh: true }), 2)
  assert.equal(await cache.read("agency", async () => 1), 2)
  assert.equal(await cache.read("student", async () => 8), 9)
})

test("최신 조회는 이전 진행 중인 응답과 오류 재시도 대기를 재사용하지 않음", async () => {
  const cache = new ReviewReadCache()
  let finish!: (value: number) => void
  const old = cache.read("agency", () => new Promise<number>(resolve => { finish = resolve }))
  assert.equal(await cache.read("agency", async () => 2, { fresh: true }), 2)
  finish(3)
  assert.equal(await old, 3)
  assert.equal(await cache.read("agency", async () => 4), 2)
  await assert.rejects(cache.read("failed", async () => { throw new Error("offline") }))
  assert.equal(await cache.read("failed", async () => 1, { fresh: true }), 1)
})
