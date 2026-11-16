"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AgencyConfirmDialog } from "@/components/ui/agency-confirm-dialog"
import { field, ProBadge, type useProManagement } from "./pro-common"
import { MonthlyBadge, MonthlyDialog, MonthlyEvidence, MonthlyHistory } from "./monthly-feedback-parts"
import { monthlyDateTime, monthlyId, monthlyPeriod, monthlyRegularAt, monthlyScheduleAt } from "@/lib/pro-monthly"
import { monthlyDirections, monthlyKinds, monthlyLength, canShortenMonthly } from "@/lib/pro-monthly-generation"
import { localDateTime, consultationResultLabel, dayNames, regularConsultationLabel } from "@/lib/pro-student-detail"
import type { MonthlyCarry, MonthlyDirection, MonthlyGeneration } from "@/lib/pro-monthly-types"
import { monthlyMessages, monthlyActionFailures } from "@/lib/pro-monthly-messages"
import type { ProMember } from "@/lib/pro-types"
import styles from "./pro-management.module.css"

type NavigationGuard = (go: () => void) => void
type Props = { hook: ReturnType<typeof useProManagement>; member: ProMember; month: string; navigationRef: React.MutableRefObject<NavigationGuard> }
const textField = "min-h-28 w-full resize-y rounded-md border border-slate-300 bg-white p-3 text-sm leading-7 outline-blue-600"
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
  return <div><div ref={ref} role="textbox" aria-label="월간 피드백 메시지" aria-multiline="true" aria-disabled={disabled} contentEditable={!disabled} suppressContentEditableWarning className={`${textField} min-h-72 whitespace-pre-wrap break-words ${disabled ? "bg-slate-50" : ""}`} onInput={e => onChange(e.currentTarget.innerText.replace(/\r/g,""))} onBlur={() => { setReason(""); render() }} onClick={e=>show(e.target)} onMouseOver={e=>show(e.target)} onFocus={e=>show(e.target)} onKeyDown={e=>{if(e.key==="Escape")setReason("")}} onPaste={e=>{e.preventDefault(); const text=e.clipboardData.getData("text/plain"); const selection=window.getSelection(); if(selection?.rangeCount){const range=selection.getRangeAt(0);range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);onChange(e.currentTarget.innerText)}}}/>{reason && <p role="tooltip" className="mt-2 rounded bg-amber-50 p-2 text-xs leading-5 text-amber-900">{reason}</p>}</div>
}

export function MonthlyFeedbackEditor({ hook, member, month, navigationRef }: Props) {
  const pro = hook.db.pro!, state = pro.monthly, record = state?.records.find(r=>r.id===monthlyId(member.id,month))
  const router = useRouter()
  const [body,setBody] = React.useState(""), [carry,setCarry] = React.useState<MonthlyCarry[]>([]), [sourceId,setSourceId] = React.useState("")
  const [revision,setRevision] = React.useState(0), [forceDirty,setForceDirty] = React.useState(false)
  const [modal,setModal] = React.useState<"regenerate"|"history"|"evidence"|"sent"|null>(null)
  const [direction,setDirection] = React.useState<MonthlyDirection>(), [request,setRequest] = React.useState(""), [actualAt,setActualAt] = React.useState("")
  const [pendingNavigation,setPendingNavigation] = React.useState<(()=>void)|null>(null), [replacement,setReplacement] = React.useState<(()=>void)|null>(null)
  const [scheduleOpen,setScheduleOpen] = React.useState(false), [weekday,setWeekday] = React.useState(""), [time,setTime] = React.useState("18:00")
  const initialized = React.useRef(""), pendingGeneration = React.useRef<string | null>(null)
  const section = React.useRef<HTMLElement>(null)
  const source = record?.generations.find(g=>g.id===sourceId) ?? record?.generations[0]
  const saved = record?.sent ?? record?.saved
  const baseline = saved ?? record?.generations[0]
  const normalizedCarry = carry.filter(c=>c.text.trim()).map(c=>({...c,text:c.text.trim()}))
  const dirty = !record?.sent && !!baseline && (forceDirty || body !== baseline.body || JSON.stringify(normalizedCarry) !== JSON.stringify(baseline.carry))
  const generating = !!record?.job, busy = hook.busy || generating
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
      else if(record.error) hook.setMessage(record.error)
      else return
      pendingGeneration.current=null
    }
  },[record,currentKey,hook])
  React.useEffect(()=>{if(record?.job){const timer=setInterval(()=>void hook.refresh(),1200);return()=>clearInterval(timer)}},[record?.job,hook])
  React.useEffect(()=>{if(window.location.hash==="#monthly-feedback") requestAnimationFrame(()=>{section.current?.scrollIntoView({block:"start"});section.current?.focus({preventScroll:true})})},[currentKey])
  React.useEffect(() => {
    const guard: NavigationGuard = go => { if(hook.busy)return; if(dirty)setPendingNavigation(()=>go);else go() }
    navigationRef.current=guard
    const click=(event:MouseEvent)=>{
      const anchor=event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(anchor instanceof HTMLAnchorElement) || event.target instanceof Element && event.target.closest("button") || anchor.target==="_blank" || event.ctrlKey || event.metaKey || event.shiftKey || anchor.href===window.location.href) return
      if (!dirty && !hook.busy)return
      event.preventDefault();event.stopPropagation();guard(()=>router.push(anchor.href))
    }
    const unload=(event:BeforeUnloadEvent)=>{if(dirty||hook.busy){event.preventDefault();event.returnValue=""}}
    const navigation=(event:Event)=>{if(dirty||hook.busy){event.preventDefault();guard((event as CustomEvent<()=>void>).detail)}}
    document.addEventListener("click",click,true);window.addEventListener("beforeunload",unload);window.addEventListener("dokdo:before-navigation",navigation)
    return()=>{navigationRef.current=go=>go();document.removeEventListener("click",click,true);window.removeEventListener("beforeunload",unload);window.removeEventListener("dokdo:before-navigation",navigation)}
  },[dirty,hook.busy,navigationRef,router])
  const load=(g:MonthlyGeneration)=>{setBody(g.body);setCarry(structuredClone(g.carry));setSourceId(g.id);setRevision(record!.revision);setForceDirty(true);setModal(null)}
  const regenerate=async()=>{
    if(!record)return
    pendingGeneration.current=record.generations.at(-1)!.id
    if(!await hook.runPro({type:"monthly-regenerate",id:record.id,revision,body,direction,request})){pendingGeneration.current=null;return}
  }
  const save=async()=>{if(record&&await hook.runPro({type:"monthly-save",id:record.id,revision,body,carry,sourceId})){setRevision(revision+1);setForceDirty(false)}}
  const copy=async()=>{
    if(!record||!saved)return
    try { await navigator.clipboard.writeText(saved.body); if(await hook.runPro({type:"monthly-copy",id:record.id,revision:record.revision}))hook.setMessage(record.sent ? "발송한 문구를 복사했습니다." : "복사했습니다. 단톡방에 보낸 뒤 [보냈어요]를 눌러 주세요.") }
    catch { hook.setError(monthlyActionFailures["monthly-copy"]) }
  }
  const send=async(manual=false)=>{
    if(!record)return
    if(await hook.runPro({type:"monthly-send",id:record.id,revision:record.revision,...(manual?{actualAt:new Date(`${actualAt}:00+09:00`).toISOString()}:{})})){setModal(null);setForceDirty(false);hook.setMessage("월간 피드백 발송 기록을 저장했습니다.")}
  }
  const actual = Date.parse(`${actualAt}:00+09:00`), validActual = !!record && Number.isFinite(actual) && actual>=Date.parse(record.firstGeneratedAt) && actual<=Date.parse(pro.clock)
  const excluded=state?.exclusions.find(e=>e.studentId===member.id&&e.month===month)
  const consultations=pro.consultations.filter(c=>c.studentId===member.id&&c.month===month&&(!state?.transition||c.at<=state.transition.at))
  const validConsultations=consultations.filter(c=>!consultations.some(n=>n.previousId===c.id))
  const owner = pro.scopeInstitutionId ?? member.institutionId
  const query=typeof window==="undefined"?"":new URLSearchParams(window.location.search)
  const evidenceQuery=`${query && query.get("monthlyTest")?`monthlyTest=${encodeURIComponent(query.get("monthlyTest")!)}&`:""}role=${hook.role}${query && query.get("demoAgency")?`&demoAgency=${encodeURIComponent(query.get("demoAgency")!)}`:""}`
  const schedule=state?.schedules.find(s=>s.studentId===member.id)
  return <section id="monthly-feedback" ref={section} tabIndex={-1} className={`${styles.studentSection} scroll-mt-28 outline-none`} aria-label="월간 피드백">
    <div className={styles.studentSectionHeader}><h2>{Number(month.slice(5))}월 월간 피드백</h2>{excluded&&!record?<ProBadge>대상 제외</ProBadge>:<MonthlyBadge record={record} now={pro.clock}/>}</div>
    <div className="space-y-4 p-5 text-sm">
      {record ? <><div className="space-y-1 text-slate-600"><p>대상 기간 {monthlyPeriod(record)}</p><p>발송 기한 {monthlyDateTime(record.due)}</p><p className="text-xs">월~수 발송 권장{monthlyScheduleAt(pro,record)&&!record.earlyEnd?` · 지정 일정 ${monthlyDateTime(monthlyScheduleAt(pro,record))}`:""}</p></div>{!record.required&&<div className="rounded-lg bg-slate-50 p-3 leading-6"><strong>11월 상담 완료 (발송 선택)</strong><p>이번 달 상담을 완료한 학생입니다. 월간 피드백 발송 여부를 선택할 수 있습니다.</p><p>미발송, 지연 집계에는 포함되지 않습니다.</p></div>}</> : excluded ? <p>{excluded.reason==="first-month"?"매칭 첫 달에 받은 피드백이 없어 이번 달 월간 피드백 대상에서 제외됩니다.":"이번 달 생성 이후 매칭된 학생입니다. 다음 달부터 월간 피드백을 제공합니다."}</p> : <p className="text-slate-500">{month<"2026-11" ? "월간 피드백 도입 전입니다." : member.caseOnly ? "조회할 월간 피드백이 없습니다." : month === "2026-11" ? "2026-11-25 기능 전환 후 생성합니다." : `생성 예정일 ${monthlyDateTime(monthlyRegularAt(month))}`}</p>}
      {!hook.readOnly && !member.caseOnly && member.institutionId===owner && month>="2026-11" && <button type="button" className="font-medium text-blue-700 hover:underline" onClick={()=>{setWeekday(schedule?.weekday?String(schedule.weekday):"");setTime(schedule?.time??"18:00");setScheduleOpen(!scheduleOpen)}}>발송 일정 변경</button>}
      {scheduleOpen&&<div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap gap-3"><label className="space-y-1">발송 요일<select className={`${field} block`} value={weekday} onChange={e=>setWeekday(e.target.value)}><option value="">기본 일정</option>{dayNames.map((d,i)=><option key={d} value={i+1}>{d}요일</option>)}</select></label><label className="space-y-1">발송 시간<Input type="time" disabled={!weekday} value={time} onInput={e=>setTime(e.currentTarget.value)} onChange={e=>setTime(e.target.value)}/></label></div><p className="text-xs text-slate-500">관리월 4주차에 반복 적용합니다. 종료월 조기 생성은 종료 주 발송 기한을 적용합니다.</p><div className="flex gap-2"><Button size="sm" disabled={hook.busy||!!weekday&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)} onClick={async()=>{if(await hook.runPro({type:"monthly-schedule",studentId:member.id,weekday:weekday?Number(weekday):null,time}))setScheduleOpen(false)}}>일정 저장</Button><Button size="sm" variant="outline" disabled={hook.busy} onClick={()=>setScheduleOpen(false)}>취소</Button></div></div>}
      {generating&&<p role="status" className="rounded bg-blue-50 p-3">월간 피드백 AI초안을 만들고 있습니다.</p>}
      {record?.error && !generating&&<div role="alert" className="space-y-2 rounded bg-rose-50 p-3 text-rose-800"><p>{record.error}</p>{!record.generations.length&&!readOnly&&<Button size="sm" variant="outline" disabled={hook.busy} onClick={()=>void hook.runPro({type:"monthly-retry",id:record.id,revision:record.revision})}>생성 재시도</Button>}</div>}
      {!!record?.generations.length&&<>
        {!record.sent&&source&&source.institutionId!==owner&&<p className="rounded bg-amber-50 p-3 text-amber-900">{monthlyMessages.beforeTransfer}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{source&&monthlyKinds[source.kind]}{source?.kind==="general"&&` · ${source.composition}`}</span><span>{monthlyLength(record.sent?.body??body)}자</span></div>
        {readOnly?<p className="whitespace-pre-wrap break-words leading-7 text-slate-900">{record.sent?.body??body}</p>:<MessageEditor value={body} onChange={setBody} generation={source} disabled={busy}/>}
        {!!source?.warnings.length&&<div className="text-amber-800">{source.warnings.map(w=><p key={w}>{w}</p>)}</div>}
        <section className="space-y-2"><h3 className="font-semibold">다음 달 이어 볼 항목</h3>{(record.sent?.carry??carry).map((c,i)=><label key={i} className="flex items-center gap-2"><span className="shrink-0 text-xs text-slate-500">{c.continued?"이어서 확인":"새 항목"}</span>{readOnly?<span>{c.text}</span>:<Input aria-label={`다음 달 이어 볼 항목 ${i+1}`} value={c.text} disabled={busy} onChange={e=>setCarry(carry.map((item,n)=>n===i?{...item,text:e.target.value}:item))}/>}</label>)}</section>
        <div className="flex flex-wrap gap-2">{!readOnly&&<Button size="sm" disabled={busy||!body.trim()} onClick={()=>void save()}>저장</Button>}<Button size="sm" variant="outline" disabled={busy||!saved?.body.trim()||!!dirty} onClick={()=>void copy()}>문구 복사</Button>{!readOnly&&<Button size="sm" disabled={busy||!record.saved||!!dirty||record.copied?.revision!==record.saved.revision} onClick={()=>void send()}>보냈어요</Button>}</div>
        {record.sent?<p className="text-xs text-slate-500">발송 완료 {monthlyDateTime(record.sent.actualAt)} · {record.sent.actor}</p>:record.saved&&<p className="text-xs text-slate-500">저장 {monthlyDateTime(record.saved.at)}{dirty?" · 미저장 변경 있음":""}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 pt-4 text-sm"><button className="text-blue-700 hover:underline" onClick={()=>setModal("evidence")}>초안 근거 보기</button>{!readOnly&&<button className="text-blue-700 hover:underline disabled:text-slate-400" disabled={busy||record.regenerationCount>=2} onClick={()=>{setDirection(undefined);setRequest("");setModal("regenerate")}}>다시 만들기</button>}<button className="text-blue-700 hover:underline disabled:text-slate-400" disabled={generating} onClick={()=>setModal("history")}>생성 이력 보기</button>{!readOnly&&<button className="text-blue-700 hover:underline disabled:text-slate-400" disabled={busy||!record.saved||!!dirty} onClick={()=>{setActualAt(localDateTime(pro.clock));setModal("sent")}}>이미 보낸 기록 남기기</button>}</div>
        {!readOnly&&<p className="text-xs text-slate-500">{record.regenerationCount>=2?monthlyMessages.exhausted:`남은 다시 만들기 횟수 ${2-record.regenerationCount}/2`}</p>}
      </>}
      {!!consultations.length&&<details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer font-medium text-blue-700">기존 상담 기록 보기</summary><div className="mt-3 space-y-4">{validConsultations.map(c=><article key={c.id} className="space-y-2"><ProBadge tone={c.result==="미진행"?"amber":"green"}>{consultationResultLabel(c.result)}</ProBadge><p className="text-xs text-slate-500">{c.result==="미진행"?"확인":"상담"} {monthlyDateTime(c.actualAt)} · {c.actor}</p><p className="whitespace-pre-wrap leading-6">{c.memo}</p></article>)}<details><summary className="cursor-pointer text-blue-700">상담 변경 이력</summary>{consultations.slice().reverse().map(c=><div key={c.id} className="mt-3 border-t border-slate-100 pt-3"><p>{c.previousId?"기록 수정":"기록 등록"} · {consultationResultLabel(c.result)}</p><p className="text-xs text-slate-500">저장 {monthlyDateTime(c.at)} · {c.actor}</p><p className="whitespace-pre-wrap">{c.memo}</p></div>)}{pro.audit.filter(a=>a.studentId===member.id&&a.kind==="consult-schedule"&&(!a.month||a.month===month)).map(a=><p key={a.id} className="mt-2">상담 일정 변경 · {monthlyDateTime(a.at)} · {a.actor}<br/>{["before","after"].map(key=>{const value=a[key as "before"|"after"] as {consultation?:ProMember["consultation"]}|undefined;return `${key==="before"?"변경 전":"변경 후"}: ${regularConsultationLabel(value?.consultation)} `})}</p>)}</details></div></details>}
    </div>
    {modal==="evidence"&&source&&<MonthlyDialog title="월간 피드백 생성 근거" onClose={()=>setModal(null)}><MonthlyEvidence generation={source} db={hook.db} query={evidenceQuery}/></MonthlyDialog>}
    {modal==="history"&&record&&<MonthlyDialog title="월간 피드백 생성 이력" onClose={()=>setModal(null)}><MonthlyHistory record={record} busy={busy} onLoad={readOnly?undefined:g=>{if(dirty)setReplacement(()=>()=>load(g));else load(g)}}/></MonthlyDialog>}
    {modal==="regenerate"&&record&&source&&<MonthlyDialog title="월간 피드백 다시 만들기" onClose={()=>setModal(null)} busy={busy} confirmLabel="생성하기" disabled={record.regenerationCount>=2||!direction&&!request.trim()} onConfirm={()=>{if(body!==source.body||JSON.stringify(carry)!==JSON.stringify(source.carry))setReplacement(()=>()=>void regenerate());else void regenerate()}}><div className="space-y-4"><p>남은 횟수 {2-record.regenerationCount}/2</p><fieldset><legend className="mb-2 font-semibold">생성 방향</legend><div className="flex flex-wrap gap-2">{monthlyDirections.map(d=><Button key={d} size="sm" variant={direction===d?"default":"outline"} aria-pressed={direction===d} disabled={busy||d==="더 간결하게"&&!canShortenMonthly(source.kind,body)} onClick={()=>setDirection(direction===d?undefined:d)}>{d}</Button>)}</div>{!canShortenMonthly(source.kind,body)&&<p className="mt-2 text-xs text-slate-500">{monthlyMessages.cannotShorten}</p>}</fieldset><label className="block space-y-2"><span className="font-semibold">직접 요청</span><textarea className={textField} value={request} disabled={busy} onChange={e=>setRequest(e.target.value)}/></label><div className="text-xs leading-6 text-slate-500"><p>내용에 관한 요청은 이 학생의 이번 달 생성에만 적용됩니다.</p><p>{monthlyMessages.requestHelp}</p></div>{hook.messageKind==="error"&&hook.message&&<p role="alert" className="text-rose-700">{hook.message}</p>}</div></MonthlyDialog>}
    {modal==="sent"&&record&&<MonthlyDialog title="월간 피드백 발송 기록" onClose={()=>setModal(null)} busy={hook.busy} closeLabel="기록 입력 취소" confirmLabel="발송 기록 저장" disabled={!validActual||!!dirty} onConfirm={()=>void send(true)}><label className="block space-y-2">실제 발송 일시<Input type="datetime-local" min={localDateTime(record.firstGeneratedAt)} max={localDateTime(pro.clock)} value={actualAt} onInput={e=>setActualAt(e.currentTarget.value)} onChange={e=>setActualAt(e.target.value)}/></label><p className="mt-3 text-xs text-slate-500">해당 월간 피드백 생성 이후부터 현재 시각까지 입력할 수 있습니다.</p>{!validActual&&actualAt&&<p role="alert" className="mt-2 text-rose-700">생성 이후부터 현재 시각까지의 발송 일시를 입력해 주세요.</p>}{hook.messageKind==="error"&&<p role="alert" className="mt-2 text-rose-700">{hook.message}</p>}</MonthlyDialog>}
    {replacement&&<AgencyConfirmDialog title="월간 피드백 내용 교체" closeLabel="취소" confirmLabel="확인" busy={busy} onClose={()=>setReplacement(null)} onConfirm={()=>{const run=replacement;setReplacement(null);run()}}><p>{modal==="regenerate"?monthlyMessages.regenerateConfirm:monthlyMessages.loadConfirm}</p></AgencyConfirmDialog>}
    {pendingNavigation&&<AgencyConfirmDialog title={monthlyMessages.leaveTitle} confirmLabel={monthlyMessages.leaveTitle} closeLabel="계속 작성" onClose={()=>setPendingNavigation(null)} onConfirm={()=>{const go=pendingNavigation;setPendingNavigation(null);go()}}><p>{monthlyMessages.leaveConfirm}</p></AgencyConfirmDialog>}
  </section>
}
