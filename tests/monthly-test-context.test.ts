import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Native TS test loader.
import { monthlyContextHref, monthlyValidationCases } from "../src/lib/monthly-test-context.ts"
// @ts-expect-error Native TS test loader.
import { monthlyLiveState, preserveSharedClock } from "../src/lib/monthly-live-context.ts"
// @ts-expect-error Native TS test loader.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Native TS test loader.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Native TS test loader.
import { buildMonthlyValidation } from "../src/lib/pro-monthly-fixtures.ts"
// @ts-expect-error Native TS test loader.
import { academyStyle, monthlyTasks } from "../src/lib/pro-monthly.ts"
const base="http://localhost:3000"
const parse=(href:string)=>new URL(href,base)
test("본사 예시 선택은 본사 경로 유지, 각 예시의 월로 초기 조회하며 오래된 조건 제거",()=>{
  const href=`${base}/admin/b2c/monthly-feedback?month=2026-10&status=late`
  for(const id of Object.keys(monthlyValidationCases) as (keyof typeof monthlyValidationCases)[]){
    const c=monthlyValidationCases[id]
    const url=parse(monthlyContextHref(href,href,{select:id}))
    assert.equal(url.pathname,"/admin/b2c/monthly-feedback")
    assert.equal(url.searchParams.get("month"),c.month)
    assert.equal(url.searchParams.get("monthlyTest"),id)
    assert.equal(url.searchParams.has("status"),false)
  }
})
test("기관 11월 30일은 12월 귀속 주차, 본사와 학생 상세는 11월 조회",()=>{
  const url=`${base}/agency/pro-management?monthlyTest=overdue`
  const week=parse(monthlyContextHref(url,url,{select:"overdue"}))
  assert.equal(week.searchParams.get("week"),"2026-11-29T15:00:00.000Z")
  for(const path of ["/admin/b2c/monthly-feedback","/agency/pro-management/students/pro-demo-1"]){assert.equal(parse(monthlyContextHref(path,url)).searchParams.get("month"),"2026-11")}
  const db=buildMonthlyValidation(initializePro(emptyReviewDatabase()),"overdue")
  assert.ok(monthlyTasks(db.pro!,"pro-demo-1",db.pro!.clock).late.some(r=>r.month==="2026-11"))
})
test("메뉴·기존 탭의 이전 검증 예시를 현재 예시로 교체하되 같은 예시의 수동 조회 월은 유지",()=>{
  const current=`${base}/agency/pro-management?monthlyTest=overdue&demoAgency=other-agency`
  const old=parse(monthlyContextHref("/admin/b2c/monthly-feedback?monthlyTest=december&month=2026-12",current))
  assert.equal(old.searchParams.get("monthlyTest"),"overdue");assert.equal(old.searchParams.get("month"),"2026-11")
  assert.equal(old.searchParams.get("demoAgency"),"other-agency")
  const same=parse(monthlyContextHref("/admin/b2c/monthly-feedback?monthlyTest=overdue&month=2026-10",current))
  assert.equal(same.searchParams.get("month"),"2026-10")
  assert.equal(monthlyContextHref("https://example.com/foo",current),"https://example.com/foo")
  assert.equal(monthlyContextHref("/student",current),"/student")
})
test("공용 복귀는 예시·이전 월·복귀 URL을 지우고 실제 날짜 조회를 지정",()=>{
  const current=`${base}/agency/pro-management/students/pro-demo-1?monthlyTest=overdue&month=2026-11&returnTo=%2Fagency%2Fpro-management%3FmonthlyTest%3Doverdue#monthly-feedback`
  const url=parse(monthlyContextHref(current,current,{select:null}))
  assert.equal(url.pathname,"/agency/pro-management/students/pro-demo-1")
  for(const key of ["monthlyTest","month","returnTo"])assert.equal(url.searchParams.has(key),false)
  assert.equal(url.searchParams.get("monthlyLive"),"1")
  assert.equal(parse(monthlyContextHref("/admin/b2c/monthly-feedback?monthlyTest=overdue",url.href)).searchParams.has("monthlyTest"),false)
})
test("실제 날짜 조회는 공용 날짜 검증 시각·저장값·복원 기준을 변경하지 않음",()=>{
  const original=buildMonthlyValidation(initializePro(emptyReviewDatabase()),"overdue"),before=structuredClone(original)
  const request=new Request(`${base}/api/mock/pro-management?role=agency&monthlyLive=1`)
  const projected=monthlyLiveState(original,request)
  assert.equal(projected.pro!.clockMode,"real");assert.deepEqual(original,before)
  const next=structuredClone(projected);next.pro!.clock="2026-11-17T00:00:00.000Z"
  assert.deepEqual(preserveSharedClock(original,next,request),before)
  assert.equal(monthlyLiveState(original,new Request(`${base}/api/mock/pro-management?role=student&monthlyLive=1`)),original)
})
test("학원 말투 예시는 사용 여부·발송본 수와 연결된 이력을 가지며 원본 보존",()=>{
  const source=initializePro(emptyReviewDatabase()),before=structuredClone(source)
  for(const id of ["november","overdue","december"] as const){
    const db=buildMonthlyValidation(source,id),style=academyStyle(db.pro!,"dokdo")
    assert.equal(db.pro!.clock,monthlyValidationCases[id].at)
    assert.equal(style.sentIds.length,id==="overdue"?1:2)
    assert.equal(style.enabled,id!=="december")
    assert.ok(style.items.length);assert.ok(style.history.length)
    assert.equal(db.pro!.monthly!.records.filter(r=>r.sent?.institutionId==="dokdo").length,style.sentIds.length)
  }
  assert.deepEqual(source,before)
})
