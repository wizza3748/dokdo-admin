"use client"
import * as React from "react"
import Link from "next/link"
import { useReviews, type ReviewRole } from "@/lib/review-client"
import { commandPro } from "@/lib/pro-client"
import { addDays, dateLabel, kstDate, weekStart } from "@/lib/pro-calendar"
import type { ProCommand } from "@/lib/pro-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
export const panel = "min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
export const field = "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
export function ProBadge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "blue" | "amber" | "red" | "green" | "violet" }) {
  const colors = { slate: "bg-slate-100 text-slate-600", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-800", red: "bg-rose-50 text-rose-700", green: "bg-emerald-50 text-emerald-700", violet: "bg-violet-50 text-violet-700" }
  return <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-4 ${colors[tone]}`}><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current"/>{children}</span>
}
export function ProStatusBadge({ status }: { status: string }) {
  const tone = status === "지연" || status === "미제출" ? "red" : status === "피드백 필요" ? "amber" : status === "2차 대기" ? "blue" : status === "관리 완료" ? "green" : "slate"
  return <ProBadge tone={tone}>{status}</ProBadge>
}
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
return <details className="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-medium">프로토타입 검증 도구 · {pro.clockMode === "test" ? "테스트 시각" : "실제 시각"} (한국 시간) {dateLabel(pro.clock)}</summary><div className="mt-3 space-y-3"><p>예시 데이터 적용 기준: {kstDate(pro.effectiveAt)} · 관리월: {pro.effectiveMonth}. 일반 학생 데이터는 변경하지 않습니다. 실제 문자 발송 없이 발송 결과를 모의 처리합니다.</p><div className="flex flex-wrap gap-2"><Link className="underline" href="/student/exploration-record?tab=workbook&demoStudent=normal">일반 학생 확인</Link>{pro.members.map(m => <Link className="underline" key={m.id} href={`/student/exploration-record?tab=workbook&month=${kstDate(pro.clock).slice(0, 7)}&demoStudent=${m.id}`}>{m.name}</Link>)}</div>{!hook.readOnly && <div className="flex flex-wrap items-center gap-2"><Button variant="outline" disabled={hook.busy} onClick={() => hook.runPro({ type: "clock", at: addDays(weekStart(pro.clock), 7) })}>다음 주 월요일로 테스트</Button><Input aria-label="테스트 시각" className="w-auto" type="datetime-local" value={time} onChange={e => setTime(e.target.value)} /><Button variant="outline" disabled={hook.busy || !time} onClick={() => hook.runPro({ type: "clock", at: new Date(`${time}:00+09:00`).toISOString() })}>테스트 시각 적용</Button><Button variant="outline" disabled={hook.busy || pro.clockMode !== "test"} onClick={() => hook.runPro({ type: "clock-real" })}>실제 시각으로 돌아가기</Button><p className="w-full text-xs text-slate-500">기본은 서버의 실제 한국 시각입니다. 테스트 시각을 적용하면 모든 프로 화면에 함께 적용됩니다. 실제 시각으로 돌아가면 테스트 중 프로 데이터 변경은 시작 전 상태로 복원하고, 현재까지의 자동 처리를 반영합니다. 일반 학생 기록은 유지합니다. 자동 처리 이력은 원래 마감 시각을 사용합니다.</p></div>}</div></details>
}
