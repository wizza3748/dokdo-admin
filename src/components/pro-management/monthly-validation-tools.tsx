"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { AgencyConfirmDialog } from "@/components/ui/agency-confirm-dialog"
import { monthlyDateTime } from "@/lib/pro-monthly"
import { monthlyContextHref, monthlyTestCase, monthlyValidationCases, type MonthlyValidationCase } from "@/lib/monthly-test-context"
import type { ReviewDatabase } from "@/lib/review-domain"
import { requestMonthlyNavigation, useMonthlyTest } from "./monthly-test-provider"

export function MonthlyValidationTools({ db, children }: { db: ReviewDatabase; children?: React.ReactNode }) {
  const context = useMonthlyTest(), current = context.scenario
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState("")
  const [reset, setReset] = React.useState(false), [open, setOpen] = React.useState(true)
  const prepare = async (selected: MonthlyValidationCase, action: "prepare" | "reset") => {
    setBusy(true); setError("")
    try {
      const url = new URL(window.location.href)
      const role = url.pathname.startsWith("/admin/") || url.searchParams.get("role") === "admin" ? "admin" : "agency"
      const query = new URLSearchParams({ role, monthlyTest: selected })
      if (url.searchParams.get("demoAgency")) query.set("demoAgency", url.searchParams.get("demoAgency")!)
      const response = await fetch(`/api/mock/monthly-feedback-test?${query}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) })
      if (!response.ok) throw new Error((await response.json()).message || "검증 예시를 준비하지 못했습니다.")
      context.apply(monthlyContextHref(url.href, url.href, { select: selected }), action === "reset")
      setReset(false)
    } catch (e) { setError(e instanceof Error ? e.message : "검증 예시를 준비하지 못했습니다.") }
    finally { setBusy(false) }
  }
  const select = (value: string) => {
    const selected = monthlyTestCase(value)
    if (selected === current) return
    requestMonthlyNavigation(() => {
      if (selected) void prepare(selected, "prepare")
      else context.apply(monthlyContextHref(window.location.href, window.location.href, { select: null }), false)
    })
  }
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
    <summary className="cursor-pointer font-medium">검증 도구 · {current ? monthlyValidationCases[current].label : "공용 화면"}</summary>
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex flex-wrap items-center gap-2">월간 피드백 예시<select aria-label="월간 피드백 검증 예시" className="h-9 max-w-full rounded border border-slate-200 bg-white px-3" value={current ?? ""} disabled={busy} onChange={event => select(event.target.value)}><option value="">공용 화면</option>{Object.entries(monthlyValidationCases).map(([id, c]) => <option value={id} key={id}>{c.label}</option>)}</select></label>
        {current && <><Button size="sm" variant="outline" disabled={busy} onClick={() => requestMonthlyNavigation(() => setReset(true))}>이 예시만 초기화</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => select("")}>공용 화면으로 돌아가기</Button></>}
      </div>
      <p role="status" className="text-xs text-slate-500">{busy ? "예시 적용 중…" : `현재 기준 시각 ${monthlyDateTime(db.pro?.clock)} · ${current ? "전용 예시 · 테스트 결과 유지" : db.pro?.clockMode === "test" ? "공용 날짜 검증 중" : "실제 날짜"}`}</p>
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {!current && children}
    </div>
    {reset && current && <AgencyConfirmDialog title="월간 피드백 예시 초기화" closeLabel="취소" confirmLabel="초기화" busy={busy} onClose={() => setReset(false)} onConfirm={() => void prepare(current, "reset")}><p>선택한 예시의 테스트 결과만 초기화합니다. 공용 데이터와 다른 예시는 유지됩니다.</p></AgencyConfirmDialog>}
  </details>
}
