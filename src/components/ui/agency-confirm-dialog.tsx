"use client"

import * as React from "react"
import { Dialog } from "radix-ui"
import { Button } from "@/components/ui/button"

export type AgencyConfirmDialogProps = {
  title: string; children: React.ReactNode; onClose: () => void; onConfirm?: () => void;
  confirmLabel?: string; closeLabel?: string; disabled?: boolean; busy?: boolean; hideCancel?: boolean;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/** Agency confirmation and notice dialogs; editing forms keep their own layout. */
export function AgencyConfirmDialog({ title, children, onClose, onConfirm, confirmLabel = "확인", closeLabel, disabled = false, busy = false, hideCancel = false, triggerRef }: AgencyConfirmDialogProps) {
  const descriptionId = React.useId()
  const [trigger] = React.useState(() => typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const buttonClass = "h-10 min-w-[72px] rounded-[10px] px-[18px] text-base font-medium shadow-sm"
  const primaryClass = `${buttonClass} border border-[#0068ed] bg-[#0068ed] text-white hover:border-[#005bd1] hover:bg-[#005bd1]`
  return <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose() }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[150] bg-black/45" />
    <Dialog.Content role="alertdialog" aria-describedby={descriptionId}
      onEscapeKeyDown={event => { if (busy) event.preventDefault() }}
      onInteractOutside={event => event.preventDefault()}
      onCloseAutoFocus={event => { event.preventDefault(); const target = triggerRef?.current ?? trigger; if (target?.isConnected && target !== document.body) target.focus({ preventScroll: true }) }}
      className="fixed left-1/2 top-1/2 z-[151] max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white px-6 py-6 text-[#50545a] shadow-2xl outline-none sm:px-8">
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#f5be3d] text-lg font-medium leading-none text-white">!</span>
        <div className="min-w-0 flex-1">
          <Dialog.Title className="text-xl font-semibold leading-8">{title}</Dialog.Title>
          <div id={descriptionId} className="mt-2 break-words text-base leading-7">{children}</div>
        </div>
      </div>
      <footer className="mt-4 flex flex-wrap justify-end gap-2.5">
        {onConfirm ? <>
          {!hideCancel && <Button type="button" variant="outline" className={`${buttonClass} border-[#dfe1e5] bg-white text-[#50545a] hover:bg-[#f7f8fa]`} disabled={busy} onClick={onClose}>{closeLabel ?? "취소"}</Button>}
          <Button type="button" className={primaryClass} disabled={disabled || busy} onClick={onConfirm}>{busy ? "처리 중…" : confirmLabel}</Button>
        </> : <Button type="button" className={primaryClass} disabled={busy} onClick={onClose}>{closeLabel ?? "확인"}</Button>}
      </footer>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
}
