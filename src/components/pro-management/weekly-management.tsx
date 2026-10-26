"use client"
import * as React from "react"
import Link from "next/link"
import { Check, ChevronLeft, ChevronRight, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addDays, managementMonth, weekdayNames, weekLabel, weekSchedule, weekStart } from "@/lib/pro-calendar"
import { isActivePro, weekdayFor } from "@/lib/pro-domain"
import { proStatuses, taskLabels, weeklyStudent } from "@/lib/pro-selectors"
import { hasPriorOverdue, weeklyColumnHelp, weeklyDate, weeklyDeadline, weeklyTaskHelp } from "@/lib/pro-weekly-presentation"
import { useReviewListPosition } from "@/lib/review-navigation"
import { agencyStudentTestToken } from "@/lib/student-test-context"
import { panel, ProDemoTools, ProNotice, useProManagement } from "./pro-common"
import { ProHelp } from "./pro-help"
import { WeeklyStudentRow } from "./weekly-student-row"
import { WeeklyRecordLegend } from "./weekly-record-marker"
import styles from "./pro-management.module.css"

const taskTones = ["rose", "blue", "amber", "cyan", "green", "violet", "orange"]
const columns = ["학생", "월 주차별 기록", "피드백 이용 권수", "피드백 현황", "제출 독려 현황", "상담 현황", "관리"]
export function WeeklyManagement() {
  const hook = useProManagement(), pro = hook.db.pro
  const [selectedWeek, setSelectedWeek] = React.useState("")
  const [ended, setEnded] = React.useState(false)
  const [filter, setFilter] = React.useState("전체")
  const [task, setTask] = React.useState<number | null>(null)
  const [openedBooks, setOpenedBooks] = React.useState<string[]>([])
  const [restored, setRestored] = React.useState(false)
  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setSelectedWeek(p.get("week") ?? "")
    setFilter(proStatuses.includes(p.get("status") ?? "") ? p.get("status")! : "전체")
    const t = p.get("task")
    setTask(t !== null && /^[0-6]$/.test(t) ? Number(t) : null)
    setEnded(p.get("ended") === "1"); setOpenedBooks(p.getAll("books"))
    p.delete("expanded")
    window.history.replaceState(null, "", `${window.location.pathname}?${p}`)
    setRestored(true)
  }, [])
  const positionRef = useReviewListPosition(hook.loaded && restored, `pro:${selectedWeek || (pro && weekStart(pro.clock))}:${filter}:${task}:${ended}`)
  if (!hook.loaded) return <p className="p-6">주간 관리 현황을 불러오는 중…</p>
  if (!pro) return <p className="p-6">{hook.error || "프로 관리 이력이 없습니다."}</p>
  const current = weekStart(pro.clock), week = selectedWeek && selectedWeek <= current ? selectedWeek : current
  const month = managementMonth(week), activeTask = week === current ? task : null
  const identity = new URLSearchParams(window.location.search).get("demoAgency")
  const studentTest = agencyStudentTestToken()
  const agencyQuery = (identity ? `&demoAgency=${encodeURIComponent(identity)}` : "") + (studentTest ? `&studentTest=${encodeURIComponent(studentTest)}` : "")
  const returnUrl = `/agency/pro-management?week=${encodeURIComponent(week)}&status=${encodeURIComponent(filter)}${activeTask === null ? "" : `&task=${activeTask}`}${ended ? "&ended=1" : ""}${openedBooks.map(id => `&books=${encodeURIComponent(id)}`).join("")}${hook.readOnly ? "&role=admin" : ""}${agencyQuery}`
  const keepUrl = (w: string, status: string, t: number | null) => {
    const p = new URLSearchParams(window.location.search)
    p.set("week", w); p.set("status", status)
    if (t === null) p.delete("task"); else p.set("task", String(t))
    window.history.replaceState(null, "", `?${p}`)
    if (hook.messageKind === "success") hook.setMessage("")
  }
  const all = pro.members.filter(m => m.product === "pro" && (ended || isActivePro(m, pro.clock))).map(m => weeklyStudent(hook.db, m, week))
  const rows = all.filter(r => activeTask !== null ? r.tasks[activeTask] > 0 : filter === "전체" || r.status === filter)
    .sort((a,b) => Number(hasPriorOverdue(b,week)) - Number(hasPriorOverdue(a,week)) || proStatuses.indexOf(a.status) - proStatuses.indexOf(b.status) || ([...a.feedback].sort((x,y) => x.due.localeCompare(y.due))[0]?.due ?? "z").localeCompare([...b.feedback].sort((x,y) => x.due.localeCompare(y.due))[0]?.due ?? "z") || a.member.name.localeCompare(b.member.name))
  const weekday = pro.members[0] ? weekdayFor(pro, pro.members[0], week) : 7, schedule = weekSchedule(week, weekday)
  const dayName = (at: string) => new Intl.DateTimeFormat("ko-KR", { timeZone:"Asia/Seoul", weekday:"short" }).format(new Date(at))
  const moveWeek = (offset: number) => { const w = addDays(week,offset); setSelectedWeek(w); setTask(null); keepUrl(w,filter,null) }
  const toggleBooks = (id: string) => {
    const value = openedBooks.includes(id) ? openedBooks.filter(item => item !== id) : [...openedBooks,id]
    setOpenedBooks(value)
    const p = new URLSearchParams(window.location.search); p.delete("books"); value.forEach(item => p.append("books",item))
    window.history.replaceState(null,"",`?${p}`)
  }
  return <div ref={positionRef} className={`${styles.page} space-y-5`}>
    <h1 className="sr-only">주간 관리 현황</h1><ProNotice hook={hook} transient/>
    <section aria-label="주차와 피드백 일정" className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-2"><Button variant="outline" size="icon-sm" aria-label="이전 주" onClick={() => moveWeek(-7)}><ChevronLeft/></Button><div className="flex flex-wrap items-baseline gap-x-3"><h2 className="text-base font-bold text-slate-900">{weekLabel(week)}</h2><p className="text-xs text-slate-500">{weeklyDate(week)} ~ {weeklyDate(addDays(week,6))}</p></div><Button variant="outline" size="icon-sm" aria-label="다음 주" disabled={week >= current} onClick={() => moveWeek(7)}><ChevronRight/></Button></div>
      <Link className="flex flex-wrap items-center gap-2 py-1 text-sm text-slate-600 hover:text-blue-700" href={`/agency/pro-management/feedback-day?role=${hook.role}${agencyQuery}`}><Settings2 className="size-4 text-slate-400"/><strong>피드백 {weekdayNames[weekday-1]}</strong><span>· 제출 마감 {weeklyDeadline(schedule.cutoff)}</span><span>· 제출 독려 {dayName(schedule.remind1)}·{dayName(schedule.remind2)}</span><span className="text-blue-600">변경</span></Link>
    </section>
    {week === current ? <section className={panel} aria-label="오늘 할 일">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold text-slate-900">오늘 할 일 <span className="ml-1 text-base font-normal text-slate-500">{weeklyDate(pro.clock)}</span></h2><p className="text-xs text-slate-500">항목을 누르면 해당 학생과 글만 표시됩니다.</p></div>
      <div className={styles.taskGrid}>{taskLabels.map((label,index) => {
        const count = all.reduce((s,r) => s+r.tasks[index],0)
        return <div key={label} className={styles.taskCard} data-tone={taskTones[index]} data-selected={activeTask === index}>
          <button type="button" aria-pressed={activeTask === index} className={styles.taskButton} onClick={() => { const next = activeTask === index ? null : index; setTask(next); setFilter("전체"); keepUrl(week,"전체",next) }}><span className={styles.taskTitle}>{label}</span><span className={styles.taskValue}><strong>{count}<small>{index < 2 ? "건" : "명"}</small>{index === 6 && <small className="ml-2">{all.reduce((s,r) => s+(r.tasks[6] ? r.usage.available : 0),0)}권</small>}</strong>{activeTask === index && <Check className="size-4 shrink-0" aria-hidden="true"/>}</span></button>
          <div className={styles.taskHelp}><ProHelp label={`${label} 안내`} lines={weeklyTaskHelp[index]}/></div>
        </div>
      })}</div>
    </section> : <p className="text-sm text-slate-500">과거 주차의 관리 기록입니다.</p>}
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2" aria-label="관리 상태 필터">{["전체",...proStatuses].map(s => <button type="button" key={s} aria-pressed={activeTask === null && filter === s} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${activeTask === null && filter === s ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => { setFilter(s); setTask(null); keepUrl(week,s,null) }}>{s} <strong className="ml-1">{s === "전체" ? all.length : all.filter(r => r.status === s).length}</strong></button>)}</div>
      <button type="button" role="switch" aria-checked={ended} aria-label="종료 학생 보기" className="flex items-center gap-2 rounded-md px-1 py-2 text-xs text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => { const next = !ended; setEnded(next); const p = new URLSearchParams(window.location.search); if(next) p.set("ended","1"); else p.delete("ended"); window.history.replaceState(null,"",`?${p}`) }}><span>종료 학생 보기</span><span aria-hidden="true" className={`relative h-5 w-9 rounded-full ${ended ? "bg-blue-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 left-0 size-4 rounded-full bg-white shadow-sm ${ended ? "translate-x-[18px]" : "translate-x-0.5"}`}/></span></button></div>
      <WeeklyRecordLegend/>
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="프로 주간 관리 학생 목록"><table className={styles.table}><caption className="sr-only">학생 한 명당 한 행으로 월간 기록과 처리할 일을 확인합니다.</caption>
        <colgroup>{[145,205,275,300,250,190,165].map((width,i) => <col key={i} style={{width:`${width/1530*100}%`}}/>)}</colgroup>
        <thead><tr>{columns.map(h => <th key={h} scope="col"><span className="inline-flex items-center gap-1.5">{h === "월 주차별 기록" ? `${Number(month.slice(5))}월 주차별 기록` : h}{weeklyColumnHelp[h] && <ProHelp label={`${h} 안내`} lines={weeklyColumnHelp[h]}/>}</span></th>)}</tr></thead>
        <tbody>{rows.map(row => <WeeklyStudentRow key={row.member.id} hook={hook} row={row} week={week} task={activeTask} returnUrl={returnUrl} agencyQuery={agencyQuery} expanded={openedBooks.includes(row.member.id)} toggle={() => toggleBooks(row.member.id)}/>)}{!rows.length && <tr className={styles.empty}><td colSpan={7} className="text-center text-slate-500">해당 관리 대상이 없습니다.</td></tr>}</tbody>
      </table></div><p className="text-xs text-slate-500">학생 이름을 누르면 권수 조정과 상세 이력을 볼 수 있습니다.</p>
    </section>{!studentTest && <ProDemoTools hook={hook} onClockChange={() => {
      setSelectedWeek(""); setTask(null)
      const params = new URLSearchParams(window.location.search)
      params.delete("week"); params.delete("task")
      window.history.replaceState(null, "", `${window.location.pathname}?${params}`)
    }} onReset={() => {
      setSelectedWeek(""); setTask(null); setFilter("전체"); setEnded(false); setOpenedBooks([])
      const params = new URLSearchParams(window.location.search)
      for (const key of ["week", "task", "status", "ended", "books"]) params.delete(key)
      window.history.replaceState(null, "", `${window.location.pathname}?${params}`)
    }}/>}
  </div>
}
