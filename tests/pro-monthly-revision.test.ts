import { test } from "node:test"
import assert from "node:assert/strict"
import type { MonthlyInput, MonthlySource } from "../src/lib/pro-monthly-types"
// @ts-expect-error Node tests load TypeScript directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { buildMonthlyValidation } from "../src/lib/pro-monthly-fixtures.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { generateMonthly, mockMonthlyOutput, monthlyInput, monthlyLength, validateMonthlyOutput } from "../src/lib/pro-monthly-generation.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { monthlyGivenName, monthlyNameWithParticle, monthlySentences, monthlyStyleObservations, monthlyApplyWarmth, monthlyDisplayNotices } from "../src/lib/pro-monthly-language.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { applyMonthlyCommand, reconcileMonthly, monthlyRegularAt, monthlyCanRead, monthlyEligibility } from "../src/lib/pro-monthly.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { monthlyContextHref, MONTHLY_FIXTURE_VERSION } from "../src/lib/monthly-test-context.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { summarizeMonthly } from "../src/lib/pro-monthly-summary.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { advanceMonthlyTiming, monthlyTimingBoundary } from "../src/lib/pro-monthly-fixture-details.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { monthlyValidationGuide } from "../src/lib/monthly-validation-guide.ts"

const source=(overrides:Partial<MonthlySource>={}):MonthlySource=>({recordId:"first",reviewId:"book",title:"바다를 건너온 편지",level:2,writingType:"생각 쓰기",round:1,submittedAt:"2026-11-05T01:00:00.000Z",sentAt:"2026-11-06T01:00:00.000Z",body:"주인공이 친구를 도와주었다. 나는 주인공이 좋다고 생각했다.",feedback:"생각의 이유를 책 속 행동과 연결해 보세요.",itemFeedback:[],is_current_academy:true,institutionId:"dokdo",round_status:"done_first",...overrides})
const input=(overrides:Partial<MonthlyInput>={}):MonthlyInput=>({studentName:"서윤",studentFullName:"김서윤",parentSalutation:"서윤이 부모님",isFirst:true,level:2,periodStart:"2026-11-01T15:00:00.000Z",periodEnd:"2026-11-24T15:00:00.000Z",kind:"general",sources:[source()],submittedWeeks:3,totalWeeks:4,style:[],examples:[],...overrides})
const revised=()=>source({recordId:"revised",round:2,submittedAt:"2026-11-12T01:00:00.000Z",sentAt:"2026-11-13T01:00:00.000Z",body:"주인공은 용기 있는 사람이라고 생각했다. 왜냐하면 어려운 친구에게 먼저 손을 내밀고 끝까지 함께했기 때문이다.",feedback:"이유가 구체적으로 이어집니다."})
const fixture=(detail:Parameters<typeof buildMonthlyValidation>[2]="base",scenario:Parameters<typeof buildMonthlyValidation>[1]="november")=>buildMonthlyValidation(initializePro(emptyReviewDatabase()),scenario,detail)
const teacher={role:"agency" as const,institutionId:"dokdo",name:"검증 선생님"},now="2026-11-25T03:00:00.000Z"

test("성 제외 이름·받침 호칭과 책 제목 표기, 공통 인사",()=>{
  for(const [full,name,call] of [["김서윤","서윤","서윤이"],["이희유","희유","희유"],["남궁민준","민준","민준이"]]){assert.equal(monthlyGivenName(full),name);assert.equal(monthlyNameWithParticle(name),call)}
  const g=generateMonthly(input());assert.ok(g.body.startsWith("서윤이 부모님, 안녕하세요. 책글섬 독도 관리 선생님입니다."));assert.ok(g.body.includes("『바다를 건너온 편지』"));assert.ok(!g.body.includes("김서윤"));assert.equal(g.charCount,monthlyLength(g.body))
})
test("허용 질문 변경과 문자 이모티콘은 반영하고 그림 요청과 구분",()=>{
  const i=input(),first=generateMonthly(i),g=generateMonthly(i,{body:first.body,request:"가정에서 해볼 질문을 ‘주인공은 왜 그렇게 행동했을까?’로 바꿔 주세요. 이모티콘을 넣어 주세요."})
  assert.match(g.body,/가정에서는 ‘주인공은 왜 그렇게 행동했을까\?’ 하고 물어봐 주세요/);assert.ok(!/\p{Extended_Pictographic}/u.test(g.body));assert.equal((g.body.match(/\^\^/g)??[]).length,1);assert.ok(!g.notesForTeacher!.some(n=>n.includes("그림 이모지")))
})

test("질문 추가와 변경은 금지된 그림 이모지와 함께 요청해도 각각 처리",()=>{
  const i=input(),first=generateMonthly(i),question="친구를 도울 다른 방법은 무엇일까?"
  const oldHome=first.body.split("\n\n").find(p=>p.startsWith("가정에서는"))!,oldQuestion=monthlySentences(oldHome)[0]
  for(const request of [`가정에서 물어볼 질문에 ‘${question}’를 넣어 주세요. 그림 이모지 🙂를 넣어 주세요.`,`가정에서 물어볼 질문에 ${question}를 추가해 주세요.`]) {
    const g=generateMonthly(i,{body:first.body,request})
    assert.ok(g.body.includes(oldQuestion));assert.ok(g.body.includes(`‘${question}’도 함께 물어봐 주세요.`));assert.ok(!/\p{Extended_Pictographic}|\^\^/u.test(g.body));assert.deepEqual(g.carry,first.carry)
    assert.ok(!g.notesForTeacher!.some(n=>n.includes("모의 생성")))
  }
  const replaced=generateMonthly(i,{body:first.body,request:`가정에서 물어볼 질문을 ‘${question}’로 변경해 주세요. 그림 이모티콘을 넣어 주세요.`})
  assert.ok(!replaced.body.includes(oldQuestion));assert.match(replaced.body,/가정에서는 ‘친구를 도울 다른 방법은 무엇일까\?’ 하고 물어봐 주세요/);assert.ok(!replaced.body.includes("^^"));assert.ok(replaced.notesForTeacher!.some(n=>n.includes("그림 이모지")))
})

test("따뜻한 방향은 학습 목표와 인용을 보존하며 완결된 서술어를 바꿈",()=>{
  for(const ending of ["집중하겠습니다.","집중할게요."]) {
    const quote=`“낱말을 사용하는 연습에 ${ending}”`,body=`다음 달에는 낱말의 뜻을 살려 문장을 적는 연습에 ${ending}\n\n${quote}`
    const changed=monthlyApplyWarmth(body)
    assert.ok(changed.includes("낱말의 뜻을 살려 문장을 적는 연습을 아이의 속도에 맞춰 차근차근 이어"));assert.ok(changed.includes(quote));assert.equal(monthlyApplyWarmth(changed),changed)
  }
  const i=input(),first=generateMonthly(i),warm=generateMonthly(i,{body:first.body,direction:"더 따뜻하게"})
  assert.deepEqual(warm.carry,first.carry);for(const quote of first.body.matchAll(/“([^”]+)”/g))assert.ok(warm.body.includes(quote[0]));assert.ok(!/연습에 아이의.*연습/.test(warm.body));assert.deepEqual(validateMonthlyOutput(warm,i).issues,[])
  const notes=["모의 생성 범위에서 처리합니다.","그림 이모지는 넣지 않았습니다."],before=[...notes]
  assert.deepEqual(monthlyDisplayNotices([],notes),[notes[1]]);assert.deepEqual(notes,before)
})

test("윤프로 참여 안내형은 300~500자이고 세 검토 문장이 본문과 일치",()=>{
  const db=fixture("review"),student=db.pro!.members.find(m=>m.name==="윤프로")!,r=db.pro!.monthly!.records.find(r=>r.studentId===student.id)!,g=r.generations[0]
  assert.equal(g.kind,"no_submission");assert.ok(g.charCount>=300&&g.charCount<=500);assert.equal(g.charCount,monthlyLength(g.body));assert.equal(g.reviewSpans.length,3)
  assert.equal(new Set(g.reviewSpans.map(s=>s.reason)).size,3)
  for(const span of g.reviewSpans)assert.equal(g.body.split(span.text).length-1,1)
  assert.deepEqual(validateMonthlyOutput(g,g.input).issues,[])
})

test("검증 시각 진행은 신규 매칭·첫 피드백과 첫 달 0편을 별도로 재현하고 되감지 않음",()=>{
  for(const scenario of ["november","december"] as const) {
    const db=fixture("timing",scenario),pro=db.pro!,month=scenario==="november"?"2026-11":"2026-12",late=[...pro.members].sort((a,b)=>b.assignedAt!.localeCompare(a.assignedAt!))[0],zero=pro.members[2]
    const regular=monthlyTimingBoundary(scenario)
    advanceMonthlyTiming(db,scenario);assert.equal(pro.clock,regular)
    assert.equal(monthlyEligibility(db,zero,month,pro.clock).reason,"first-month")
    assert.equal(monthlyEligibility(db,late,month,pro.clock).eligible,false)
    advanceMonthlyTiming(db,scenario,true)
    assert.equal(pro.clock,new Date(Date.parse(regular)+90*60000).toISOString());assert.equal(monthlyEligibility(db,late,month,pro.clock).reason,"late-assignment");assert.equal(monthlyEligibility(db,zero,month,pro.clock).reason,"first-month")
    assert.ok(db.records.some(r=>r.sentAt&&r.sentAt<=pro.clock&&db.reviews.some(v=>v.id===r.reviewId&&v.studentId===late.id)))
    reconcileMonthly(db,pro.clock);const before=structuredClone(pro.monthly)
    advanceMonthlyTiming(db,scenario);advanceMonthlyTiming(db,scenario,true);assert.deepEqual(pro.monthly,before)
    assert.ok(monthlyValidationGuide(db,scenario,"timing").some(r=>r.target===late.name&&r.path.includes("매칭·첫 피드백 이후")))
  }
})

test("12월 전월 확정 항목은 계속·완료 후 새 목표로 나뉘고 미발송 저장 항목은 제외",()=>{
  const db=fixture("learning","december");reconcileMonthly(db,db.pro!.clock)
  for(const completed of [false,true]) {
    const review=db.reviews.find(r=>r.id.startsWith(`monthly-carry-${completed?"complete":"continue"}-`))!,student=db.pro!.members.find(m=>m.id===review.studentId)!,r=db.pro!.monthly!.records.find(r=>r.studentId===student.id&&r.month==="2026-12")!,g=r.generations[0]
    assert.ok(g.input.sources.some(s=>s.reviewId===review.id));assert.equal(g.input.previous!.carry[0].text,"책에서 고른 낱말을 상황에 맞는 문장에 사용하기");assert.equal(g.carry[0].continued,!completed)
    if(completed){assert.notEqual(g.carry[0].text,g.input.previous!.carry[0].text);assert.ok(g.input.sources.some(s=>s.round===2));assert.match(g.body,/고쳐 쓴 글|뒤에 쓴 글|처음 글/)}
    assert.deepEqual(validateMonthlyOutput(g,g.input).issues,[])
  }
  const unsent=db.pro!.monthly!.records.find(r=>r.month==="2026-11"&&r.saved?.carry.some(c=>c.text==="저장만 하고 발송하지 않은 항목"))!,next=db.pro!.monthly!.records.find(r=>r.studentId===unsent.studentId&&r.month==="2026-12")!
  assert.equal(next.generations[0].input.previous,undefined);assert.equal(next.generations[0].carry[0].continued,false)
  assert.ok(!JSON.stringify(next.generations[0]).includes("저장만 하고 발송하지 않은 항목"))
})

test("기한 경과 안내는 오늘 할 일 지연을 통해 11월로 진입",()=>{
  const db=fixture("base","overdue"),rows=monthlyValidationGuide(db,"overdue","base")
  assert.ok(rows.length);assert.ok(rows.every(r=>r.path.startsWith("주간 관리 현황 → 오늘 할 일 [월간 피드백 지연] → 학생 [월간 피드백] → 11월")))
})
test("축약은 인용 내부 마침표와 물음표로 자르지 않고 서술어·다음 계획·가정 팁 유지",()=>{
  const quoted="전달된 피드백에서는 “이유를 적어 보세요. 왜 그렇게 생각했나요?”라고 안내했습니다."
  assert.deepEqual(monthlySentences(quoted),[quoted])
  const i=input(),first=generateMonthly(i),body=first.body+"\n\n"+quoted
  const result=generateMonthly(i,{body,direction:"더 간결하게",previousComposition:first.composition})
  assert.ok(result.body.includes(quoted));assert.match(result.body,/다음 달에는/);assert.match(result.body,/가정에서는.*물어봐 주세요/);assert.ok(monthlyLength(result.body)>=450);assert.ok(monthlyLength(result.body)<=monthlyLength(body))
})
test("다른 방식은 실제 성장 자료가 있을 때 성장 전개, 자료 없으면 성장 구성 금지",()=>{
  const i=input({sources:[source(),revised()]}),first=generateMonthly(i),g=generateMonthly(i,{direction:"다른 방식으로",body:first.body,previousComposition:first.composition})
  assert.equal(first.composition,"강점 집중형");assert.equal(g.composition,"성장 이야기형");assert.match(g.body,/처음 쓴 글에서는.*고쳐 쓴 글/);assert.notEqual(g.body,first.body.split("\n\n").reverse().join("\n\n"));assert.ok(g.body.indexOf("처음 쓴 글")<g.body.indexOf("가정에서는"))
  const plain=generateMonthly(input(),{direction:"다른 방식으로",previousComposition:"한 편 깊이 읽기형"});assert.notEqual(plain.composition,"성장 이야기형")
})
test("두 짧은 유형은 다른 방식에서 유형 유지·본문 전개 변경",()=>{
  for(const kind of ["feedback_pending","no_submission"] as const){const i=input({kind,sources:kind==="no_submission"?[]:[source({sentAt:undefined,feedback:"",is_current_academy:null})]}),first=generateMonthly(i),next=generateMonthly(i,{direction:"다른 방식으로",body:first.body,previousComposition:first.composition});assert.equal(next.kind,kind);assert.equal(next.composition,first.composition);assert.notEqual(next.body,first.body);assert.deepEqual(next.warnings,[])}
})
test("기간 전체 자료에서 전후 변화·또래 기준·지도 성과를 각각 근거와 연결",()=>{
  const i=input({sources:[source(),revised()]}),g=generateMonthly(i)
  assert.equal(g.peerComparison,true);assert.equal(g.teachingOutcome,true);assert.ok(g.evidence!.some(e=>e.criterion));assert.ok(g.evidence!.some(e=>e.references.some(r=>r.recordId==="first")&&e.references.some(r=>r.recordId==="revised")));assert.deepEqual(validateMonthlyOutput(g,i).issues,[])
  const noEvidence=generateMonthly(input());assert.equal(noEvidence.peerComparison,false);assert.equal(noEvidence.teachingOutcome,false)
})
test("이전 학원 근거는 중립 표현, 전월 사용한 또래·지도 성과는 반복 안 함",()=>{
  const first=generateMonthly(input({sources:[source(),revised()]})),i=input({sources:[source({is_current_academy:false}),revised()]})
  i.sources[1].is_current_academy=false
  const next=generateMonthly(i,{body:first.body,direction:"더 따뜻하게",previousComposition:first.composition});assert.ok(!/지도했었습니다|뒤에 쓴 글에 반영/.test(next.body));assert.ok(!/이전 학원|학원 변경/.test(next.body));assert.equal(next.teachingOutcome,false)
  const repeated=generateMonthly(input({sources:[source(),revised()],previous:{body:first.body,carry:first.carry,composition:first.composition,peerComparison:true,teachingOutcome:true}}));assert.equal(repeated.peerComparison,false);assert.equal(repeated.teachingOutcome,false);assert.ok(!repeated.body.startsWith(first.body.split("\n\n")[0]))
})
test("전월 확정 항목을 개별 비교: 관계없는 항목·참여형은 새 항목, 완료 항목은 새 목표",()=>{
  const prior={body:"지난달 발송",carry:[{text:"낱말을 새로운 문장에 사용하기",continued:false}],composition:"균형형",peerComparison:false,teachingOutcome:false}
  assert.equal(generateMonthly(input({previous:prior})).carry[0].continued,false)
  const related={...prior,carry:[{text:"고른 장면과 생각의 이유를 연결하기",continued:false}]}
  assert.equal(generateMonthly(input({previous:related})).carry[0].continued,true)
  const done=generateMonthly(input({previous:related,sources:[source(),revised()]}));assert.equal(done.carry[0].continued,false);assert.notEqual(done.carry[0].text,related.carry[0].text)
  assert.equal(generateMonthly(input({kind:"no_submission",sources:[],previous:related})).carry[0].continued,false)
})
test("출력 문구 검증은 같은 입력 한 번 재시도, 2차 실패 안내와 JSON 실패 분리",()=>{
  const i=input(),snap=structuredClone(i);let calls=0
  const out=generateMonthly(i,{},incoming=>{assert.deepEqual(incoming,snap);calls++;return {...mockMonthlyOutput(incoming),body:"AI 자동 생성 🙂\n- 점수 90점 ^^ ^^",reviewSpans:[]}})
  assert.equal(calls,2);assert.ok(out.warnings.length>=3);assert.deepEqual(i,snap)
  calls=0;assert.throws(()=>generateMonthly(i,{},()=>{calls++;return "not-json"}),/다시 시도/);assert.equal(calls,2)
  const valid=mockMonthlyOutput(i);calls=0;assert.deepEqual(generateMonthly(i,{},()=>++calls===1?"not-json":valid).warnings,[]);assert.equal(calls,2)
  assert.equal(validateMonthlyOutput({...valid,notesForTeacher:"invalid-shape"},i).json,false)
})
test("검토 표시는 최대 3개, 본문에 없는 표시만 제거하고 문구를 고치지 않음",()=>{
  const i=input(),g=mockMonthlyOutput(i),text=g.body.split("\n\n")[0],raw={...g,reviewSpans:[...Array.from({length:4},()=>({text,reason:"제출 횟수 언급"})),{text:"없는 문장",reason:"제출 횟수 언급"}]}
  const checked=validateMonthlyOutput(raw,i);assert.equal(checked.output!.reviewSpans.length,3);assert.equal(checked.output!.body,g.body);assert.ok(checked.issues.some(i=>i.includes("세 개")))
  assert.equal(validateMonthlyOutput({...g,evidence:[{point:text,source:"bad",references:[null]}]},i).json,false)
})
test("입력 연결: 유효 2차·기간 전 글/기간 내 전송 포함, 기한 후·반려·미전송 의견 제외",()=>{
  const db=fixture("learning"),m=db.pro!.members[0],r=db.pro!.monthly!.records.find(r=>r.studentId===m.id)!,i=monthlyInput(db,m,r)
  assert.ok(i.writings!.some(w=>w.firstRecordId&&w.revisedRecordId));assert.ok(i.sources.some(s=>s.round===2));assert.ok(i.sources.some(s=>s.itemFeedback.length));assert.ok(i.sources.some(s=>s.reportFeedback));assert.ok(i.sources.length>=3)
  const pending=db.pro!.members[1],pr=db.pro!.monthly!.records.find(r=>r.studentId===pending.id)!,pi=monthlyInput(db,pending,pr);assert.ok(pi.sources.every(s=>s.is_current_academy===null&&s.feedback===""&&s.itemFeedback.length===0))
  const old=db.pro!.members[3],or=db.pro!.monthly!.records.find(r=>r.studentId===old.id)!;assert.ok(monthlyInput(db,old,or).sources.some(s=>s.submittedAt<or.periodStart&&s.sentAt!>or.periodStart))
  const late=db.pro!.members[4],lr=db.pro!.monthly!.records.find(r=>r.studentId===late.id)!;assert.ok(!monthlyInput(db,late,lr).sources.some(s=>s.recordId.endsWith("-late")))
})
test("다음 달 입력은 저장만 한 항목을 제외하고 발송 때 수정·확정한 항목을 전달",()=>{
  const db=fixture("learning","december");reconcileMonthly(db,db.pro!.clock)
  const first=db.pro!.members[0],r=db.pro!.monthly!.records.find(r=>r.studentId===first.id&&r.month==="2026-12")!;assert.equal(monthlyInput(db,first,r).previous,undefined)
  const sent=db.pro!.monthly!.records.find(r=>r.month==="2026-11"&&r.sent)!,member=db.pro!.members.find(m=>m.id===sent.studentId)!,dec=db.pro!.monthly!.records.find(r=>r.studentId===member.id&&r.month==="2026-12")!
  assert.deepEqual(monthlyInput(db,member,dec).previous!.carry,sent.sent!.carry)
})
test("말투 우선순위: 해당 요청 > 저장 말투 > 예시, 본사 그림 이모지 금지는 최우선",()=>{
  const i=input({style:["정중한 습니다체로 안내합니다."],examples:["확인했어요. 살펴볼게요. 도와드려요."]})
  assert.ok(!generateMonthly(i).body.includes("살펴볼게요"))
  assert.ok(generateMonthly(i,{request:"해요체로 써 주세요."}).body.includes("살펴볼게요"))
  assert.ok(generateMonthly(input({examples:i.examples})).body.includes("살펴볼게요"))
  assert.deepEqual(monthlyStyleObservations("초안입니다.","따뜻한 햇볕을 이야기했습니다.","가정 질문을 ‘따뜻한 햇볕이 비치면 어떨까?’로 바꿔 주세요."),[])
})
test("말투 0·1·2·3편과 사용 끄기, 관찰·확정·현재 학원만 입력",()=>{
  for(const [detail,count,enabled] of [["tone-zero",0,true],["tone-one",1,true],["tone-two",2,true],["tone-ready",3,true],["tone-off",3,false]] as const){const db=fixture(detail),s=db.pro!.monthly!.styles.find(s=>s.institutionId==="dokdo"),m=db.pro!.members[0],r=db.pro!.monthly!.records.find(r=>r.studentId===m.id)!,i=monthlyInput(db,m,r);assert.equal(s?.sentIds.length??0,count);if(count)assert.equal(s!.items[0].observations,count);assert.equal(i.style.length>0,count>=3&&enabled);assert.equal(i.examples.length,count>=3&&enabled?2:0);assert.ok(!i.examples.some(b=>b.includes("전송 전 비공개")))}
})
test("말투 내용 요청 제외·반대 어미 교체·다른 학생의 직접 요청 미전달",()=>{
  let db=fixture("tone-ready"),r=db.pro!.monthly!.records.find(r=>r.studentId===db.pro!.members[0].id)!,g=r.generations[0]
  db=applyMonthlyCommand(db,{type:"monthly-regenerate",id:r.id,revision:r.revision,body:g.body,request:"가정 질문을 ‘따뜻한 햇볕을 보면 어떤 생각이 드니?’로 바꿔 주세요. 습니다체로 써 주세요."},teacher,"regen-style",now);reconcileMonthly(db,now);r=db.pro!.monthly!.records.find(v=>v.id===r.id)!;g=r.generations.at(-1)!
  db=applyMonthlyCommand(db,{type:"monthly-save",id:r.id,revision:r.revision,body:g.body,carry:g.carry,sourceId:g.id},teacher,"save-style",now);r=db.pro!.monthly!.records.find(v=>v.id===r.id)!;db=applyMonthlyCommand(db,{type:"monthly-send",id:r.id,revision:r.revision,actualAt:now},teacher,"send-style",now)
  const s=db.pro!.monthly!.styles.find(s=>s.institutionId==="dokdo")!;assert.ok(!s.items.some(i=>/햇볕|따뜻/.test(i.text)));assert.ok(s.items.some(i=>i.text.includes("습니다체")&&i.observations===1));assert.ok(!s.items.some(i=>i.text.includes("해요체")))
  const other=db.pro!.members[1],or=db.pro!.monthly!.records.find(v=>v.studentId===other.id)!;assert.ok(!generateMonthly(monthlyInput(db,other,or)).body.includes("햇볕"))
})
test("세부 예시도 URL·메뉴·원문 이동 문맥 유지, 공용 복귀 시 완전 해제",()=>{
  const current="http://localhost:3000/agency/pro-management?monthlyTest=november&monthlyCase=learning"
  for(const path of ["/admin/b2c/monthly-feedback","/agency/pro-management/academy-style","/agency/online-workbooks/test-record"]){const url=new URL(monthlyContextHref(path,current),current);assert.equal(url.searchParams.get("monthlyCase"),"learning")}
  const changed=new URL(monthlyContextHref(current,current,{select:"december"}),current);assert.equal(changed.searchParams.has("monthlyCase"),false)
  assert.equal(new URL(monthlyContextHref(current,current,{select:null}),current).searchParams.has("monthlyCase"),false)
})
test("새 예시 버전·복수 학원 21명, 필수 0 학원·원본 보존",()=>{
  const sourceDb=initializePro(emptyReviewDatabase()),before=structuredClone(sourceDb),db=buildMonthlyValidation(sourceDb,"november","paging")
  assert.deepEqual(sourceDb,before);assert.equal(db.pro!.monthly!.validation!.version,MONTHLY_FIXTURE_VERSION)
  const summary=summarizeMonthly(db,{month:"2026-11",institution:"",required:"",status:"",student:""});assert.equal(summary.students.length,21);assert.ok(summary.academies.some(a=>a.target===0&&a.optional===2));assert.equal(new Set(summary.students.map(r=>r.studentId)).size,21)
})
test("연결 관리 기록이 없는 기존 독후감을 예시 첫 자료로 선택하지 않음",()=>{
  const db=initializePro(emptyReviewDatabase()),member=db.pro!.members[0],review=db.reviews.find(r=>r.studentId===member.id)!,record=db.records.find(r=>r.reviewId===review.id)!
  db.reviews.unshift({...structuredClone(review),id:"unlinked-first-review"});db.records.unshift({...structuredClone(record),id:"unlinked-first-record",reviewId:"unlinked-first-review"})
  db.pro!.members.sort((a,b)=>Number(db.pro!.cases.some(c=>c.studentId===a.id))-Number(db.pro!.cases.some(c=>c.studentId===b.id)))
  const before=structuredClone(db),result=buildMonthlyValidation(db,"november","learning")
  assert.deepEqual(db,before);assert.ok(!result.reviews.some(r=>r.id==="unlinked-first-review"));assert.ok(result.pro!.monthly!.records.some(r=>r.generations[0]?.input.sources.some(s=>s.round===2)))
})
test("상담 전환 전 완료 2명만 선택, 정정·미진행·전환 뒤 완료는 필수",()=>{
  const db=fixture("consultations"),ids=db.pro!.members.slice(0,5).map(m=>m.id)
  for(let n=0;n<ids.length;n++){const r=db.pro!.monthly!.records.find(r=>r.studentId===ids[n])!;assert.equal(r.required,n>=2)}
})
test("경계 예시는 생성 직전과 정각·재실행을 구분, 과거 생성 이력 유지",()=>{
  const nov=fixture("timing");assert.equal(nov.pro!.monthly!.records.length,0)
  reconcileMonthly(nov,now);assert.ok(nov.pro!.monthly!.records.some(r=>r.job));reconcileMonthly(nov,now);const count=nov.pro!.monthly!.records.length;reconcileMonthly(nov,now);assert.equal(nov.pro!.monthly!.records.length,count)
  const dec=fixture("timing","december"),at=monthlyRegularAt("2026-12"),before=structuredClone(dec.pro!.monthly!.records.filter(r=>r.month==="2026-11"));assert.ok(dec.pro!.clock<at);reconcileMonthly(dec,at);reconcileMonthly(dec,at);assert.deepEqual(dec.pro!.monthly!.records.filter(r=>r.month==="2026-11"),before)
})
test("학원 이동 예시의 이전 담당 권한 차단, 발송 완료 귀속 보존",()=>{
  const db=fixture("transfer"),first=db.pro!.monthly!.records.find(r=>r.studentId===db.pro!.members[0].id)!,sent=db.pro!.monthly!.records.find(r=>r.sent)!
  assert.equal(first.institutionId,"other-agency");assert.equal(monthlyCanRead(db.pro!,first,teacher),false);assert.equal(sent.sent!.institutionId,"dokdo");assert.equal(monthlyCanRead(db.pro!,sent,teacher),true)
})
test("항목별·평가 의견이 지도 근거이면 해당 필드 위치를 연결",()=>{
  const i=input({sources:[source({feedback:"",itemFeedback:["생각의 이유를 책 속 행동으로 설명해 보세요."],reportFeedback:"생각과 이유의 연결을 확인합니다."}),revised()]})
  const g=generateMonthly(i);assert.ok(g.evidence!.some(e=>e.references.some(ref=>ref.field==="itemFeedback")));assert.ok(g.evidence!.some(e=>e.references.some(ref=>ref.field==="reportFeedback")));assert.deepEqual(validateMonthlyOutput(g,i).issues,[])
  const quoted={...g,body:g.body+`\n\n“${i.sources[0].reportFeedback}”라는 의견을 살펴보았습니다.`};assert.ok(!validateMonthlyOutput(quoted,i).issues.some(issue=>issue.includes("인용 문장")))
})
test("말투 최대 10개·학원 분리·초기화 뒤 새 관찰, 발송 이력 보존",()=>{
  let db=fixture("tone-ready"),s=db.pro!.monthly!.styles.find(s=>s.institutionId==="dokdo")!
  s.items=Array.from({length:10},(_,n)=>({text:`문장 표현 예시 ${n}`,observations:2}))
  db.pro!.monthly!.styles.push({institutionId:"other-agency",enabled:true,revision:0,items:[{text:"부드러운 해요체로 안내합니다.",observations:3}],sentIds:["other-sent"],handledIds:["other-sent"],history:[]})
  const other=structuredClone(db.pro!.monthly!.styles.at(-1)),count=s.sentIds.length
  const sendEdited=(studentId:string,key:string)=>{
    let r=db.pro!.monthly!.records.find(r=>r.studentId===studentId)!
    const g=r.generations[0]
    db=applyMonthlyCommand(db,{type:"monthly-save",id:r.id,revision:r.revision,body:g.body+" ^^",carry:g.carry,sourceId:g.id},teacher,`${key}-save`,now)
    r=db.pro!.monthly!.records.find(v=>v.id===r.id)!
    db=applyMonthlyCommand(db,{type:"monthly-send",id:r.id,revision:r.revision,actualAt:now},teacher,`${key}-send`,now)
  }
  sendEdited(db.pro!.members[0].id,"limit")
  s=db.pro!.monthly!.styles.find(s=>s.institutionId==="dokdo")!;assert.equal(s.items.length,10);assert.equal(s.sentIds.length,count+1);assert.deepEqual(db.pro!.monthly!.styles.at(-1),other)
  const sentIds=structuredClone(s.sentIds),history=structuredClone(s.history)
  db=applyMonthlyCommand(db,{type:"monthly-style-reset",revision:s.revision},teacher,"reset-observations",now)
  sendEdited(db.pro!.members[1].id,"after-reset")
  s=db.pro!.monthly!.styles.find(s=>s.institutionId==="dokdo")!;assert.deepEqual(s.items,[{text:"문자 이모티콘 ^^를 한 번 사용합니다.",observations:1}]);assert.deepEqual(s.sentIds.slice(0,sentIds.length),sentIds);assert.deepEqual(s.history.slice(0,history.length),history)
})
