"use client"
import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { managementMonth } from "@/lib/pro-calendar"
import { proUsage } from "@/lib/pro-domain"
import { weeklyDate } from "@/lib/pro-weekly-presentation"
import { safeAgencyReturn } from "@/lib/review-navigation"
import { agencyStudentTestToken } from "@/lib/student-test-context"
import { adjustmentValues, consultationResultLabel, consultationResults, dayNames, detailDateTime, localDateTime, nthNames, regularConsultationLabel, studentConsultation, studentFeedbackRows } from "@/lib/pro-student-detail"
import type { ProAudit, ProCommand, ProConsultation } from "@/lib/pro-types"
import { ExternalBadge, field, ProBadge, ProNotice, useProManagement } from "./pro-common"
import { StudentManagementMemo } from "./student-management-memo"
import styles from "./pro-management.module.css"

type Editor = "limit" | "cancel-debit" | "regular" | "monthly" | "consult" | null
type History = "adjustments" | "management" | null
const auditLabels: Record<string, string> = { apply: "학생 피드백 신청", cancel: "학생 신청 취소", designate: "피드백 대상 지정", limit: "월 한도 조정", "cancel-debit": "차감 취소", reminder: "독려 기록", "cancel-reminder": "독려 기록 취소", consult: "상담 기록", "consult-schedule": "상담 일정 변경", "retry-parent": "학부모 발송 재시도" }
const inputLabel = "block space-y-1.5 text-sm font-medium"
const memoClass = "min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white p-3 text-sm font-normal leading-6 outline-blue-600"

export function StudentManagementDetail({ id }: { id: string }) {
  const hook = useProManagement(), pro = hook.db.pro
  const [month, setMonth] = React.useState(""), [returnTo, setReturnTo] = React.useState("")
  const [editor, setEditor] = React.useState<Editor>(null), [history, setHistory] = React.useState<History>(null)
  const [showConsultHistory, setShowConsultHistory] = React.useState(false)
  const [limit, setLimit] = React.useState(""), [reason, setReason] = React.useState("")
  const [memo, setMemo] = React.useState(""), [cancelId, setCancelId] = React.useState("")
  const [nth, setNth] = React.useState(2), [weekday, setWeekday] = React.useState(4), [time, setTime] = React.useState("15:00")
  const [override, setOverride] = React.useState("")
  const [result, setResult] = React.useState<ProConsultation["result"]>("유선 상담 완료")
  const [actualAt, setActualAt] = React.useState(""), [consultMemo, setConsultMemo] = React.useState("")
  const [previousId, setPreviousId] = React.useState<string>()
  const consultationRef = React.useRef<HTMLElement | null>(null)
  const entryHandled = React.useRef(false)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setMonth(params.get("month") ?? ""); setReturnTo(safeAgencyReturn(params.get("returnTo"), ""))
  }, [])
  React.useEffect(() => {
    if (!hook.loaded || !pro || entryHandled.current) return
    entryHandled.current = true
    if (window.location.hash !== "#consultation") return
    if (new URLSearchParams(window.location.search).get("role") !== "admin") {
      setEditor("consult"); setActualAt(localDateTime(pro.clock))
    }
    requestAnimationFrame(() => {
      consultationRef.current?.scrollIntoView({ block: "start" })
      consultationRef.current?.focus({ preventScroll: true })
    })
  }, [hook.loaded, pro])
  if (!hook.loaded) return <p className="p-6">학생 관리 내역을 불러오는 중…</p>
  const member = pro?.members.find(m => m.id === id && m.product === "pro")
  if (!pro || !member) return <p className="p-6">{hook.error || "조회 권한이 없거나 매칭된 프로 학생이 아닙니다."}</p>
  const currentMonth = managementMonth(pro.clock), selectedMonth = month || currentMonth, monthName = `${Number(selectedMonth.slice(5))}월`
  const studentTest = agencyStudentTestToken()
  const testQuery = studentTest ? `&studentTest=${encodeURIComponent(studentTest)}` : ""
  const usage = proUsage(pro, member, pro.clock, selectedMonth)
  const rows = studentFeedbackRows(hook.db, id, selectedMonth)
  const consultation = studentConsultation(pro, member, selectedMonth)
  const audit = pro.audit.filter(a => a.studentId === id && a.kind !== "management-memo" && (!a.month || a.month === selectedMonth)).slice().sort((a, b) => b.at.localeCompare(a.at))
  const adjustments = audit.filter(a => a.kind === "limit" || a.kind === "cancel-debit")
  const consultationHistory = pro.consultations.filter(c => c.studentId === id && c.month === selectedMonth).slice().sort((a, b) => b.at.localeCompare(a.at))
  const consultationScheduleHistory = audit.filter(a => a.kind === "consult-schedule")
  const selectedBook = (reviewId?: string) => hook.db.reviews.find(r => r.id === reviewId)?.bookTitle
  const closeEditor = () => { if (!hook.busy) { setEditor(null); setCancelId(""); hook.setMessage("") } }
  const openEditor = (kind: Editor) => { hook.setMessage(""); setCancelId(""); setEditor(kind) }
  const save = async (command: ProCommand) => { if (await hook.runPro(command)) { setEditor(null); setCancelId("") } }
  const openConsult = (record?: ProConsultation) => {
    setPreviousId(record?.id); setResult(record?.result ?? "유선 상담 완료")
    setActualAt(localDateTime(record?.actualAt ?? pro.clock)); setConsultMemo(record?.memo ?? "")
    setShowConsultHistory(false); openEditor("consult")
  }
  const changeMonth = (value: string) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || hook.busy) return
    setMonth(value); setEditor(null); setCancelId(""); setHistory(null); setShowConsultHistory(false); hook.setMessage("")
    const url = new URL(window.location.href); url.searchParams.set("month", value)
    window.history.replaceState(window.history.state, "", url)
  }
  const limitValid = limit.trim() !== "" && Number.isInteger(Number(limit)) && Number(limit) >= usage.used + usage.pending
  const overrideValid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(override) && override.startsWith(selectedMonth) && !Number.isNaN(Date.parse(`${override}:00+09:00`))
  const actualValid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(actualAt) && !Number.isNaN(Date.parse(`${actualAt}:00+09:00`)) && Date.parse(`${actualAt}:00+09:00`) <= Date.parse(pro.clock)
  const formActions = (label: string, onSave: () => void, disabled: boolean) => <div className="flex items-center gap-2"><Button size="sm" disabled={hook.busy || disabled || hook.readOnly} onClick={onSave}>{hook.busy ? "저장 중…" : label}</Button><Button size="sm" variant="outline" disabled={hook.busy} onClick={closeEditor}>취소</Button></div>
  const auditRows = (items: ProAudit[]) => items.length ? <ol className="divide-y divide-slate-200">{items.map(a => <li key={a.id} className={styles.detailHistoryRow}>
    <div><p className="font-medium text-slate-900">{auditLabels[a.kind] ?? a.kind}</p><p className="mt-1 text-xs text-slate-500">{detailDateTime(a.at)} · {a.actor}</p></div>
    <div className="min-w-0 space-y-1">{selectedBook(a.reviewId) && <p className="font-medium">{selectedBook(a.reviewId)}</p>}{adjustmentValues(a) && <p className="font-medium text-blue-700">{adjustmentValues(a)}</p>}{a.reason && <p>{a.reason}</p>}{a.memo && <p className="whitespace-pre-wrap break-words text-slate-600">{a.memo}</p>}
      {a.kind === "consult-schedule" && (["before", "after"] as const).map(key => {
        const value = a[key] as { consultation?: typeof member.consultation; overrides?: Record<string, string> } | undefined
        return value && <p key={key}>{key === "before" ? "변경 전" : "변경 후"} · {regularConsultationLabel(value.consultation)}{value.overrides?.[selectedMonth] && ` · ${monthName} ${detailDateTime(value.overrides[selectedMonth])}`}</p>
      })}
    </div>
  </li>)}</ol> : <p className="py-4 text-sm text-slate-500">기록된 이력이 없습니다.</p>
  const consultForm = <div className={styles.detailEditor} role="region" aria-label={previousId ? "상담 기록 수정" : "상담 기록 입력"}>
    <div className={styles.consultFormTop}><fieldset><legend className="mb-2 text-sm font-medium">상담 결과</legend><div className="flex flex-wrap gap-x-5 gap-y-2">{consultationResults.map(r => <label key={r} className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="student-consultation-result" checked={result === r} onChange={() => setResult(r)} className="size-4 accent-blue-600"/>{consultationResultLabel(r)}</label>)}</div></fieldset><label className={inputLabel}>{result === "미진행" ? "확인 일시" : "실제 상담 일시"}<Input type="datetime-local" max={localDateTime(pro.clock)} value={actualAt} onChange={e => setActualAt(e.target.value)}/></label></div>
    <label className={`${inputLabel} mt-4`}>{result === "미진행" ? "미진행 사유" : "상담 내용"}<textarea className={memoClass} value={consultMemo} onChange={e => setConsultMemo(e.target.value)} placeholder={result === "미진행" ? "상담하지 못한 사유를 입력하세요." : "상담 내용을 입력하세요."}/></label>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">상담 메모는 본사도 볼 수 있습니다.</span>{formActions(previousId ? "수정 저장" : "상담 기록 저장", () => void save({type:"consult", studentId:id, month:selectedMonth, result, actualAt:new Date(`${actualAt}:00+09:00`).toISOString(), memo:consultMemo, previousId}), !actualValid || !consultMemo.trim())}</div>
    {actualAt && !actualValid && <p role="alert" className="mt-2 text-xs text-rose-700">현재 시각 이전의 일시를 입력해 주세요.</p>}
  </div>
  return <div className={`${styles.page} ${styles.studentPage} space-y-5`}>
    <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold text-slate-900">{member.name}</h1>{member.external && <ExternalBadge/>}{member.status === "ended" && <ProBadge>이용 종료</ProBadge>}</div><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm">조회 월<Input className="w-40 bg-white" type="month" value={selectedMonth} disabled={hook.busy} onChange={e => changeMonth(e.target.value)}/></label><Button asChild variant="outline"><Link href={`/agency/online-workbooks?role=${hook.role}&audience=pro&studentId=${encodeURIComponent(id)}${testQuery}`}>온라인 독후감 목록</Link></Button><Button asChild variant="outline"><Link href={returnTo || `/agency/pro-management?role=${hook.role}${testQuery}`}>주간 관리 현황</Link></Button></div></header>
    {!cancelId && <ProNotice hook={hook} transient/>}
    <div className={styles.studentDetailLayout}>
    <section className={styles.studentSection} aria-label="월별 피드백 내역">
      <div className={styles.studentSectionHeader}><h2>월별 피드백 내역</h2>{!hook.readOnly && selectedMonth === currentMonth && <Button size="sm" variant="outline" disabled={hook.busy} onClick={() => { setLimit(String(usage.limit)); setReason(""); setMemo(""); openEditor("limit") }}>한도 조정</Button>}</div>
      <div className={styles.detailUsageRow}><span className={styles.usageAmount}><strong>{usage.used}</strong><span>/ {usage.limit}권 사용</span></span>{usage.limit !== 4 && <ProBadge tone="violet">수동 조정</ProBadge>}{selectedMonth === currentMonth && <p className={styles.usageAvailable}>남은 신청 권수 <strong>{usage.available}권</strong>{usage.rolloverAvailable > 0 && <span className={`${styles.usageRollover} ml-1.5`}>(이월 {usage.rolloverAvailable}권 포함)</span>}</p>}</div>
      {editor === "limit" && <div className={styles.detailEditor} role="region" aria-label="한도 조정 입력"><div className={styles.limitForm}><label className={inputLabel}>조정 후 한도<Input type="number" min={usage.used + usage.pending} step="1" value={limit} onChange={e => setLimit(e.target.value)}/></label><label className={inputLabel}>조정 사유 (필수)<Input required value={reason} onChange={e => setReason(e.target.value)}/></label></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">최소 {usage.used + usage.pending}권 · 이미 사용했거나 피드백이 예정된 권수입니다.</p>{formActions("한도 저장", () => void save({type:"limit", studentId:id, limit:Number(limit), reason}), !limitValid || !reason.trim() || selectedMonth !== currentMonth)}</div>{limit !== "" && !limitValid && <p role="alert" className="mt-2 text-xs text-rose-700">한도는 {usage.used + usage.pending}권 이상의 정수로 입력해 주세요.</p>}</div>}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="피드백 이용 내역 표"><table className={`${styles.detailTable} ${styles.studentFeedbackTable}`}>
        <colgroup><col style={{width:"12%"}}/><col style={{width:"34%"}}/><col style={{width:"24%"}}/><col style={{width:"30%"}}/></colgroup>
        <thead><tr>{["관리 주차", "도서명", "2차 작성 여부", "사용 권수"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <React.Fragment key={row.c.reviewId}>
          <tr data-feedback-case={row.c.reviewId}><td data-label="관리 주차">{row.week}</td><td data-label="도서명" className="font-medium text-slate-900">{row.title}</td><td data-label="2차 작성 여부">{row.finishMethod}</td>
            <td data-label="사용 권수">{row.c.debitCancelledAt ? <div><div className="flex flex-wrap items-center gap-2"><ProBadge>차감 취소</ProBadge><span className="text-xs text-slate-500">{weeklyDate(row.c.debitCancelledAt)}</span></div><p className="mt-1.5 text-sm text-slate-600">{row.cancellation?.reason ?? "취소 사유 기록 없음"}</p></div> : row.c.firstSentAt ? <div className="flex flex-wrap items-center gap-4"><span className="font-semibold">1권</span>{!hook.readOnly && <Button size="sm" variant="outline" aria-label={`${row.title} 차감 취소`} aria-expanded={editor === "cancel-debit" && cancelId === row.c.reviewId} aria-controls={`cancel-debit-${row.c.reviewId}`} disabled={hook.busy} onClick={() => { if (editor === "cancel-debit" && cancelId === row.c.reviewId) { closeEditor(); return } openEditor("cancel-debit"); setCancelId(row.c.reviewId); setReason(""); setMemo("") }}>차감 취소</Button>}</div> : <span className="text-slate-500">미사용</span>}</td>
          </tr>
          {editor === "cancel-debit" && cancelId === row.c.reviewId && <tr className={styles.debitEditorRow}><td colSpan={4}>
            <div id={`cancel-debit-${row.c.reviewId}`} className={`${styles.detailEditor} space-y-4`} role="region" aria-label={`${row.title} 차감 취소 입력`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold text-slate-900">차감 취소</h3><p className="text-sm text-slate-600">{row.week} · 사용 {usage.used}권 → {Math.max(0, usage.used - 1)}권</p></div>
              <label className={inputLabel}>취소 사유 (필수)<select autoFocus required className={`${field} w-full font-normal`} value={reason} onChange={e => setReason(e.target.value)}><option value="">사유 선택</option>{["잘못된 학생에게 발송", "같은 글 중복 발송", "기타"].map(r => <option key={r}>{r}</option>)}</select></label>
              <label className={inputLabel}>메모 (필수)<textarea required className={memoClass} value={memo} onChange={e => setMemo(e.target.value)}/></label>
              <p className="text-xs leading-5 text-slate-500">사용 권수만 되돌립니다. 이미 보낸 피드백과 발송 기록은 유지됩니다.</p>
              {formActions("차감 취소", () => void save({type:"cancel-debit", reviewId:row.c.reviewId, reason, memo}), !reason.trim() || !memo.trim() || !row.c.firstSentAt || !!row.c.debitCancelledAt)}
              {(hook.error || hook.messageKind === "error" && hook.message) && <p role="alert" className="rounded bg-rose-50 p-3 text-rose-800">{hook.error || hook.message}</p>}
            </div>
          </td></tr>}
        </React.Fragment>)}{!rows.length && <tr><td colSpan={4} className="text-center text-slate-500">피드백 내역이 없습니다.</td></tr>}</tbody>
      </table></div>
      <div className={styles.detailHistoryNav} aria-label="피드백 이력 조회"><button type="button" aria-expanded={history === "adjustments"} aria-controls="feedback-history" onClick={() => setHistory(history === "adjustments" ? null : "adjustments")}>조정 이력 <span>{adjustments.length}</span></button><button type="button" aria-expanded={history === "management"} aria-controls="feedback-history" onClick={() => setHistory(history === "management" ? null : "management")}>관리 이력</button></div>
      {history && <div id="feedback-history" className={styles.detailHistory} role="region" aria-label={history === "adjustments" ? "조정 이력" : "관리 이력"}>{history === "adjustments" ? <><p className="mb-2 text-xs text-slate-500">조정 이력은 본사에서 확인할 수 있습니다.</p>{auditRows(adjustments)}</> : <>
        {rows.some(r => r.c.closedAt) && <div className="mb-3 border-b border-slate-200 pb-3"><h3 className="mb-2 font-semibold">학부모 발송</h3>{rows.filter(r => r.c.closedAt).map(({c, title}) => <div key={c.reviewId} className="flex flex-wrap items-center justify-between gap-2 py-2"><p>{title}<span className="ml-3 text-xs text-slate-500">{c.parent.status === "sent" ? `발송 완료 · ${weeklyDate(c.parent.at)}` : c.parent.status === "missing" ? "연락처 미등록" : c.parent.status === "failed" ? "발송 실패" : "발송 대기"}</span></p>{c.parent.status !== "sent" && !hook.readOnly && <Button size="sm" variant="outline" disabled={hook.busy || !hook.db.records.some(r => r.reviewId === c.reviewId && r.feedbackStatus === "전송완료" && r.parentContact)} onClick={() => void hook.runPro({type:"retry-parent", reviewId:c.reviewId})}>자동 발송 재시도</Button>}</div>)}</div>}{auditRows(audit)}
      </>}</div>}
    </section>
    <div className={styles.studentDetailRight}>
    <section id="consultation" ref={consultationRef} tabIndex={-1} className={`${styles.studentSection} ${styles.studentConsultationSection} scroll-mt-28 outline-none`} aria-label="학부모 상담">
      <div className={styles.studentSectionHeader}><div className="flex flex-wrap items-center gap-3"><h2>학부모 상담</h2><ProBadge tone={consultation.status.tone}>{consultation.status.label}</ProBadge></div>{!hook.readOnly && editor !== "consult" && <Button size="sm" variant={consultation.records.length ? "outline" : "default"} disabled={hook.busy} onClick={() => openConsult()}>{consultation.records.length ? "상담 추가" : "상담 기록"}</Button>}</div>
      <div className={styles.consultSchedule}><div><span className="text-slate-500">정기 일정</span><strong>{regularConsultationLabel(member.consultation)}</strong>{!hook.readOnly && <button type="button" className={styles.detailTextButton} disabled={hook.busy} onClick={() => { setNth(member.consultation?.nth ?? 2); setWeekday(member.consultation?.weekday ?? 4); setTime(member.consultation?.time ?? "15:00"); openEditor("regular") }}>정기 일정 변경</button>}</div><div><span className="text-slate-500">{monthName} 예정일</span><strong>{detailDateTime(consultation.due)}</strong>{!hook.readOnly && <button type="button" className={styles.detailTextButton} disabled={hook.busy} onClick={() => { setOverride(localDateTime(consultation.due)); openEditor("monthly") }}>{monthName} 일정만 변경</button>}{consultation.unrecordedOverdue && <span className="text-xs text-amber-800">예정일 경과 · 결과 미기록</span>}</div></div>
      {editor === "regular" && <div className={styles.detailEditor} role="region" aria-label="정기 일정 변경 입력"><div className="flex flex-wrap items-end gap-3"><label className={inputLabel}>매월<select className={`${field} block`} value={nth} onChange={e => setNth(Number(e.target.value))}>{nthNames.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></label><label className={inputLabel}>요일<select className={`${field} block`} value={weekday} onChange={e => setWeekday(Number(e.target.value))}>{dayNames.map((d, i) => <option key={d} value={i + 1}>{d}요일</option>)}</select></label><label className={inputLabel}>시간<Input type="time" value={time} onChange={e => setTime(e.target.value)}/></label>{formActions("일정 저장", () => void save({type:"consult-schedule", studentId:id, nth, weekday, time}), !time)}</div><p className="mt-3 text-xs text-slate-500">매월 반복되는 일정입니다. 따로 변경한 월의 예정일은 유지됩니다.</p></div>}
      {editor === "monthly" && <div className={styles.detailEditor} role="region" aria-label="월별 일정 변경 입력"><div className="flex flex-wrap items-end gap-3"><label className={inputLabel}>{monthName} 상담 예정일<Input type="datetime-local" min={`${selectedMonth}-01T00:00`} value={override} onChange={e => setOverride(e.target.value)}/></label>{formActions("예정일 저장", () => void save({type:"consult-schedule", studentId:id, nth:member.consultation?.nth ?? 2, weekday:member.consultation?.weekday ?? 4, time:member.consultation?.time ?? "15:00", month:selectedMonth, override:new Date(`${override}:00+09:00`).toISOString()}), !overrideValid)}</div><p className="mt-3 text-xs text-slate-500">{monthName} 예정일만 변경합니다. 정기 일정은 유지됩니다.</p>{override && !overrideValid && <p role="alert" className="mt-2 text-xs text-rose-700">{monthName}의 날짜를 선택해 주세요.</p>}</div>}
      <div className={styles.consultRecords}>{consultation.records.map(record => editor === "consult" && previousId === record.id ? <React.Fragment key={record.id}>{consultForm}</React.Fragment> : <article key={record.id} className={styles.consultRecord}><div className="flex flex-wrap items-center gap-3"><ProBadge tone={record.result === "미진행" ? "amber" : "green"}>{consultationResultLabel(record.result)}</ProBadge><span className="text-sm text-slate-500">{detailDateTime(record.actualAt)} · {record.actor}</span>{!hook.readOnly && <button className={`${styles.detailTextButton} ml-auto`} disabled={hook.busy} onClick={() => openConsult(record)}>기록 수정</button>}</div><p className="mt-3 whitespace-pre-wrap break-words leading-6 text-slate-800">{record.memo}</p></article>)}{editor === "consult" && !previousId && consultForm}{!consultation.records.length && editor !== "consult" && <p className="py-5 text-sm text-slate-500">등록된 상담 기록이 없습니다.</p>}</div>
      <div className={styles.detailHistoryNav}><button type="button" aria-expanded={showConsultHistory} aria-controls="consult-history" onClick={() => setShowConsultHistory(!showConsultHistory)}>상담 변경 이력</button></div>
      {showConsultHistory && <div id="consult-history" className={styles.detailHistory} role="region" aria-label="상담 변경 이력">{consultationHistory.map(c => <div key={c.id} className={styles.detailHistoryRow}><div><p className="font-medium">{c.previousId ? "기록 수정" : "기록 등록"} · {consultationResultLabel(c.result)}</p><p className="mt-1 text-xs text-slate-500">저장 {detailDateTime(c.at)} · {c.actor}</p></div><div><p className="mb-1 text-xs text-slate-500">{c.result === "미진행" ? "확인" : "상담"} {detailDateTime(c.actualAt)}</p><p className="whitespace-pre-wrap break-words">{c.memo}</p></div></div>)}{consultationScheduleHistory.length > 0 && auditRows(consultationScheduleHistory)}{!consultationHistory.length && !consultationScheduleHistory.length && <p className="py-4 text-sm text-slate-500">기록된 이력이 없습니다.</p>}</div>}
    </section>
    <StudentManagementMemo key={member.id} hook={hook} member={member}/>
    </div>
    </div>
  </div>
}
