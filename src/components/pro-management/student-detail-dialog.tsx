"use client"
import type { ReactNode, RefObject } from "react"
import { Dialog } from "radix-ui"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function StudentDetailDialog({ title, children, onClose, onConfirm, confirmLabel = "저장", disabled, busy, triggerRef }: {
  title: string; children: ReactNode; onClose: () => void; onConfirm?: () => void; confirmLabel?: string;
  disabled?: boolean; busy?: boolean; triggerRef: RefObject<HTMLElement | null>;
}) {
  return <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose() }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[150] bg-slate-950/40"/>
    <Dialog.Content aria-describedby={undefined} onEscapeKeyDown={e => { if (busy) e.preventDefault() }} onInteractOutside={e => e.preventDefault()}
      onCloseAutoFocus={e => { e.preventDefault(); triggerRef.current?.focus() }}
      className="fixed top-1/2 left-1/2 z-[151] flex max-h-[90dvh] w-[calc(100%-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-slate-200 bg-white text-sm text-slate-700 shadow-xl outline-none">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>
        <Dialog.Close asChild><Button variant="ghost" size="icon" disabled={busy} aria-label="창 닫기"><X className="size-4"/></Button></Dialog.Close>
      </header>
      <div className="min-h-0 overflow-y-auto p-5">{children}</div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4">
        <Button variant="outline" disabled={busy} onClick={onClose}>닫기</Button>
        {onConfirm && <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={disabled || busy} onClick={onConfirm}>{busy ? "저장 중…" : confirmLabel}</Button>}
      </footer>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
}
