"use client"
import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StudentDetailDialog } from "./student-detail-dialog"
import { ProBadge } from "./pro-common"
import { monthlyDateTime, monthlyLate, monthlyPeriod, monthlyStatus } from "@/lib/pro-monthly"
import { monthlyKinds } from "@/lib/pro-monthly-generation"
import type { MonthlyGeneration, MonthlyRecord, AcademyStyle } from "@/lib/pro-monthly-types"
import type { ReviewDatabase } from "@/lib/review-domain"

export function MonthlyBadge({ record, now }: { record?: MonthlyRecord; now: string }) {
  const status = monthlyStatus(record)
  return <span className="inline-flex flex-wrap items-center gap-1.5"><ProBadge tone={record?.sent ? "green" : status === "생성 실패" ? "red" : record?.saved ? "blue" : "slate"}>{status}</ProBadge>{record && monthlyLate(record,now) && <ProBadge tone="red">지연</ProBadge>}</span>
}
export function MonthlyDialog({ title, children, onClose, onConfirm, confirmLabel, closeLabel, disabled, busy }: {
  title: string; children: React.ReactNode; onClose: () => void; onConfirm?: () => void; confirmLabel?: string; closeLabel?: string; disabled?: boolean; busy?: boolean
}) {
  const trigger = React.useRef<HTMLElement | null>(typeof document === "undefined" ? null : document.activeElement as HTMLElement)
  return <StudentDetailDialog title={title} onClose={onClose} onConfirm={onConfirm} confirmLabel={confirmLabel} closeLabel={closeLabel} disabled={disabled} busy={busy} triggerRef={trigger}>{children}</StudentDetailDialog>
}
export function MonthlyEvidence({ generation, db, query = "role=agency" }: { generation: MonthlyGeneration; db: ReviewDatabase; query?: string }) {
  return <div className="space-y-5 text-sm leading-6">
    <section><h3 className="font-semibold text-slate-900">중심 내용</h3><p className="mt-1">{generation.focus}</p></section>
    <section><h3 className="font-semibold text-slate-900">학습 자료</h3>{generation.input.sources.length ? <ul className="mt-2 divide-y divide-slate-200">{generation.input.sources.map(source => <li key={source.recordId} className="space-y-2 py-3">
      <p className="font-semibold">{source.title} · {source.round}차 · {source.level}레벨</p><p className="text-xs text-slate-500">제출 {monthlyDateTime(source.submittedAt)}<br/>피드백 전송 {monthlyDateTime(source.sentAt)}</p>
      <p>{source.is_current_academy === null ? "피드백 전 제출 글" : source.is_current_academy ? "현재 학원 자료" : "이전 학원 자료"}</p>
      <details><summary className="cursor-pointer text-blue-700">근거 위치</summary><p className="mt-2 whitespace-pre-wrap">학생 글: {source.body}</p>{source.feedback && <p className="mt-2 whitespace-pre-wrap">선생님 피드백: {source.feedback}</p>}{source.itemFeedback.map((text,i) => <p key={i}>항목별 의견: {text}</p>)}</details>
      {db.records.some(r => r.id === source.recordId) ? <Button asChild size="sm" variant="outline"><Link href={`/agency/online-workbooks/${source.recordId}?${query}`} target="_blank" rel="noopener noreferrer">근거 보기</Link></Button> : <Button size="sm" variant="outline" disabled>근거 보기</Button>}
    </li>)}</ul> : <p className="mt-2 text-slate-500">해당 기간에 제출한 글이 없습니다.</p>}</section>
    <section><h3 className="font-semibold text-slate-900">이전 발송본</h3><p className="mt-2 whitespace-pre-wrap">{generation.input.previous?.body || "지난 발송본이 없습니다."}</p></section>
    <section><h3 className="font-semibold text-slate-900">검토 안내</h3>{generation.warnings.length ? generation.warnings.map(w => <p key={w} className="mt-1 text-amber-800">{w}</p>) : <p className="mt-1 text-slate-500">추가 확인 안내가 없습니다.</p>}</section>
  </div>
}
export function MonthlyHistory({ record, busy, onLoad }: { record: MonthlyRecord; busy?: boolean; onLoad?: (g: MonthlyGeneration) => void }) {
  return <ol className="space-y-4">{record.generations.slice().reverse().map(g => <li key={g.id} className="rounded-lg border border-slate-200 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{record.generations.indexOf(g) === 0 ? "최초 생성" : `다시 만들기 ${record.generations.indexOf(g)}회`}</h3><span className="text-xs text-slate-500">{monthlyDateTime(g.at)}</span></div>
    <p className="mt-1 text-xs text-slate-500">{monthlyKinds[g.kind]} · {g.composition}</p>{(g.direction || g.request) && <p className="mt-2 text-sm">요청: {g.direction}{g.direction && g.request ? " / " : ""}{g.request}</p>}
    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{g.body}</p><ul className="mt-3 space-y-1 text-sm text-slate-600">{g.carry.map((c,i) => <li key={i}>{c.continued ? "이어서 확인" : "새 항목"} · {c.text}</li>)}</ul>
    {onLoad && !record.sent && <Button className="mt-3" size="sm" variant="outline" disabled={busy} onClick={() => onLoad(g)}>이 초안 불러오기</Button>}
  </li>)}</ol>
}
function readableStyle(value: string) {
  try { const v = JSON.parse(value), items = Array.isArray(v) ? v : v.items; return `${typeof v.enabled === "boolean" ? `사용 여부: ${v.enabled ? "사용" : "사용 안 함"}\n` : ""}${items.length ? items.map((i:{text:string;observations:number})=>`${i.text} (${i.observations >= 2 ? "확정" : "관찰"})`).join("\n") : "저장된 말투 없음"}` } catch { return value }
}
export function AcademyStyleHistory({ style }: { style: AcademyStyle }) {
  return <ol className="divide-y divide-slate-200">{style.history.slice().reverse().map(h => <li key={h.id} className="space-y-2 py-4 text-sm"><p className="font-semibold">{h.kind}</p><p className="text-xs text-slate-500">{monthlyDateTime(h.at)} · {h.actor}</p><p className="whitespace-pre-wrap">변경 전: {readableStyle(h.before)}</p><p className="whitespace-pre-wrap">변경 후: {readableStyle(h.after)}</p></li>)}{!style.history.length && <li className="py-4 text-sm text-slate-500">변경 이력이 없습니다.</li>}</ol>
}
export function AcademyStyleView({ style }: { style: AcademyStyle }) {
  return <div className="space-y-5 text-sm"><dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2"><dt>학원 말투 사용</dt><dd>{style.enabled ? "사용" : "사용 안 함"}</dd><dt>발송본 누적</dt><dd>{style.sentIds.length}편</dd><dt>현재 적용 상태</dt><dd>{!style.enabled ? "사용 안 함" : style.sentIds.length < 3 ? "적용 대기" : "사용"}</dd><dt>마지막 변경</dt><dd>{monthlyDateTime(style.updatedAt)}</dd></dl><section><h3 className="font-semibold">저장된 말투</h3>{style.items.length ? <ul className="mt-3 space-y-2">{style.items.map((item,i) => <li key={i}><ProBadge>{item.observations >= 2 ? "확정" : "관찰"}</ProBadge> {item.text}</li>)}</ul> : <p className="mt-2 text-slate-500">저장된 말투가 없습니다.</p>}</section><details><summary className="cursor-pointer font-semibold">변경 이력 보기</summary><AcademyStyleHistory style={style}/></details></div>
}
export function MonthlyReadOnly({ record, db }: { record: MonthlyRecord; db: ReviewDatabase }) {
  const body = record.job ? undefined : record.sent ?? record.saved ?? record.generations[0], source = record.generations.find(g => g.id === (record.sent?.sourceId ?? record.saved?.sourceId)) ?? record.generations[0]
  return <div className="space-y-5 text-sm leading-6"><dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2"><dt>학생</dt><dd>{db.pro?.members.find(m=>m.id===record.studentId)?.name}</dd><dt>관리월</dt><dd>{record.month}</dd><dt>대상 기간</dt><dd>{monthlyPeriod(record)}</dd><dt>발송 구분</dt><dd>{record.required ? "발송 필수" : "발송 선택"}</dd><dt>실제 발송 일시</dt><dd>{monthlyDateTime(record.sent?.actualAt)}</dd>{record.sent && <><dt>기록 일시</dt><dd>{monthlyDateTime(record.sent.recordedAt)}</dd><dt>발송 기록 방식</dt><dd>{record.sent.manual ? "실제 발송 일시 직접 입력" : "[보냈어요]로 기록"}</dd><dt>처리자</dt><dd>{record.sent.actor}</dd></>}</dl>
    <MonthlyBadge record={record} now={db.pro!.clock}/>
    <p className="whitespace-pre-wrap text-slate-900">{body?.body ?? (record.job ? "월간 피드백 AI초안을 만들고 있습니다." : "월간 피드백 AI초안을 생성하지 못했습니다.")}</p>
    {!!body?.carry.length && <section><h3 className="font-semibold">다음 달 이어 볼 항목</h3>{body.carry.map((c,i)=><p key={i}>{c.continued ? "이어서 확인" : "새 항목"} · {c.text}</p>)}</section>}
    {source && <details><summary className="cursor-pointer font-semibold text-blue-700">생성 근거</summary><div className="mt-3"><MonthlyEvidence generation={source} db={db} query={`role=admin${typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("monthlyTest")?`&monthlyTest=${encodeURIComponent(new URLSearchParams(window.location.search).get("monthlyTest")!)}`:""}`}/></div></details>}
    {!!record.generations.length && <details><summary className="cursor-pointer font-semibold text-blue-700">생성 이력 보기</summary><div className="mt-3"><MonthlyHistory record={record}/></div></details>}
    <details><summary className="cursor-pointer font-semibold text-blue-700">처리 이력</summary><ol className="mt-2 divide-y divide-slate-200">{record.audit.slice().reverse().map(a=><li className="py-2" key={a.id}>{a.action}<br/><span className="text-xs text-slate-500">{monthlyDateTime(a.at)} · {db.reviews.find(r=>r.institutionId===a.institutionId)?.institution ?? a.institutionId} · {a.actor}</span></li>)}</ol></details>
  </div>
}
