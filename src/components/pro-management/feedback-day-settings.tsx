"use client"
import * as React from "react"
import Link from "next/link"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addDays, weekdayNames, weekStart } from "@/lib/pro-calendar"
import { weekdayFor } from "@/lib/pro-domain"
import { feedbackDaySchedule } from "@/lib/pro-feedback-day-presentation"
import { panel, ProNotice, useProManagement } from "./pro-common"
import styles from "./pro-management.module.css"

export function FeedbackDaySettings() {
  const hook = useProManagement()
  const [selectedDay, setWeekday] = React.useState<number | null>(null)
  const pro = hook.db.pro
  if (!hook.loaded) return <p className="p-6">불러오는 중…</p>
  if (!pro) return <p className="p-6">{hook.error || "프로 관리 이력이 없습니다."}</p>
  const member = pro.members.find(m => m.product === "pro" && m.institutionId)
  const current = member ? weekdayFor(pro, member, weekStart(pro.clock)) : 7
  const nextWeek = addDays(weekStart(pro.clock), 7)
  const pending = pro.schedules.find(s => s.institutionId === member?.institutionId && s.from === nextWeek)
  const weekday = selectedDay ?? pending?.weekday ?? current
  const preview = feedbackDaySchedule(nextWeek, weekday)
  return <div className={`${styles.page} space-y-5`}>
    <div className="flex flex-wrap items-center justify-start gap-3"><h1 className="sr-only">피드백 요일 설정</h1><Button asChild variant="outline"><Link href={`/agency/pro-management?role=${hook.role}`}>주간 관리 현황</Link></Button></div>
    <ProNotice hook={hook} transient/>
    <section className={`${panel} space-y-5`} aria-label="피드백 요일 설정">
      <div>
        <h2 className="mb-3 font-bold text-slate-900">피드백 요일 <span className="ml-2 text-xs font-normal text-slate-500">일요일 권장</span></h2>
        <div role="radiogroup" aria-label="피드백 요일" className="flex flex-wrap gap-2">{weekdayNames.map((day, i) => <button type="button" key={day} role="radio" aria-checked={weekday === i + 1} disabled={hook.readOnly} onClick={() => setWeekday(i + 1)} className={`h-11 min-w-12 rounded-lg border px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed ${weekday === i + 1 ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white hover:border-blue-300"}`}>{day.slice(0, 1)}</button>)}</div>
        <p className="mt-3 text-sm leading-6 text-slate-600">매주 피드백을 학생에게 보내야 하는 기준 요일입니다. 선택한 요일에 따라 제출·피드백 신청 마감일과 제출 독려일이 함께 정해집니다.</p>
        {weekday !== 7 && <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><Info className="mt-0.5 size-4 shrink-0"/>일요일을 권장합니다. 다른 요일을 선택하면 제출 주차와 피드백 처리 주차가 달라질 수 있습니다.</p>}
      </div>
      <div>
        <h2 className="mb-3 font-bold text-slate-900">제출·독려 일정</h2>
        <dl className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 text-sm">
          {preview.map(({ label, value }) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:grid-cols-[200px_minmax(0,1fr)]"><dt className="bg-slate-50 px-4 py-3 text-slate-500">{label}</dt><dd className="px-4 py-3 font-semibold text-slate-900">{value}</dd></div>)}
        </dl>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-500">변경한 요일은 다음 주부터 적용됩니다.</p>
        {!hook.readOnly && <Button disabled={hook.busy || !member} onClick={async () => { if (await hook.runPro({ type: "schedule", weekday })) hook.setMessage("피드백 요일을 저장했습니다. 다음 주부터 적용됩니다.") }}>{hook.busy ? "저장 중…" : "저장"}</Button>}
      </div>
    </section>
  </div>
}
