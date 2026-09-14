"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { BookOpen, X } from "lucide-react"

/** Desktop reference stays non-modal so the second-round writing remains accessible. */
export function TeacherReferencePanel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const panelRef = React.useRef<HTMLElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const desktop = window.matchMedia("(min-width: 1280px)")
    const originalOverflow = document.body.style.overflow
    const syncMode = () => {
      document.body.style.overflow = desktop.matches ? originalOverflow : "hidden"
      panelRef.current?.setAttribute("aria-modal", String(!desktop.matches))
    }
    syncMode()
    closeRef.current?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return }
      if (desktop.matches || event.key !== "Tab") return
      const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, [tabindex="0"]') ?? []).filter(node => node.getClientRects().length > 0)
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    const keepMobileFocus = (event: FocusEvent) => {
      if (!desktop.matches && event.target instanceof Node && !panelRef.current?.contains(event.target)) closeRef.current?.focus({ preventScroll: true })
    }
    desktop.addEventListener("change", syncMode)
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("focusin", keepMobileFocus)
    return () => {
      desktop.removeEventListener("change", syncMode)
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("focusin", keepMobileFocus)
      document.body.style.overflow = originalOverflow
      trigger?.focus({ preventScroll: true })
    }
  }, [onClose])

  return createPortal(<aside ref={panelRef} id="first-round-reference-panel" role="dialog" aria-labelledby="first-round-reference-title" className="fixed inset-0 z-[130] flex min-h-0 flex-col border border-[#e3e3e3] bg-white text-[#454545] shadow-xl xl:inset-auto xl:bottom-4 xl:right-4 xl:top-20 xl:w-[44vw] xl:max-w-[640px] xl:rounded-lg">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e8e8e8] px-5 py-4">
      <div><h2 id="first-round-reference-title" className="flex items-center gap-2 text-lg font-semibold"><BookOpen className="size-4 shrink-0" />1차 작성글·피드백 참고</h2><p className="mt-1 text-xs text-[#8c8c8c]">1차 작성글·피드백·평가 정보 · 읽기 전용</p></div>
      <button ref={closeRef} type="button" aria-label="1차 참고 패널 닫기" onClick={onClose} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded text-[#777] hover:bg-[#f5f5f5] focus-visible:outline-2 focus-visible:outline-[#1890ff]"><X className="size-5" /></button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
  </aside>, document.body)
}
