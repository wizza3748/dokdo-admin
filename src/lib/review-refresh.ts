"use client"

import { ReviewReadCache } from "@/lib/review-read-cache"

export const reviewReads = new ReviewReadCache()
export const REVIEW_REFRESH_INTERVAL = 60_000
export const REVIEW_IDLE_TIMEOUT = 3 * 60_000
const listeners = new Set<() => void | Promise<void>>()
let stop: (() => void) | undefined
let queued = false

/** One visible-tab timer for lists, navigation and student views. Mutations still refresh immediately. */
export function subscribeReviewRefresh(listener: () => void | Promise<void>) {
  listeners.add(listener)
  const refresh = () => {
    if (document.visibilityState === "hidden" || queued) return
    queued = true
    queueMicrotask(() => {
      queued = false
      if (document.visibilityState === "hidden") return
      for (const notify of listeners) void Promise.resolve().then(notify).catch(() => undefined)
    })
  }
  if (!stop) {
    let lastActivity = Date.now()
    const changed = () => { reviewReads.invalidate(); if (Date.now() - lastActivity < REVIEW_IDLE_TIMEOUT) refresh() }
    const channel = typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel("dokdo-review-refresh")
    let broadcastQueued = false
    let disposed = false
    const localChange = () => {
      lastActivity = Date.now()
      changed()
      if (!broadcastQueued) {
        broadcastQueued = true
        queueMicrotask(() => { broadcastQueued = false; if (!disposed) channel?.postMessage("changed") })
      }
    }
    const activity = () => {
      const idle = Date.now() - lastActivity >= REVIEW_IDLE_TIMEOUT
      lastActivity = Date.now()
      if (idle) refresh()
    }
    const resume = () => {
      if (document.visibilityState === "hidden") return
      lastActivity = Date.now()
      refresh()
    }
    if (channel) channel.onmessage = changed
    window.addEventListener("dokdo-review-change", localChange)
    window.addEventListener("dokdo-workbook-change", localChange)
    window.addEventListener("dokdo-agency-workbook-change", localChange)
    window.addEventListener("storage", changed)
    window.addEventListener("focus", resume)
    document.addEventListener("visibilitychange", resume)
    for (const event of ["pointerdown", "keydown", "scroll"]) window.addEventListener(event, activity, { passive: true })
    const timer = window.setInterval(() => { if (Date.now() - lastActivity < REVIEW_IDLE_TIMEOUT) refresh() }, REVIEW_REFRESH_INTERVAL)
    stop = () => {
      disposed = true
      window.clearInterval(timer)
      window.removeEventListener("dokdo-review-change", localChange)
      window.removeEventListener("dokdo-workbook-change", localChange)
      window.removeEventListener("dokdo-agency-workbook-change", localChange)
      window.removeEventListener("storage", changed)
      window.removeEventListener("focus", resume)
      document.removeEventListener("visibilitychange", resume)
      for (const event of ["pointerdown", "keydown", "scroll"]) window.removeEventListener(event, activity)
      channel?.close()
    }
  }
  refresh()
  return () => {
    listeners.delete(listener)
    if (!listeners.size) { stop?.(); stop = undefined }
  }
}
