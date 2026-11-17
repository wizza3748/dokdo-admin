"use client"
import * as React from "react"
import { monthlyMessages } from "@/lib/pro-monthly-messages"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { academyStyle, monthlyDateTime } from "@/lib/pro-monthly"
import { AcademyStyleHistory, MonthlyDialog } from "./monthly-feedback-parts"
import { MonthlyValidationTools } from "./monthly-validation-tools"
import { useMonthlyNavigationGuard } from "./use-monthly-navigation-guard"
import { panel, ProBadge, ProNotice, useProManagement } from "./pro-common"
import styles from "./pro-management.module.css"
import ui from "./monthly-feedback.module.css"

export function AcademyStyleSettings() {
  const hook=useProManagement(), pro=hook.db.pro
  const [draft,setDraft]=React.useState<{enabled:boolean;items:{text:string;observations:number}[];revision:number}|null>(null)
  const [reset,setReset]=React.useState(false)
  const institutionId=pro?.scopeInstitutionId ?? "dokdo", style=pro ? academyStyle(pro,institutionId) : null
  const dirty=!!draft && !!style && (draft.enabled!==style.enabled || JSON.stringify(draft.items.map(i=>i.text))!==JSON.stringify(style.items.map(i=>i.text)))
  const navigation=useMonthlyNavigationGuard(dirty,hook.busy)
  if(!hook.loaded)return <p className="p-6">학원 말투 설정을 불러오는 중…</p>
  if(!pro||!style||hook.readOnly)return <p role="alert" className="p-6">학원 말투 설정 권한이 없습니다.</p>
  if(!pro.members.length&&!pro.cases.length&&!pro.monthly?.records.length)return <p className="p-6">학원 말투 설정 권한이 없습니다.</p>
  const values=draft??{enabled:style.enabled,items:style.items.map(({text,observations})=>({text,observations})),revision:style.revision}
  const change=(patch:Partial<typeof values>)=>setDraft({...values,...patch})
  const active=style.enabled&&style.sentIds.length>=3
  return <div className={`${styles.page} space-y-5`}><h1 className="text-xl font-semibold text-slate-900">학원 말투 설정</h1><ProNotice hook={hook} transient/>
    <div className={`${panel} ${ui.styleFields} ${ui.styleSettings}`}>
      <section aria-label="말투 적용 설정" className={ui.styleApplication}>
        <h2 className={ui.tableTitle}>말투 적용 설정</h2>
        <div className={ui.styleUsageHeading}>
          <button type="button" role="switch" aria-checked={values.enabled} aria-label="학원 말투 사용" disabled={hook.busy} onClick={()=>change({enabled:!values.enabled})} className={ui.styleToggle}>
            <span>학원 말투 사용</span>
            <span aria-hidden="true" className={ui.styleToggleTrack}><span/></span>
          </button>
        </div>
        <dl className={ui.styleFacts}>
          <div><dt>현재 적용 상태</dt><dd><ProBadge tone={active?"green":"slate"}>{!style.enabled?"사용 안 함":active?"사용":"적용 대기"}</ProBadge></dd></div>
          <div><dt>학원 발송본 누적 편수</dt><dd><strong>{style.sentIds.length}</strong>편</dd></div>
          <div><dt>마지막 변경 일시</dt><dd>{monthlyDateTime(style.updatedAt)}</dd></div>
        </dl>
        <p className={ui.styleGuide}>{!style.enabled?"저장된 말투와 발송본 예시를 초안 생성에 사용하지 않습니다.":style.sentIds.length<3?`학원 발송본이 3편 이상 쌓이면 학원 말투를 적용합니다. 현재 ${style.sentIds.length}편`:"이후 생성하는 월간 피드백 AI초안에 학원 말투를 반영합니다."}</p>
      </section>
      <section aria-label="저장된 말투" className={ui.styleItems}>
        <div className={ui.styleHeading}><h2 className={ui.tableTitle}>저장된 말투</h2><Button size="sm" variant="outline" disabled={hook.busy||!style.items.length} onClick={()=>setReset(true)}>저장된 말투 초기화</Button></div>
        {!values.items.length && <p className={ui.help}>저장된 말투가 없습니다.</p>}
        {!!values.items.length && <>
          <div className={ui.styleItemsHeader} aria-hidden="true"><span>말투 항목</span><span>관찰 상태</span><span/></div>
          {values.items.map((item,i)=><div key={i} className={ui.styleRow}>
            <Input aria-label={`말투 항목 ${i+1}`} value={item.text} disabled={hook.busy} onChange={e=>change({items:values.items.map((v,n)=>n===i?{...v,text:e.target.value}:v)})}/>
            <span className={ui.styleObservation}><ProBadge>{item.observations>=2?"확정":"관찰"}</ProBadge></span>
            <Button size="sm" variant="outline" aria-label={`말투 항목 ${i+1} 삭제`} disabled={hook.busy} onClick={()=>change({items:values.items.filter((_,n)=>n!==i)})}>항목 삭제</Button>
          </div>)}
        </>}
      </section>
      <div className={ui.styleSaveBar}><Button disabled={hook.busy||values.items.some(i=>!i.text.trim())} onClick={async()=>{if(await hook.runPro({type:"monthly-style-save",...values,items:values.items.map(i=>i.text)}))setDraft(null)}}>{hook.busy?"저장 중…":"저장"}</Button></div>
    </div>
    <section className={`${panel} ${ui.styleSettings}`} aria-label="말투 변경 이력"><h2 className={`${ui.tableTitle} mb-3`}>말투 변경 이력</h2><details className={ui.styleHistoryDisclosure}><summary>변경 이력 보기</summary><div className="mt-4"><AcademyStyleHistory style={style}/></div></details></section>
    <MonthlyValidationTools db={hook.db}/>
    {navigation.pending && <MonthlyDialog size="confirm" title={monthlyMessages.leaveTitle} confirmLabel={monthlyMessages.leaveTitle} closeLabel="계속 작성" onClose={navigation.cancel} onConfirm={navigation.confirm}><p className="leading-7">{monthlyMessages.leaveConfirm}</p></MonthlyDialog>}
    {reset && <MonthlyDialog size="confirm" title="저장된 말투 초기화" closeLabel="취소" confirmLabel="초기화" busy={hook.busy} busyLabel="처리 중…" onClose={()=>setReset(false)} onConfirm={async()=>{if(await hook.runPro({type:"monthly-style-reset",revision:style.revision})){setReset(false);setDraft(null)}}}><div className="space-y-2 leading-7"><p>{monthlyMessages.resetStyleConfirm}</p><p>발송본과 이전 변경 이력은 유지됩니다.</p></div></MonthlyDialog>}
  </div>
}
