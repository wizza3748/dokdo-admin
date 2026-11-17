"use client"
import * as React from "react"
import { useRouter } from "next/navigation"

export function useMonthlyNavigationGuard(dirty: boolean, busy: boolean, navigationRef?: React.MutableRefObject<(go: () => void) => void>) {
  const router = useRouter()
  const [pending, setPending] = React.useState<(() => void) | null>(null)
  React.useEffect(() => {
    const guard = (go: () => void) => { if (busy) return; if (dirty) setPending(() => go); else go() }
    if (navigationRef) navigationRef.current = guard
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(anchor instanceof HTMLAnchorElement) || event.target instanceof Element && event.target.closest("button") || anchor.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || anchor.href === window.location.href) return
      if (!dirty && !busy) return
      event.preventDefault(); event.stopPropagation(); guard(() => router.push(anchor.href))
    }
    const unload = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = "" } }
    const navigation = (event: Event) => { if (dirty || busy) { event.preventDefault(); guard((event as CustomEvent<() => void>).detail) } }
    document.addEventListener("click", click, true)
    window.addEventListener("beforeunload", unload)
    window.addEventListener("dokdo:before-navigation", navigation)
    return () => {
      if (navigationRef) navigationRef.current = go => go()
      document.removeEventListener("click", click, true)
      window.removeEventListener("beforeunload", unload)
      window.removeEventListener("dokdo:before-navigation", navigation)
    }
  }, [dirty, busy, navigationRef, router])
  return { pending, cancel: () => setPending(null), confirm: () => { const go = pending; setPending(null); go?.() } }
}
