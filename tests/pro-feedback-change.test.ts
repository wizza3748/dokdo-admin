import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { applyProCommand, applyManagedReviewCommand, proChangeCandidates } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { studentProView, proSnapshotAt } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { proSummaryText, proSummaryRemainingText, proSecondDeadlineDay, proBookPresentation } from "../src/lib/student-pro-presentation.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { PrototypeStore } from "../src/lib/prototype-store.ts"
const actor = {role:"student" as const,studentId:"pro-demo-1",name:"검증 학생"}
const teacher = {role:"agency" as const,institutionId:"dokdo",name:"검증 선생님"}
const a="review-pro-apply-a", b="review-pro-apply-b", target="review-pro-writing"
const change={type:"change" as const,reviewId:target,previousReviewId:a}
function fixture(count=2) {
  let db=initializePro(emptyReviewDatabase()); db.pro!.clockMode="test"
  if(count===1) db.pro!.members[0].limits["2026-10"]=1
  db=applyManagedReviewCommand(db,{type:"submit",recordId:`${target}-r1`},actor,"submit",db.pro!.clock)
  db=applyProCommand(db,{type:"apply",reviewId:a},actor,"apply-a")
  if(count===2) db=applyProCommand(db,{type:"apply",reviewId:b},actor,"apply-b")
  db.pro!.clock="2026-10-08T01:01:00.000Z"
  return db
}
test("1개·여러 개 변경 후보와 권수, 작성글 보존 및 취소·선정 이력",()=>{
  for(const count of [1,2]){
    const db=fixture(count),view=studentProView(db,actor.studentId)!
    assert.equal(proChangeCandidates(db,target).length,count)
    assert.equal(proBookPresentation(view,target)?.action,"change")
    const next=applyProCommand(db,change,actor,"change-request")
    const after=studentProView(next,actor.studentId)!
    for(const key of ["used","available","rolloverAvailable","pending"] as const) assert.equal(after.usage[key],view.usage[key],key)
    assert.equal(next.pro!.cases.find(c=>c.reviewId===a)!.selectedAt,undefined)
    assert.equal(next.pro!.cases.find(c=>c.reviewId===target)!.selection,"student")
    assert.deepEqual(next.records,db.records)
    assert.ok(next.pro!.audit.some(h=>h.id==="change-request:cancel"&&h.reviewId===a))
    assert.ok(next.pro!.audit.some(h=>h.kind==="대상 선정"&&h.reviewId===target))
    assert.deepEqual(applyProCommand(next,change,actor,"change-request"),next)
    assert.equal(proSnapshotAt(next,"2026-10-08T01:00:30.000Z").pro!.cases.find(c=>c.reviewId===a)!.selection,"student")
    assert.equal(proSnapshotAt(next,next.pro!.clock).pro!.cases.find(c=>c.reviewId===target)!.selection,"student")
  }
})
test("선생님 작성 시작·마감·대상 상태 변경·다른 학생은 기존 신청을 보존",()=>{
  for(const reason of ["locked","cutoff","selected","draft","foreign","automatic","teacher","ended","unassigned"]){
    let db=fixture()
    if(reason==="locked") db=applyManagedReviewCommand(db,{type:"save-feedback",recordId:`${a}-r1`,feedback:"생각을 잘 표현했어요. 다음에도 읽어 보세요.",items:[],decision:"complete"},teacher,"lock",db.pro!.clock)
    if(reason==="cutoff") db.pro!.clock=db.pro!.cases.find(c=>c.reviewId===a)!.cutoff
    if(reason==="selected") db.pro!.cases.find(c=>c.reviewId===target)!.selectedAt=db.pro!.clock
    if(reason==="draft") db.records.find(r=>r.id===`${target}-r1`)!.writingStatus="writing"
    if(reason==="automatic") db.pro!.cases.find(c=>c.reviewId===a)!.selection="auto"
    if(reason==="teacher") db.pro!.cases.find(c=>c.reviewId===a)!.selection="teacher"
    if(reason==="ended") db.pro!.members[0].status="ended"
    if(reason==="unassigned") db.pro!.members[0].assignedAt=undefined
    const before=structuredClone(db)
    assert.throws(()=>applyProCommand(db,reason==="foreign"?{...change,previousReviewId:"review-pro-rollover"}:change,actor,`fail-${reason}`),reason)
    assert.deepEqual(db,before,reason)
  }
})
test("잔여 권수가 있으면 신청만, 직접 신청한 취소 가능 글만 변경 후보",()=>{
  const db=fixture();db.pro!.cases.find(c=>c.reviewId===a)!.selectedAt=undefined
  assert.equal(proChangeCandidates(db,target).length,0)
  assert.equal(proBookPresentation(studentProView(db,actor.studentId)!,target)?.action,"apply")
})
test("선정 요약 우선순위·추가 신청 문구·2차 D-day 날짜 계산",()=>{
  const db=fixture(),view=studentProView(db,actor.studentId)!
  assert.equal(proSummaryText(view),"이번 주 피드백 받을 독후감이 정해졌어요.")
  assert.equal(proSummaryRemainingText(view),"이번 주 남은 신청 권수 0권")
  view.usage.available=1
  assert.equal(proSummaryRemainingText(view),"1권 더 신청할 수 있어요.")
  assert.equal(proSecondDeadlineDay("2026-10-31T14:59:00.000Z","2026-10-08T01:00:00.000Z"),"D-23")
  assert.equal(proSecondDeadlineDay("2026-10-31T14:59:00.000Z","2026-10-31T01:00:00.000Z"),"D-day")
})
test("저장 실패는 기존 신청 보존, CAS 경합에서 동일 신청 중복 변경 방지",async()=>{
  let raw=JSON.stringify(fixture()), fail=false
  const sql=async(query:string,parameters:unknown[])=>{
    if(query.startsWith("SELECT")) return [{digest:"fresh",payload:raw}]
    if(fail) throw new Error("simulated storage failure")
    const {createHash}=await import("node:crypto")
    if(parameters[1]!==createHash("sha256").update(raw).digest("hex")) return []
    raw=String(parameters[2]);return [{key:parameters[0]}]
  }
  const options={env:{DOKDO_STATE_PROVIDER:"neon",DATABASE_URL:"postgres://test:test@local.neon.tech/test"},sql}
  fail=true;const before=raw
  await assert.rejects(new PrototypeStore(options).update("reviews",fixture,db=>applyProCommand(db,change,actor,"fail-store")))
  assert.equal(raw,before)
  fail=false
  const result=await Promise.allSettled(["race-1","race-2"].map(id=>new PrototypeStore(options).update("reviews",fixture,db=>applyProCommand(db,change,actor,id))))
  assert.equal(result.filter(r=>r.status==="fulfilled").length,1)
  assert.equal(result.filter(r=>r.status==="rejected").length,1)
  const saved=JSON.parse(raw).value
  assert.equal(saved.pro.cases.filter((c:{reviewId:string;selectedAt?:string})=>c.selectedAt&&[a,b,target].includes(c.reviewId)).length,2)
})
