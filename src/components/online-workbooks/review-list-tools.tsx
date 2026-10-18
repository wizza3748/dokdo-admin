"use client"
import * as React from "react"
import { Columns3, Expand } from "lucide-react"
import { ReviewDialog } from "./review-ui"
import { hiddenReviewColumnNames } from "@/lib/review-list-presentation"

/** Shared controls: hide matching header/body columns without changing their order. */
export function ReviewListTools({ tableId, columns, legacyColumns }: { tableId: string; columns: string[]; legacyColumns?: string[] }) {
  const [open, setOpen] = React.useState(false)
  const [hidden, setHidden] = React.useState<string[]>([])
  const [error, setError] = React.useState("")
  const [loaded, setLoaded] = React.useState(false)
  const hiddenColumns = columns.every(name => hidden.includes(name)) ? hidden.filter(name => name !== columns[0]) : hidden
  const legacyColumnKey = JSON.stringify(legacyColumns ?? columns)
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`dokdo:columns:${tableId}:names`) ?? localStorage.getItem(`dokdo:columns:${tableId}`) ?? "[]")
      setHidden(hiddenReviewColumnNames(saved, JSON.parse(legacyColumnKey)))
    } catch {}
    setLoaded(true)
  }, [tableId, legacyColumnKey])
  React.useEffect(() => { if (loaded) { try { localStorage.setItem(`dokdo:columns:${tableId}:names`, JSON.stringify(hidden)) } catch {} } }, [loaded, hidden, tableId])
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.getElementById(tableId)?.requestFullscreen(); setError("") }
    catch { setError("이 브라우저에서는 전체 화면을 사용할 수 없습니다.") }
  }
  return <>
    <button type="button" aria-label="전체 화면" onClick={() => void fullscreen()} className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><Expand className="size-4" /></button>
    <button type="button" aria-label="열 설정" onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><Columns3 className="size-4" /></button>
    <style>{columns.flatMap((name, index) => hiddenColumns.includes(name) ? [`#${tableId} th:nth-child(${index + 1}), #${tableId} td:not([colspan]):nth-child(${index + 1}) { display: none; }`] : []).join("\n") + `#${tableId}:fullscreen { overflow:auto; background:white; padding:16px; }`}</style>
    {error && <span role="status" className="text-xs text-red-600">{error}</span>}
    {open && <ReviewDialog variant="form" title="열 설정" onClose={() => setOpen(false)}><div className="grid grid-cols-2 gap-3">{columns.map(name => <label key={name} className="flex items-center gap-2"><input type="checkbox" checked={!hiddenColumns.includes(name)} disabled={!hiddenColumns.includes(name) && columns.filter(column => !hiddenColumns.includes(column)).length === 1} onChange={e => setHidden(e.target.checked ? hiddenColumns.filter(column => column !== name) : [...hiddenColumns, name])} />{name}</label>)}</div><button type="button" className="mt-4 text-blue-600" onClick={() => setHidden([])}>전체 표시</button></ReviewDialog>}
  </>
}
