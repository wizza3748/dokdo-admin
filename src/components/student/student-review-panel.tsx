"use client"

import * as React from "react"
import { Dialog } from "radix-ui"
import { X } from "lucide-react"

/** Reference-only overlay. The writing editor and permanent rewrite guide remain mounted underneath. */
export function StudentReviewPanel({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  // Capture before the dialog's focus/scroll-lock effects run, not in onOpenAutoFocus.
  const [opener] = React.useState(() => document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const [position] = React.useState(() => ({
    elements: Array.from(document.querySelectorAll("*")).filter(element => !element.closest('[role="dialog"]') && (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)).map(element => ({ element, top: element.scrollTop, left: element.scrollLeft })),
  }))
  const restoreScroll = () => position.elements.forEach(({ element, top, left }) => { element.scrollTop = top; element.scrollLeft = left })
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[140] bg-black/35 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
      <Dialog.Content
        aria-describedby={undefined}
        className="fixed inset-y-3 right-3 z-[141] flex w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-[22px] border border-[#dce3e7] bg-white shadow-2xl outline-none sm:w-[min(600px,calc(100%-1.5rem))] data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200 motion-reduce:animate-none"
        onOpenAutoFocus={event => {
          event.preventDefault()
          closeRef.current?.focus({ preventScroll: true })
          restoreScroll()
        }}
        onCloseAutoFocus={event => {
          event.preventDefault()
          opener?.focus({ preventScroll: true })
          restoreScroll()
        }}
      >
        <header className="relative flex min-h-[70px] shrink-0 items-center justify-center border-b-2 border-dashed border-[#dde1e3] bg-white px-14 py-4">
          <Dialog.Title className="text-center text-[23px] font-black">{title}</Dialog.Title>
          <Dialog.Close asChild><button ref={closeRef} type="button" aria-label="닫기" className="absolute right-5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-[#444b50] transition hover:bg-[#f1f5f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#249ce0]"><X className="size-7" /></button></Dialog.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f5f7f9] p-4 sm:p-5">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
