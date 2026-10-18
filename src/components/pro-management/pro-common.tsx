"use client"
import * as React from "react"
import Link from "next/link"
import { useReviews, type ReviewRole } from "@/lib/review-client"
import { commandPro, resetProDemo } from "@/lib/pro-client"
import { STUDENT_FRONT_TEST_PATH } from "@/lib/pro-demo-navigation"
import { addDays, dateLabel, kstDate, weekStart } from "@/lib/pro-calendar"
import type { ProCommand } from "@/lib/pro-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AgencyConfirmDialog } from "@/components/ui/agency-confirm-dialog"
import { cn } from "@/lib/utils"
export const panel = "min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
export const field = "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
export function ProBadge({ children, tone = "slate", className }: { children: React.ReactNode; tone?: "slate" | "blue" | "amber" | "red" | "green" | "violet"; className?: string }) {
  const colors = { slate: "bg-slate-100 text-slate-600", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-800", red: "bg-rose-50 text-rose-700", green: "bg-emerald-50 text-emerald-700", violet: "bg-violet-50 text-violet-700" }
  return <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-4", colors[tone], className)}><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current"/>{children}</span>
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
  const [messageKind, setMessageKind] = React.useState<"success" | "error">("success")
  const pending = React.useRef(false)
  const run = async (command: ProCommand) => { if (pending.current) return false; pending.current = true; setBusy(true); setMessage(""); try { await commandPro(command, role); await hook.refresh(); setMessageKind("success"); setMessage(command.type === "reminder" ? "독려 발송 기록을 저장했습니다." : command.type === "cancel-reminder" ? "독려 발송 기록을 취소했습니다." : command.type === "clock" ? "테스트 시각을 적용했습니다." : command.type === "clock-real" ? "실제 시각으로 돌아왔습니다." : "저장했습니다."); return true } catch (e) { setMessageKind("error"); setMessage(e instanceof Error ? e.message : "처리에 실패했습니다."); return false } finally { pending.current = false; setBusy(false) } }
  const resetDemo = async () => {
    if (pending.current || role !== "agency") return false
    pending.current = true; setBusy(true); setMessage("")
    try {
      await resetProDemo(role); await hook.refresh()
      setMessageKind("success"); setMessage("예시 데이터를 실제 오늘 기준으로 초기화했습니다.")
      return true
    } catch (e) {
      setMessageKind("error"); setMessage(e instanceof Error ? e.message : "예시 데이터를 초기화하지 못했습니다.")
      return false
    } finally { pending.current = false; setBusy(false) }
  }
  return { ...hook, role, readOnly: role === "admin", busy, message, messageKind, setMessage, runPro: run, resetDemo }
}
export function ProNotice({ hook, transient = false }: { hook: ReturnType<typeof useProManagement>; transient?: boolean }) {
  const { message, messageKind, setMessage } = hook
  React.useEffect(() => {
    if (!transient || !message || messageKind !== "success") return
    const timer = window.setTimeout(() => setMessage(""), 4000)
    return () => window.clearTimeout(timer)
  }, [transient, message, messageKind, setMessage])
  const success = !!message && messageKind === "success" && !hook.error
  return <>{hook.readOnly && <p className="rounded bg-slate-100 p-3 text-sm">본사관리자는 조회만 가능합니다.</p>}{(message || hook.error) && <div role={success ? "status" : "alert"} className={transient && success ? "fixed right-5 bottom-5 z-[160] flex max-w-[calc(100vw-40px)] items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-md" : "rounded bg-blue-50 p-3 text-sm"}><span>{hook.error || message}</span>{transient && success && <button type="button" aria-label="완료 알림 닫기" className="shrink-0 rounded px-1 text-base hover:bg-blue-100 focus-visible:outline-2" onClick={() => setMessage("")}>×</button>}</div>}</>
}
export function ProDemoTools({ hook, onClockChange, onReset }: { hook: ReturnType<typeof useProManagement>; onClockChange?: () => void; onReset?: () => void }) {
  const [time, setTime] = React.useState("")
  const [confirmReset, setConfirmReset] = React.useState(false)
  const pro = hook.db.pro
  const changeClock = async (command: ProCommand) => { if (await hook.runPro(command)) onClockChange?.() }
  const reset = async () => {
    if (await hook.resetDemo()) { setConfirmReset(false); setTime(""); onReset?.() }
  }
  if (!pro) return null
  const identity = new URLSearchParams(window.location.search).get("demoAgency")
  const testHref = identity ? `${STUDENT_FRONT_TEST_PATH}?demoAgency=${encodeURIComponent(identity)}` : STUDENT_FRONT_TEST_PATH
  return <>
    <details className="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
      <summary className="cursor-pointer font-medium">프로토타입 검증 도구 · {pro.clockMode === "test" ? "테스트 시각" : "실제 시각"} (한국 시간) {dateLabel(pro.clock)}</summary>
      <div className="mt-3 space-y-3">
        <p>예시 데이터 적용 기준: {kstDate(pro.effectiveAt)} · 관리월: {pro.effectiveMonth}. 실제 문자 발송 없이 발송 결과를 모의 처리합니다.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link target="_blank" rel="noopener noreferrer" href={testHref}>학생프론트 테스트 열기 ↗</Link></Button>
          {!hook.readOnly && !identity && <Button variant="outline" disabled={hook.busy} onClick={() => { hook.setMessage(""); setConfirmReset(true) }}>예시 데이터 초기화</Button>}
        </div>
        <p className="text-xs text-slate-500">새로고침해도 테스트 기록은 유지됩니다. 초기화 버튼에서 확인하면 공용 프로 예시 데이터가 실제 오늘 기준으로 바뀝니다.</p>
        {!hook.readOnly && <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={hook.busy} onClick={() => changeClock({ type: "clock", at: addDays(weekStart(pro.clock), 7) })}>다음 주 월요일로 테스트</Button>
          <Input aria-label="테스트 시각" className="w-auto" type="datetime-local" value={time} onChange={e => setTime(e.target.value)} />
          <Button variant="outline" disabled={hook.busy || !time} onClick={() => changeClock({ type: "clock", at: new Date(`${time}:00+09:00`).toISOString() })}>테스트 시각 적용</Button>
          <Button variant="outline" disabled={hook.busy || pro.clockMode !== "test"} onClick={() => changeClock({ type: "clock-real" })}>실제 시각으로 돌아가기</Button>
          <p className="w-full text-xs text-slate-500">테스트 시각은 모든 프로 화면에 함께 적용됩니다. ‘실제 시각으로 돌아가기’는 날짜 테스트 시작 전 기록으로 복원하는 기능이며, 예시 데이터 초기화와 다릅니다. 일반 학생 기록은 유지됩니다.</p>
        </div>}
      </div>
    </details>
    {confirmReset && <AgencyConfirmDialog title="예시 데이터 초기화" confirmLabel="초기화" onClose={() => setConfirmReset(false)} onConfirm={() => void reset()} busy={hook.busy}>
      <p>지정된 프로 예시 학생의 테스트 기록을 지우고, 실제 오늘 기준 초기 상태로 되돌립니다. 일반 학생 기록은 유지됩니다.</p>
      <p className="mt-2">테스트 시각도 실제 시각으로 돌아갑니다. 공용 예시 데이터이므로 다른 테스트 사용자에게도 반영됩니다.</p>
      {hook.messageKind === "error" && hook.message && <p role="alert" className="mt-2 text-red-700">{hook.message}</p>}
    </AgencyConfirmDialog>}
  </>
}
