"use client"
import * as React from "react"
import { Columns3, Expand } from "lucide-react"
import { ReviewDialog } from "./review-ui"

/** Shared controls: hide matching header/body columns without changing their order. */
export function ReviewListTools({ tableId, columns }: { tableId: string; columns: string[] }) {
  const [open, setOpen] = React.useState(false)
  const [hidden, setHidden] = React.useState<number[]>([])
  const [error, setError] = React.useState("")
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.getElementById(tableId)?.requestFullscreen(); setError("") }
    catch { setError("이 브라우저에서는 전체 화면을 사용할 수 없습니다.") }
  }
  return <>
    <button type="button" aria-label="전체 화면" onClick={() => void fullscreen()} className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><Expand className="size-4" /></button>
    <button type="button" aria-label="열 설정" onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><Columns3 className="size-4" /></button>
    <style>{hidden.map(index => `#${tableId} th:nth-child(${index + 1}), #${tableId} td:nth-child(${index + 1}) { display: none; }`).join("\n") + `#${tableId}:fullscreen { overflow:auto; background:white; padding:16px; }`}</style>
    {error && <span role="status" className="text-xs text-red-600">{error}</span>}
    {open && <ReviewDialog title="열 설정" onClose={() => setOpen(false)}><div className="grid grid-cols-2 gap-3">{columns.map((name, index) => <label key={name} className="flex items-center gap-2"><input type="checkbox" checked={!hidden.includes(index)} disabled={!hidden.includes(index) && hidden.length === columns.length - 1} onChange={e => setHidden(value => e.target.checked ? value.filter(i => i !== index) : [...value, index])} />{name}</label>)}</div><button type="button" className="mt-4 text-blue-600" onClick={() => setHidden([])}>전체 표시</button></ReviewDialog>}
  </>
}
