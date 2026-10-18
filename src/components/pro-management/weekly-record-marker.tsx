import { weeklyRecordAppearance, weeklyRecordLegend } from "@/lib/pro-weekly-presentation"

/** One visual for the actual week cells and their legend. */
export function WeeklyRecordMarker({ label, current = false }: { label: string; current?: boolean }) {
  const appearance = weeklyRecordAppearance(label)
  return <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-md border text-xs font-semibold ${current ? "ring-2 ring-blue-500 ring-offset-1" : ""} ${appearance.className}`}>{appearance.symbol}</span>
}

export function WeeklyRecordLegend() {
  return <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-slate-600" aria-label="주차별 기록 범례">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{weeklyRecordLegend.map(label => <span key={label} className="inline-flex items-center gap-2"><WeeklyRecordMarker label={label}/>{label}</span>)}</div>
    <span className="inline-flex items-center gap-2 border-l border-slate-300 pl-5"><WeeklyRecordMarker label="-" current/><span>현재 주 <span className="text-slate-500">(파란 테두리)</span></span></span>
  </div>
}
