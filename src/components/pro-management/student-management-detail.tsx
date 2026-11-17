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
import { adjustmentValues, detailDateTime, regularConsultationLabel, studentFeedbackRows } from "@/lib/pro-student-detail"
import type { ProAudit, ProCommand } from "@/lib/pro-types"
import { ExternalBadge, field, ProBadge, ProNotice, useProManagement } from "./pro-common"
import { MonthlyFeedbackEditor } from "./monthly-feedback-editor"
import { MonthlyValidationTools } from "./monthly-validation-tools"
import { useMonthlyTest } from "./monthly-test-provider"
import { monthlyValidationCases } from "@/lib/monthly-test-context"
import { isActivePro } from "@/lib/pro-domain"
import { StudentManagementMemo } from "./student-management-memo"
import styles from "./pro-management.module.css"

type Editor = "limit" | "cancel-debit" | null
type History = "adjustments" | "management" | null
const auditLabels: Record<string, string> = { apply: "학생 피드백 신청", cancel: "학생 신청 취소", designate: "피드백 대상 지정", limit: "월 한도 조정", "cancel-debit": "차감 취소", reminder: "독려 기록", "cancel-reminder": "독려 기록 취소", consult: "상담 기록", "consult-schedule": "상담 일정 변경", "retry-parent": "학부모 발송 재시도" }
const inputLabel = "block space-y-1.5 text-sm font-medium"
const memoClass = "min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white p-3 text-sm font-normal leading-6 outline-blue-600"

export function StudentManagementDetail({ id }: { id: string }) {
  const monthlyContext = useMonthlyTest()
  const hook = useProManagement(), pro = hook.db.pro
  const [month, setMonth] = React.useState(""), [returnTo, setReturnTo] = React.useState("")
  const [editor, setEditor] = React.useState<Editor>(null), [history, setHistory] = React.useState<History>(null)
  const [limit, setLimit] = React.useState(""), [reason, setReason] = React.useState("")
  const [memo, setMemo] = React.useState(""), [cancelId, setCancelId] = React.useState("")
  const navigation = React.useRef<(go: () => void) => void>(go => go())
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setMonth(params.get("month") ?? (monthlyContext.scenario ? monthlyValidationCases[monthlyContext.scenario].month : "")); setReturnTo(safeAgencyReturn(params.get("returnTo"), ""))
  }, [monthlyContext.scenario])
  if (!hook.loaded) return <p className="p-6">학생 관리 내역을 불러오는 중…</p>
  const member = pro?.members.find(m => m.id === id && (m.product === "pro" || !!m.endedAt || !!m.caseOnly))
  if (!pro || !member) return <p className="p-6">{hook.error || "조회 권한이 없거나 매칭된 프로 학생이 아닙니다."}</p>
  const currentMonth = managementMonth(pro.clock), selectedMonth = month || currentMonth, monthName = `${Number(selectedMonth.slice(5))}월`
  const studentTest = agencyStudentTestToken()
  const monthlyTest = new URLSearchParams(window.location.search).get("monthlyTest")
  const identity = new URLSearchParams(window.location.search).get("demoAgency")
  const live = new URLSearchParams(window.location.search).get("monthlyLive") === "1" ? "&monthlyLive=1" : ""
  const testQuery = (monthlyTest ? `&monthlyTest=${encodeURIComponent(monthlyTest)}` : studentTest ? `&studentTest=${encodeURIComponent(studentTest)}` : live) + (identity ? `&demoAgency=${encodeURIComponent(identity)}` : "")
  const usage = proUsage(pro, member, pro.clock, selectedMonth)
  const rows = studentFeedbackRows(hook.db, id, selectedMonth)
  const audit = pro.audit.filter(a => a.studentId === id && a.kind !== "management-memo" && (!a.month || a.month === selectedMonth)).slice().sort((a, b) => b.at.localeCompare(a.at))
  const adjustments = audit.filter(a => a.kind === "limit" || a.kind === "cancel-debit")
  const selectedBook = (reviewId?: string) => hook.db.reviews.find(r => r.id === reviewId)?.bookTitle
  const closeEditor = () => { if (!hook.busy) { setEditor(null); setCancelId(""); hook.setMessage("") } }
  const openEditor = (kind: Editor) => { hook.setMessage(""); setCancelId(""); setEditor(kind) }
  const save = async (command: ProCommand) => { if (await hook.runPro(command)) { setEditor(null); setCancelId("") } }
  const changeMonth = (value: string) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || hook.busy) return
    setMonth(value); setEditor(null); setCancelId(""); setHistory(null); hook.setMessage("")
    const url = new URL(window.location.href); url.searchParams.set("month", value)
    window.history.replaceState(window.history.state, "", url)
  }
  const limitValid = limit.trim() !== "" && Number.isInteger(Number(limit)) && Number(limit) >= usage.used + usage.pending
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
  return <div className={`${styles.page} ${styles.studentPage} space-y-5`}>
    <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold text-slate-900">{member.name}</h1><span className="text-sm text-slate-500">{member.level}레벨</span>{member.external && <ExternalBadge className="ml-0 inline-flex items-center border border-violet-200 bg-violet-50 px-2 py-0.5 leading-4 text-violet-700"/>}{(member.caseOnly || !isActivePro(member,pro.clock)) && <ProBadge>이전 담당</ProBadge>}{member.status === "ended" && <ProBadge>이용 종료</ProBadge>}</div><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm">조회 월<Input className="w-40 bg-white" type="month" value={selectedMonth} disabled={hook.busy} onInput={e => { const value=e.currentTarget.value; if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)||value===selectedMonth)return; e.currentTarget.value=selectedMonth; navigation.current(() => changeMonth(value)) }} onChange={e => { const value=e.target.value; if(value!==selectedMonth)navigation.current(() => changeMonth(value)) }}/></label><Button asChild variant="outline"><Link href={`/agency/online-workbooks?role=${hook.role}&audience=pro&studentId=${encodeURIComponent(id)}${testQuery}`}>온라인 독후감 목록</Link></Button><Button asChild variant="outline"><Link href={returnTo || `/agency/pro-management?role=${hook.role}${testQuery}`}>주간 관리 현황</Link></Button></div></header>
    {!cancelId && <ProNotice hook={hook} transient/>}
    <div className={styles.studentDetailLayout}>
    <section className={styles.studentSection} aria-label="월별 피드백 내역">
      <div className={styles.studentSectionHeader}><h2>월별 피드백 내역</h2>{!hook.readOnly && !member.caseOnly && isActivePro(member,pro.clock) && selectedMonth === currentMonth && <Button size="sm" variant="outline" disabled={hook.busy} onClick={() => { setLimit(String(usage.limit)); setReason(""); setMemo(""); openEditor("limit") }}>한도 조정</Button>}</div>
      <div className={styles.detailUsageRow}><span className={styles.usageAmount}><strong>{usage.used}</strong><span>/ {usage.limit}권 사용</span></span>{usage.limit !== 4 && <ProBadge tone="violet">수동 조정</ProBadge>}{selectedMonth === currentMonth && <p className={styles.usageAvailable}>남은 신청 권수 <strong>{usage.available}권</strong>{usage.rolloverAvailable > 0 && <span className={`${styles.usageRollover} ml-1.5`}>(이월 {usage.rolloverAvailable}권 포함)</span>}</p>}</div>
      {editor === "limit" && <div className={styles.detailEditor} role="region" aria-label="한도 조정 입력"><div className={styles.limitForm}><label className={inputLabel}>조정 후 한도<Input type="number" min={usage.used + usage.pending} step="1" value={limit} onChange={e => setLimit(e.target.value)}/></label><label className={inputLabel}>조정 사유 (필수)<Input required value={reason} onChange={e => setReason(e.target.value)}/></label></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">최소 {usage.used + usage.pending}권 · 이미 사용했거나 피드백이 예정된 권수입니다.</p>{formActions("한도 저장", () => void save({type:"limit", studentId:id, limit:Number(limit), reason}), !limitValid || !reason.trim() || selectedMonth !== currentMonth)}</div>{limit !== "" && !limitValid && <p role="alert" className="mt-2 text-xs text-rose-700">한도는 {usage.used + usage.pending}권 이상의 정수로 입력해 주세요.</p>}</div>}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="피드백 이용 내역 표"><table className={`${styles.detailTable} ${styles.studentFeedbackTable}`}>
        <colgroup><col style={{width:"12%"}}/><col style={{width:"25%"}}/><col style={{width:"20%"}}/><col style={{width:"20%"}}/><col style={{width:"23%"}}/></colgroup>
        <thead><tr>{["관리 주차", "도서명", "2차 작성 여부", "사용 권수", "학부모 발송"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <React.Fragment key={row.c.reviewId}>
          <tr data-feedback-case={row.c.reviewId}><td data-label="관리 주차" className="whitespace-nowrap">{row.week}</td><td data-label="도서명" className="font-medium text-slate-900">{row.title}</td><td data-label="2차 작성 여부">{row.finishMethod}</td>
            <td data-label="사용 권수">{row.c.debitCancelledAt ? <div><div className="flex flex-wrap items-center gap-2"><ProBadge>차감 취소</ProBadge><span className="text-xs text-slate-500">{weeklyDate(row.c.debitCancelledAt)}</span></div><p className="mt-1.5 text-sm text-slate-600">{row.cancellation?.reason ?? "취소 사유 기록 없음"}</p></div> : row.c.firstSentAt ? <div className="flex flex-wrap items-center gap-4"><span className="font-semibold">1권</span>{!hook.readOnly && !member.caseOnly && <Button size="sm" variant="outline" aria-label={`${row.title} 차감 취소`} aria-expanded={editor === "cancel-debit" && cancelId === row.c.reviewId} aria-controls={`cancel-debit-${row.c.reviewId}`} disabled={hook.busy} onClick={() => { if (editor === "cancel-debit" && cancelId === row.c.reviewId) { closeEditor(); return } openEditor("cancel-debit"); setCancelId(row.c.reviewId); setReason(""); setMemo("") }}>차감 취소</Button>}</div> : <span className="text-slate-500">미사용</span>}</td>
            <td data-label="학부모 발송"><p className="text-xs leading-5">{row.c.parent.status === "sent" ? `발송 완료 · ${weeklyDate(row.c.parent.at)}` : row.c.parent.status === "missing" ? "연락처 미등록" : row.c.parent.status === "failed" ? "발송 실패" : row.c.closedAt ? "발송 대기" : row.c.selectedAt ? "관리 종료 후 자동 발송" : "-"}</p>{row.c.closedAt && row.c.parent.status !== "sent" && !hook.readOnly && <Button className="mt-2" size="sm" variant="outline" disabled={hook.busy || !hook.db.records.some(r => r.reviewId === row.c.reviewId && r.feedbackStatus === "전송완료" && r.parentContact)} onClick={() => void hook.runPro({type:"retry-parent",reviewId:row.c.reviewId})}>발송 재시도</Button>}</td>
          </tr>
          {editor === "cancel-debit" && cancelId === row.c.reviewId && <tr className={styles.debitEditorRow}><td colSpan={5}>
            <div id={`cancel-debit-${row.c.reviewId}`} className={`${styles.detailEditor} space-y-4`} role="region" aria-label={`${row.title} 차감 취소 입력`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold text-slate-900">차감 취소</h3><p className="text-sm text-slate-600">{row.week} · 사용 {usage.used}권 → {Math.max(0, usage.used - 1)}권</p></div>
              <label className={inputLabel}>취소 사유 (필수)<select autoFocus required className={`${field} w-full font-normal`} value={reason} onChange={e => setReason(e.target.value)}><option value="">사유 선택</option>{["잘못된 학생에게 발송", "같은 글 중복 발송", "기타"].map(r => <option key={r}>{r}</option>)}</select></label>
              <label className={inputLabel}>메모 (필수)<textarea required className={memoClass} value={memo} onChange={e => setMemo(e.target.value)}/></label>
              <p className="text-xs leading-5 text-slate-500">사용 권수만 되돌립니다. 이미 보낸 피드백과 발송 기록은 유지됩니다.</p>
              {formActions("차감 취소", () => void save({type:"cancel-debit", reviewId:row.c.reviewId, reason, memo}), !reason.trim() || !memo.trim() || !row.c.firstSentAt || !!row.c.debitCancelledAt)}
              {(hook.error || hook.messageKind === "error" && hook.message) && <p role="alert" className="rounded bg-rose-50 p-3 text-rose-800">{hook.error || hook.message}</p>}
            </div>
          </td></tr>}
        </React.Fragment>)}{!rows.length && <tr><td colSpan={5} className="text-center text-slate-500">피드백 내역이 없습니다.</td></tr>}</tbody>
      </table></div>
      <div className={styles.detailHistoryNav} aria-label="피드백 이력 조회"><button type="button" aria-expanded={history === "adjustments"} aria-controls="feedback-history" onClick={() => setHistory(history === "adjustments" ? null : "adjustments")}>조정 이력 <span>{adjustments.length}</span></button><button type="button" aria-expanded={history === "management"} aria-controls="feedback-history" onClick={() => setHistory(history === "management" ? null : "management")}>관리 이력</button></div>
      {history && <div id="feedback-history" className={styles.detailHistory} role="region" aria-label={history === "adjustments" ? "조정 이력" : "관리 이력"}>{history === "adjustments" ? <><p className="mb-2 text-xs text-slate-500">조정 이력은 본사에서 확인할 수 있습니다.</p>{auditRows(adjustments)}</> : <>
        {rows.some(r => r.c.closedAt) && <div className="mb-3 border-b border-slate-200 pb-3"><h3 className="mb-2 font-semibold">학부모 발송</h3>{rows.filter(r => r.c.closedAt).map(({c, title}) => <div key={c.reviewId} className="flex flex-wrap items-center justify-between gap-2 py-2"><p>{title}<span className="ml-3 text-xs text-slate-500">{c.parent.status === "sent" ? `발송 완료 · ${weeklyDate(c.parent.at)}` : c.parent.status === "missing" ? "연락처 미등록" : c.parent.status === "failed" ? "발송 실패" : "발송 대기"}</span></p>{c.parent.status !== "sent" && !hook.readOnly && <Button size="sm" variant="outline" disabled={hook.busy || !hook.db.records.some(r => r.reviewId === c.reviewId && r.feedbackStatus === "전송완료" && r.parentContact)} onClick={() => void hook.runPro({type:"retry-parent", reviewId:c.reviewId})}>자동 발송 재시도</Button>}</div>)}</div>}{auditRows(audit)}
      </>}</div>}
    </section>
    <div className={styles.studentDetailRight}>
    <MonthlyFeedbackEditor key={`${id}:${selectedMonth}`} hook={hook} member={member} month={selectedMonth} navigationRef={navigation}/>
    {!member.caseOnly && <StudentManagementMemo key={member.id} hook={hook} member={member}/>}
    </div>
    </div>
    {monthlyContext.scenario && <MonthlyValidationTools db={hook.db}/>}
  </div>
}
