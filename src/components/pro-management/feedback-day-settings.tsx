"use client"
import * as React from "react"
import Link from "next/link"
import { CalendarDays, Info, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addDays, cutoffLabel, dateLabel, kstDate, weekdayNames, weekSchedule, weekStart } from "@/lib/pro-calendar"
import { weekdayFor } from "@/lib/pro-domain"
import { field, panel, ProBadge, ProNotice, useProManagement } from "./pro-common"
import styles from "./pro-management.module.css"

export function FeedbackDaySettings() {
  const hook = useProManagement()
  const [weekday, setWeekday] = React.useState(7)
  const [teacherId, setTeacherId] = React.useState("teacher-1")
  const pro = hook.db.pro
  if (!hook.loaded) return <p className="p-6">불러오는 중…</p>
  if (!pro) return <p className="p-6">{hook.error || "프로 관리 이력이 없습니다."}</p>
  const member = pro.members.find(m => m.teacherId === teacherId)
  const current = member ? weekdayFor(pro, member, weekStart(pro.clock)) : 7
  const nextWeek = addDays(weekStart(pro.clock), 7), preview = weekSchedule(nextWeek, weekday)
  const pending = pro.schedules.find(s => s.teacherId === teacherId && s.from === nextWeek)
  return <div className={`${styles.page} space-y-5`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold text-slate-900">피드백 요일 설정</h1><Button asChild variant="outline"><Link href={`/agency/pro-management?role=${hook.role}`}>주간 관리 현황</Link></Button></div>
    <ProNotice hook={hook}/>
    <section className={`${panel} max-w-4xl space-y-7 sm:p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <label className="flex flex-wrap items-center gap-3 text-sm font-medium">담당 선생님<select className={field} value={teacherId} onChange={e => setTeacherId(e.target.value)}>{[...new Set(pro.members.map(m => m.teacherId))].map(id => <option key={id} value={id}>담당 선생님 ({id})</option>)}</select></label>
        <div className="flex flex-wrap gap-2"><ProBadge tone="blue">현재 {weekdayNames[current - 1]}</ProBadge>{pending && <ProBadge>다음 주 {weekdayNames[pending.weekday - 1]} 적용 예정</ProBadge>}</div>
      </div>
      <div>
        <h2 className="mb-3 font-bold text-slate-900">피드백 요일 <span className="ml-2 text-xs font-normal text-slate-500">하나 선택 · 일요일 권장</span></h2>
        <div role="radiogroup" aria-label="피드백 요일" className="flex flex-wrap gap-2">{weekdayNames.map((day, i) => <button type="button" key={day} role="radio" aria-checked={weekday === i + 1} disabled={hook.readOnly} onClick={() => setWeekday(i + 1)} className={`h-11 min-w-12 rounded-lg border px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed ${weekday === i + 1 ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white hover:border-blue-300"}`}>{day.slice(0, 1)}</button>)}</div>
        <p className="mt-3 text-sm leading-6 text-slate-500">실제로 피드백하는 날입니다. 전날 밤 12시가 제출·신청 마감이고, 독려 일정은 자동으로 정해집니다.</p>
        {weekday !== 7 && <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><Info className="mt-0.5 size-4 shrink-0"/>일요일을 권장합니다. 다른 요일을 선택하면 제출 주차와 피드백 처리 주차가 달라질 수 있습니다.</p>}
      </div>
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><CalendarDays className="size-4 text-slate-400"/>이 요일로 정해지는 일정</h2>
        <dl className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 text-sm">
          {[["제출·신청 마감", cutoffLabel(preview.cutoff)], ["1차 독려", `${dateLabel(preview.remind1)} · 마감 2일 전`], ["2차 독려", `${dateLabel(preview.remind2)} · 마감 전날`], ["피드백 처리 기한", dateLabel(preview.due)]].map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(110px,0.7fr)_minmax(0,1.3fr)]"><dt className="bg-slate-50 px-4 py-3 text-slate-500">{label}</dt><dd className="px-4 py-3 font-semibold">{value}</dd></div>)}
        </dl>
        <p className="mt-2 text-xs leading-5 text-slate-500">독려 요일에는 미제출 학생과 수정본을 내지 않은 학생이 함께 할 일에 올라옵니다.</p>
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-800"><MessageSquare className="size-4"/>학생 안내</h2>
        <p className="text-sm leading-7 text-slate-700">{cutoffLabel(preview.cutoff)}까지 피드백받을 글을 골라 주세요. 남은 자리는 최근에 제출한 글부터 자동으로 골라요.</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-5">
        <div><p className="font-semibold">적용 시작일 <span className="ml-2 text-blue-700">{kstDate(nextWeek)} 월요일</span></p><p className="mt-2 text-xs leading-5 text-slate-500">저장하면 다음 주부터 적용됩니다.<br/>이미 배정된 관리 건의 마감과 처리 기한은 변경되지 않습니다.</p></div>
        {!hook.readOnly && <Button disabled={hook.busy} onClick={async () => { if (await hook.runPro({ type: "schedule", weekday, teacherId })) hook.setMessage(`피드백 요일을 저장했습니다. ${kstDate(nextWeek)}부터 적용됩니다.`) }}>저장</Button>}
      </div>
    </section>
  </div>
}
