"use client"
import * as React from "react"
import { useMonthlyNavigationGuard } from "./use-monthly-navigation-guard"
import { Check, FileSearch, History, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { field, ProBadge, type useProManagement } from "./pro-common"
import { MonthlyBadge, MonthlyDialog, MonthlyEvidence, MonthlyEvidenceBasis, MonthlyHistory, monthlyGenerationLabel, monthlyGenerationTitle } from "./monthly-feedback-parts"
import { monthlyDateTime, monthlyId, monthlyPeriod, monthlyRegularAt, monthlyScheduleAt } from "@/lib/pro-monthly"
import { monthlyDirections, monthlyLength, canShortenMonthly } from "@/lib/pro-monthly-generation"
import { localDateTime, consultationResultLabel, dayNames, regularConsultationLabel } from "@/lib/pro-student-detail"
import type { MonthlyCarry, MonthlyDirection, MonthlyGeneration } from "@/lib/pro-monthly-types"
import { monthlyMessages, monthlyActionFailures } from "@/lib/pro-monthly-messages"
import { demoIdentityQuery } from "@/lib/review-client"
import type { ProMember } from "@/lib/pro-types"
import styles from "./pro-management.module.css"
import ui from "./monthly-feedback.module.css"

type NavigationGuard = (go: () => void) => void
type Props = { hook: ReturnType<typeof useProManagement>; member: ProMember; month: string; navigationRef: React.MutableRefObject<NavigationGuard> }
const reviewReasons: Record<string,string> = { "작성 과정의 도움 여부": "작성 과정의 도움 여부를 확인하는 문장입니다. 발송 전에 표현을 확인해 주세요.", "부족한 점의 직접 언급": monthlyMessages.improvementReview, "제출 횟수 언급": "제출 횟수를 언급하는 문장입니다. 발송 전에 표현을 확인해 주세요." }
const escape = (text: string) => text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")

function MessageEditor({ value, onChange, generation, disabled }: { value: string; onChange: (text:string)=>void; generation?: MonthlyGeneration; disabled: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [reason,setReason] = React.useState("")
  const render = React.useCallback(() => {
    if (!ref.current) return
    const spans = generation?.reviewSpans.filter(s => value.includes(s.text)).sort((a,b)=>b.text.length-a.text.length) ?? []
    let html = escape(value)
    for (const span of spans) html = html.replace(escape(span.text),`<mark tabindex="0" style="background:transparent;color:#b45309" data-reason="${escape(span.reason)}" title="${escape(reviewReasons[span.reason])}">${escape(span.text)}</mark>`)
    ref.current.innerHTML = html
  },[value,generation])
  React.useEffect(() => { if (!ref.current?.contains(document.activeElement)) render() },[render])
  const show = (target: EventTarget | null) => setReason(target instanceof HTMLElement ? reviewReasons[target.closest("[data-reason]")?.getAttribute("data-reason") ?? ""] ?? "" : "")
  return <div><div ref={ref} role="textbox" aria-label="월간 피드백 본문" aria-multiline="true" aria-disabled={disabled} contentEditable={!disabled} suppressContentEditableWarning className={ui.bodyInput} onInput={e => onChange(e.currentTarget.innerText.replace(/\r/g,""))} onBlur={() => { setReason(""); render() }} onClick={e=>show(e.target)} onMouseOver={e=>show(e.target)} onFocus={e=>show(e.target)} onKeyDown={e=>{if(e.key==="Escape")setReason("")}} onPaste={e=>{e.preventDefault(); const text=e.clipboardData.getData("text/plain"); const selection=window.getSelection(); if(selection?.rangeCount){const range=selection.getRangeAt(0);range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);onChange(e.currentTarget.innerText)}}}/>{reason && <p role="tooltip" className="mt-2 rounded bg-amber-50 p-2 text-xs leading-5 text-amber-900">{reason}</p>}</div>
}

export function MonthlyFeedbackEditor({ hook, member, month, navigationRef }: Props) {
  const pro = hook.db.pro!, state = pro.monthly, record = state?.records.find(r=>r.id===monthlyId(member.id,month))
  const [body,setBody] = React.useState(""), [carry,setCarry] = React.useState<MonthlyCarry[]>([]), [sourceId,setSourceId] = React.useState("")
  const [revision,setRevision] = React.useState(0), [forceDirty,setForceDirty] = React.useState(false)
  const [modal,setModal] = React.useState<"regenerate"|"history"|"evidence"|"sent"|null>(null)
  const [direction,setDirection] = React.useState<MonthlyDirection>(), [request,setRequest] = React.useState(""), [actualAt,setActualAt] = React.useState("")
  const [replacement,setReplacement] = React.useState<(()=>void)|null>(null)
  const [generationRequest, setGenerationRequest] = React.useState<"retry" | "regenerate" | null>(null)
  const [historyId, setHistoryId] = React.useState("")
  const dialogBody = React.useRef<HTMLDivElement>(null), confirmationText = React.useRef<HTMLParagraphElement>(null)
  const returnScroll = React.useRef(0), returnFocus = React.useRef<HTMLElement | null>(null)
  const [scheduleOpen,setScheduleOpen] = React.useState(false), [weekday,setWeekday] = React.useState(""), [time,setTime] = React.useState("18:00")
  const initialized = React.useRef(""), pendingGeneration = React.useRef<string | null>(null)
  const section = React.useRef<HTMLElement>(null)
  const source = record?.generations.find(g=>g.id===(record.sent?.sourceId ?? sourceId)) ?? record?.generations[0]
  const saved = record?.sent ?? record?.saved
  const baseline = saved ?? record?.generations[0]
  const normalizedCarry = carry.filter(c=>c.text.trim()).map(c=>({...c,text:c.text.trim()}))
  const dirty = !record?.sent && !!baseline && (forceDirty || body !== baseline.body || JSON.stringify(normalizedCarry) !== JSON.stringify(baseline.carry))
  const generating = !!record?.job || generationRequest !== null, busy = hook.busy || generating
  const readOnly = hook.readOnly || !!record?.sent || !!member.caseOnly
  const currentKey = `${member.id}:${month}`
  React.useEffect(() => {
    if (!record?.generations.length) {
      if (initialized.current !== `${currentKey}:empty`) {
        setBody("");setCarry([]);setSourceId("");setForceDirty(false);setModal(null);initialized.current=`${currentKey}:empty`
      }
      return
    }
    if (initialized.current !== currentKey) {
      const initial = record.sent ?? record.saved ?? record.generations[0]
      setBody(initial.body); setCarry(structuredClone(initial.carry)); setSourceId("sourceId" in initial ? initial.sourceId : initial.id); setRevision(record.revision); setForceDirty(false); initialized.current=currentKey
    }
    if (pendingGeneration.current && !record.job && !hook.busy) {
      const latest=record.generations.at(-1)!
      if (latest.id !== pendingGeneration.current) { setBody(latest.body);setCarry(structuredClone(latest.carry));setSourceId(latest.id);setRevision(record.revision);setForceDirty(true);setModal(null) }
      else if(record.error) hook.setError(monthlyMessages.generationFailed)
      else return
      pendingGeneration.current=null
    }
  },[record,currentKey,hook])
  React.useEffect(()=>{if(record?.job){const timer=setInterval(()=>void hook.refresh(),1200);return()=>clearInterval(timer)}},[record?.job,hook])
  React.useLayoutEffect(() => {
    if (!replacement) return
    if (dialogBody.current) dialogBody.current.scrollTop = 0
    confirmationText.current?.focus({ preventScroll: true })
  }, [replacement])
  React.useEffect(()=>{if(window.location.hash==="#monthly-feedback") requestAnimationFrame(()=>{section.current?.scrollIntoView({block:"start"});section.current?.focus({preventScroll:true})})},[currentKey])
  const navigation = useMonthlyNavigationGuard(dirty, busy, navigationRef)
  const load=(g:MonthlyGeneration)=>{setBody(g.body);setCarry(structuredClone(g.carry));setSourceId(g.id);setRevision(record!.revision);setForceDirty(true);setModal(null)}
  const regenerate=async()=>{
    if(!record)return
    pendingGeneration.current=record.generations.at(-1)!.id
    setGenerationRequest("regenerate")
    try {
      if(!await hook.runPro({type:"monthly-regenerate",id:record.id,revision,body,direction,request})){pendingGeneration.current=null;return}
      hook.setMessage("")
    } finally { setGenerationRequest(null) }
  }
  const retry = async () => {
    if (!record) return
    setGenerationRequest("retry")
    try { if (await hook.runPro({ type: "monthly-retry", id: record.id, revision: record.revision })) hook.setMessage("") }
    finally { setGenerationRequest(null) }
  }
  const confirmReplacement = (run: () => void) => {
    returnScroll.current = dialogBody.current?.scrollTop ?? 0
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setReplacement(() => run)
  }
  const cancelReplacement = () => {
    setReplacement(null)
    requestAnimationFrame(() => {
      returnFocus.current?.focus({ preventScroll: true })
      if (dialogBody.current) dialogBody.current.scrollTop = returnScroll.current
    })
  }
  const save=async()=>{if(record&&await hook.runPro({type:"monthly-save",id:record.id,revision,body,carry,sourceId})){setRevision(revision+1);setForceDirty(false)}}
  const copy=async()=>{
    if(!record||!saved)return
    try { await navigator.clipboard.writeText(saved.body); if(await hook.runPro({type:"monthly-copy",id:record.id,revision:record.revision}))hook.setMessage(record.sent ? "발송한 문구를 복사했습니다." : "복사했습니다. 단톡방에 보낸 뒤 [보냈어요]를 눌러 주세요.") }
    catch { hook.setError(monthlyActionFailures["monthly-copy"]) }
  }
  const send=async(manual=false)=>{
    if(!record)return
    if(await hook.runPro({type:"monthly-send",id:record.id,revision:record.revision,...(manual?{actualAt:new Date(`${actualAt}:00+09:00`).toISOString()}:{})})){setModal(null);setForceDirty(false);hook.setMessage("")}
  }
  const actual = Date.parse(`${actualAt}:00+09:00`), validActual = !!record && Number.isFinite(actual) && actual>=Date.parse(record.firstGeneratedAt) && actual<=Date.parse(pro.clock)
  const excluded=state?.exclusions.find(e=>e.studentId===member.id&&e.month===month)
  const consultations=pro.consultations.filter(c=>c.studentId===member.id&&c.month===month&&(!state?.transition||c.at<=state.transition.at))
  const validConsultations=consultations.filter(c=>!consultations.some(n=>n.previousId===c.id))
  const owner = pro.scopeInstitutionId ?? member.institutionId
  const evidenceQuery=`role=${hook.role}${demoIdentityQuery(hook.role)}`
  const schedule=state?.schedules.find(s=>s.studentId===member.id)
  const selectedGeneration = record?.generations.find(g => g.id === historyId) ?? record?.generations.at(-1)
  const primaryAction = !record?.saved || dirty ? "save" : record.copied?.revision === record.saved.revision ? "send" : "copy"
  const canSchedule = !hook.readOnly && !member.caseOnly && member.institutionId === owner && month >= "2026-11"
  const openSchedule = () => { setWeekday(schedule?.weekday ? String(schedule.weekday) : ""); setTime(schedule?.time ?? "18:00"); setScheduleOpen(!scheduleOpen) }
  const modalTitle = replacement ? "월간 피드백 내용 교체" : modal === "regenerate" ? "월간 피드백 다시 만들기" : modal === "history" ? "월간 피드백 생성 이력" : modal === "evidence" ? "월간 피드백 생성 근거" : "월간 피드백 발송 기록"
  const confirmModal = replacement ? () => { const run = replacement; setReplacement(null); run() } : modal === "regenerate" && record && source ? () => {
    if (body !== source.body || JSON.stringify(carry) !== JSON.stringify(source.carry)) confirmReplacement(() => void regenerate())
    else void regenerate()
  } : modal === "history" && !readOnly && selectedGeneration ? () => {
    if (dirty) confirmReplacement(() => load(selectedGeneration))
    else load(selectedGeneration)
  } : modal === "sent" ? () => void send(true) : undefined
  return <section id="monthly-feedback" ref={section} tabIndex={-1} className={`${styles.studentSection} scroll-mt-28 outline-none`} aria-label="월간 피드백">
    <div className={styles.studentSectionHeader}><h2>{Number(month.slice(5))}월 월간 피드백</h2>{excluded&&!record?<ProBadge>대상 제외</ProBadge>:<MonthlyBadge record={record} now={pro.clock} generating={generating}/>}</div>
    <div className={ui.editor}>
      <div className={ui.summary}>
        {record ? <dl className={ui.facts}><dt>대상 기간</dt><dd>{monthlyPeriod(record)}</dd><dt>발송 기한</dt><dd>{monthlyDateTime(record.due)}</dd><dt>지정 일정</dt><dd>{monthlyScheduleAt(pro,record)&&!record.earlyEnd ? monthlyDateTime(monthlyScheduleAt(pro,record)) : "기본 일정"}<span className="ml-2 text-slate-500">월~수 발송 권장</span></dd></dl> : excluded ? <p>{excluded.reason==="first-month"?"매칭 첫 달에 받은 피드백이 없어 이번 달 월간 피드백 대상에서 제외됩니다.":"이번 달 생성 이후 매칭된 학생입니다. 다음 달부터 월간 피드백을 제공합니다."}</p> : <p className="text-slate-500">{month<"2026-11" || member.caseOnly ? "-" : month === "2026-11" ? "생성 예정일 2026-11-25" : `생성 예정일 ${monthlyDateTime(monthlyRegularAt(month))}`}</p>}
        {canSchedule && <Button type="button" size="sm" variant="outline" className={ui.scheduleToggle} aria-expanded={scheduleOpen} onClick={openSchedule}>발송 일정 변경</Button>}
      </div>
      {record && !record.required && <div className={`${ui.notice} bg-slate-50`}><strong>11월 상담 완료 (발송 선택)</strong><p>이번 달 상담을 완료한 학생입니다. 월간 피드백 발송 여부를 선택할 수 있습니다.</p><p>미발송, 지연 집계에는 포함되지 않습니다.</p></div>}
      {scheduleOpen && <div className={ui.schedule}><div className={ui.scheduleFields}><label>발송 요일<select className={field} value={weekday} onChange={e=>setWeekday(e.target.value)}><option value="">기본 일정</option>{dayNames.map((d,i)=><option key={d} value={i+1}>{d}요일</option>)}</select></label><label>발송 시간<Input type="time" disabled={!weekday} value={time} onInput={e=>setTime(e.currentTarget.value)} onChange={e=>setTime(e.target.value)}/></label></div><div className={ui.actions}><Button size="sm" disabled={hook.busy||!!weekday&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)} onClick={async()=>{if(await hook.runPro({type:"monthly-schedule",studentId:member.id,weekday:weekday?Number(weekday):null,time}))setScheduleOpen(false)}}>일정 저장</Button><Button size="sm" variant="outline" disabled={hook.busy} onClick={()=>setScheduleOpen(false)}>취소</Button></div></div>}
      {generating && <p role="status" className={ui.progress}>월간 피드백 AI초안을 만들고 있습니다.</p>}
      {record?.error && !generating && <div role="alert" className={`${ui.notice} space-y-2 bg-rose-50 text-rose-800`}><p>{monthlyMessages.generationFailed}</p>{!record.generations.length&&!readOnly&&<Button size="sm" variant="outline" disabled={hook.busy} onClick={()=>void retry()}>생성 재시도</Button>}</div>}
      {!!record?.generations.length&&<>
        {!record.sent&&source&&source.institutionId!==owner&&<p className={`${ui.notice} bg-amber-50 text-amber-900`}>{monthlyMessages.beforeTransfer}</p>}
        <div className={ui.bodyHeading}><h3>월간 피드백 본문</h3><span className={ui.bodyMeta}><span>{monthlyGenerationLabel(source)}</span><span>{monthlyLength(record.sent?.body??body)}자</span></span></div>
        {readOnly?<p className={`${ui.bodyInput} ${ui.readOnlyBody}`} tabIndex={0} aria-label="월간 피드백 본문">{record.sent?.body??body}</p>:<MessageEditor value={body} onChange={setBody} generation={source} disabled={busy}/>}
        {!!source && !![...source.warnings,...(source.notesForTeacher??[])].length&&<div className="text-amber-800">{[...new Set([...source.warnings,...(source.notesForTeacher??[])])].map(w=><p key={w}>{w}</p>)}</div>}
        {!readOnly && <div className={ui.editTools}><Button type="button" size="sm" variant="outline" disabled={busy||record.regenerationCount>=2} onClick={()=>{setDirection(undefined);setRequest("");setModal("regenerate")}}><RefreshCw className="size-3.5"/>다시 만들기</Button><span className={ui.help}>{record.regenerationCount>=2?monthlyMessages.exhausted:`남은 다시 만들기 횟수 ${2-record.regenerationCount}/2`}</span></div>}
        <section className={ui.carry}><h3 className={ui.sectionTitle}>다음 달 이어 볼 항목</h3>{(record.sent?.carry??carry).map((c,i)=><label key={i} className={ui.carryRow}><span>{c.continued?"이어서 확인":"새 항목"}</span>{readOnly?<span>{c.text}</span>:<Input aria-label={`다음 달 이어 볼 항목 ${i+1}`} value={c.text} disabled={busy} onChange={e=>setCarry(carry.map((item,n)=>n===i?{...item,text:e.target.value}:item))}/>}</label>)}</section>
        <div className={ui.workflow}>
          <div className={ui.actions} aria-label="월간 피드백 처리">{!readOnly&&<Button size="sm" variant={primaryAction==="save"?"default":"outline"} disabled={busy||!body.trim()} onClick={()=>void save()}>저장</Button>}<Button size="sm" variant={primaryAction==="copy"&&!readOnly?"default":"outline"} disabled={busy||!saved?.body.trim()||!!dirty} onClick={()=>void copy()}>문구 복사</Button>{!readOnly&&<Button size="sm" variant={primaryAction==="send"?"default":"outline"} disabled={busy||!record.saved||!!dirty||record.copied?.revision!==record.saved.revision} onClick={()=>void send()}>보냈어요</Button>}</div>
          {record.sent?<p className={ui.help}>발송 완료 {monthlyDateTime(record.sent.actualAt)} · {record.sent.actor}</p>:record.saved&&<p className={ui.help}>저장 {monthlyDateTime(record.saved.at)}</p>}
        </div>
        <div className={ui.support}><button type="button" onClick={()=>setModal("evidence")}><FileSearch className="size-3.5"/>초안 근거 보기</button><button type="button" disabled={generating} onClick={()=>{setHistoryId(record.generations.at(-1)?.id??"");setModal("history")}}><History className="size-3.5"/>생성 이력 보기</button>{!readOnly&&<button type="button" disabled={busy||!record.saved||!!dirty} onClick={()=>{setActualAt(localDateTime(pro.clock));setModal("sent")}}>이미 보낸 기록 남기기</button>}</div>
      </>}
      {!!consultations.length&&<details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer font-medium text-blue-700">기존 상담 기록 보기</summary><div className="mt-3 space-y-4">{validConsultations.map(c=><article key={c.id} className="space-y-2"><ProBadge tone={c.result==="미진행"?"amber":"green"}>{consultationResultLabel(c.result)}</ProBadge><p className="text-xs text-slate-500">{c.result==="미진행"?"확인":"상담"} {monthlyDateTime(c.actualAt)} · {c.actor}</p><p className="whitespace-pre-wrap leading-6">{c.memo}</p></article>)}<details><summary className="cursor-pointer text-blue-700">상담 변경 이력</summary>{consultations.slice().reverse().map(c=><div key={c.id} className="mt-3 border-t border-slate-100 pt-3"><p>{c.previousId?"기록 수정":"기록 등록"} · {consultationResultLabel(c.result)}</p><p className="text-xs text-slate-500">저장 {monthlyDateTime(c.at)} · {c.actor}</p><p className="whitespace-pre-wrap">{c.memo}</p></div>)}{pro.audit.filter(a=>a.studentId===member.id&&a.kind==="consult-schedule"&&(!a.month||a.month===month)).map(a=><p key={a.id} className="mt-2">상담 일정 변경 · {monthlyDateTime(a.at)} · {a.actor}<br/>{["before","after"].map(key=>{const value=a[key as "before"|"after"] as {consultation?:ProMember["consultation"]}|undefined;return `${key==="before"?"변경 전":"변경 후"}: ${regularConsultationLabel(value?.consultation)} `})}</p>)}</details></div></details>}
    </div>
    {modal && record && <MonthlyDialog
      title={modalTitle} size={replacement ? "confirm" : modal === "history" || modal === "evidence" ? "reading" : "form"}
      bodyRef={dialogBody} onClose={replacement ? cancelReplacement : () => setModal(null)} onConfirm={confirmModal}
      subtitle={!replacement && <div className="space-y-1"><div className={ui.dialogIdentity}><strong>{member.name}</strong><span>{month.replace("-", "년 ")}월</span>{modal === "regenerate" && <span>남은 횟수 {2-record.regenerationCount}/2</span>}{modal === "evidence" && source && <span>{monthlyGenerationTitle(record, source)}</span>}</div>{modal === "evidence" && source && <MonthlyEvidenceBasis generation={source}/>}</div>}
      busy={modal === "regenerate" || modal === "sent" || replacement ? busy : false}
      busyLabel={modal === "regenerate" ? "생성 중…" : "저장 중…"}
      confirmLabel={replacement ? "확인" : modal === "regenerate" ? "생성하기" : modal === "history" ? "이 초안 불러오기" : "발송 기록 저장"}
      closeLabel={replacement ? "취소" : modal === "sent" ? "기록 입력 취소" : "닫기"}
      disabled={!!replacement ? busy : modal === "regenerate" ? record.regenerationCount >= 2 || !direction && !request.trim() : modal === "history" ? busy : modal === "sent" ? !validActual || !!dirty : false}
      footerStart={!replacement && modal === "history" && selectedGeneration && `선택: ${monthlyGenerationTitle(record, selectedGeneration)}`}
    >
      {replacement && <p ref={confirmationText} tabIndex={-1} className="leading-7 outline-none">{modal === "regenerate" ? monthlyMessages.regenerateConfirm : monthlyMessages.loadConfirm}</p>}
      <div hidden={!!replacement}>
        {modal === "evidence" && source && <MonthlyEvidence generation={source} db={hook.db} query={evidenceQuery}/>}
        {modal === "history" && <MonthlyHistory record={record} db={hook.db} query={evidenceQuery} selectedId={selectedGeneration?.id} onSelect={setHistoryId}/>}
        {modal === "regenerate" && source && <div className={ui.dialogContent}>
          <fieldset><legend className={`${ui.sectionTitle} mb-2`}>생성 방향</legend><div className={ui.directions}>{monthlyDirections.map(d => <button type="button" key={d} className={ui.direction} aria-pressed={direction === d} disabled={busy || d === "더 간결하게" && !canShortenMonthly(source.kind, body)} onClick={() => setDirection(direction === d ? undefined : d)}>{d}<Check className={`size-4 shrink-0 ${direction === d ? "" : "invisible"}`} aria-hidden="true"/></button>)}</div>{!canShortenMonthly(source.kind,body) && <p className={`${ui.help} mt-2`}>{monthlyMessages.cannotShorten}</p>}</fieldset>
          <div><label className={ui.request}><span className={ui.sectionTitle}>직접 요청</span><textarea value={request} disabled={busy} onChange={e => setRequest(e.target.value)}/></label><div className={`${ui.requestHelp} mt-2`}><p>내용에 관한 요청은 이 학생의 이번 달 생성에만 적용됩니다.</p><p>{monthlyMessages.requestHelp}</p></div></div>
          {generating && <p role="status" className={ui.progress}>월간 피드백 AI초안을 만들고 있습니다.</p>}
          {!generating && hook.messageKind === "error" && hook.message && <p role="alert" className="text-rose-700">{hook.message}</p>}
        </div>}
        {modal === "sent" && <div className={ui.dialogContent}><label className={ui.request}><span className={ui.sectionTitle}>실제 발송 일시</span><Input type="datetime-local" min={localDateTime(record.firstGeneratedAt)} max={localDateTime(pro.clock)} value={actualAt} onInput={e=>setActualAt(e.currentTarget.value)} onChange={e=>setActualAt(e.target.value)} disabled={hook.busy}/></label>{!validActual&&actualAt&&<p role="alert" className="text-rose-700">해당 월간 피드백 생성 이후~현재 시각 / 미래 일시 불가</p>}{hook.messageKind==="error"&&hook.message&&<p role="alert" className="text-rose-700">{hook.message}</p>}</div>}
      </div>
    </MonthlyDialog>}
    {navigation.pending && <MonthlyDialog size="confirm" title={monthlyMessages.leaveTitle} confirmLabel={monthlyMessages.leaveTitle} closeLabel="계속 작성" onClose={navigation.cancel} onConfirm={navigation.confirm}><p className="leading-7">{monthlyMessages.leaveConfirm}</p></MonthlyDialog>}
  </section>
}
