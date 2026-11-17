"use client"
import { useRef, type ReactNode, type RefObject } from "react"
import { Dialog } from "radix-ui"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function StudentDetailDialog({ title, children, onClose, onConfirm, confirmLabel = "저장", closeLabel = "닫기", disabled, busy, triggerRef, subtitle, maxWidth, busyLabel = "저장 중…", bodyRef, footerStart, headerLayout, focusContentOnOpen = false, className }: {
  title: string; children: ReactNode; onClose: () => void; onConfirm?: () => void; confirmLabel?: string; closeLabel?: string;
  disabled?: boolean; busy?: boolean; triggerRef: RefObject<HTMLElement | null>;
  subtitle?: ReactNode; maxWidth?: number; busyLabel?: string; bodyRef?: RefObject<HTMLDivElement | null>; footerStart?: ReactNode;
  headerLayout?: "stacked"; focusContentOnOpen?: boolean; className?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const closeButton = <Dialog.Close asChild><Button variant="ghost" size="icon" disabled={busy} aria-label="창 닫기"><X className="size-4"/></Button></Dialog.Close>
  return <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose() }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[150] bg-slate-950/40"/>
    <Dialog.Content ref={contentRef} aria-describedby={undefined} onEscapeKeyDown={e => { if (busy) e.preventDefault() }} onInteractOutside={e => e.preventDefault()}
      onOpenAutoFocus={e => { if (focusContentOnOpen) { e.preventDefault(); contentRef.current?.focus({ preventScroll: true }) } }}
      onCloseAutoFocus={e => { e.preventDefault(); triggerRef.current?.focus() }}
      style={maxWidth ? { maxWidth } : undefined}
      className={`fixed top-1/2 left-1/2 z-[151] flex max-h-[90dvh] w-[calc(100%-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-slate-200 bg-white text-sm text-slate-700 shadow-xl outline-none ${className ?? ""}`}>
      <header className={`shrink-0 border-b border-slate-200 px-5 py-4 ${headerLayout === "stacked" ? "" : "flex items-center justify-between gap-3"}`}>
        {headerLayout === "stacked" ? <>
          <div className="flex items-center justify-between gap-3"><Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>{closeButton}</div>
          {subtitle && <div className="mt-3 text-sm text-slate-500">{subtitle}</div>}
        </> : <>
          {subtitle ? <div className="min-w-0"><Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title><div className="mt-1.5 text-sm text-slate-500">{subtitle}</div></div> : <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>}
          {closeButton}
        </>}
      </header>
      <div ref={bodyRef} className="min-h-0 overflow-y-auto p-5">{children}</div>
      <footer className={`flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4 ${maxWidth ? "flex-wrap items-center" : ""}`}>
        {footerStart && <div className="mr-auto min-w-0 text-xs text-slate-500">{footerStart}</div>}
        <Button variant="outline" disabled={busy} onClick={onClose}>{closeLabel}</Button>
        {onConfirm && <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={disabled || busy} onClick={onConfirm}>{busy ? busyLabel : confirmLabel}</Button>}
      </footer>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
}
