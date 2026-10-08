"use client"
import * as React from "react"
import Link from "next/link"
import { CalendarDays, MessageSquare, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { dateLabel, managementMonth, weekLabel } from "@/lib/pro-calendar"
import { consultDue, currentConsultations, proUsage } from "@/lib/pro-domain"
import { caseParentLabel, selectionLabels } from "@/lib/pro-selectors"
import type { ProConsultation } from "@/lib/pro-types"
import { ExternalBadge, field, panel, ProBadge, ProNotice, useProManagement } from "./pro-common"
import styles from "./pro-management.module.css"

export function StudentManagementDetail({ id }: { id: string }) {
  const hook = useProManagement(), pro = hook.db.pro
  const [month, setMonth] = React.useState(""), [limit, setLimit] = React.useState("4")
  const [reason, setReason] = React.useState("기타"), [memo, setMemo] = React.useState(""), [cancelId, setCancelId] = React.useState("")
  const [nth, setNth] = React.useState(2), [weekday, setWeekday] = React.useState(4), [time, setTime] = React.useState("15:00"), [override, setOverride] = React.useState("")
  const [result, setResult] = React.useState<ProConsultation["result"]>("유선 상담 완료"), [actualAt, setActualAt] = React.useState(""), [consultMemo, setConsultMemo] = React.useState(""), [previousId, setPreviousId] = React.useState<string>()
  const adjustmentRef = React.useRef<HTMLElement>(null)
  React.useEffect(() => { setMonth(new URLSearchParams(window.location.search).get("month") ?? "") }, [])
  if (!hook.loaded) return <p className="p-6">학생 관리 내역을 불러오는 중…</p>
  const member = pro?.members.find(m => m.id === id && m.product === "pro")
  if (!pro || !member) return <p className="p-6">{hook.error || "조회 권한이 없거나 매칭된 프로 학생이 아닙니다."}</p>
  const currentMonth = managementMonth(pro.clock), selectedMonth = month || currentMonth
  const usage = proUsage(pro, member, pro.clock, selectedMonth)
  const cases = pro.cases.filter(c => c.studentId === id && c.month === selectedMonth)
  const consultations = currentConsultations(pro, id, selectedMonth)
  const audit = pro.audit.filter(a => a.studentId === id && (!a.month || a.month === selectedMonth)).slice().reverse()
  const adjustments = audit.filter(a => a.kind === "limit" || a.kind === "cancel-debit")
  const auditRows = (items: typeof audit) => items.length ? <ol className="divide-y divide-slate-100">{items.map((a, index) => <li className="py-3 text-sm" key={`${a.id}:${items.length - index}`}>
    <p className="font-medium">{a.kind === "limit" ? "월 한도 조정" : a.kind === "cancel-debit" ? "차감 취소" : a.kind}{a.reason && <span className="ml-2 font-normal text-slate-500">{a.reason}</span>}</p>
    {a.memo && <p className="mt-1 whitespace-pre-wrap">{a.memo}</p>}<p className="mt-1 text-xs text-slate-500">{dateLabel(a.at)} · {a.actor}</p>
    {a.before !== undefined && <p className="mt-2 break-all rounded bg-slate-50 p-2 text-xs text-slate-500">변경 전 {JSON.stringify(a.before)} → 변경 후 {JSON.stringify(a.after)}</p>}
  </li>)}</ol> : <p className="py-4 text-sm text-slate-400">아직 기록된 이력이 없습니다.</p>
  return <div className={`${styles.page} space-y-5`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-slate-900">{member.name}<ExternalBadge/></h1><p className="mt-1 text-sm text-slate-500">프로 학생 상세 · {member.level}레벨 · 담당 선생님 {member.teacherId}</p></div>
      <Button asChild variant="outline"><Link href={`/agency/pro-management?role=${hook.role}`}>주간 관리 현황</Link></Button>
    </div>
    <ProNotice hook={hook}/>
    <div className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
      <label className="flex items-center gap-3 font-semibold">관리월<Input aria-label="관리월" className="w-44" type="month" value={selectedMonth} onChange={e => setMonth(e.target.value)}/></label>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500"><ProBadge tone={member.status === "active" ? "green" : "slate"}>{member.status === "active" ? "프로 이용 중" : "프로 이용 종료"}</ProBadge><span>적용 기준일 {dateLabel(member.effectiveAt)}</span></div>
    </div>
    <div className={styles.detailGrid}>
      <div className="min-w-0 space-y-5">
        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold text-slate-900">{Number(selectedMonth.slice(5))}월 피드백 내역</h2><span className="text-xs text-slate-500">1차·2차 합쳐 1권</span></div>
          <div className="my-5 flex flex-wrap items-end gap-x-5 gap-y-2">
            <p className="text-2xl font-bold text-slate-900">{usage.used} / {usage.limit}<span className="ml-1 text-sm font-medium">권 사용</span></p>
            {usage.limit !== 4 ? <ProBadge tone="violet">수동 조정</ProBadge> : <span className="text-xs text-slate-500">기본 한도 4권</span>}
            <p className="text-sm text-slate-500">전송 전 선정 <strong className="text-slate-800">{usage.pending}권</strong> · 추가 신청 <strong className="text-blue-700">{usage.available}권</strong></p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200" tabIndex={0} role="region" aria-label="월별 피드백 내역">
            <table className={styles.detailTable}>
              <colgroup>{[16, 23, 24, 16, 21].map((width, index) => <col key={index} style={{ width: `${width}%` }}/>)}</colgroup>
              <thead><tr>{["관리 주차", "도서 · 선정 방식", "진행 상태", "권수", "학부모 자동 발송"].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
              <tbody>{cases.map(c => {
                const common = hook.db.reviews.find(r => r.id === c.reviewId)!
                const records = hook.db.records.filter(r => r.reviewId === c.reviewId)
                return <tr key={c.reviewId}>
                  <td>{weekLabel(c.week)}{c.secondWeek && <small className="mt-1 block text-slate-500">2차 {weekLabel(c.secondWeek)}</small>}</td>
                  <td><p className="font-medium">{common.bookTitle}</p><p className="my-2"><ProBadge tone={c.selection ? "blue" : "slate"}>{c.selection ? selectionLabels[c.selection] : "미선정"}</ProBadge></p><div className="flex flex-wrap gap-2">{records.map(r => <Link key={r.id} className="text-xs text-blue-600 hover:underline" href={`/agency/online-workbooks/${r.id}?role=${hook.role}&returnTo=${encodeURIComponent(`/agency/pro-management/students/${id}?month=${selectedMonth}&role=${hook.role}`)}`}>{r.round}차 보기 →</Link>)}</div></td>
                  <td><p>{c.closedAt ? c.closeReason : c.secondDeadline ? `2차 기한 ${dateLabel(c.secondDeadline)}` : "1차 진행"}</p><p className="mt-2 text-xs text-slate-500">1차 전송 {dateLabel(c.firstSentAt)}</p></td>
                  <td><span className="font-medium">{c.debitCancelledAt ? "차감 취소" : c.firstSentAt ? "1권 사용" : c.selectedAt ? "선정 대기" : "-"}</span>{c.firstSentAt && !c.debitCancelledAt && !hook.readOnly && <Button variant="outline" size="sm" className="mt-2 block border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => { setCancelId(c.reviewId); adjustmentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }) }}>차감 취소</Button>}</td>
                  <td className="text-xs">{caseParentLabel(c)}{c.closedAt && c.parent.status !== "sent" && !hook.readOnly && <Button variant="outline" size="sm" className="mt-2" disabled={hook.busy} onClick={() => hook.runPro({ type: "retry-parent", reviewId: c.reviewId })}>자동 발송 재시도</Button>}</td>
                </tr>
              })}{!cases.length && <tr><td colSpan={5} className="text-center text-slate-400">해당 월의 관리 내역이 없습니다.</td></tr>}</tbody>
            </table>
          </div>
        </section>
        {!hook.readOnly && <section ref={adjustmentRef} className={`${panel} scroll-mt-32`}>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><SlidersHorizontal className="size-4 text-slate-400"/>{cancelId ? "차감 취소" : "이번 달 한도 조정"}</h2>
          <p className="my-3 text-sm leading-6 text-slate-500">{cancelId ? "사용 권수만 되돌립니다. 이미 보낸 피드백과 발송 기록은 유지됩니다." : "사용·선정 권수보다 낮게 설정할 수 없습니다. 한도를 늘려도 미래 주의 기회를 사용할 수 없습니다."}</p>
          {cancelId && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800">{hook.db.reviews.find(r => r.id === cancelId)?.bookTitle}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {!cancelId && <label className="space-y-2 text-sm"><span className="block font-medium">조정 후 한도</span><Input aria-label="조정 후 한도" type="number" min="0" value={limit} onChange={e => setLimit(e.target.value)}/></label>}
            <label className="space-y-2 text-sm"><span className="block font-medium">조정 사유</span><select aria-label="조정 사유" className={`${field} w-full`} value={reason} onChange={e => setReason(e.target.value)}>{["잘못된 학생에게 발송", "같은 글 중복 발송", "기타"].map(r => <option key={r}>{r}</option>)}</select></label>
            <label className="space-y-2 text-sm sm:col-span-2"><span className="block font-medium">조정 메모 <span className="text-xs text-rose-600">필수</span></span><Input aria-label="조정 메모" placeholder="사유에 대한 메모를 입력하세요." value={memo} onChange={e => setMemo(e.target.value)}/></label>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">{cancelId && <Button variant="outline" onClick={() => setCancelId("")}>취소</Button>}<Button disabled={hook.busy || !memo.trim() || !cancelId && selectedMonth !== currentMonth} onClick={async () => {
            const ok = await hook.runPro(cancelId ? { type: "cancel-debit", reviewId: cancelId, reason, memo } : { type: "limit", studentId: id, limit: Number(limit), reason, memo })
            if (ok) { setCancelId(""); setMemo("") }
          }}>확인 후 저장</Button></div>
          <p className="mt-3 text-xs text-slate-500">조정 이력은 본사에서 확인할 수 있습니다. 수정하거나 삭제할 수 없습니다.</p>
        </section>}
        <section className={panel}><h2 className="font-bold text-slate-900">조정 이력 <span className="ml-2 text-xs font-normal text-slate-500">본사 열람 가능</span></h2>{auditRows(adjustments)}</section>
        <section className={panel}><h2 className="font-bold text-slate-900">피드백 원문·최종 전송 이력</h2>
          {cases.map(c => <details key={c.reviewId} className="mt-3 border-t border-slate-100 pt-3 text-sm">
            <summary className="cursor-pointer font-medium">{hook.db.reviews.find(r => r.id === c.reviewId)?.bookTitle}</summary>
            <p className="my-2 text-xs leading-5 text-slate-500">기존 기록에 원문이 없으면 새로 만들지 않습니다. 학생에게는 전송된 최종 피드백만 표시합니다.</p>
            {!c.aiSnapshots.length && <p className="text-slate-400">보존된 AI 원문 없음</p>}
            {c.aiSnapshots.map(s => <details key={s.runId} className="my-2"><summary>AI 생성 원문 · {dateLabel(s.at)}</summary><pre className="whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-xs">{JSON.stringify(s.result, null, 2)}</pre></details>)}
            {c.finalSnapshots.map(s => <div key={`${s.recordId}:${s.at}`} className="my-3 rounded-lg bg-slate-50 p-3"><strong>{s.recordId.endsWith("-r2") ? "2차" : "1차"} 최종 전송 · {dateLabel(s.at)}</strong><p className="mt-2 whitespace-pre-wrap leading-6">{s.feedback}</p></div>)}
          </details>)}
        </section>
        <section className={panel}><details><summary className="cursor-pointer font-bold text-slate-900">전체 관리 이력</summary>{auditRows(audit)}</details></section>
      </div>
      <section id="consultation" className={`${panel} scroll-mt-32`}>
        <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><MessageSquare className="size-4 text-slate-400"/>학부모 상담 · {Number(selectedMonth.slice(5))}월</h2><span className="text-xs text-slate-500">월 1회</span></div>
        <div className="my-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm"><ProBadge tone={consultations.some(c => c.result !== "미진행") ? "green" : "amber"}>{consultations.some(c => c.result !== "미진행") ? "월 상담 완료" : "월 상담 미완료"}</ProBadge><p>이번 달 예정 <strong>{dateLabel(consultDue(member, selectedMonth))}</strong></p></div>
        {!hook.readOnly && <>
          <details className="mb-5 rounded-lg border border-slate-200 p-3"><summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-slate-400"/>상담 일정 설정</summary>
            <div className="mt-4 space-y-4">
              <fieldset><legend className="mb-2 text-xs text-slate-500">정기 상담 일정</legend><div className="flex flex-wrap gap-2">
                <select aria-label="정기 상담 주차" className={field} value={nth} onChange={e => setNth(Number(e.target.value))}>{[1,2,3,4,5].map(n => <option value={n} key={n}>{n}번째</option>)}</select>
                <select aria-label="정기 상담 요일" className={field} value={weekday} onChange={e => setWeekday(Number(e.target.value))}>{["월", "화", "수", "목", "금", "토", "일"].map((d,i) => <option value={i + 1} key={d}>{d}요일</option>)}</select>
                <Input aria-label="상담 시간" className="w-32" type="time" value={time} onChange={e => setTime(e.target.value)}/>
                <Button variant="outline" disabled={hook.busy} onClick={() => hook.runPro({ type: "consult-schedule", studentId: id, nth, weekday, time })}>정기 일정 저장</Button>
              </div></fieldset>
              <div className="space-y-2 border-t border-slate-100 pt-3"><label htmlFor="pro-consult-override" className="text-xs text-slate-500">이번 달 예정일만 변경</label><Input id="pro-consult-override" aria-label="이번 달 상담 예정일" type="datetime-local" value={override} onChange={e => setOverride(e.target.value)}/><Button variant="outline" disabled={hook.busy || !override} onClick={() => hook.runPro({ type: "consult-schedule", studentId: id, nth, weekday, time, month: selectedMonth, override: new Date(`${override}:00+09:00`).toISOString() })}>이번 달 예정일만 변경</Button></div>
            </div>
          </details>
          <div className="space-y-4">
            {previousId && <ProBadge tone="blue">상담 기록 수정 중</ProBadge>}
            <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">상담 결과</legend>{(["유선 상담 완료", "부재 후 카톡 상담으로 대체", "미진행"] as const).map(r => <label key={r} className="flex items-center gap-2 text-sm"><input type="radio" name="pro-consult-result" className="accent-blue-600" checked={result === r} onChange={() => setResult(r)}/>{r}</label>)}</fieldset>
            <label className="block space-y-2 text-sm"><span className="font-semibold">실제 상담 일시</span><Input aria-label="실제 상담 일시" type="datetime-local" value={actualAt} onChange={e => setActualAt(e.target.value)}/></label>
            <label className="block space-y-2 text-sm"><span className="font-semibold">상담 메모 <span className="font-normal text-slate-500">· 본사도 볼 수 있습니다.</span></span><textarea aria-label="상담 메모" placeholder="상담 내용을 입력하세요." className="min-h-32 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm leading-6 outline-blue-500" value={consultMemo} onChange={e => setConsultMemo(e.target.value)}/></label>
            <Button disabled={hook.busy || !actualAt || !consultMemo.trim()} onClick={async () => { if (await hook.runPro({ type: "consult", studentId: id, month: selectedMonth, result, actualAt: new Date(`${actualAt}:00+09:00`).toISOString(), memo: consultMemo, previousId })) { setConsultMemo(""); setPreviousId(undefined) } }}>{previousId ? "수정 이력 저장" : "상담 기록 저장"}</Button>
          </div>
        </>}
        <div className="mt-6 border-t border-slate-200 pt-4"><h3 className="mb-2 text-sm font-semibold">이번 달 상담 기록</h3>
          {!consultations.length && <p className="py-2 text-sm text-slate-400">아직 상담 기록이 없습니다.</p>}
          {consultations.map(c => <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm" key={c.id}><strong>{c.result}</strong><p className="mt-1 text-xs text-slate-500">{dateLabel(c.actualAt)} · {c.actor}</p><p className="my-2 whitespace-pre-wrap leading-6">{c.memo}</p>{!hook.readOnly && <Button variant="outline" size="sm" onClick={() => { setPreviousId(c.id); setResult(c.result); setConsultMemo(c.memo); setActualAt(new Date(Date.parse(c.actualAt) + 9*3600000).toISOString().slice(0,16)) }}>기록 수정</Button>}</div>)}
          <details className="mt-4 text-xs text-slate-500"><summary className="cursor-pointer">상담 변경 이력</summary>{pro.consultations.filter(c => c.studentId === id && c.month === selectedMonth).map(c => <p className="mt-2" key={c.id}>{dateLabel(c.at)} · {c.actor} · {c.result} · {c.memo}</p>)}</details>
        </div>
      </section>
    </div>
  </div>
}
