"use client"
import * as React from "react"

/** URL carries filters; sessionStorage carries only presentation state/scroll. */
export function useReviewListPosition(ready: boolean, key: string) {
  const root = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!ready || !root.current) return
    const containers: HTMLElement[] = []
    for (let node: HTMLElement | null = root.current; node; node = node.parentElement) {
      if (/auto|scroll/.test(getComputedStyle(node).overflowY)) containers.push(node)
    }
    containers.push(document.scrollingElement as HTMLElement)
    const storageKey = `dokdo:list-position:${key}`
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as number[] | null
      if (saved) containers.forEach((node, i) => { node.scrollTop = saved[i] ?? 0 })
    } catch { /* Storage may be unavailable; navigation still works. */ }
    const save = () => { try { sessionStorage.setItem(storageKey, JSON.stringify(containers.map(node => node.scrollTop))) } catch {} }
    containers.forEach(node => node.addEventListener("scroll", save, { passive: true }))
    return () => { save(); containers.forEach(node => node.removeEventListener("scroll", save)) }
  }, [ready, key])
  return root
}

export function safeAgencyReturn(value: string | null, fallback: string) {
  if (!value) return fallback
  try {
    const url = new URL(value, "https://prototype.invalid")
    if (url.origin === "https://prototype.invalid" && /^\/agency\/(pro-management(?:\/students\/[^/]+)?|online-workbooks)$/.test(url.pathname)) return url.pathname + url.search + url.hash
  } catch {}
  return fallback
}
