"use client"
import * as React from "react"
import Link from "next/link"
import { Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StudentDetailDialog } from "./student-detail-dialog"
import { ProBadge } from "./pro-common"
import { academyName, monthlyDateTime, monthlyLate, monthlyPeriod, monthlyStatus } from "@/lib/pro-monthly"
import { monthlyKinds, monthlyLength } from "@/lib/pro-monthly-generation"
import { monthlyDisplayNotices } from "@/lib/pro-monthly-language"
import type { MonthlyGeneration, MonthlyRecord, AcademyStyle } from "@/lib/pro-monthly-types"
import type { ReviewDatabase } from "@/lib/review-domain"
import { demoIdentityQuery } from "@/lib/review-client"
import ui from "./monthly-feedback.module.css"

export function monthlyGenerationLabel(generation?: Pick<MonthlyGeneration, "kind" | "composition">) {
  if (!generation) return "-"
  return `${monthlyKinds[generation.kind]}${generation.kind === "general" ? ` · ${generation.composition}` : ""}`
}
export function monthlyGenerationTitle(record: MonthlyRecord, generation: MonthlyGeneration) {
  const index = record.generations.indexOf(generation)
  return index === 0 ? "최초 생성" : `다시 만들기 ${index}회`
}
export function MonthlyBadge({ record, now, generating = false }: { record?: MonthlyRecord; now: string; generating?: boolean }) {
  const status = generating ? "생성 중" : monthlyStatus(record)
  return <span className="inline-flex flex-wrap items-center gap-1.5"><ProBadge tone={record?.sent ? "green" : status === "생성 실패" ? "red" : record?.saved && !generating ? "blue" : "slate"}>{status}</ProBadge>{record && monthlyLate(record, now) && <ProBadge tone="red">지연</ProBadge>}</span>
}
type MonthlyDialogProps = Omit<React.ComponentProps<typeof StudentDetailDialog>, "triggerRef" | "maxWidth"> & { size?: "form" | "reading" | "confirm" }
export function MonthlyDialog({ size = "form", className, ...props }: MonthlyDialogProps) {
  const trigger = React.useRef<HTMLElement | null>(typeof document === "undefined" ? null : document.activeElement as HTMLElement)
  return <StudentDetailDialog headerLayout="stacked" focusContentOnOpen={size === "reading"} {...props} className={`${ui.monthlyDialog} ${className ?? ""}`} maxWidth={size === "reading" ? 800 : size === "confirm" ? 520 : 640} triggerRef={trigger}/>
}
export function MonthlyEvidenceBasis({ generation }: { generation: MonthlyGeneration }) {
  return <span className={ui.help}>생성 당시 담당 학원 기준 · {monthlyDateTime(generation.at)}</span>
}
export function MonthlyEvidence({ generation, db, query = "role=agency" }: { generation: MonthlyGeneration; db: ReviewDatabase; query?: string }) {
  const notices=monthlyDisplayNotices(generation.warnings,generation.notesForTeacher)
  return <div className={ui.evidence}>
    <section className={ui.evidenceFocus}><h3>중심 내용</h3><p>{generation.focus}</p></section>
    {!!generation.evidence?.length && <section><h3>생성 근거</h3><ul className={ui.evidenceList}>{generation.evidence.map((e,i)=><li key={i} className={ui.source}>
      <p className="font-medium text-slate-900">{e.point}</p><p className={ui.help}>{e.source}</p>
      <details className={ui.sourceDisclosure}><summary>근거 위치</summary><div className={ui.sourceQuotes}>{e.references.map((ref,j)=><p key={j}><span className={ui.help}>{generation.input.sources.find(s=>s.recordId===ref.recordId)?.title} · {ref.field==="body"?"학생 글":"선생님 피드백"}</span><br/>{ref.quote}</p>)}{e.criterion&&<p><span className={ui.help}>또래 서술 기준</span><br/>{e.criterion}</p>}</div></details>
    </li>)}</ul></section>}
    <section className={!generation.input.sources.length ? ui.emptyEvidence : undefined}><h3>학습 자료</h3>{generation.input.sources.length ? <ul className={ui.evidenceList}>{generation.input.sources.map(source => <li key={source.recordId} className={ui.source}>
      <div className={ui.sourceHeading}><strong className="text-slate-900">{source.title}</strong><span className={ui.help}>{source.round}차 · {source.level}레벨</span><ProBadge>{source.is_current_academy === null ? "피드백 전 제출 글" : source.is_current_academy ? "현재 학원 자료" : "이전 학원 자료"}</ProBadge></div>
      <p className={`${ui.help} mt-1`}>제출 {monthlyDateTime(source.submittedAt)} · 피드백 전송 {monthlyDateTime(source.sentAt)}</p>
      <div className={ui.sourceActions}>
        <details className={`${ui.sourceDisclosure} min-w-0 flex-1`}><summary>근거 위치</summary><div className={ui.sourceQuotes}><p><span className={ui.help}>학생 글</span><br/>{source.body}</p>{source.feedback && <p><span className={ui.help}>선생님 피드백</span><br/>{source.feedback}</p>}{source.itemFeedback.map((text, i) => <p key={i}><span className={ui.help}>항목별 의견</span><br/>{text}</p>)}</div></details>
        {db.records.some(r => r.id === source.recordId) ? <Button asChild size="sm" variant="outline"><Link href={`/agency/online-workbooks/${source.recordId}?${query}`} target="_blank" rel="noopener noreferrer">근거 보기<ExternalLink className="size-3.5" aria-label="새 탭"/></Link></Button> : <Button size="sm" variant="outline" disabled>근거 보기<ExternalLink className="size-3.5" aria-hidden="true"/></Button>}
      </div>
    </li>)}</ul> : <p className={ui.help}>-</p>}</section>
    <section className={!generation.input.previous?ui.emptyEvidence:ui.evidencePanel}><h3>이전 발송본</h3><p className={generation.input.previous ? ui.prose : ui.help}>{generation.input.previous?.body || "-"}</p></section>
    <section className={!notices.length?ui.emptyEvidence:ui.evidenceNotes}><h3>검토 안내</h3>{notices.length ? notices.map(w => <p key={w} className="text-amber-800">{w}</p>) : <p className={ui.help}>-</p>}</section>
  </div>
}
export function MonthlyHistory({ record, selectedId, onSelect, db, query }: { record: MonthlyRecord; selectedId?: string; onSelect?: (id: string) => void; db?: ReviewDatabase; query?: string }) {
  const [localId, setLocalId] = React.useState(record.generations.at(-1)?.id)
  const selected = record.generations.find(g => g.id === (selectedId ?? localId)) ?? record.generations.at(-1)
  if (!selected) return <p className={ui.help}>-</p>
  return <div className={ui.history}>
    <ol className={ui.historyList} aria-label="생성 이력 선택">{record.generations.slice().reverse().map(g => <li key={g.id}>
      <button type="button" className={ui.historyChoice} aria-pressed={selected.id === g.id} onClick={() => onSelect ? onSelect(g.id) : setLocalId(g.id)}>
        <strong>{monthlyGenerationTitle(record, g)}<Check className={`size-4 shrink-0 text-blue-700 ${selected.id === g.id ? "" : "invisible"}`} aria-hidden="true"/></strong>
        <span className={ui.help}>{monthlyDateTime(g.at)}</span>
        {(g.direction || g.request) && <span className={`${ui.help} break-words`}>{g.direction || "직접 요청"}</span>}
      </button>
    </li>)}</ol>
    <section className={ui.historyBody} aria-label="선택한 생성본">
      <div className={ui.historySummary}>
        <div className={ui.historySummaryHeading}><h3 className={ui.sectionTitle}>{monthlyGenerationTitle(record, selected)}</h3><span className={ui.help}>{monthlyDateTime(selected.at)}</span></div>
        <p className={ui.help}>{monthlyGenerationLabel(selected)}</p>
        {(selected.direction || selected.request) && <dl className={`${ui.facts} ${ui.historyRequest}`}>{selected.direction && <><dt>요청 방향</dt><dd>{selected.direction}</dd></>}{selected.request && <><dt>직접 요청</dt><dd className="whitespace-pre-wrap">{selected.request}</dd></>}</dl>}
      </div>
      <div className={ui.readMessage}><p className={ui.prose}>{selected.body}</p></div>
      <div className={ui.historyCarry}><h3 className={ui.sectionTitle}>다음 달 이어 볼 항목</h3>
        <ul className="mt-2 space-y-1">{selected.carry.map((c, i) => <li key={i}><span className={ui.help}>{c.continued ? "이어서 확인" : "새 항목"}</span> · {c.text}</li>)}</ul>
      </div>
      {db&&<details className={ui.evidenceDisclosure}><summary>생성에 사용한 자료</summary><div><p className="mb-4"><MonthlyEvidenceBasis generation={selected}/></p><MonthlyEvidence generation={selected} db={db} query={query}/></div></details>}
    </section>
  </div>
}
function readableStyle(value: string) {
  try { const v = JSON.parse(value), items = Array.isArray(v) ? v : v.items; return `${typeof v.enabled === "boolean" ? `사용 여부: ${v.enabled ? "사용" : "사용 안 함"}\n` : ""}${items.length ? items.map((i: { text: string; observations: number }) => `${i.text} (${i.observations >= 2 ? "확정" : "관찰"})`).join("\n") : "-"}` } catch { return value }
}
export function AcademyStyleHistory({ style }: { style: AcademyStyle }) {
  return <ol className={ui.styleHistory}>{style.history.slice().reverse().map(h => <li key={h.id}>
    <div className={ui.styleHistoryMeta}><strong className="text-sm text-slate-900">{h.kind}</strong><span className={ui.help}>{monthlyDateTime(h.at)} · {h.actor}</span></div>
    <div className={ui.styleChanges}><div><h4 className={`${ui.help} mb-1`}>변경 전</h4><p>{readableStyle(h.before)}</p></div><div><h4 className={`${ui.help} mb-1`}>변경 후</h4><p>{readableStyle(h.after)}</p></div></div>
  </li>)}{!style.history.length && <li className={ui.help}>변경 이력이 없습니다.</li>}</ol>
}
export function AcademyStyleSummary({ style, name }: { style: AcademyStyle; name: string }) {
  return <div className={ui.academyIdentity}><strong>{name}</strong><dl className={ui.readMetaGrid}>
    <div><dt>사용 여부</dt><dd>{style.enabled ? "사용" : "사용 안 함"}</dd></div>
    <div><dt>누적 발송본 수</dt><dd>{style.sentIds.length}편</dd></div>
    <div><dt>현재 적용 상태</dt><dd><ProBadge tone={style.enabled && style.sentIds.length >= 3 ? "green" : "slate"}>{!style.enabled ? "사용 안 함" : style.sentIds.length < 3 ? "적용 대기" : "사용"}</ProBadge></dd></div>
  </dl></div>
}
export function AcademyStyleView({ style }: { style: AcademyStyle }) {
  return <div className={ui.readDocument}><section>
    <div className={ui.styleHeading}><h3 className={ui.sectionTitle}>저장된 말투</h3><span className={ui.help}>마지막 변경 일시 {monthlyDateTime(style.updatedAt)}</span></div>
    {style.items.length ? <div className={ui.readStyleList}>
      <div className={ui.readStyleLabels} aria-hidden="true"><span>말투 항목</span><span>관찰 상태</span></div>
      <ul>{style.items.map((item, i) => <li key={i}><span>{item.text}</span><ProBadge>{item.observations >= 2 ? "확정" : "관찰"}</ProBadge></li>)}</ul>
    </div> : <p className={ui.help}>저장된 말투가 없습니다.</p>}
  </section><div className={ui.readDisclosureGroup}><details><summary>말투 변경 이력</summary><div><AcademyStyleHistory style={style}/></div></details></div></div>
}
export function MonthlyReadOnly({ record, db }: { record: MonthlyRecord; db: ReviewDatabase }) {
  const body = record.job ? undefined : record.sent ?? record.saved ?? record.generations[0]
  const source = record.generations.find(g => g.id === (record.sent?.sourceId ?? record.saved?.sourceId)) ?? record.generations[0]
  return <div className={ui.readDocument}>
    <section><div className={ui.styleHeading}><h3 className={ui.sectionTitle}>기본 정보</h3><MonthlyBadge record={record} now={db.pro!.clock}/></div><dl className={ui.readMetaGrid}>
      <div><dt>학습 대상 기간</dt><dd>{monthlyPeriod(record)}</dd></div><div><dt>발송 구분</dt><dd>{record.required ? "발송 필수" : "발송 선택"}</dd></div><div><dt>실제 발송 일시</dt><dd>{monthlyDateTime(record.sent?.actualAt)}</dd></div>
      {record.sent && <><div><dt>기록 일시</dt><dd>{monthlyDateTime(record.sent.recordedAt)}</dd></div><div><dt>발송 기록 방식</dt><dd>{record.sent.manual ? "실제 발송 일시 직접 입력" : "[보냈어요]로 기록"}</dd></div><div><dt>처리자</dt><dd>{record.sent.actor}</dd></div></>}
    </dl></section>
    <section><div className={`${ui.bodyHeading} mb-3`}><h3>월간 피드백 본문</h3>{body && <span className={ui.bodyMeta}>{monthlyGenerationLabel(source)}<span>{monthlyLength(body.body)}자</span></span>}</div><div className={ui.readMessage}><p className={ui.prose}>{body?.body ?? (record.job ? "월간 피드백 AI초안을 만들고 있습니다." : "월간 피드백 AI초안을 생성하지 못했습니다.")}</p></div></section>
    {!!body?.carry.length && <section><h3 className={`${ui.sectionTitle} mb-2`}>다음 달 이어 볼 항목</h3>{body.carry.map((c, i) => <p key={i}><span className={ui.help}>{c.continued ? "이어서 확인" : "새 항목"}</span> · {c.text}</p>)}</section>}
    <div className={ui.readDisclosureGroup}>
    {source && <details><summary>생성에 사용한 자료</summary><div><p className="mb-4"><MonthlyEvidenceBasis generation={source}/></p><MonthlyEvidence generation={source} db={db} query={`role=admin${demoIdentityQuery("admin")}`}/></div></details>}
    {!!record.generations.length && <details><summary>생성 이력</summary><div><MonthlyHistory record={record} db={db} query={`role=admin${demoIdentityQuery("admin")}`}/></div></details>}
    <details><summary>처리 이력</summary><div><ol className={ui.auditList}>{record.audit.slice().reverse().map(a => <li key={a.id}><p>{a.action}</p><p className={ui.help}>{monthlyDateTime(a.at)} · {academyName(db, a.institutionId)} · {a.actor}</p></li>)}</ol></div></details>
    </div>
  </div>
}
