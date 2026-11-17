import type { ReviewDatabase } from "./review-domain"
// @ts-expect-error Node tests load TypeScript directly.
import { emptyMonthly, reconcileMonthly, applyMonthlyCommand } from "./pro-monthly.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { midnight, weekStart, weekSchedule } from "./pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { MONTHLY_FIXTURE_VERSION, monthlyValidationCases, type MonthlyValidationCase, type MonthlyDetailCase } from "./monthly-test-context.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { monthlyApplyEnding } from "./pro-monthly-language.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { prepareMonthlyDetail, completeMonthlyDetail } from "./pro-monthly-fixture-details.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { refreshProDemoLabels } from "./pro-demo-labels.ts"
export { monthlyValidationCases, type MonthlyValidationCase }
/** Copies existing local identities/books into a cookie-owned workspace. The source aggregate is untouched. */
export function buildMonthlyValidation(source: ReviewDatabase, scenario: MonthlyValidationCase, detail:MonthlyDetailCase="base") {
  let db=refreshProDemoLabels(structuredClone(source),{studentNamesOnly:true})
  if(!db.pro)throw new Error("기존 프로 예시가 필요합니다.")
  const linkedReview=(studentId:string)=>db.reviews.find(r=>r.studentId===studentId&&db.pro!.cases.some(c=>c.studentId===studentId&&c.reviewId===r.id)&&db.records.some(record=>record.reviewId===r.id&&record.round===1))
  const available=db.pro.members.filter(m=>m.product==="pro"&&db.reviews.some(r=>r.studentId===m.id))
  // These cases edit five connected writing histories. Unassigned source students stay in the remaining examples.
  const connected=detail==="learning"||detail==="paging"?available.filter(m=>linkedReview(m.id)).slice(0,5):[]
  const candidates=[...connected,...available.filter(m=>!connected.includes(m))].slice(0,12)
  const reviews=candidates.map(m=>linkedReview(m.id)??db.reviews.find(r=>r.studentId===m.id)!)
  if(!candidates.length)throw new Error("월간 피드백 예시에 사용할 제출·관리 기록이 없습니다.")
  db.reviews=reviews
  db.records=reviews.flatMap(r=>{const first=db.records.find(s=>s.reviewId===r.id&&s.round===1);return first?[first]:[]})
  db.pro.members=candidates;db.pro.cases=db.pro.cases.filter(c=>reviews.some(r=>r.id===c.reviewId));db.pro.audit=[];db.pro.reminders=[];db.pro.reminderSnapshots=[];db.pro.consultations=[];db.pro.processed=[]
  db.pro.monthly=emptyMonthly();db.pro.clockMode="test";db.pro.clock="2026-11-25T00:00:00.000Z"
  delete db.proTestBaseline
  candidates.forEach((m,i)=>{
    m.assignedAt=midnight(i===candidates.length-1?"2026-11-10":"2026-09-28");m.matchingHistory=[{at:m.assignedAt,institutionId:i===6?"other-agency":"dokdo"}];m.institutionId=i===6?"other-agency":"dokdo";m.status=i===8?"ended":"active";m.endedAt=i===8?"2026-11-22T15:00:00.000Z":undefined;m.endConfirmedAt=m.endedAt;m.serviceEnd=m.endedAt??"2027-12-31T15:00:00.000Z";m.caseOnly=undefined
    const review=reviews[i],r=db.records.find(r=>r.reviewId===review.id),c=db.pro!.cases.find(c=>c.reviewId===review.id)
    review.institutionId=m.institutionId;review.institution=m.institutionId==="dokdo"?"독도학원":"다른 예시기관";review.month="2026-11";review.createdAt="2026-11-05T00:00:00.000Z"
    if(!r||!c)return
    const sent=![1,2,candidates.length-1].includes(i)
    r.writingStatus=i===2?"writing":"submitted";r.submittedAt=i===2?undefined:"2026-11-05T01:00:00.000Z";r.sentAt=sent?"2026-11-06T01:00:00.000Z":undefined;r.savedAt=sent?"2026-11-06T00:00:00.000Z":undefined;r.feedbackStatus=sent?"전송완료":"작성전"
    review.progress=sent?"first-sent":i===2?"first-writing":"first-submitted";review.secondDecision=sent?"complete":undefined
    if(!r.finalBody)r.finalBody=r.body||Object.values(r.answers).join("\n")
    if(sent&&!r.feedback)r.feedback="책 속 장면을 자신의 생각과 연결해서 적었습니다. 다음 글에서는 그렇게 생각한 이유를 한 문장 더 적어 보세요."
    r.feedbackSchedules=[];r.history=[]
    c.institutionId=m.institutionId;c.month="2026-11";c.week=weekStart(r.submittedAt??review.createdAt);c.cutoff=weekSchedule(c.week,7).cutoff;c.due=weekSchedule(c.week,7).due;c.selectedAt=r.submittedAt;c.selection=r.submittedAt?"student":undefined;c.firstSentAt=r.sentAt;c.secondDeadline=undefined;c.secondDue=undefined;c.secondWeek=undefined;c.closedAt=r.sentAt;c.closeReason=sent?"1차 완료 전송":undefined;c.parent={status:sent?"sent":"none",at:r.sentAt,attempts:[]};c.finalSnapshots=sent?[{recordId:r.id,at:r.sentAt!,feedback:r.feedback,body:r.finalBody,report:r.report}]:[]
  })
  if(candidates[5])db.pro.consultations.push({id:"monthly-validation-consult",studentId:candidates[5].id,month:"2026-11",result:"유선 상담 완료",actualAt:"2026-11-20T01:00:00.000Z",at:"2026-11-20T01:10:00.000Z",actor:"예시 선생님",memo:"학부모와 읽기 습관에 대해 상담했습니다."})
  prepareMonthlyDetail(db,detail)
  db=reconcileMonthly(db,db.pro.clock)
  const failure=db.pro!.monthly!.records.find(r=>r.studentId===candidates[9]?.id)
  if(failure)failure.simulateGenerationFailureOnce=true
  db=reconcileMonthly(db,"2026-11-25T00:00:02.000Z")
  const teacher={role:"agency" as const,name:"예시 선생님",institutionId:"dokdo"}
  const toneCount:Record<string,number>={"tone-zero":0,"tone-one":1,"tone-two":2,"tone-ready":3,"tone-off":3}
  const savedIndices=detail.startsWith("tone-")?[3,4,7].slice(0,toneCount[detail]):detail==="failures"||detail==="review"?[]:[3,4,7,8]
  for(const index of savedIndices){
    const record=db.pro!.monthly!.records.find(r=>r.studentId===candidates[index]?.id)
    if(!record?.generations[0])continue
    const g=record.generations[0]
    db=applyMonthlyCommand(db,{type:"monthly-save",id:record.id,revision:record.revision,body:monthlyApplyEnding(g.body,true),carry:g.carry,sourceId:g.id},teacher,`${record.id}:fixture-save`,"2026-11-25T01:00:00.000Z")
    if(detail.startsWith("tone-")||index!==3 && (scenario!=="overdue" || index===4)){const r=db.pro!.monthly!.records.find(r=>r.id===record.id)!;db=applyMonthlyCommand(db,{type:"monthly-send",id:r.id,revision:r.revision,actualAt:"2026-11-25T01:10:00.000Z"},teacher,`${r.id}:fixture-sent`,"2026-11-25T01:15:00.000Z")}
  }
  if(candidates[6]){const m=db.pro!.members.find(m=>m.id===candidates[6].id)!;m.institutionId="dokdo";m.matchingHistory!.push({at:"2026-11-25T02:00:00.000Z",institutionId:"dokdo"})}
  const styleFailure=db.pro!.monthly!.records.find(r=>r.studentId===candidates[3]?.id)
  if(styleFailure)styleFailure.simulateStyleFailureOnce=true
  if(detail==="tone-off"||scenario==="december"&&!detail.startsWith("tone-")){
    const style=db.pro!.monthly!.styles.find(s=>s.institutionId==="dokdo")
    if(style)
    db=applyMonthlyCommand(db,{type:"monthly-style-save",enabled:false,items:style.items.map(i=>i.text),revision:style.revision},teacher,"fixture-style-disabled","2026-11-25T02:30:00.000Z")
  }
  db.pro!.clock=monthlyValidationCases[scenario].at
  completeMonthlyDetail(db,scenario,detail)
  db.pro!.monthly!.validation={version:MONTHLY_FIXTURE_VERSION,scenario,caseId:detail,createdAt:new Date().toISOString()}
  db=reconcileMonthly(db,db.pro!.clock)
  return db
}
