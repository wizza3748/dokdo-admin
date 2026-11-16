"use client"
import * as React from "react"
import { monthlyMessages } from "@/lib/pro-monthly-messages"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AgencyConfirmDialog } from "@/components/ui/agency-confirm-dialog"
import { academyStyle, monthlyDateTime } from "@/lib/pro-monthly"
import { AcademyStyleHistory } from "./monthly-feedback-parts"
import { panel, ProBadge, ProNotice, useProManagement } from "./pro-common"
import styles from "./pro-management.module.css"

export function AcademyStyleSettings() {
  const hook=useProManagement(), pro=hook.db.pro
  const [draft,setDraft]=React.useState<{enabled:boolean;items:string[];revision:number}|null>(null)
  const [reset,setReset]=React.useState(false)
  if(!hook.loaded)return <p className="p-6">학원 말투 설정을 불러오는 중…</p>
  if(!pro||hook.readOnly)return <p role="alert" className="p-6">학원 말투 설정 권한이 없습니다.</p>
  const institutionId=pro.scopeInstitutionId ?? "dokdo", style=academyStyle(pro,institutionId)
  if(!pro.members.length&&!pro.cases.length&&!pro.monthly?.records.length)return <p className="p-6">학원 말투 설정 권한이 없습니다.</p>
  const values=draft??{enabled:style.enabled,items:style.items.map(i=>i.text),revision:style.revision}
  const change=(patch:Partial<typeof values>)=>setDraft({...values,...patch})
  return <div className={`${styles.page} space-y-5`}><h1 className="text-xl font-semibold text-slate-900">학원 말투 설정</h1><ProNotice hook={hook} transient/>
    <section className={`${panel} space-y-4`} aria-label="말투 적용 설정"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">말투 적용 설정</h2><Button disabled={hook.busy||values.items.some(i=>!i.trim())} onClick={async()=>{if(await hook.runPro({type:"monthly-style-save",...values}))setDraft(null)}}>저장</Button></div><label className="flex items-center gap-3"><input type="checkbox" role="switch" aria-label="학원 말투 사용" className="size-4 accent-blue-600" checked={values.enabled} disabled={hook.busy} onChange={e=>change({enabled:e.target.checked})}/><span>학원 말투 사용</span><span className="text-sm text-slate-500">{values.enabled?"사용":"사용 안 함"}</span></label>
      <div className="flex flex-wrap items-center gap-3 text-sm"><span>학원 발송본 누적 <strong>{style.sentIds.length}편</strong></span><ProBadge tone={style.enabled&&style.sentIds.length>=3?"green":"slate"}>{!style.enabled?"사용 안 함":style.sentIds.length<3?"적용 대기":"사용"}</ProBadge><span className="text-slate-500">마지막 변경 {monthlyDateTime(style.updatedAt)}</span></div>
      <p className="text-sm text-slate-600">{!style.enabled?"저장된 말투와 발송본 예시를 초안 생성에 사용하지 않습니다.":style.sentIds.length<3?`학원 발송본이 3편 이상 쌓이면 학원 말투를 적용합니다. 현재 ${style.sentIds.length}편`:"이후 생성하는 월간 피드백 AI초안에 학원 말투를 반영합니다."}</p>
    </section>
    <section className={`${panel} space-y-4`} aria-label="저장된 말투"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">저장된 말투</h2><Button size="sm" variant="outline" disabled={hook.busy||!style.items.length} onClick={()=>setReset(true)}>저장된 말투 초기화</Button></div><p className="text-sm text-slate-500">어미, 문장 길이, 이모티콘 등 표현 방식만 입력해 주세요. 최대 10개까지 저장합니다.</p>{values.items.map((text,i)=><div key={i} className="flex flex-wrap items-center gap-2"><ProBadge>{(style.items.find(item=>item.text===text)?.observations??1)>=2?"확정":"관찰"}</ProBadge><Input aria-label={`말투 항목 ${i+1}`} className="min-w-48 flex-1" value={text} disabled={hook.busy} onChange={e=>change({items:values.items.map((v,n)=>n===i?e.target.value:v)})}/><Button size="sm" variant="outline" disabled={hook.busy} onClick={()=>change({items:values.items.filter((_,n)=>n!==i)})}>항목 삭제</Button></div>)}{!values.items.length&&<p className="text-sm text-slate-500">저장된 말투가 없습니다.</p>}</section>
    <section className={panel} aria-label="말투 변경 이력"><h2 className="mb-3 font-semibold">말투 변경 이력</h2><details><summary className="cursor-pointer text-sm text-blue-700">변경 이력 보기</summary><AcademyStyleHistory style={style}/></details></section>
    {reset&&<AgencyConfirmDialog title="저장된 말투 초기화" closeLabel="취소" confirmLabel="초기화" busy={hook.busy} onClose={()=>setReset(false)} onConfirm={async()=>{if(await hook.runPro({type:"monthly-style-reset",revision:style.revision})){setReset(false);setDraft(null)}}}><p>{monthlyMessages.resetStyleConfirm}</p><p>발송본과 이전 변경 이력은 유지됩니다.</p></AgencyConfirmDialog>}
  </div>
}
