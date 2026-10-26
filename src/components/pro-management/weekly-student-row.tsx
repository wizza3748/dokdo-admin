"use client"
import Link from "next/link"
import { OctagonAlert, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addDays, kstDate, managementMonth, monthWeeks, weekLabel } from "@/lib/pro-calendar"
import { feedbackActionLabel, proCaseStatus, weeklyTaskBooks, type weeklyStudent } from "@/lib/pro-selectors"
import { consultationSummary, hasPriorOverdue, weeklyDate, weeklyDeadline, weeklyRecord, weeklyWarning } from "@/lib/pro-weekly-presentation"
import { ExternalBadge, ProBadge, type useProManagement } from "./pro-common"
import { ProHelp } from "./pro-help"
import { WeeklyReminders } from "./weekly-reminders"
import { WeeklyRecordMarker } from "./weekly-record-marker"
import styles from "./pro-management.module.css"
import { activeFeedbackScheduleAt } from "@/lib/review-schedule"
import { FeedbackScheduleStatus } from "@/components/online-workbooks/review-schedule-status"

type Row = ReturnType<typeof weeklyStudent>
function FeedbackStatus({ status }: { status: string }) {
  return <span className={styles.feedbackStatus} data-status={status}>{status}</span>
}
export function WeeklyStudentRow({ hook, row, week, task, returnUrl, agencyQuery, expanded, toggle }: {
  hook: ReturnType<typeof useProManagement>; row: Row; week: string; task: number | null;
  returnUrl: string; agencyQuery: string; expanded: boolean; toggle: () => void;
}) {
  const month = managementMonth(week), member = row.member
  const studentUrl = `/agency/pro-management/students/${member.id}?month=${month}&role=${hook.role}${agencyQuery}&returnTo=${encodeURIComponent(returnUrl)}`
  const detailUrl = (id: string) => `/agency/online-workbooks/${id}?role=${hook.role}${agencyQuery}&returnTo=${encodeURIComponent(returnUrl)}`
  const books = weeklyTaskBooks(row, week, row.asOf, task), jobs = books.feedback, primary = jobs[0], waiting = books.waiting[0]
  const otherCases = [...new Map([...books.waiting, ...books.submissions].filter(c => !jobs.some(f => f.c.reviewId === c.reviewId)).map(c => [c.reviewId, c])).values()]
  const consult = consultationSummary(row, week)
  const warning = weeklyWarning(row)
  const book = (id: string) => hook.db.reviews.find(r => r.id === id)
  const title = (id: string) => book(id)?.bookTitle ?? "온라인 독후감"
  const bookLine = (id: string, round: number) => <p className="truncate font-medium text-slate-900" title={`${title(id)} · ${round}차 · ${book(id)?.level ?? "-"}레벨`}>{title(id)} <span className="text-xs font-normal text-slate-500">· {round}차 · {book(id)?.level ?? "-"}레벨</span></p>
  const feedbackInfo = (f: Row["feedback"][number]) => <div className="space-y-2" data-feedback-record={f.record.id}>
    <div className="flex flex-wrap items-center gap-1.5"><FeedbackStatus status={f.due < row.asOf ? "지연" : "피드백 필요"}/><span className="text-xs font-medium text-slate-700">{f.record.savedAt ? "전송 대기" : "작성 필요"}</span><span className="text-xs text-slate-600">· 처리 {weeklyDate(f.due)}까지</span></div><FeedbackScheduleStatus schedule={activeFeedbackScheduleAt(f.record, row.asOf)}/>{bookLine(f.c.reviewId, f.record.round)}
  </div>
  const feedbackButton = (f: Row["feedback"][number]) => <Button asChild size="sm" variant={feedbackActionLabel(f.record, hook.readOnly) === "피드백 작성" ? "default" : "outline"} className={!hook.readOnly && feedbackActionLabel(f.record) === "피드백 확인" ? styles.feedbackReviewButton : undefined}><Link aria-label={`${title(f.c.reviewId)} ${f.record.round}차 ${feedbackActionLabel(f.record, hook.readOnly)}`} href={detailUrl(f.record.id)}>{feedbackActionLabel(f.record, hook.readOnly)}</Link></Button>
  const primaryOther = !primary ? waiting ?? otherCases[0] : undefined
  const remaining = otherCases.filter(c => c.reviewId !== primaryOther?.reviewId)
  return <tr data-student-row={member.id} className={hasPriorOverdue(row, week) ? styles.priorOverdue : undefined}>
    <td data-label="학생"><div className="flex items-center gap-1 whitespace-nowrap">
      {warning && <ProHelp label={`${member.name} ${warning.label}`} trigger={warning.level === "hq" ? <OctagonAlert className="size-4 text-rose-600"/> : <TriangleAlert className="size-4 text-amber-600"/>} lines={warning.lines}><strong>{warning.label} · {row.missed}주 연속 미제출</strong></ProHelp>}
      {member.caseOnly ? <span className="font-semibold text-slate-900">{member.name}</span> : <Link className="cursor-pointer rounded-sm font-semibold text-blue-700 underline decoration-blue-400 decoration-1 underline-offset-4 hover:text-blue-800 hover:decoration-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" href={studentUrl}>{member.name}</Link>}{member.external && <ExternalBadge/>}
    </div></td>
    <td data-label={`${Number(month.slice(5))}월 주차별 기록`}><div className="flex gap-1.5" aria-label={`${Number(month.slice(5))}월 주차별 기록`}>{monthWeeks(month).map(w => {
      const info = weeklyRecord(hook.db, member, w, row.asOf, hook.db.pro!.clock)
      return <ProHelp key={w} label={`${member.name} ${weekLabel(w)} ${info.label}${info.current ? " 현재 주" : ""}`} trigger={<WeeklyRecordMarker label={info.label} current={info.current}/>} lines={[`기간: ${weeklyDate(w)} ~ ${weeklyDate(addDays(w,6))}`, `상태: ${info.label}`, `제출한 독후감: ${info.submitted}건`, `전송한 피드백: ${info.sent}건`]}><strong>{weekLabel(w)}{info.current ? " · 현재 주" : ""}</strong></ProHelp>
    })}</div></td>
    <td data-label="피드백 이용 권수">{member.caseOnly ? <span className="text-slate-400">—</span> : <div className={`${styles.usage} ${styles.weeklyUsage}`}>
      <div className={styles.usagePrimary}><span className={styles.usageAmount}><strong>{row.usage.used}</strong><span>/ {row.usage.limit}권 사용</span></span></div>
      <p className={styles.usageAvailable}>남은 신청 권수 <strong>{row.usage.available}권</strong>{row.usage.rolloverAvailable > 0 && <span className={`${styles.usageRollover} ml-1.5 whitespace-nowrap`}>(이월 {row.usage.rolloverAvailable}권 포함)</span>}</p>
    </div>}</td>
    <td data-label="피드백 현황">{primary ? feedbackInfo(primary) : waiting ? <div className="space-y-2"><div className="flex flex-wrap items-center gap-1.5"><FeedbackStatus status="2차 대기"/><span className="text-xs">학생 제출 {weeklyDeadline(waiting.secondDeadline)}까지</span></div>{bookLine(waiting.reviewId,2)}</div> : task !== null ? <span className="text-slate-400">—</span> : <div className="space-y-2"><FeedbackStatus status={row.status}/>{primaryOther && bookLine(primaryOther.reviewId,1)}</div>}
      {(jobs.length > 1 || remaining.length > 0) && <button type="button" className="mt-2 text-xs font-semibold text-blue-700 hover:underline" aria-expanded={expanded} aria-controls={`pro-books-${member.id}`} onClick={toggle}>{expanded ? "글 목록 접기" : jobs.length > 1 ? `미처리 ${jobs.length}건 · 모두 보기` : `제출·대기 글 ${otherCases.length}건 보기`}</button>}
      {expanded && <div id={`pro-books-${member.id}`} className="mt-3 space-y-3">{jobs.slice(1).map(f => <div key={f.record.id} className="border-t border-slate-200 pt-3">{feedbackInfo(f)}</div>)}{remaining.map(c => <div key={c.reviewId} className="space-y-1.5 border-t border-slate-200 pt-3"><p className="text-xs text-slate-600">{proCaseStatus(hook.db,c)}</p>{bookLine(c.reviewId,c.secondDeadline ? 2 : 1)}{c.secondDeadline && !c.closedAt && <p className="text-xs">학생 제출 {weeklyDeadline(c.secondDeadline)}까지</p>}</div>)}</div>}
    </td>
    <td data-label="제출 독려 현황">{member.caseOnly ? <span className="text-slate-400">—</span> : <WeeklyReminders hook={hook} row={row} week={week}/>}</td>
    <td data-label="상담 현황">{member.caseOnly ? <span className="text-slate-400">—</span> : <><div className="flex flex-wrap items-center gap-1.5"><ProBadge tone={consult.tone}>{consult.label}</ProBadge><span className="text-xs text-slate-600">{weeklyDate(consult.date)}</span></div>{row.consultDue && kstDate(row.consultDue) < kstDate(row.asOf) && !row.consulted && !row.consultation.length && <p className="mt-1 text-xs text-amber-800">예정일 경과 · 결과 미기록</p>}</>}</td>
    <td data-label="관리"><div className={styles.managementActions}>{(expanded ? jobs : jobs.slice(0,1)).map(f => <div key={f.record.id}>{jobs.length > 1 && <p className="mb-1 text-xs text-slate-500">{title(f.c.reviewId)} · {f.record.round}차</p>}{feedbackButton(f)}</div>)}
      {!member.caseOnly && <Button asChild size="sm" variant="outline"><Link href={`${studentUrl}#consultation`}>{hook.readOnly ? "상담 내역" : "상담 기록"}</Link></Button>}
    </div></td>
  </tr>
}
