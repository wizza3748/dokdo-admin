import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TS directly.
import { subscribeReviewRefresh, REVIEW_REFRESH_INTERVAL, REVIEW_IDLE_TIMEOUT, reviewReads } from "../src/lib/review-refresh.ts"

test("공통 타이머 하나·중복 알림 병합·숨긴 탭 중지·복귀 갱신·구독 정리", async () => {
  const saved = new Map(["window", "document", "BroadcastChannel"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const timers = new Map<number, () => void>()
  let broadcasts = 0, timerSequence = 0
  const win = Object.assign(new EventTarget(), {
    setInterval: (callback: () => void, milliseconds: number) => { assert.equal(milliseconds, 60_000); const id = ++timerSequence; timers.set(id, callback); return id },
    clearInterval: (id: number) => { timers.delete(id) },
  })
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" })
  const subscriptions: (() => void)[] = []
  const originalNow = Date.now
  let now = 0
  const flush = async () => { await new Promise(resolve => setImmediate(resolve)) }
  try {
    Date.now = () => now
    Object.defineProperty(globalThis, "window", { configurable: true, value: win })
    Object.defineProperty(globalThis, "document", { configurable: true, value: doc })
    Object.defineProperty(globalThis, "BroadcastChannel", { configurable: true, value: class {
      onmessage?: () => void
      postMessage() { broadcasts++ }
      close() {}
    } })
    let first = 0, second = 0
    subscriptions.push(subscribeReviewRefresh(() => { first++ }), subscribeReviewRefresh(() => { second++ }))
    await flush()
    assert.equal(timers.size, 1); assert.equal(REVIEW_REFRESH_INTERVAL, 60_000)
    assert.deepEqual([first, second], [1, 1])
    await reviewReads.read("saved", async () => 1)
    win.dispatchEvent(new Event("dokdo-review-change")); win.dispatchEvent(new Event("dokdo-workbook-change"))
    await flush()
    assert.deepEqual([first, second], [2, 2]); assert.equal(broadcasts, 1)
    assert.equal(await reviewReads.read("saved", async () => 2), 2)
    doc.visibilityState = "hidden"
    for (const tick of timers.values()) tick()
    win.dispatchEvent(new Event("focus"))
    await flush(); assert.deepEqual([first, second], [2, 2])
    doc.visibilityState = "visible"; doc.dispatchEvent(new Event("visibilitychange"))
    await flush(); assert.deepEqual([first, second], [3, 3])
    now += REVIEW_IDLE_TIMEOUT
    for (const tick of timers.values()) tick()
    await flush(); assert.deepEqual([first, second], [3, 3], "켜 둔 화면도 장시간 조작이 없으면 자동 조회 중지")
    win.dispatchEvent(new Event("pointerdown"))
    await flush(); assert.deepEqual([first, second], [4, 4], "다시 조작하면 최신 상태 조회")
    win.dispatchEvent(new Event("keydown"))
    await flush(); assert.deepEqual([first, second], [4, 4], "입력마다 조회하지 않음")
    subscriptions.pop()!(); subscriptions.pop()!()
    assert.equal(timers.size, 0)
    win.dispatchEvent(new Event("focus")); await flush()
    assert.deepEqual([first, second], [4, 4])
  } finally {
    subscriptions.forEach(stop => stop())
    reviewReads.invalidate()
    Date.now = originalNow
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
