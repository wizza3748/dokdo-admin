import type { ReviewDatabase } from "./review-domain"
import type { MonthlyDetailCase, MonthlyValidationCase } from "./monthly-test-context"
// @ts-expect-error Node tests load TypeScript directly.
import { emptyMonthly, monthlyRegularAt } from "./pro-monthly.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { weekStart, weekSchedule } from "./pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { monthlyLength } from "./pro-monthly-generation.ts"

/** Only called while constructing a new cookie-owned monthly fixture. Never migrates a saved run. */
export function prepareMonthlyDetail(db:ReviewDatabase,detail:MonthlyDetailCase) {
  const pro=db.pro!,members=pro.members
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
    const sent=state.records.find(r=>r.sent)
    if(sent)sent.sent!.carry=[{text:"책에서 고른 낱말을 상황에 맞는 문장에 사용하기",continued:false}]
    if(unsent?.generations[0])unsent.saved={body:unsent.generations[0].body,carry:[{text:"저장만 하고 발송하지 않은 항목",continued:false}],sourceId:unsent.generations[0].id,at:pro.clock,actor:"예시 선생님",revision:unsent.revision}
  }
  if(detail==="transfer") {
    const sent=state.records.find(r=>r.sent),unsent=state.records.find(r=>r.studentId===members[0].id)!
    for(const r of [unsent,sent].filter(r=>!!r)) {
      const m=members.find(m=>m.id===r.studentId)!;m.institutionId="other-agency";m.matchingHistory!.push({at:"2026-11-25T02:00:00.000Z",institutionId:"other-agency"})
    }
  }
  if(detail==="review") {
    const r=state.records.find(r=>r.studentId===members[0].id)!,g=r?.generations[0]
    if(g){const spans=[{text:"쓰는 과정에서 누군가의 도움을 받았다면 어떤 부분이었는지 함께 확인해 주세요.",reason:"작성 과정의 도움 여부" as const},{text:"생각의 이유를 설명하는 부분은 아직 부족합니다.",reason:"부족한 점의 직접 언급" as const},{text:"한 주에 글을 한 편씩 제출하며 생각을 적어 보면 좋겠습니다.",reason:"제출 횟수 언급" as const}];g.body+="\n\n"+spans.map(s=>s.text).join(" ");g.reviewSpans=spans;g.charCount=monthlyLength(g.body)}
  }
  if(detail==="timing") {
    const month=scenario==="december"?"2026-12":"2026-11",boundary=month==="2026-11"?"2026-11-25T00:00:00.000Z":monthlyRegularAt(month)
    if(month==="2026-11")pro.monthly=emptyMonthly()
    else{state.records=state.records.filter(r=>r.month!==month);state.evaluatedMonths=state.evaluatedMonths.filter(m=>m!==month);state.exclusions=state.exclusions.filter(e=>e.month!==month)}
    pro.clock=month==="2026-11"?"2026-11-24T14:59:59.000Z":new Date(Date.parse(boundary)-1000).toISOString()
    const late=members.at(-1)!,at=new Date(Date.parse(boundary)+3600000).toISOString();late.assignedAt=at;late.matchingHistory=[{at,institutionId:"dokdo"}]
    if(month==="2026-12") {
      const early=members[1];early.status="ended";early.endedAt="2026-12-10T00:00:00.000Z";early.serviceEnd=early.endedAt;early.endConfirmedAt="2026-12-08T00:00:00.000Z"
    }
  }
}
