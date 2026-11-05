"use client"
import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function ProHelp({ label, children, lines, trigger, open, onOpenChange, constrainToViewport = false }: { label: string; children?: ReactNode; lines: string[]; trigger?: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; constrainToViewport?: boolean }) {
  return <Popover open={open} onOpenChange={onOpenChange}><PopoverTrigger asChild><button type="button" aria-label={label} className="inline-flex shrink-0 items-center justify-center rounded text-slate-500 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{trigger ?? <Info className="size-4" aria-hidden="true"/>}</button></PopoverTrigger><PopoverContent aria-label={label} collisionPadding={constrainToViewport ? 12 : undefined} sticky={constrainToViewport ? "always" : undefined} style={constrainToViewport ? { maxWidth: "min(calc(100vw - 24px), var(--radix-popover-content-available-width))", maxHeight: "var(--radix-popover-content-available-height)", overflowY: "auto", overscrollBehavior: "contain" } : undefined} className="z-[170] w-[440px] max-w-[calc(100vw-24px)] space-y-3 break-keep p-5 text-sm leading-6 text-slate-700">
    {children}<ul className="list-disc space-y-2 pl-4 marker:text-slate-500">{lines.map(line => {
      const split = line.indexOf(": ")
      return <li key={line} className="pl-1">{split > 0 ? <><strong className="font-semibold text-slate-900">{line.slice(0, split)}</strong>{line.slice(split)}</> : line}</li>
    })}</ul>
  </PopoverContent></Popover>
}
