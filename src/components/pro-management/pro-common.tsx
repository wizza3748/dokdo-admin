"use client"
import * as React from "react"
import Link from "next/link"
import { useReviews, type ReviewRole } from "@/lib/review-client"
import { commandPro } from "@/lib/pro-client"
import { addDays, dateLabel, kstDate, weekStart } from "@/lib/pro-calendar"
import type { ProCommand } from "@/lib/pro-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
export const panel = "rounded-lg border border-slate-200 bg-white p-5"
export const field = "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
export function ExternalBadge() { return <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600">외부</span> }
export function useProManagement() {
  const [role, setRole] = React.useState<ReviewRole>("agency")
  React.useEffect(() => { if (new URLSearchParams(window.location.search).get("role") === "admin") setRole("admin") }, [])
  const hook = useReviews(role), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState("")
  const run = async (command: ProCommand) => { setBusy(true); setMessage(""); try { await commandPro(command, role); await hook.refresh(); setMessage("저장했습니다."); return true } catch (e) { setMessage(e instanceof Error ? e.message : "처리에 실패했습니다."); return false } finally { setBusy(false) } }
  return { ...hook, role, readOnly: role === "admin", busy, message, setMessage, runPro: run }
}
export function ProNotice({ hook }: { hook: ReturnType<typeof useProManagement> }) { return <>{hook.readOnly && <p className="rounded bg-slate-100 p-3 text-sm">본사관리자는 조회만 가능합니다.</p>}{(hook.message || hook.error) && <p role="status" className="rounded bg-blue-50 p-3 text-sm">{hook.message || hook.error}</p>}</> }
export function ProDemoTools({ hook }: { hook: ReturnType<typeof useProManagement> }) {
  const [time, setTime] = React.useState("")
  const pro = hook.db.pro
  if (!pro) return null
  return <details className="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-medium">프로토타입 검증 도구 · 기준 시각 {dateLabel(pro.clock)}</summary><div className="mt-3 space-y-3"><p>예시 데이터 적용 기준: {kstDate(pro.effectiveAt)} · 관리월: {pro.effectiveMonth}. 일반 학생 데이터는 변경하지 않습니다. 실제 문자 발송 없이 발송 결과를 모의 처리합니다.</p><div className="flex flex-wrap gap-2"><Link className="underline" href="/student/exploration-record?tab=workbook&demoStudent=normal">일반 학생 확인</Link>{pro.members.map(m => <Link className="underline" key={m.id} href={`/student/exploration-record?tab=workbook&month=${kstDate(pro.clock).slice(0, 7)}&demoStudent=${m.id}`}>{m.name}</Link>)}</div>{!hook.readOnly && <div className="flex flex-wrap items-center gap-2"><Button variant="outline" disabled={hook.busy} onClick={() => hook.runPro({ type: "clock", at: addDays(weekStart(pro.clock), 7) })}>다음 주 월요일로 진행</Button><Input aria-label="테스트 시각" className="w-auto" type="datetime-local" value={time} onChange={e => setTime(e.target.value)} /><Button variant="outline" disabled={hook.busy || !time} onClick={() => hook.runPro({ type: "clock", at: new Date(`${time}:00+09:00`).toISOString() })}>지정 시각으로 진행</Button><p className="text-xs text-slate-500">되돌릴 수 없습니다. 조회 시 누락된 자동 처리를 원래 마감 시각으로 반영합니다.</p></div>}</div></details>
}
