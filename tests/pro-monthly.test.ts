import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node test runner loads TS sources.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node test runner loads TS sources.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node test runner loads TS sources.
import { applyMonthlyCommand, emptyMonthly, executeMonthlyTransition, reconcileMonthly, monthlyEligibility, monthlyRegularAt, monthlyDue, monthlyStatus, monthlyTasks, monthlyOwner, monthlyCanRead } from "../src/lib/pro-monthly.ts"
// @ts-expect-error Node test runner loads TS sources.
import { buildMonthlyValidation } from "../src/lib/pro-monthly-fixtures.ts"
// @ts-expect-error Node test runner loads TS sources.
import { monthlyInput, generateMonthly, mockMonthlyOutput, monthlyLength, validateMonthlyOutput, canShortenMonthly } from "../src/lib/pro-monthly-generation.ts"
// @ts-expect-error Node test runner loads TS sources.
import { summarizeMonthly } from "../src/lib/pro-monthly-summary.ts"
// @ts-expect-error Node test runner loads TS sources.
import { scopePro, proTasks, studentProView } from "../src/lib/pro-selectors.ts"
import type { ReviewDatabase } from "../src/lib/review-domain"
const teacher = { role:"agency" as const, institutionId:"dokdo", name:"검증 선생님" }
const start="2026-11-25T00:00:00.000Z", now="2026-11-25T03:00:00.000Z"
const fixture=()=>buildMonthlyValidation(initializePro(emptyReviewDatabase()),"november")
const first=(db:ReviewDatabase)=>db.pro!.monthly!.records.find(r=>r.studentId==="pro-demo-1")!
function save(db:ReviewDatabase,r=first(db)) { const g=r.generations[0];return applyMonthlyCommand(db,{type:"monthly-save",id:r.id,revision:r.revision,body:g.body,carry:g.carry,sourceId:g.id},teacher,"save",now) }
function send(db:ReviewDatabase,manual=true,r=first(db),id="send") {return applyMonthlyCommand(db,{type:"monthly-send",id:r.id,revision:r.revision,...(manual?{actualAt:now}:{})},teacher,id,now)}

test("11월 전환 최초 시각과 유효 상담 판정을 재실행해도 보존",()=>{
  const db=initializePro(emptyReviewDatabase()),pro=db.pro!;pro.monthly=emptyMonthly()
  const base={studentId:"pro-demo-1",month:"2026-11",result:"유선 상담 완료" as const,memo:"기존 상담",actor:"선생님",actualAt:start}
  pro.consultations=[{...base,id:"old",at:start},{...base,id:"cancel",previousId:"old",result:"미진행",at:"2026-11-25T00:01:00.000Z"},{...base,id:"valid",studentId:"pro-demo-2",at:start},{...base,id:"later",studentId:"pro-demo-3",at:"2026-11-25T04:00:00.000Z"}]
  executeMonthlyTransition(pro,now)
  const snapshot=structuredClone(pro.monthly.transition)
  assert.deepEqual(snapshot,{at:now,optional:{"pro-demo-2":["valid"]}})
  pro.consultations.push({...base,id:"new",at:"2026-11-25T05:00:00.000Z"})
  assert.equal(executeMonthlyTransition(pro,"2026-11-26T00:00:00.000Z"),false)
  assert.deepEqual(pro.monthly.transition,snapshot)
})
test("전환 전 빈 데이터에 월간 기록을 추가하지 않음",()=>{const db=initializePro(emptyReviewDatabase()),before=structuredClone(db);reconcileMonthly(db,"2026-11-24T14:59:00.000Z");assert.deepEqual(db,before)})
test("정기 생성은 5주 관리월에도 4주차 월요일 06시, 기한은 일요일 23:59",()=>{
  assert.equal(monthlyRegularAt("2026-12"),"2026-12-20T21:00:00.000Z")
  assert.equal(monthlyDue("2026-12"),"2026-12-27T14:59:00.000Z")
  assert.equal(monthlyRegularAt("2027-04"),"2027-04-18T21:00:00.000Z")
})
test("학생 일정은 지정 시각부터 할 일만 표시하고 초안 생성·기간·마감은 유지",()=>{
  let db=fixture(),r=first(db)
  const before=structuredClone(r)
  db=applyMonthlyCommand(db,{type:"monthly-schedule",studentId:r.studentId,weekday:3,time:"18:00"},teacher,"schedule",now)
  assert.deepEqual(first(db),before)
  assert.equal(monthlyTasks(db.pro!,r.studentId,"2026-11-25T08:59:59.999Z").write.length,0)
  assert.equal(monthlyTasks(db.pro!,r.studentId,"2026-11-25T09:00:00.000Z").write.length,1)
  db=applyMonthlyCommand(db,{type:"monthly-schedule",studentId:r.studentId,weekday:7,time:"23:59"},teacher,"schedule-later",now)
  assert.deepEqual(first(db),before)
  const lateAt="2026-11-29T15:00:00.000Z"
  assert.equal(monthlyTasks(db.pro!,r.studentId,lateAt).write.length,0)
  assert.equal(monthlyTasks(db.pro!,r.studentId,lateAt).late.length,1)
  db=save(db);r=first(db)
  db=applyMonthlyCommand(db,{type:"monthly-send",id:r.id,revision:r.revision,actualAt:lateAt},teacher,"late-send",lateAt)
  assert.equal(first(db).sent!.actualAt,lateAt)
  assert.equal(monthlyTasks(db.pro!,r.studentId,lateAt).late.length,0)
})
test("11월 첫 운영 전에는 학생 지정 시각이 지나도 생성하지 않고 종료월은 조기 생성일 유지",()=>{
  const db=initializePro(emptyReviewDatabase()),m=db.pro!.members[0]
  db.pro!.monthly=emptyMonthly()
  db.pro!.monthly.schedules.push({studentId:m.id,weekday:1,time:"07:00",at:"2026-11-16T00:00:00.000Z",actor:"선생님"})
  reconcileMonthly(db,"2026-11-24T14:59:00.000Z")
  assert.equal(db.pro!.monthly.records.length,0)
  const early=fixture(),member=early.pro!.members[0]
  member.endedAt="2026-12-10T00:00:00.000Z";member.endConfirmedAt="2026-12-01T00:00:00.000Z";member.serviceEnd=member.endedAt
  early.pro!.monthly!.schedules.push({studentId:member.id,weekday:7,time:"23:59",at:now,actor:"선생님"})
  const at="2026-12-06T21:00:00.000Z"
  reconcileMonthly(early,at);reconcileMonthly(early,at)
  const record=early.pro!.monthly!.records.find(r=>r.studentId===member.id&&r.month==="2026-12")!
  assert.equal(record.scheduledGenerationAt,at)
  assert.equal(record.due,"2026-12-13T14:59:00.000Z")
  assert.ok(monthlyTasks(early.pro!,member.id,at).write.some(r=>r.id===record.id))
})
test("검증 예시는 원본·공용 이력 보존, 첫 생성 기간·상담 발송 선택과 세 유형 재현",()=>{
  const source=initializePro(emptyReviewDatabase()),before=structuredClone(source),db=buildMonthlyValidation(source,"november")
  assert.deepEqual(source,before)
  assert.equal(first(db).periodStart,"2026-11-01T15:00:00.000Z");assert.equal(first(db).periodEnd,"2026-11-24T15:00:00.000Z")
  assert.equal(db.pro!.monthly!.records.find(r=>r.studentId==="pro-demo-6")!.required,false)
  assert.deepEqual(new Set(db.pro!.monthly!.records.flatMap(r=>r.generations.map(g=>g.kind))),new Set(["general","feedback_pending","no_submission"]))
  assert.equal(new Set(db.pro!.monthly!.records.map(r=>r.id)).size,db.pro!.monthly!.records.length)
})
test("첫 달 피드백 0편은 종료월에도 제외, 늦은 매칭은 다음 달부터",()=>{
  const db=fixture(),m=db.pro!.members.at(-1)!;assert.equal(monthlyEligibility(db,m,"2026-11",now).reason,"first-month")
  m.status="ended";m.endedAt="2026-11-27T00:00:00.000Z";assert.equal(monthlyEligibility(db,m,"2026-11",now).reason,"first-month")
  db.pro!.monthly!.exclusions=[]
  m.assignedAt="2026-11-25T01:00:00.000Z";m.matchingHistory=[{at:m.assignedAt,institutionId:"dokdo"}];m.status="active";m.endedAt=undefined;m.serviceEnd="2027-12-31T15:00:00.000Z"
  const rec=db.records.find(r=>db.reviews.find(c=>c.id===r.reviewId)?.studentId===m.id)!;rec.sentAt="2026-11-25T02:00:00.000Z"
  assert.equal(monthlyEligibility(db,m,"2026-11",now).reason,"late-assignment")
  m.endedAt="2026-11-27T00:00:00.000Z";m.endConfirmedAt=m.endedAt;assert.equal(monthlyEligibility(db,m,"2026-11","2026-11-27T01:00:00.000Z").eligible,true)
})
test("12월 대상 기간은 11월 최초 생성일부터 12월 생성 전날, 이미 생성된 건은 보존",()=>{
  const db=fixture(),before=structuredClone(first(db));db.pro!.clock="2026-12-21T01:00:00.000Z";reconcileMonthly(db,db.pro!.clock);reconcileMonthly(db,db.pro!.clock)
  const december=db.pro!.monthly!.records.find(r=>r.studentId===before.studentId&&r.month==="2026-12")!
  assert.equal(december.periodStart,"2026-11-24T15:00:00.000Z");assert.equal(december.periodEnd,"2026-12-20T15:00:00.000Z")
  assert.deepEqual(first(db),before)
})
test("제출일·전송일 기준 입력이며 미전송 의견·작성 중·반려·기한 후 2차는 제외",()=>{
  const db=fixture(),m=db.pro!.members[0],r=first(db),record=db.records.find(s=>db.reviews.find(c=>c.id===s.reviewId)?.studentId===m.id)!
  record.sentAt=undefined;record.feedback="비공개 의견";record.itemFeedback=[{itemId:"private",text:"비공개 항목",visible:true}]
  let input=monthlyInput(db,m,r);assert.equal(input.kind,"feedback_pending");assert.equal(input.sources[0].feedback,"");assert.deepEqual(input.sources[0].itemFeedback,[]);assert.equal(input.sources[0].is_current_academy,null)
  record.writingStatus="writing";assert.equal(monthlyInput(db,m,r).sources.length,0)
  record.writingStatus="submitted";record.round=2;db.pro!.cases.find(c=>c.reviewId===record.reviewId)!.secondDeadline="2026-11-04T15:00:00.000Z";input=monthlyInput(db,m,r);assert.equal(input.sources.length,0)
})
test("저장·복사·발송 순서와 최신 저장본 복사 확인, 중복 발송 차단",()=>{
  let db=fixture();const r=first(db);assert.throws(()=>send(db,false),/저장/)
  db=save(db);assert.equal(monthlyStatus(first(db)),"저장됨");assert.throws(()=>send(db,false),/복사/)
  db=applyMonthlyCommand(db,{type:"monthly-copy",id:r.id,revision:first(db).revision},teacher,"copy",now)
  assert.equal(monthlyStatus(first(db)),"저장됨")
  db=send(db,false);const sent=structuredClone(first(db).sent);db=send(db,false,first(db),"send")
  assert.deepEqual(first(db).sent,sent);assert.throws(()=>send(db,false,first(db),"send-other"),/변경/)
  assert.equal(db.pro!.monthly!.styles[0].handledIds.filter(id=>id===r.id).length,1)
})
test("본문 수정 저장 시 이전 복사 무효화, 직접 입력 발송 범위 검증",()=>{
  let db=save(fixture()),r=first(db);db=applyMonthlyCommand(db,{type:"monthly-copy",id:r.id,revision:r.revision},teacher,"copy",now);r=first(db)
  db=applyMonthlyCommand(db,{type:"monthly-save",id:r.id,revision:r.revision,body:r.saved!.body+"\n수정 문장",carry:r.saved!.carry,sourceId:r.saved!.sourceId},teacher,"save-again",now)
  assert.throws(()=>send(db,false),/복사/);r=first(db)
  for(const actualAt of ["2026-11-24T00:00:00Z","2026-11-26T00:00:00Z"])assert.throws(()=>applyMonthlyCommand(db,{type:"monthly-send",id:r.id,revision:r.revision,actualAt},teacher,"bad",now),/일시/)
  assert.ok(send(db).pro!.monthly!.records.find(r=>r.id===first(db).id)!.sent)
})
test("발송 후 말투 갱신 실패는 발송본·기존 말투 보존, 동일 발송본 중복 처리 없음",()=>{
  let db=save(fixture());first(db).simulateStyleFailureOnce=true
  const items=structuredClone(db.pro!.monthly!.styles[0]?.items??[])
  db=send(db);assert.equal(first(db).styleUpdate,"failed");assert.ok(first(db).sent)
  assert.deepEqual(db.pro!.monthly!.styles[0].items,items)
  const history=structuredClone(db.pro!.monthly!.styles);db=send(db,true,first(db),"send");assert.deepEqual(db.pro!.monthly!.styles,history)
})
test("학원 말투 사용 해제와 초기화는 발송본·관찰 횟수·기존 변경 이력 보존",()=>{
  let db=fixture(),style=db.pro!.monthly!.styles.find(s=>s.institutionId===teacher.institutionId)!
  const items=structuredClone(style.items),sentIds=structuredClone(style.sentIds),sent=db.pro!.monthly!.records.filter(r=>r.sent).map(r=>structuredClone(r.sent)),history=structuredClone(style.history)
  db=applyMonthlyCommand(db,{type:"monthly-style-save",enabled:false,items:items.map(i=>i.text),revision:style.revision},teacher,"disable-style",now)
  style=db.pro!.monthly!.styles.find(s=>s.institutionId===teacher.institutionId)!
  assert.equal(style.enabled,false);assert.deepEqual(style.items,items)
  db=applyMonthlyCommand(db,{type:"monthly-style-reset",revision:style.revision},teacher,"reset-style",now)
  style=db.pro!.monthly!.styles.find(s=>s.institutionId===teacher.institutionId)!
  assert.deepEqual(style.items,[]);assert.deepEqual(style.sentIds,sentIds);assert.deepEqual(style.history.slice(0,history.length),history)
  assert.deepEqual(db.pro!.monthly!.records.filter(r=>r.sent).map(r=>r.sent),sent)
})
test("생성 실패는 횟수·편집본 유지, 두 번 재생성 후 최대 3개 이력",()=>{
  let db=save(fixture()),r=first(db);const before=structuredClone(r.saved)
  db=applyMonthlyCommand(db,{type:"monthly-regenerate",id:r.id,revision:r.revision,body:r.saved!.body,direction:"더 따뜻하게"},teacher,"fail-job",now)
  first(db).simulateGenerationFailureOnce=true;reconcileMonthly(db,now);assert.equal(first(db).regenerationCount,0);assert.deepEqual(first(db).saved,before)
  for(let i=0;i<2;i++){r=first(db);db=applyMonthlyCommand(db,{type:"monthly-regenerate",id:r.id,revision:r.revision,body:r.saved!.body,direction:"다른 방식으로"},teacher,`regen-${i}`,now);reconcileMonthly(db,now)}
  r=first(db);assert.equal(r.regenerationCount,2);assert.equal(r.generations.length,3);assert.deepEqual(r.saved,before)
  assert.throws(()=>applyMonthlyCommand(db,{type:"monthly-regenerate",id:r.id,revision:r.revision,body:r.saved!.body,direction:"더 따뜻하게"},teacher,"exhausted",now),/모두 사용/)
})
test("생성 JSON·문구 검증은 한 번만 재시도, 본문에 없는 검토 표시 제거",()=>{
  const input=first(fixture()).generations[0].input;let calls=0
  assert.throws(()=>generateMonthly(input,{},()=>{calls++;return "bad-json"}),/다시 시도/);assert.equal(calls,2)
  calls=0;const warning=generateMonthly(input,{},()=>{calls++;return {...mockMonthlyOutput(input),body:"짧음"}});assert.equal(calls,2);assert.ok(warning.warnings.length)
  const checked=validateMonthlyOutput({...mockMonthlyOutput(input),reviewSpans:[{text:"없는문장",reason:"제출 횟수 언급"}]},input);assert.deepEqual(checked.output!.reviewSpans,[])
})
test("세 메시지 유형 분량 검증과 축약 비활성 기준",()=>{
  for(const r of fixture().pro!.monthly!.records){const g=r.generations[0];if(!g)continue;assert.ok(monthlyLength(g.body)>=(g.kind==="general"?450:300));assert.ok(monthlyLength(g.body)<=(g.kind==="general"?1000:500));assert.deepEqual(g.warnings,[])}
  assert.equal(canShortenMonthly("general","가".repeat(500)),false);assert.equal(canShortenMonthly("no_submission","가".repeat(350)),false)
})
test("필수·선택 집계와 이전 달 지연 할 일, 학원 변경은 미발송 담당만 변경",()=>{
  const db=fixture(),pro=db.pro!,r=first(db),before=structuredClone(r);const m=pro.members[0];m.institutionId="other-agency";reconcileMonthly(db,now)
  assert.equal(first(db).institutionId,"other-agency");assert.deepEqual(first(db).generations,before.generations);assert.equal(monthlyOwner(pro,m),"other-agency")
  assert.equal(monthlyCanRead(pro,first(db),teacher),false);assert.equal(scopePro(pro,"dokdo").monthly!.records.some(s=>s.id===r.id),false)
  pro.clock="2026-12-21T01:00:00.000Z";const tasks=monthlyTasks(pro);assert.ok(tasks.late.some(r=>r.month==="2026-11"));assert.ok(tasks.late.every(r=>r.required))
  const totals=summarizeMonthly(db,{month:"2026-11",institution:"",required:"",status:"",student:""});assert.equal(totals.academies.reduce((n,a)=>n+a.target,0),totals.all.filter(r=>r.required).length)
  assert.equal(totals.academies.reduce((n,a)=>n+a.optional,0),totals.all.filter(r=>!r.required).length)
  const filtered=summarizeMonthly(db,{month:"2026-11",institution:"",required:"optional",status:"",student:""});assert.deepEqual(filtered.academies,totals.academies)
  assert.ok(!JSON.stringify(studentProView(db,m.id)).includes("monthly:"))
})
test("권한·경합 검사: 본사 수정 차단, 오래된 버전 저장 차단",()=>{
  const db=fixture(),r=first(db),g=r.generations[0],command={type:"monthly-save" as const,id:r.id,body:g.body,carry:g.carry,sourceId:g.id,revision:r.revision}
  assert.throws(()=>applyMonthlyCommand(db,command,{role:"admin",name:"본사"},"admin",now),/기관관리자/)
  assert.throws(()=>applyMonthlyCommand(db,{...command,revision:-1},teacher,"stale",now),/다른 화면/)
  assert.equal(proTasks(db).badge,proTasks(db).counts.slice(0,6).reduce((n,c)=>n+c,0))
})

test("저장·복사·발송 기록 실패는 입력 명령과 기존 본문·복사·발송 이력을 보존",()=>{
  const db=save(fixture()),r=first(db),g=r.generations[0],before=structuredClone(db)
  const commands=[
    {type:"monthly-save" as const,id:r.id,revision:r.revision-1,body:"아직 저장하지 못한 수정 내용",carry:g.carry,sourceId:g.id},
    {type:"monthly-copy" as const,id:r.id,revision:r.revision-1},
    {type:"monthly-send" as const,id:r.id,revision:r.revision-1,actualAt:now},
  ]
  for(const command of commands){
    const input=structuredClone(command)
    assert.throws(()=>applyMonthlyCommand(db,command,teacher,`failed-${command.type}`,now),/다른 화면/)
    assert.deepEqual(command,input)
    assert.deepEqual(db,before)
  }
})

test("정기 생성 시각 직전에는 생성하지 않고 경계 시각부터 한 번만 생성",()=>{
  const db=fixture(),boundary=monthlyRegularAt("2026-12")
  reconcileMonthly(db,new Date(Date.parse(boundary)-1).toISOString())
  assert.equal(db.pro!.monthly!.records.filter(r=>r.month==="2026-12").length,0)
  reconcileMonthly(db,boundary)
  const december=db.pro!.monthly!.records.filter(r=>r.month==="2026-12")
  assert.ok(december.length>0)
  assert.ok(december.every(r=>r.job&&r.generations.length===0))
  reconcileMonthly(db,boundary)
  const generated=structuredClone(db.pro!.monthly!.records.filter(r=>r.month==="2026-12"))
  assert.ok(generated.every(r=>!r.job&&r.generations.length===1))
  reconcileMonthly(db,new Date(Date.parse(boundary)+1000).toISOString())
  assert.deepEqual(db.pro!.monthly!.records.filter(r=>r.month==="2026-12"),generated)
})

test("학원 변경 뒤 다시 만들기는 현재 학원 자료 구분·말투를 쓰고 이전 근거는 보존",()=>{
  let db=fixture(),r=first(db)
  const original=structuredClone(r.generations),member=db.pro!.members.find(m=>m.id===r.studentId)!
  assert.ok(original[0].input.sources.some(s=>s.is_current_academy===true))
  member.institutionId="other-agency"
  member.matchingHistory!.push({at:now,institutionId:"other-agency"})
  db.pro!.monthly!.styles.push({institutionId:"other-agency",enabled:true,revision:0,items:[{text:"현재 학원의 간결한 표현",observations:3}],sentIds:["a","b","c"],handledIds:[],history:[]})
  reconcileMonthly(db,now);r=first(db)
  const command={type:"monthly-regenerate" as const,id:r.id,revision:r.revision,body:original[0].body,direction:"더 따뜻하게" as const}
  assert.equal(monthlyCanRead(db.pro!,r,teacher),false)
  assert.throws(()=>applyMonthlyCommand(db,command,teacher,"old-academy",now),/권한/)
  const current={...teacher,institutionId:"other-agency"}
  assert.equal(monthlyCanRead(db.pro!,r,current),true)
  db=applyMonthlyCommand(db,command,current,"new-academy",now)
  assert.equal(first(db).job!.institutionId,"other-agency")
  assert.deepEqual(first(db).job!.input.style,["현재 학원의 간결한 표현"])
  assert.ok(first(db).job!.input.sources.filter(s=>s.sentAt).every(s=>s.is_current_academy===false))
  reconcileMonthly(db,now)
  assert.deepEqual(first(db).generations.slice(0,original.length),original)
  assert.equal(first(db).generations.at(-1)!.institutionId,"other-agency")
})

test("다중 학원 집계는 미발송의 현재 담당과 발송본의 담당 학원을 구분",()=>{
  const db=send(save(fixture()))
  let sent=first(db)
  const sentSnapshot=structuredClone(sent.sent)
  const unsent=db.pro!.monthly!.records.find(r=>r.studentId!==sent.studentId&&!r.sent&&r.required)!
  for(const r of [sent,unsent])db.pro!.members.find(m=>m.id===r.studentId)!.institutionId="other-agency"
  reconcileMonthly(db,now)
  sent=first(db)
  assert.deepEqual(sent.sent,sentSnapshot)
  assert.equal(sent.institutionId,"dokdo")
  assert.equal(unsent.institutionId,"other-agency")
  const filters={month:"2026-11",institution:"",required:"",status:"",student:""},summary=summarizeMonthly(db,filters)
  assert.ok(summary.academies.length>=2)
  for(const academy of summary.academies){
    const owned=summary.all.filter(r=>(r.sent?.institutionId??r.institutionId)===academy.id)
    assert.equal(academy.target,owned.filter(r=>r.required).length)
    assert.equal(academy.sent,owned.filter(r=>r.required&&r.sent).length)
    assert.equal(academy.unsent,academy.target-academy.sent)
    assert.equal(academy.optional,owned.filter(r=>!r.required).length)
  }
  const selected=summarizeMonthly(db,{...filters,institution:"other-agency"})
  assert.ok(selected.students.some(r=>r.id===unsent.id))
  assert.ok(selected.students.every(r=>r.id!==sent.id))
})

test("최초 생성 재시도는 실패 상태를 지우고 생성 중을 거쳐 횟수 차감 없이 완료",()=>{
  let db=fixture(),r=first(db)
  r.generations=[];r.error="월간 피드백 AI초안을 만들지 못했습니다. 다시 시도해 주세요."
  db=applyMonthlyCommand(db,{type:"monthly-retry",id:r.id,revision:r.revision},teacher,"retry-first",now)
  r=db.pro!.monthly!.records.find(s=>s.id===r.id)!
  assert.ok(r.job);assert.equal(r.error,undefined);assert.equal(monthlyStatus(r),"생성 중")
  reconcileMonthly(db,now)
  assert.equal(r.job,undefined);assert.equal(r.error,undefined);assert.equal(r.generations.length,1);assert.equal(r.regenerationCount,0)
})
