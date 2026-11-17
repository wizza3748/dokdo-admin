import type { ReviewDatabase } from "./review-domain"
import type { MonthlyDetailCase, MonthlyValidationCase } from "./monthly-test-context"
// @ts-expect-error Node tests load TypeScript directly.
import { emptyMonthly, monthlyRegularAt, reconcileMonthly } from "./pro-monthly.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { weekStart, weekSchedule } from "./pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { monthlyLength } from "./pro-monthly-generation.ts"

/** Only called while constructing a new cookie-owned monthly fixture. Never migrates a saved run. */
export function prepareMonthlyDetail(db:ReviewDatabase,detail:MonthlyDetailCase) {
  const pro=db.pro!,members=pro.members
  if(detail==="review") {
    const member=members.find(m=>m.name==="윤프로")??members[0]
    for(const review of db.reviews.filter(r=>r.studentId===member.id)) {
      review.progress="first-writing";review.secondDecision=undefined
      for(const record of db.records.filter(r=>r.reviewId===review.id)) {
        record.writingStatus="writing";record.submittedAt=undefined;record.sentAt=undefined;record.savedAt=undefined;record.feedbackStatus="작성전"
      }
      const c=pro.cases.find(c=>c.reviewId===review.id)
      if(c){c.firstSentAt=undefined;c.closedAt=undefined;c.closeReason=undefined;c.selectedAt=undefined;c.selection=undefined;c.finalSnapshots=[];c.parent={status:"none",attempts:[]}}
    }
  }
  if(detail==="consultations" || detail==="paging") {
    pro.consultations=[]
    for(let i=0;i<5 && members[i];i++) {
      const at=i===4?"2026-11-25T01:00:00.000Z":"2026-11-20T01:00:00.000Z"
      pro.consultations.push({id:`consult-detail-${i}`,studentId:members[i].id,month:"2026-11",result:i===1?"부재 후 카톡 상담으로 대체":i===2?"미진행":"유선 상담 완료",actualAt:at,at,actor:"예시 선생님",memo:"월간 피드백 전환 판정 확인용 상담"})
      if(i===3)pro.consultations.push({...pro.consultations.at(-1)!,id:"consult-detail-corrected",previousId:"consult-detail-3",at:"2026-11-24T01:00:00.000Z",result:"미진행"})
    }
  }
  if(detail==="learning") {
    const firstMember=members[0],review=db.reviews.find(r=>r.studentId===firstMember.id)!,record=db.records.find(r=>r.reviewId===review.id)!,c=pro.cases.find(c=>c.reviewId===review.id)!
    const firstBody="주인공은 친구를 도와주었다. 나는 주인공이 좋다고 생각했다."
    const revisedBody="나는 주인공의 행동에 용기가 있다고 생각했다. 왜냐하면 친구가 어려울 때 자기 일을 멈추고 먼저 손을 내밀었기 때문이다. 나도 학교에서 친구가 혼자 발표를 준비할 때 함께 연습했던 경험이 떠올랐다."
    record.body=record.finalBody=firstBody;record.feedback="생각의 이유를 책 속 행동과 연결해 보세요.";record.itemFeedback=[{itemId:"monthly-reason",text:"인물의 행동을 근거로 생각의 이유를 한 문장 더 적어 보세요.",visible:true}];record.reportFeedback="책 속 행동과 생각의 연결을 확인합니다."
    c.finalSnapshots=[{recordId:record.id,at:record.sentAt!,body:firstBody,feedback:record.feedback,report:record.report}]
    c.secondDeadline="2026-11-19T15:00:00.000Z";c.secondWeek=weekStart("2026-11-12T01:00:00.000Z");c.secondDue=weekSchedule(c.secondWeek,7).due;c.closedAt="2026-11-13T01:00:00.000Z";c.closeReason="2차 완료 전송"
    const revised={...structuredClone(record),id:`${record.id}-monthly-revised`,round:2 as const,body:revisedBody,finalBody:revisedBody,submittedAt:"2026-11-12T01:00:00.000Z",sentAt:"2026-11-13T01:00:00.000Z",feedback:"처음 글보다 행동과 이유가 구체적으로 이어집니다. 다음에는 읽는 사람이 궁금할 점을 질문으로 덧붙여 보세요."}
    db.records.push(revised);c.finalSnapshots.push({recordId:revised.id,at:revised.sentAt,body:revisedBody,feedback:revised.feedback,report:revised.report})
    review.secondDecision="request";review.progress="second-sent";c.parent={status:"sent",at:revised.sentAt,attempts:[]}
    // A different, real catalog book supplies an additional in-period writing and later December data.
    const book=db.reviews.find(r=>r.bookTitle!==review.bookTitle)??db.reviews[1]
    if(book)for(const [suffix,date,sent] of [["nov","2026-11-18",true],["dec","2026-12-10",true]] as const) {
      const id=`monthly-detail-${suffix}-${review.id}`,at=`${date}T01:00:00.000Z`,week=weekStart(at),schedule=weekSchedule(week,7)
      db.reviews.push({...structuredClone(book),id,studentId:firstMember.id,studentName:firstMember.name,institutionId:firstMember.institutionId!,institution:"독도학원",month:date.slice(0,7),createdAt:at,progress:"first-sent",secondDecision:"complete"})
      const writing={...structuredClone(record),id:`${id}-r1`,reviewId:id,body:revisedBody,finalBody:revisedBody,submittedAt:at,sentAt:sent?`${date}T02:00:00.000Z`:undefined,feedback:"책 속 행동과 생각의 이유가 잘 연결되었습니다. 다음 글에서는 낱말의 뜻을 살려 문장을 적어 보세요."}
      db.records.push(writing);pro.cases.push({...structuredClone(c),reviewId:id,week,month:date.slice(0,7),cutoff:schedule.cutoff,due:schedule.due,selectedAt:at,firstSentAt:writing.sentAt,closedAt:writing.sentAt,closeReason:"1차 완료 전송",parent:{status:"sent",at:writing.sentAt,attempts:[]},secondDeadline:undefined,secondWeek:undefined,secondDue:undefined,finalSnapshots:[{recordId:writing.id,at:writing.sentAt!,body:writing.finalBody,feedback:writing.feedback,report:writing.report}]})
    }
    // Period-before writing, late revision, returned draft, and private unsent comments.
    const second=db.records.find(r=>db.reviews.find(v=>v.id===r.reviewId)?.studentId===members[1]?.id)
    if(second){second.feedback="전송 전 비공개 피드백";second.itemFeedback=[{itemId:"private",text:"전송 전 비공개 항목",visible:true}]}
    const third=db.records.find(r=>db.reviews.find(v=>v.id===r.reviewId)?.studentId===members[2]?.id)
    if(third){third.writingStatus="writing";third.rejectedAt="2026-11-06T01:00:00.000Z";third.submittedAt=undefined;third.sentAt=undefined}
    const fourth=db.records.find(r=>db.reviews.find(v=>v.id===r.reviewId)?.studentId===members[3]?.id)
    if(fourth)fourth.submittedAt="2026-10-28T01:00:00.000Z"
    const fifth=db.records.find(r=>db.reviews.find(v=>v.id===r.reviewId)?.studentId===members[4]?.id),fifthCase=pro.cases.find(c=>c.reviewId===fifth?.reviewId)
    if(fifth&&fifthCase){fifthCase.secondDeadline="2026-11-12T15:00:00.000Z";db.records.push({...structuredClone(fifth),id:`${fifth.id}-late`,round:2,submittedAt:"2026-11-13T01:00:00.000Z",sentAt:"2026-11-14T01:00:00.000Z",body:"기한 후 제출 글",finalBody:"기한 후 제출 글"})}
  }
  if(detail==="paging") {
    const template=members[0],review=db.reviews.find(r=>r.studentId===template.id)!,record=db.records.find(r=>r.reviewId===review.id)!,c=pro.cases.find(c=>c.reviewId===review.id)!
    const names=["김서윤","이나율","박시우","최도윤","정하린","강지안","조서준","윤수아","장예준","임하준","한지우"]
    const initialCount=members.length
    for(let i=members.length;i<22;i++) {
      const id=`monthly-page-${i}`,name=names[i-initialCount]??`김민서${i}`,rid=`${id}-review`,recordId=`${rid}-r1`
      members.push({...structuredClone(template),id,name,account:id})
      db.reviews.push({...structuredClone(review),id:rid,studentId:id,studentName:name})
      db.records.push({...structuredClone(record),id:recordId,reviewId:rid})
      pro.cases.push({...structuredClone(c),reviewId:rid,studentId:id,finalSnapshots:[{recordId,at:record.sentAt!,body:record.finalBody,feedback:record.feedback,report:record.report}]})
    }
    for(const m of members.slice(0,2)) {
      m.institutionId="other-agency";m.matchingHistory=[{at:m.assignedAt!,institutionId:"other-agency"}]
      for(const r of db.reviews.filter(r=>r.studentId===m.id)){r.institutionId="other-agency";r.institution="다른 예시기관"}
      for(const row of pro.cases.filter(r=>r.studentId===m.id))row.institutionId="other-agency"
    }
  }
}

export function completeMonthlyDetail(db:ReviewDatabase,scenario:MonthlyValidationCase,detail:MonthlyDetailCase) {
  const pro=db.pro!,state=pro.monthly!,members=pro.members
  if(detail==="learning") {
    const unsent=state.records.find(r=>r.studentId===members[0].id)!
    // Only a fixture's teacher-confirmed sent carry is eligible as the next month's input.
    const sent=state.records.filter(r=>r.sent&&members.find(m=>m.id===r.studentId)?.status!=="ended")
    const previousGoal="책에서 고른 낱말을 상황에 맞는 문장에 사용하기"
    for(const r of sent.slice(0,2)) {
      r.sent!.carry=[{text:previousGoal,continued:false}]
      // Keep the saved/sent teacher-confirmed version internally consistent; generated history is retained.
      if(r.saved)r.saved.carry=structuredClone(r.sent!.carry)
    }
    if(scenario==="december") {
      if(sent[0])addDecemberCarryWriting(db,sent[0].studentId,false)
      if(sent[1])addDecemberCarryWriting(db,sent[1].studentId,true)
    }
    if(unsent?.generations[0])unsent.saved={body:unsent.generations[0].body,carry:[{text:"저장만 하고 발송하지 않은 항목",continued:false}],sourceId:unsent.generations[0].id,at:pro.clock,actor:"예시 선생님",revision:unsent.revision}
  }
  if(detail==="transfer") {
    const sent=state.records.find(r=>r.sent),unsent=state.records.find(r=>r.studentId===members[0].id)!
    for(const r of [unsent,sent].filter(r=>!!r)) {
      const m=members.find(m=>m.id===r.studentId)!;m.institutionId="other-agency";m.matchingHistory!.push({at:"2026-11-25T02:00:00.000Z",institutionId:"other-agency"})
    }
  }
  if(detail==="review") {
    const member=members.find(m=>m.name==="윤프로")??members[0]
    const r=state.records.find(r=>r.studentId===member.id)!,g=r?.generations[0]
    if(g){
      const spans=[{text:"쓰는 과정에서 누군가의 도움을 받았다면 어떤 부분이었는지 함께 확인해 주세요.",reason:"작성 과정의 도움 여부" as const},{text:"생각의 이유를 설명하는 부분은 아직 부족합니다.",reason:"부족한 점의 직접 언급" as const},{text:"한 주에 글을 한 편씩 제출하며 생각을 적어 보면 좋겠습니다.",reason:"제출 횟수 언급" as const}]
      g.body=[g.body.split("\n\n")[0],"이번 기간에는 제출이 완료된 온라인 독후감이 아직 없습니다. 다음 글은 책에서 기억에 남은 장면을 고르고, 그 장면을 고른 이유를 자기 말로 나누는 것부터 시작하겠습니다.",spans[0].text,spans[1].text+" 다음 글에서는 떠오른 생각 뒤에 책 속 장면을 한 문장 덧붙여 보도록 돕겠습니다.","가정에서는 가장 기억에 남은 장면을 물어봐 주세요. 답을 미리 정하지 않고 아이의 이야기를 충분히 들은 뒤, 말한 내용을 스스로 적도록 기다려 주세요.",spans[2].text,"다음 글도 꼼꼼히 살펴보겠습니다."].join("\n\n")
      g.reviewSpans=spans;g.charCount=monthlyLength(g.body)
    }
  }
  if(detail==="timing") {
    const month=scenario==="december"?"2026-12":"2026-11",boundary=monthlyTimingBoundary(scenario)
    if(month==="2026-11")pro.monthly=emptyMonthly()
    else{state.records=state.records.filter(r=>r.month!==month);state.evaluatedMonths=state.evaluatedMonths.filter(m=>m!==month);state.exclusions=state.exclusions.filter(e=>e.month!==month)}
    pro.clock=month==="2026-11"?"2026-11-24T14:59:59.000Z":new Date(Date.parse(boundary)-1000).toISOString()
    const late=members.filter(m=>m.status!=="ended").at(-1)!,at=new Date(Date.parse(boundary)+3600000).toISOString();late.assignedAt=at;late.matchingHistory=[{at,institutionId:late.institutionId!}]
    const lateReview=db.reviews.find(r=>r.studentId===late.id)!,lateRecord=db.records.find(r=>r.reviewId===lateReview.id&&r.round===1)!,lateCase=pro.cases.find(c=>c.reviewId===lateReview.id)
    const submittedAt=new Date(Date.parse(at)+10*60000).toISOString(),sentAt=new Date(Date.parse(at)+30*60000).toISOString()
    lateReview.month=month;lateReview.createdAt=submittedAt;lateReview.progress="first-sent";lateReview.secondDecision="complete"
    lateRecord.writingStatus="submitted";lateRecord.submittedAt=submittedAt;lateRecord.sentAt=sentAt;lateRecord.savedAt=sentAt;lateRecord.feedbackStatus="전송완료";lateRecord.feedback="책의 장면을 골라 자기 생각을 적었습니다. 다음에는 생각한 이유도 이어 적어 보세요."
    if(lateCase){const week=weekStart(submittedAt),schedule=weekSchedule(week,7);Object.assign(lateCase,{month,week,cutoff:schedule.cutoff,due:schedule.due,selectedAt:submittedAt,selection:"student",firstSentAt:sentAt,closedAt:sentAt,closeReason:"1차 완료 전송",parent:{status:"sent",at:sentAt,attempts:[]},finalSnapshots:[{recordId:lateRecord.id,at:sentAt,body:lateRecord.finalBody,feedback:lateRecord.feedback,report:lateRecord.report}]})}
    // Separate first-month/no-feedback exclusion from a post-generation matching with feedback.
    const zero=members[2],zeroAt=new Date(Date.parse(boundary)-3600000).toISOString()
    zero.assignedAt=zeroAt;zero.matchingHistory=[{at:zeroAt,institutionId:"dokdo"}]
    for(const review of db.reviews.filter(r=>r.studentId===zero.id)) {
      review.createdAt=zeroAt;review.month=month;review.progress="first-writing";review.secondDecision=undefined
      for(const record of db.records.filter(r=>r.reviewId===review.id)){record.writingStatus="writing";record.submittedAt=undefined;record.sentAt=undefined;record.savedAt=undefined;record.feedbackStatus="작성전"}
      const c=pro.cases.find(c=>c.reviewId===review.id)
      if(c){const week=weekStart(zeroAt),schedule=weekSchedule(week,7);Object.assign(c,{month,week,cutoff:schedule.cutoff,due:schedule.due,selection:undefined,selectedAt:undefined,firstSentAt:undefined,closedAt:undefined,closeReason:undefined,finalSnapshots:[],parent:{status:"none",attempts:[]}})}
    }
    if(month==="2026-12") {
      const early=members[1];early.status="ended";early.endedAt="2026-12-10T00:00:00.000Z";early.serviceEnd=early.endedAt;early.endConfirmedAt="2026-12-08T00:00:00.000Z"
    }
  }
}

/** Only the validation clock advances; operational eligibility and scheduling stay unchanged. */
export const monthlyTimingBoundary=(scenario:MonthlyValidationCase)=>scenario==="december"?monthlyRegularAt("2026-12"):"2026-11-25T00:00:00.000Z"
export function advanceMonthlyTiming(db:ReviewDatabase,scenario:MonthlyValidationCase,afterMatching=false) {
  const boundary=monthlyTimingBoundary(scenario),pro=db.pro!
  if(pro.clock<boundary){pro.clock=boundary;reconcileMonthly(db,boundary)}
  const target=afterMatching?new Date(Date.parse(boundary)+90*60000).toISOString():boundary
  if(pro.clock<target)pro.clock=target
  return reconcileMonthly(db,pro.clock)
}

/** Minimal current-period material for comparing two teacher-confirmed prior-month items. */
function addDecemberCarryWriting(db:ReviewDatabase,studentId:string,completed:boolean) {
  const pro=db.pro!,member=pro.members.find(m=>m.id===studentId)!
  const template=db.reviews.find(r=>r.studentId===studentId&&pro.cases.some(c=>c.reviewId===r.id))!
  const original=db.records.find(r=>r.reviewId===template.id&&r.round===1)!,originalCase=pro.cases.find(c=>c.reviewId===template.id)!
  const id=`monthly-carry-${completed?"complete":"continue"}-${studentId}`,submittedAt="2026-12-03T01:00:00.000Z",sentAt="2026-12-04T01:00:00.000Z",week=weekStart(submittedAt),schedule=weekSchedule(week,7)
  const body="이 책에서 ‘용기’라는 낱말이 기억에 남았다. 친구를 돕는 주인공이 멋지다고 생각했다."
  const feedback="책에서 고른 낱말의 뜻을 살려 새로운 문장을 써 보세요."
  const first={...structuredClone(original),id:`${id}-r1`,reviewId:id,round:1 as const,writingStatus:"submitted" as const,submittedAt,sentAt,savedAt:sentAt,feedbackStatus:"전송완료" as const,body,finalBody:body,feedback,itemFeedback:[],reportFeedback:"",rejectedAt:undefined,feedbackSchedules:[],history:[]}
  db.reviews.push({...structuredClone(template),id,studentId,studentName:member.name,month:"2026-12",createdAt:submittedAt,progress:completed?"second-sent":"first-sent",secondDecision:completed?"request":"complete"})
  db.records.push(first)
  const c={...structuredClone(originalCase),reviewId:id,week,month:"2026-12",cutoff:schedule.cutoff,due:schedule.due,selectedAt:submittedAt,firstSentAt:sentAt,closedAt:sentAt,closeReason:"1차 완료 전송",parent:{status:"sent" as const,at:sentAt,attempts:[]},secondDeadline:undefined as string|undefined,secondWeek:undefined as string|undefined,secondDue:undefined as string|undefined,finalSnapshots:[{recordId:first.id,at:sentAt,body,feedback,report:first.report}]}
  if(completed) {
    const revisedBody="나는 ‘용기’라는 낱말의 뜻을 떠올리며 친구가 무서울 때 먼저 손을 잡아 주었다는 문장을 쓰고 그 상황을 함께 설명했다."
    const revised={...structuredClone(first),id:`${id}-r2`,round:2 as const,submittedAt:"2026-12-10T01:00:00.000Z",sentAt:"2026-12-11T01:00:00.000Z",savedAt:"2026-12-11T01:00:00.000Z",body:revisedBody,finalBody:revisedBody,feedback:"고른 낱말의 뜻이 새로운 문장과 상황에 알맞게 드러납니다."}
    db.records.push(revised);c.secondDeadline="2026-12-17T15:00:00.000Z";c.secondWeek=weekStart(revised.submittedAt);c.secondDue=weekSchedule(c.secondWeek,7).due;c.closedAt=revised.sentAt;c.closeReason="2차 완료 전송";c.parent.at=revised.sentAt;c.finalSnapshots.push({recordId:revised.id,at:revised.sentAt,body:revisedBody,feedback:revised.feedback,report:revised.report})
  }
  pro.cases.push(c)
}
