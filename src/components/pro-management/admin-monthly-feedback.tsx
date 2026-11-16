"use client"
import * as React from "react"
import { monthlyMessages } from "@/lib/pro-monthly-messages"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useReviews } from "@/lib/review-client"
import { managementMonth } from "@/lib/pro-calendar"
import { academyName, academyStyle, monthlyDateTime, monthlyDue, monthlyIsEnded, monthlyLate, monthlyPeriod, monthlyRegularAt } from "@/lib/pro-monthly"
import { monthlyKinds } from "@/lib/pro-monthly-generation"
import { summarizeMonthly, type MonthlyFilters } from "@/lib/pro-monthly-summary"
import { MonthlyBadge, MonthlyDialog, MonthlyReadOnly, AcademyStyleView } from "./monthly-feedback-parts"
import { field, panel } from "./pro-common"
import { MonthlyValidationTools } from "./monthly-validation-tools"
import { ProHelp } from "./pro-help"
import styles from "./pro-management.module.css"
import table from "./admin-weekly.module.css"

const initialFilters:MonthlyFilters={month:"",institution:"",required:"",status:"",student:""}
function AcademySelect({value,options,onChange,disabled}:{value:string;options:{id:string;name:string}[];onChange:(id:string)=>void;disabled:boolean}) {
  const [open,setOpen]=React.useState(false),[query,setQuery]=React.useState("")
  const choose=(id:string)=>{onChange(id);setOpen(false);setQuery("")}
  const matches=options.filter(i=>i.name.includes(query.trim()))
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-label="담당 학원" aria-expanded={open} disabled={disabled} className="w-52 justify-between font-normal">{options.find(i=>i.id===value)?.name??"전체 학원"}<ChevronDown className="size-4 text-slate-400"/></Button></PopoverTrigger><PopoverContent className="w-60 p-2" align="start"><Input aria-label="학원명 검색" placeholder="학원명 검색" value={query} onChange={e=>setQuery(e.target.value)}/><div role="listbox" aria-label="담당 학원 선택" className="mt-2 max-h-60 overflow-y-auto"><button type="button" role="option" aria-selected={!value} className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100" onClick={()=>choose("")}>전체 학원</button>{matches.map(i=><button key={i.id} type="button" role="option" aria-selected={value===i.id} className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100" onClick={()=>choose(i.id)}>{i.name}</button>)}</div></PopoverContent></Popover>
}
export function AdminMonthlyFeedback() {
  const hook=useReviews("admin"),pro=hook.db.pro
  const [draft,setDraft]=React.useState(initialFilters),[applied,setApplied]=React.useState(initialFilters),[page,setPage]=React.useState(1),[size,setSize]=React.useState(20)
  const [recordId,setRecordId]=React.useState(""),[styleId,setStyleId]=React.useState(""),[searching,setSearching]=React.useState(false)
  const studentSection=React.useRef<HTMLElement>(null)
  React.useEffect(()=>{const month=new URLSearchParams(window.location.search).get("month");if(month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)){setDraft({...initialFilters,month});setApplied({...initialFilters,month})}},[])
  if(!hook.loaded)return <p className="p-6">월간 피드백 현황을 불러오는 중…</p>
  if(hook.error||!pro)return <div role="alert" className="space-y-3 p-6"><p>월간 피드백 현황을 불러오지 못했습니다. 다시 조회해 주세요.</p><Button variant="outline" disabled={searching} onClick={async()=>{setSearching(true);try{await hook.refresh()}finally{setSearching(false)}}}>다시 조회</Button></div>
  const current=managementMonth(pro.clock),filters={...applied,month:applied.month||current},values={...draft,month:draft.month||current},summary=summarizeMonthly(hook.db,filters)
  const options=summarizeMonthly(hook.db,{...initialFilters,month:values.month}).institutions
  const record=pro.monthly?.records.find(r=>r.id===recordId), style=styleId?academyStyle(pro,styleId):undefined
  const pages=Math.max(1,Math.ceil(summary.students.length/size)),selectedPage=Math.min(page,pages),rows=summary.students.slice((selectedPage-1)*size,selectedPage*size)
  const search=async(next=values)=>{setSearching(true);setApplied({...next,student:next.student.trim()});setPage(1);try{await hook.refresh()}finally{setSearching(false)}}
  const empty=!summary.evaluated?monthlyMessages.notGenerated:!summary.all.length?monthlyMessages.noTargets:"조회 조건에 해당하는 월간 피드백이 없습니다."
  return <div className={`${styles.page} space-y-5`}>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-semibold text-slate-900">프로학생 월간피드백현황</h1><p className="mt-2 text-sm text-slate-600">{filters.month.replace("-","년 ")}월 · 정기 생성일 {filters.month === "2026-11" ? pro.monthly?.transition ? monthlyDateTime(pro.monthly.transition.at) : "2026-11-25" : monthlyDateTime(monthlyRegularAt(filters.month))} · 기본 발송 기한 {monthlyDateTime(monthlyDue(filters.month))}</p></div><p className="text-xs text-slate-500">{monthlyDateTime(pro.clock)} 기준</p></header>
    <section className={`${panel} flex flex-wrap items-end gap-4`} aria-label="조회 조건">
      <label className="space-y-1.5 text-sm">관리월<Input type="month" min="2026-11" max={current} value={values.month} disabled={searching} onInput={e=>setDraft({...values,month:e.currentTarget.value,institution:""})} onChange={e=>setDraft({...values,month:e.target.value,institution:""})}/></label>
      <div className="space-y-1.5 text-sm"><p>담당 학원</p><AcademySelect value={values.institution} options={options} disabled={searching} onChange={institution=>setDraft({...values,institution})}/></div>
      <label className="space-y-1.5 text-sm">발송 구분<select className={`${field} block`} value={values.required} disabled={searching} onChange={e=>setDraft({...values,required:e.target.value})}><option value="">전체</option><option value="required">발송 필수</option><option value="optional">발송 선택</option></select></label>
      <label className="space-y-1.5 text-sm">발송 상태<select className={`${field} block`} value={values.status} disabled={searching} onChange={e=>setDraft({...values,status:e.target.value})}><option value="">전체</option><option value="unsent">미발송</option><option value="late">지연</option><option value="sent">발송 완료</option></select></label>
      <label className="space-y-1.5 text-sm">학생명<Input value={values.student} disabled={searching} placeholder="학생명 검색" onChange={e=>setDraft({...values,student:e.target.value})} onKeyDown={e=>{if(e.key==="Enter")void search()}}/></label>
      <Button variant="outline" disabled={searching} onClick={()=>{const next={...initialFilters,month:current};setDraft(next);void search(next)}}>초기화</Button><Button disabled={searching||values.month<"2026-11"||values.month>current} onClick={()=>void search()}>검색</Button>
    </section>
    <section className={panel} aria-label="학원별 발송 현황"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-semibold">학원별 발송 현황</h2><ProHelp label="집계 안내" lines={["발송 대상, 완료, 미발송, 지연, 완료율은 발송이 필요한 학생을 기준으로 집계합니다.","발송 선택 학생은 별도로 표시합니다.","미발송은 현재 담당 학원, 발송 완료는 발송 기록의 담당 학원에 반영합니다.","주간관리현황의 관리 인원과는 별도 집계입니다."]}/></div><div className={table.tableScroll} tabIndex={0}><table className={`${styles.table} ${table.academies}`}><thead><tr>{["담당 학원","발송 대상","발송 완료","미발송","지연","발송 완료율","발송 선택","학원 말투"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{summary.academies.map(a=><tr key={a.id}><td><button type="button" className="text-blue-700 hover:underline" disabled={searching} onClick={()=>{setDraft({...values,institution:a.id});setApplied({...filters,institution:a.id});setPage(1)}}>{a.name}</button></td><td>{a.target}명</td><td>{a.sent}명</td><td>{a.unsent}명</td><td className={a.late?"text-rose-700":""}>{a.late}명</td><td>{a.rate}{a.rate!=="-"&&"%"}</td><td>{a.optional}명</td><td><Button size="sm" variant="outline" onClick={()=>setStyleId(a.id)}>학원 말투 보기</Button></td></tr>)}{!summary.academies.length&&<tr><td colSpan={8} className="text-center text-slate-500">{empty}</td></tr>}</tbody></table></div></section>
    <section ref={studentSection} className={panel} aria-label="학생별 발송 현황"><h2 className="mb-4 font-semibold">학생별 발송 현황 <span className="ml-1 text-sm font-normal text-slate-500">{summary.students.length}명</span></h2><div className={table.tableScroll} tabIndex={0}><table className={`${styles.table} ${table.academies}`} style={{minWidth:1500}}><thead><tr>{["학생","담당 학원","학습 대상 기간","메시지 유형","발송 구분","작성 상태","발송 기한","지연","실제 발송 일시","조회"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(r=>{const m=pro.members.find(m=>m.id===r.studentId),g=r.generations[0];return <tr key={r.id}><td><span className="font-medium">{m?.name}</span><p className="mt-1 text-xs text-slate-500">{m&&monthlyIsEnded(m,pro.clock)?"이용 종료":"프로 이용 중"}</p></td><td>{academyName(hook.db,r.sent?.institutionId??r.institutionId)}</td><td>{monthlyPeriod(r)}</td><td>{g?monthlyKinds[g.kind]:"-"}</td><td>{r.required?"발송 필수":"발송 선택"}</td><td><MonthlyBadge record={r} now={r.due}/></td><td>{monthlyDateTime(r.due)}</td><td>{monthlyLate(r,pro.clock)?<span className="text-rose-700">지연</span>:"-"}</td><td>{monthlyDateTime(r.sent?.actualAt)}</td><td><Button size="sm" variant="outline" disabled={searching} onClick={()=>setRecordId(r.id)}>월간 피드백 보기</Button></td></tr>})}{!rows.length&&<tr><td colSpan={10} className="text-center text-slate-500">{empty}</td></tr>}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><label>표시 건수 <select aria-label="표시 건수" className={field} value={size} disabled={searching} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}>{[20,50,100].map(n=><option key={n} value={n}>{n}건</option>)}</select></label><span>{summary.students.length?(selectedPage-1)*size+1:0}–{Math.min(selectedPage*size,summary.students.length)} / 전체 {summary.students.length}건</span><nav className="flex gap-1" aria-label="학생 목록 페이지"><Button size="icon-sm" variant="outline" aria-label="이전 페이지" disabled={searching||selectedPage===1} onClick={()=>{setPage(selectedPage-1);studentSection.current?.scrollIntoView({block:"start"})}}><ChevronLeft/></Button>{Array.from({length:pages},(_,i)=><Button key={i} size="sm" variant={selectedPage===i+1?"default":"outline"} disabled={searching} aria-label={`${i+1}페이지`} onClick={()=>{setPage(i+1);studentSection.current?.scrollIntoView({block:"start"})}}>{i+1}</Button>)}<Button size="icon-sm" variant="outline" aria-label="다음 페이지" disabled={searching||selectedPage===pages} onClick={()=>{setPage(selectedPage+1);studentSection.current?.scrollIntoView({block:"start"})}}><ChevronRight/></Button></nav></div>
    </section>
    <MonthlyValidationTools db={hook.db}/>
    {record&&<MonthlyDialog title="월간 피드백 보기" onClose={()=>setRecordId("")}><p className="mb-4 text-sm text-slate-500">담당 학원 {academyName(hook.db,record.sent?.institutionId??record.institutionId)}</p><MonthlyReadOnly record={record} db={hook.db}/></MonthlyDialog>}
    {style&&<MonthlyDialog title="학원 말투 보기" onClose={()=>setStyleId("")}><p className="mb-4 font-semibold">{academyName(hook.db,styleId)}</p><AcademyStyleView style={style}/></MonthlyDialog>}
  </div>
}
