"use client"
import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addDays, cutoffLabel, dateLabel, kstDate, managementMonth, monthWeeks, weekdayNames, weekLabel, weekSchedule, weekStart } from "@/lib/pro-calendar"
import { isActivePro, weekdayFor } from "@/lib/pro-domain"
import { proStatuses, reminderCopy, selectionLabels, taskLabels, weeklyStudent } from "@/lib/pro-selectors"
import { ExternalBadge, panel, ProBadge, ProDemoTools, ProNotice, ProStatusBadge, useProManagement } from "./pro-common"
import styles from "./pro-management.module.css"

const taskColors = [
  "border-rose-100 bg-rose-50 text-rose-800",
  "border-amber-100 bg-amber-50 text-amber-800",
  "border-orange-100 bg-orange-50 text-orange-800",
  "border-blue-100 bg-blue-50 text-blue-800",
  "border-emerald-100 bg-emerald-50 text-emerald-800",
  "border-violet-100 bg-violet-50 text-violet-800",
  "border-slate-200 bg-slate-50 text-slate-700",
]
type StudentRow = ReturnType<typeof weeklyStudent>

export function WeeklyManagement() {
  const hook = useProManagement(), pro = hook.db.pro
  const [selectedWeek, setSelectedWeek] = React.useState("")
  const [ended, setEnded] = React.useState(false)
  const [filter, setFilter] = React.useState("전체")
  const [task, setTask] = React.useState<number | null>(null)
  const [copied, setCopied] = React.useState("")
  const [copiedKey, setCopiedKey] = React.useState("")
  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setSelectedWeek(p.get("week") ?? "")
    setFilter(p.get("status") ?? "전체")
    const t = p.get("task")
    setTask(t === null ? null : Number(t))
  }, [])
  if (!hook.loaded) return <p className="p-6">주간 관리 현황을 불러오는 중…</p>
  if (!pro) return <p className="p-6">{hook.error || "프로 관리 이력이 없습니다."}</p>
  const current = weekStart(pro.clock), week = selectedWeek && selectedWeek <= current ? selectedWeek : current
  const month = managementMonth(week), weeks = monthWeeks(month)
  const roleQuery = hook.readOnly ? "&role=admin" : ""
  const keepUrl = (w: string, status: string, t: number | null) => {
    window.history.replaceState(null, "", `?week=${encodeURIComponent(w)}&status=${encodeURIComponent(status)}${t === null ? "" : `&task=${t}`}${roleQuery}`)
  }
  const all = pro.members.filter(m => m.product === "pro" && (ended || isActivePro(m, pro.clock))).map(m => weeklyStudent(hook.db, m, week))
  const rows = all.filter(r => task !== null ? r.tasks[task] > 0 : filter === "전체" || r.status === filter)
    .sort((a, b) => proStatuses.indexOf(a.status) - proStatuses.indexOf(b.status) || (a.feedback[0]?.due ?? "z").localeCompare(b.feedback[0]?.due ?? "z") || a.member.name.localeCompare(b.member.name))
  const older = all.flatMap(row => row.feedback.filter(f => f.week < week && (task === null || task === 0 && f.due < pro.clock)).map(f => ({ ...f, row })))
  const teacher = pro.members[0], weekday = teacher ? weekdayFor(pro, teacher, week) : 7
  const schedule = weekSchedule(week, weekday)
  const detailLink = (recordId: string) => `/agency/online-workbooks/${recordId}?role=${hook.role}&returnTo=${encodeURIComponent(`/agency/pro-management?week=${encodeURIComponent(week)}&status=${encodeURIComponent(filter)}${task === null ? "" : `&task=${task}`}${roleQuery}`)}`
  const studentLink = (row: StudentRow) => `/agency/pro-management/students/${row.member.id}?month=${month}&role=${hook.role}`
  const copy = async (studentId: string, kind: "submission" | "revision") => {
    const member = pro.members.find(m => m.id === studentId)!
    const text = reminderCopy(hook.db, member, kind, week)
    try { await navigator.clipboard.writeText(text); setCopiedKey(`${studentId}:${kind}`) }
    catch { hook.setMessage("복사 권한이 없어 아래 문구를 직접 복사해 주세요.") }
    setCopied(text)
  }
  const moveWeek = (offset: number) => {
    const w = addDays(week, offset)
    setSelectedWeek(w); setTask(null); keepUrl(w, filter, null)
  }
  const taskDescriptions = [
    "처리 기한을 지난 관리 건",
    `피드백 기한 ${dateLabel(schedule.due)}`,
    `1차 ${dateLabel(schedule.remind1)} · 2차 ${dateLabel(schedule.remind2)}`,
    "2차 글 제출을 기다리는 학생",
    "이번 달 예정일이 오늘인 학생",
    "마지막 주 상담 기록 확인",
    "이번 달 남은 미선정 기회",
  ]
  const studentCell = (row: StudentRow) => <div className="space-y-1.5">
    <div><Link className="font-semibold text-slate-800 hover:text-blue-600 hover:underline" href={studentLink(row)}>{row.member.name}</Link><ExternalBadge/></div>
    <p className="text-xs text-slate-500">{row.member.level}레벨 · 프로</p>
    {row.missed >= 2 && <ProBadge tone="red">{row.missed >= 3 ? "본사 확인 필요" : "집중 관리"}</ProBadge>}
    {row.missed === 2 && <p className="text-xs text-rose-700">학부모 상담 권유</p>}
    <Link className="block text-xs text-blue-600 hover:underline" href={`/agency/online-workbooks?pro=1&studentId=${row.member.id}&role=${hook.role}`}>독후감 목록 보기 →</Link>
  </div>
  const weekCell = (row: StudentRow) => <div className="flex gap-1" aria-label="월별 주차 기록">
    {weeks.map((w, i) => {
      const before = !row.member.assignedAt || w < weekStart(row.member.assignedAt) || w < weekStart(row.member.effectiveAt)
      const managed = row.cases.some(c => c.week === w && c.firstSentAt)
      const submitted = row.cases.some(c => c.week === w)
      const label = before || w > current ? "-" : managed ? "관리" : w < current ? submitted ? "제출" : "미제출" : "이번 주"
      return <span key={w} title={`${weekLabel(w)} · ${label}`} className={`flex min-w-6 flex-col items-center gap-1 text-[11px] ${w === week ? "font-bold text-blue-700" : "text-slate-500"}`}>
        <span>{i + 1}주</span><span className={`grid size-6 place-items-center rounded-md border ${w === week ? "ring-2 ring-blue-500 ring-offset-2" : ""} ${managed ? "border-emerald-600 bg-emerald-600 text-white" : label === "미제출" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>{managed ? "✓" : label === "미제출" ? "−" : "·"}</span>
        <span className="sr-only">{label}</span>
      </span>
    })}
  </div>
  const usageCell = (row: StudentRow) => <div className="space-y-1">
    <p><strong className="text-base tabular-nums text-slate-800">{row.usage.used}/{row.usage.limit}</strong><span className="ml-1 text-xs text-slate-500">권 사용</span></p>
    <p>추가 신청 <strong className="text-blue-700">{row.usage.available}권</strong></p>
    <p className="text-xs text-slate-500">전송 전 선정 {row.usage.pending}권{row.usage.rollover > 0 && <><br/>이월 {row.usage.rollover}권 포함</>}</p>
    {row.usage.limit !== 4 && <ProBadge tone="violet">수동 조정</ProBadge>}
  </div>
  const consultationCell = (row: StudentRow) => <Link href={`${studentLink(row)}#consultation`} className="block space-y-2 hover:underline">
    <ProBadge tone={row.consulted ? "green" : row.tasks[4] ? "blue" : "slate"}>{row.consulted ? "상담 완료" : row.tasks[4] ? "오늘 상담" : "상담 예정"}</ProBadge>
    <span className="block text-xs">{dateLabel(row.consultDue)}</span><span className="block text-xs text-blue-600">상담 기록 →</span>
  </Link>
  const reminderCell = (row: StudentRow, sequence: 1 | 2) => {
    const rowSchedule = weekSchedule(week, weekdayFor(pro, row.member, week))
    const assignedWeek = row.member.assignedAt && weekStart(row.member.assignedAt) === week
    const kinds = ["submission", "revision"] as const
    const visible = (kind: typeof kinds[number]) => pro.reminders.some(r => r.studentId === row.member.id && r.week === week && r.kind === kind && r.sequence === sequence && !r.cancelledAt) || (kind === "submission" ? row.tasks[2] > 0 : row.waiting.length > 0)
    const renderKind = (kind: typeof kinds[number]) => {
      const record = pro.reminders.find(r => r.studentId === row.member.id && r.week === week && r.kind === kind && r.sequence === sequence && !r.cancelledAt)
      const hasFirst = pro.reminders.some(r => r.studentId === row.member.id && r.week === week && r.kind === kind && r.sequence === 1 && !r.cancelledAt)
      const relevant = kind === "submission" ? row.tasks[2] > 0 : row.tasks[3] > 0
      const scheduled = sequence === 1 ? rowSchedule.remind1 : rowSchedule.remind2
      return <div key={kind} className="space-y-1.5">
        <p className="text-xs font-medium text-slate-600">{kind === "submission" ? "제출 독려" : "수정본 독려"}</p>
        {record ? <><ProBadge tone="green">기록 완료</ProBadge><p className="text-xs text-slate-500">{dateLabel(record.at)}<br/>{record.actor}</p>{!hook.readOnly && <Button variant="ghost" size="xs" disabled={hook.busy || kstDate(record.at) !== kstDate(pro.clock)} onClick={() => hook.runPro({ type: "cancel-reminder", id: record.id })}>기록 취소</Button>}</> : <>
          <span className={`block text-xs ${relevant ? "font-medium text-orange-700" : "text-slate-500"}`}>{assignedWeek ? "배정 주 제외" : relevant && scheduled <= pro.clock ? kstDate(scheduled) < kstDate(pro.clock) ? "독려 기록 지연" : "오늘 독려" : dateLabel(scheduled)}</span>
          <div className="flex flex-wrap gap-1"><Button variant="outline" size="xs" onClick={() => copy(row.member.id, kind)}>문구 복사</Button>{!hook.readOnly && <Button variant="outline" size="xs" disabled={hook.busy || week !== current || sequence === 2 && !hasFirst} onClick={() => hook.runPro({ type: "reminder", studentId: row.member.id, week, kind, sequence })}>{copiedKey === `${row.member.id}:${kind}` ? "보냈어요" : "바로 기록"}</Button>}</div>
          {sequence === 2 && !hasFirst && <p className="text-[11px] text-slate-400">1차 기록 후 가능</p>}
        </>}
      </div>
    }
    const main = kinds.filter(visible), extra = kinds.filter(kind => !visible(kind))
    return <div className="space-y-3">{main.map(renderKind)}{!main.length && <span className="text-slate-400">-</span>}{extra.length > 0 && <details className="text-xs"><summary className="cursor-pointer text-slate-500">기록 추가</summary><div className="mt-3 space-y-3">{extra.map(renderKind)}</div></details>}</div>
  }

  return <div className={`${styles.page} space-y-5`}>
    <h1 className="text-2xl font-semibold text-slate-900">주간 관리 현황</h1>
    <ProNotice hook={hook}/>
    <section className={`${panel} flex flex-wrap items-center justify-between gap-4`}>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" aria-label="이전 주" onClick={() => moveWeek(-7)}><ChevronLeft/></Button>
        <div><h2 className="text-lg font-bold text-slate-900">{weekLabel(week)}</h2><p className="text-xs text-slate-500">{kstDate(week)} ~ {kstDate(addDays(week, 6))}</p></div>
        <Button variant="outline" size="icon-sm" aria-label="다음 주" disabled={week >= current} onClick={() => moveWeek(7)}><ChevronRight/></Button>
      </div>
      <Link className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-blue-50" href={`/agency/pro-management/feedback-day?role=${hook.role}`}>
        <Settings2 className="size-4 text-slate-400"/><strong>피드백 {weekdayNames[weekday - 1]}</strong><span>· 마감 {cutoffLabel(schedule.cutoff)}</span><span className="text-blue-600">변경</span>
      </Link>
    </section>
    {week === current ? <section className={panel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-slate-900">오늘 할 일 <span className="ml-1 text-sm font-normal text-slate-500">{kstDate(pro.clock)}</span></h2><p className="text-xs text-slate-500">항목을 누르면 해당 학생만 표시됩니다. 처리하면 숫자가 줄어듭니다.</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-7">{taskLabels.map((label, index) => <button type="button" key={label} aria-pressed={task === index} className={`min-w-0 rounded-lg border p-3 text-left transition hover:shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600 ${taskColors[index]} ${task === index ? "ring-2 ring-blue-500 ring-offset-2" : ""}`} onClick={() => { setTask(index); setFilter("전체"); keepUrl(week, "전체", index) }}>
        <span className="text-[13px] font-medium">{label}</span><strong className="my-1 block text-2xl tabular-nums">{all.reduce((s, r) => s + r.tasks[index], 0)}<small className="ml-1 text-sm font-medium">{index < 2 ? "건" : "명"}</small>{index === 6 && <small className="ml-2 text-sm">{all.reduce((s, r) => s + (r.tasks[6] ? r.usage.available : 0), 0)}권</small>}</strong><span className="block text-[11px] leading-5 opacity-80">{taskDescriptions[index]}</span>
      </button>)}</div>
    </section> : <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">과거 주차의 관리 기록입니다. 현재 할 일 카드는 표시하지 않습니다.</p>}
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">{["전체", ...proStatuses].map(s => <button type="button" aria-pressed={filter === s && task === null} key={s} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === s && task === null ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => { setFilter(s); setTask(null); keepUrl(week, s, null) }}>{s} <span className="ml-1 font-bold">{s === "전체" ? all.length : all.filter(r => r.status === s).length}</span></button>)}</div>
        <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={ended} onChange={e => setEnded(e.target.checked)}/>종료 학생 보기</label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><p>표시 학생 <strong>{rows.length}명</strong>{task !== null && ` · ${taskLabels[task]}`}</p><p><span className="text-emerald-600">■</span> 관리함 <span className="ml-2 text-rose-400">■</span> 미제출 <span className="ml-2 text-blue-600">□</span> 이번 주</p></div>
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="프로 주간 관리 학생 목록">
        <table className={styles.table}>
          <caption className="sr-only">프로 학생별 월 주차 기록, 이용 권수, 제출 및 피드백, 처리 기한, 독려와 상담</caption>
          <colgroup>{[135, 160, 125, 195, 135, 130, 135, 135, 135].map((width, i) => <col key={i} style={{ width }}/>)}</colgroup>
          <thead><tr>{["학생", `${Number(month.slice(5))}월 주차별 기록`, "이용 권수", "이번 주 제출 · 피드백 대상", "관리 상태", "처리 기한", "독려 1차", "독려 2차", "이번 달 상담"].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>
            {older.length > 0 && <tr className={`${styles.group} ${styles.overdueGroup}`}><th colSpan={9} scope="rowgroup">지난주 미완료 · {older.length}건</th></tr>}
            {older.map(f => <tr key={f.record.id}>
              <td data-label="학생">{studentCell(f.row)}</td><td data-label="월별 주차 기록">{weekCell(f.row)}</td><td data-label="이용 권수">{usageCell(f.row)}</td>
              <td data-label="제출 글 · 피드백 대상"><p className="font-medium">{hook.db.reviews.find(c => c.id === f.c.reviewId)?.bookTitle}</p><p className="mt-1 text-xs text-slate-500">{f.record.round}차 · {weekLabel(f.week)}</p><p className="mt-2"><ProBadge tone="blue">{f.record.round === 2 ? "2차 수정본" : f.c.selection ? selectionLabels[f.c.selection] : "미선정"}</ProBadge></p></td>
              <td data-label="관리 상태"><ProStatusBadge status={f.due < pro.clock ? "지연" : "피드백 필요"}/><Button asChild size="sm" className="mt-2"><Link href={detailLink(f.record.id)}>피드백 {hook.readOnly ? "조회" : "작성"}</Link></Button></td>
              <td data-label="처리 기한" className={f.due < pro.clock ? "font-medium text-rose-700" : ""}>{dateLabel(f.due)}</td>
              <td data-label="독려 1차">-</td><td data-label="독려 2차">-</td><td data-label="이번 달 상담">{consultationCell(f.row)}</td>
            </tr>)}
            <tr className={styles.group}><th colSpan={9} scope="rowgroup">{week === current ? "이번 주" : "선택 주차"} · {weekLabel(week)}</th></tr>
            {rows.map(row => <tr key={row.member.id}>
              <td data-label="학생">{studentCell(row)}</td><td data-label="월별 주차 기록">{weekCell(row)}</td><td data-label="이용 권수">{usageCell(row)}</td>
              <td data-label="이번 주 제출 · 피드백 대상"><p className="mb-2 font-medium">1차 제출 {row.submissions.length}편</p><div className="space-y-3">{row.submissions.map(c => <div key={c.reviewId}><p className="text-xs">{hook.db.reviews.find(r => r.id === c.reviewId)?.bookTitle}</p><span className="mt-1 inline-block"><ProBadge tone={c.selection ? "blue" : "slate"}>{c.selection ? selectionLabels[c.selection] : "미선정"}</ProBadge></span></div>)}{row.feedback.filter(f => f.record.round === 2 && f.week === week).map(f => <div key={f.record.id}><p className="text-xs">{hook.db.reviews.find(r => r.id === f.c.reviewId)?.bookTitle}</p><ProBadge tone="green">2차 수정본 제출</ProBadge></div>)}{row.waiting.map(c => <p className="text-xs text-blue-700" key={c.reviewId}>2차 대기 · {dateLabel(c.secondDeadline)}까지</p>)}</div></td>
              <td data-label="관리 상태"><ProStatusBadge status={row.status}/><div className="mt-2 space-y-2">{row.feedback.filter(f => f.week === week && (task === 0 ? f.due < pro.clock : task === 1 ? f.due >= pro.clock : true)).map(f => <Button asChild key={f.record.id} size="sm"><Link href={detailLink(f.record.id)}>{f.record.round}차 피드백 {hook.readOnly ? "조회" : "작성"}</Link></Button>)}</div></td>
              <td data-label="처리 기한"><div className="space-y-2">{row.feedback.filter(f => f.week === week).map(f => <p key={f.record.id} className={f.due < pro.clock ? "text-rose-700" : ""}>{f.record.round}차 {dateLabel(f.due)}</p>)}{!row.feedback.some(f => f.week === week) && (row.status === "자동 선정 대기" ? <p className="text-slate-500">{dateLabel(weekSchedule(week, weekdayFor(pro, row.member, week)).due)}<span className="block text-xs">선정 후 처리</span></p> : <span className="text-slate-400">-</span>)}</div></td>
              <td data-label="독려 1차">{reminderCell(row, 1)}</td><td data-label="독려 2차">{reminderCell(row, 2)}</td><td data-label="이번 달 상담">{consultationCell(row)}</td>
            </tr>)}
            {!rows.length && <tr className={styles.empty}><td colSpan={9} className="text-center text-slate-500">해당 관리 대상이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">실제 독려는 학부모 단체 대화방에서 선생님이 직접 발송합니다. 문구 복사는 발송 기록이 아닙니다.</p>
    </section>
    {copied && <section className={panel}><h2 className="font-semibold">복사 문구 미리보기</h2><p className="mt-2 whitespace-pre-line text-sm leading-6">{copied}</p></section>}
    <ProDemoTools hook={hook}/>
  </div>
}
