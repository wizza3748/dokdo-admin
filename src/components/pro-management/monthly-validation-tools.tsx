"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { AgencyConfirmDialog } from "@/components/ui/agency-confirm-dialog"
import { monthlyDateTime, monthlyStatus } from "@/lib/pro-monthly"
import type { ReviewDatabase } from "@/lib/review-domain"

const cases = [
  { id:"november", label:"11월 전환·작성·발송 선택", at:"2026-11-25T03:00:00.000Z", month:"2026-11" },
  { id:"overdue", label:"11월 기한 경과", at:"2026-11-30T00:00:00.000Z", month:"2026-11" },
  { id:"december", label:"12월 정기 생성·이전 달 지연", at:"2026-12-21T01:00:00.000Z", month:"2026-12" },
]
export function MonthlyValidationTools({ db }: { db: ReviewDatabase }) {
  const current = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("monthlyTest") ?? ""
  const [selected,setSelected] = React.useState(current || "november"), [busy,setBusy] = React.useState(false), [error,setError] = React.useState("")
  const [reset,setReset] = React.useState(false)
  const prepare = async (action: "prepare" | "reset") => {
    setBusy(true);setError("")
    try {
      const response = await fetch(`/api/mock/monthly-feedback-test?role=agency&monthlyTest=${selected}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})})
      if (!response.ok) throw new Error((await response.json()).message || "검증 예시를 준비하지 못했습니다.")
      window.location.assign(`/agency/pro-management?monthlyTest=${selected}`)
    } catch (e) { setError(e instanceof Error ? e.message : "검증 예시를 준비하지 못했습니다.");setBusy(false) }
  }
  const scenario = cases.find(c=>c.id===current)
  return <details className="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
    <summary className="cursor-pointer font-medium">월간 피드백 검증 도구{scenario ? ` · ${scenario.label} · ${monthlyDateTime(scenario.at)}` : ""}</summary>
    <div className="mt-3 space-y-3">
      <p>기존 학생과 도서를 복사한 브라우저별 전용 예시입니다. 공용 데이터와 학생프론트 테스트 결과는 바뀌지 않습니다.</p>
      <div className="flex flex-wrap items-center gap-2"><select aria-label="월간 피드백 검증 예시" className="h-9 rounded border border-slate-200 bg-white px-3" value={selected} onChange={e=>setSelected(e.target.value)} disabled={busy}>{cases.map(c=><option value={c.id} key={c.id}>{c.label}</option>)}</select><Button variant="outline" disabled={busy} onClick={()=>void prepare("prepare")}>월간 피드백 예시 열기</Button>{current&&<Button variant="outline" disabled={busy} onClick={()=>setReset(true)}>이 예시만 초기화</Button>}</div>
      <p className="text-xs text-slate-500">기준 일시 {monthlyDateTime(cases.find(c=>c.id===selected)!.at)} · 같은 예시를 다시 열어도 테스트 결과를 유지합니다. 실제 단톡방 발송과 AI 호출은 하지 않습니다.</p>
      {scenario&&<><div className="flex flex-wrap gap-4 text-blue-700 underline"><a href={`/agency/pro-management?monthlyTest=${current}`}>주간 관리 현황</a><a href={`/admin/b2c/monthly-feedback?monthlyTest=${current}&month=${scenario.month}`}>본사 월간피드백현황</a><a href={`/agency/pro-management/academy-style?monthlyTest=${current}`}>학원 말투 설정</a><a href="/agency/pro-management">공용 화면으로 돌아가기</a></div><p>최초 전환 실행 {monthlyDateTime(db.pro?.monthly?.transition?.at)} · 말투 갱신 실패 예시는 저장된 학생의 발송 기록으로 확인합니다.</p><ul className="grid gap-2 sm:grid-cols-2">{db.pro?.monthly?.records.filter(r=>r.month===scenario.month).map(r=><li key={r.id}><a className="text-blue-700 underline" href={`/agency/pro-management/students/${r.studentId}?month=${r.month}&monthlyTest=${current}#monthly-feedback`}>{db.pro?.members.find(m=>m.id===r.studentId)?.name}</a> · {monthlyStatus(r)}{!r.required?" · 발송 선택":""}{r.simulateStyleFailureOnce?" · 발송 후 말투 갱신 실패":""}</li>)}</ul></>}
      {error&&<p role="alert" className="text-rose-700">{error}</p>}
    </div>
    {reset&&<AgencyConfirmDialog title="월간 피드백 예시 초기화" closeLabel="취소" confirmLabel="초기화" busy={busy} onClose={()=>setReset(false)} onConfirm={()=>void prepare("reset")}><p>선택한 월간 피드백 예시의 테스트 결과만 초기화합니다. 공용 데이터와 다른 예시는 유지됩니다.</p></AgencyConfirmDialog>}
  </details>
}
