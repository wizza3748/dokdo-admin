"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { AgencyConfirmDialog } from "@/components/ui/agency-confirm-dialog"
import { monthlyDateTime } from "@/lib/pro-monthly"
import { MONTHLY_FIXTURE_VERSION, monthlyContextHref, monthlyDetailCases, monthlyDetailCase, monthlyTestCase, monthlyValidationCases, type MonthlyValidationCase, type MonthlyDetailCase } from "@/lib/monthly-test-context"
import { notifyReviewChange } from "@/lib/review-client"
import type { ReviewDatabase } from "@/lib/review-domain"
import { requestMonthlyNavigation, useMonthlyTest } from "./monthly-test-provider"

export function MonthlyValidationTools({ db, children }: { db: ReviewDatabase; children?: React.ReactNode }) {
  const context = useMonthlyTest(), current = context.scenario
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState("")
  const [reset, setReset] = React.useState(false), [open, setOpen] = React.useState(true)
  const [fault,setFault]=React.useState("monthly-save"),[faultRecord,setFaultRecord]=React.useState(""),[notice,setNotice]=React.useState("")
  const prepare = async (selected: MonthlyValidationCase, action: "prepare" | "reset", detail:MonthlyDetailCase=context.detail) => {
    setBusy(true); setError("")
    try {
      const url = new URL(window.location.href)
      const role = url.pathname.startsWith("/admin/") || url.searchParams.get("role") === "admin" ? "admin" : "agency"
      const query = new URLSearchParams({ role, monthlyTest: selected, monthlyCase:detail })
      if (url.searchParams.get("demoAgency")) query.set("demoAgency", url.searchParams.get("demoAgency")!)
      const response = await fetch(`/api/mock/monthly-feedback-test?${query}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) })
      if (!response.ok) throw new Error((await response.json()).message || "검증 예시를 준비하지 못했습니다.")
      context.apply(monthlyContextHref(url.href, url.href, { select: selected, detail }), action === "reset")
      setReset(false)
    } catch (e) { setError(e instanceof Error ? e.message : "검증 예시를 준비하지 못했습니다.") }
    finally { setBusy(false) }
  }
  const control=async(action:string)=>{
    setBusy(true);setError("");setNotice("")
    try {
      const params=new URLSearchParams({role:window.location.pathname.startsWith("/admin/")?"admin":"agency",monthlyTest:current!,monthlyCase:context.detail})
      const agency=new URLSearchParams(window.location.search).get("demoAgency");if(agency)params.set("demoAgency",agency)
      const response=await fetch(`/api/mock/monthly-feedback-test?${params}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,fault,recordId:faultRecord||available[0]?.id})})
      if(!response.ok)throw new Error((await response.json()).message)
      notifyReviewChange();setNotice(action==="arm-failure"?"해당 학생의 다음 처리에서 한 번 실패합니다.":"정기 생성 시각으로 진행했습니다.")
    } catch(e){setError(e instanceof Error?e.message:"검증 처리를 완료하지 못했습니다.")}
    finally{setBusy(false)}
  }
  const available=db.pro?.monthly?.records.filter(r=>!r.sent&&r.month===monthlyValidationCases[current??"november"].month)??[]
  const select = (value: string) => {
    const selected = monthlyTestCase(value)
    if (selected === current) return
    requestMonthlyNavigation(() => {
      if (selected) void prepare(selected, "prepare", "base")
      else context.apply(monthlyContextHref(window.location.href, window.location.href, { select: null }), false)
    })
  }
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
    <summary className="cursor-pointer font-medium">검증 도구 · {current ? monthlyValidationCases[current].label : "공용 화면"}</summary>
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex flex-wrap items-center gap-2">월간 피드백 예시<select aria-label="월간 피드백 검증 예시" className="h-9 max-w-full rounded border border-slate-200 bg-white px-3" value={current ?? ""} disabled={busy} onChange={event => select(event.target.value)}><option value="">공용 화면</option>{Object.entries(monthlyValidationCases).map(([id, c]) => <option value={id} key={id}>{c.label}</option>)}</select></label>
        {current&&<label className="flex flex-wrap items-center gap-2">확인 항목<select aria-label="월간 피드백 세부 확인 항목" className="h-9 max-w-full rounded border border-slate-200 bg-white px-3" value={context.detail} disabled={busy} onChange={e=>{const detail=monthlyDetailCase(e.target.value);if(detail!==context.detail)requestMonthlyNavigation(()=>void prepare(current,"prepare",detail))}}>{[...new Set(Object.values(monthlyDetailCases).map(c=>c.group))].map(group=><optgroup key={group} label={group}>{Object.entries(monthlyDetailCases).filter(([,c])=>c.group===group).map(([id,c])=><option key={id} value={id}>{c.label}</option>)}</optgroup>)}</select></label>}
        {current && <><Button size="sm" variant="outline" disabled={busy} onClick={() => requestMonthlyNavigation(() => setReset(true))}>이 예시만 초기화</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => select("")}>공용 화면으로 돌아가기</Button></>}
      </div>
      <p role="status" className="text-xs text-slate-500">{busy ? "예시 적용 중…" : `현재 기준 시각 ${monthlyDateTime(db.pro?.clock)} · ${current ? "전용 예시 · 테스트 결과 유지" : db.pro?.clockMode === "test" ? "공용 날짜 검증 중" : "실제 날짜"}`}</p>
      {current&&<><p className="text-xs text-slate-600">{monthlyDetailCases[context.detail].check}</p><p className="text-xs text-slate-500">확인 학생: {db.pro?.members.slice(0,context.detail==="consultations"?5:3).map(m=>m.name).join(", ")}</p>{(db.pro?.monthly?.validation?.version??0)<MONTHLY_FIXTURE_VERSION&&<p className="text-xs text-amber-800">이전 버전 예시입니다. 기존 생성 이력과 테스트 결과를 보존합니다. [이 예시만 초기화]하면 이름과 자료를 최신 예시로 다시 구성합니다.</p>}</>}
      {current&&context.detail==="timing"&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>requestMonthlyNavigation(()=>void control("advance-regular"))}>정기 생성 시각으로 진행</Button>}
      {current&&context.detail==="failures"&&<div className="flex flex-wrap items-center gap-2"><select aria-label="실패 확인 학생" value={faultRecord||available[0]?.id||""} onChange={e=>setFaultRecord(e.target.value)} className="h-9 rounded border px-2">{available.map(r=><option key={r.id} value={r.id}>{db.pro?.members.find(m=>m.id===r.studentId)?.name}</option>)}</select><select aria-label="실패할 처리" value={fault} onChange={e=>setFault(e.target.value)} className="h-9 rounded border px-2">{[["monthly-save","본문 저장"],["monthly-copy","문구 복사"],["monthly-send","발송 기록"],["generation","다시 만들기"],["style","발송 후 말투 갱신"]].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><Button size="sm" variant="outline" disabled={busy||!available.length} onClick={()=>void control("arm-failure")}>다음 처리 한 번 실패</Button></div>}
      {notice&&<p className="text-xs text-slate-600" role="status">{notice}</p>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {!current && children}
    </div>
    {reset && current && <AgencyConfirmDialog title="월간 피드백 예시 초기화" closeLabel="취소" confirmLabel="초기화" busy={busy} onClose={() => setReset(false)} onConfirm={() => void prepare(current, "reset")}><p>선택한 예시의 테스트 결과만 초기화합니다. 공용 데이터와 다른 예시는 유지됩니다.</p></AgencyConfirmDialog>}
  </details>
}
