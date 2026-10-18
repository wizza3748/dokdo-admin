import {test} from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node test runner loads TS sources directly.
import {createReviewShareSecrets,encryptReviewShare,decryptReviewShare} from "../src/lib/review-share-token.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import {sharedReviewState} from "../src/lib/review-share-projection.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import {initializePro} from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import {emptyReviewDatabase} from "../src/lib/review-domain.ts"

test("공유 키는 결과 ID를 노출하지 않고 변조·다른 키·원시 ID를 거부", () => {
  const key=createReviewShareSecrets().key, id="review-pro-apply-a-r1"
  const token=encryptReviewShare(id,key)
  assert.ok(!token.includes(id)); assert.equal(decryptReviewShare(token,key),id)
  assert.equal(decryptReviewShare(token,createReviewShareSecrets().key),null)
  assert.equal(decryptReviewShare(token.slice(0,20)+(token[20]==="A"?"B":"A")+token.slice(21),key),null)
  assert.equal(decryptReviewShare(id,key),null)
})
test("공유 결과는 제출 글만 포함하고 미전송 피드백·초안·개인 관리 정보 제외", () => {
  const db=initializePro(emptyReviewDatabase())
  const record=db.records.find(r=>r.id==="review-pro-apply-a-r1")!
  record.feedback="절대 미공개인 피드백"
  record.reportFeedback="미공개 보고서 총평"
  record.feedbackStatus="작성완료"
  record.aiHistory.push({requestId:"secret-run",at:db.pro!.clock,status:"success",actor:"내부 담당자"})
  record.history.push({action:"save-feedback",at:db.pro!.clock,actor:"내부 담당자",requestId:"internal-history"})
  db.records.push({...record,id:"draft-second",round:2,writingStatus:"writing",body:"비공개 초안",finalBody:"비공개 초안"})
  const view=sharedReviewState(db,record.id), json=JSON.stringify(view)
  assert.equal(view.records.length,1)
  for(const privateText of ["절대 미공개","미공개 보고서","secret-run","내부 담당자","비공개 초안"]) assert.ok(!json.includes(privateText))
  assert.equal(view.pro,undefined); assert.equal(view.records[0].parentContact,false)
  assert.equal(view.reviews[0].institutionId,"")
  assert.equal(sharedReviewState(db,"draft-second").records.length,0)
  const original=JSON.stringify(db)
  sharedReviewState(db,record.id)
  assert.equal(JSON.stringify(db),original)
})
