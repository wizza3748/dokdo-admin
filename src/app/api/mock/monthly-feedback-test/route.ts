import { NextResponse } from "next/server"
import { studentTestWorkspace, studentTestWorkspaceStore, studentTestResponseHeaders } from "@/lib/student-test-workspace"
import { prototypeStore } from "@/lib/prototype-store"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"
import { initializePro } from "@/lib/pro-seeds"
import { refreshProDemoLabels } from "@/lib/pro-demo-labels"
import { reviewActor, visibleReviewState } from "@/lib/review-server"
import { reconcileMonthly } from "@/lib/pro-monthly"
import { monthlyRegularAt } from "@/lib/pro-monthly"
import { monthlyDetailCase, monthlyDetailCases } from "@/lib/monthly-test-context"
import { buildMonthlyValidation, monthlyValidationCases, type MonthlyValidationCase } from "@/lib/pro-monthly-fixtures"
import { applyProCommand, applyManagedReviewCommand } from "@/lib/pro-domain"
import { adminWeeklyAllowed } from "@/lib/admin-operator"
import type { ReviewDatabase, ReviewCommand } from "@/lib/review-domain"
import type { ProCommand } from "@/lib/pro-types"
export const runtime="nodejs"
type Fixture={db:ReviewDatabase;createdAt:string}
async function response(request:Request){
  try{
    const params=new URL(request.url).searchParams,scenario=params.get("monthlyTest") as MonthlyValidationCase
    if(!Object.hasOwn(monthlyValidationCases,scenario))throw new Error("월간 피드백 검증 예시를 확인해 주세요.")
    if(params.has("monthlyCase")&&!Object.hasOwn(monthlyDetailCases,params.get("monthlyCase")!))throw new Error("세부 확인 항목을 확인해 주세요.")
    const detail=monthlyDetailCase(params.get("monthlyCase"))
    const body=request.method==="POST"?await request.json():undefined
    const workspace=studentTestWorkspace(request,body?.action==="prepare")
    if(!workspace)throw new Error("검증 도구에서 월간 피드백 예시를 먼저 열어 주세요.")
    if(params.get("role")==="admin"&&!adminWeeklyAllowed())return NextResponse.json({message:"조회 권한이 없습니다."},{status:403})
    const key=`monthly-${workspace.key}-${scenario}${detail==="base"?"":`-${detail}`}`
    let failureMessage=""
    let fixture:Fixture|null
    if(body?.action==="prepare"||body?.action==="reset"){
      const original=await prototypeStore.read("online-reviews",getDefaultReviewDatabase)
      fixture=await studentTestWorkspaceStore.update<Fixture|null>(key,()=>null,old=>old&&body.action!=="reset"?{...old,db:refreshProDemoLabels(old.db,{studentNamesOnly:true})}:{db:buildMonthlyValidation(initializePro(original),scenario,detail),createdAt:new Date().toISOString()})
    }else{
      fixture=await studentTestWorkspaceStore.update<Fixture|null>(key,()=>null,old=>{
        if(!old)throw new Error("검증 도구에서 월간 피드백 예시를 먼저 열어 주세요.")
        let db=reconcileMonthly(refreshProDemoLabels(structuredClone(old.db),{studentNamesOnly:true}),old.db.pro!.clock)
        if(body?.action==="advance-regular"&&detail==="timing") {
          const boundary=scenario==="december"?monthlyRegularAt("2026-12"):"2026-11-25T00:00:00.000Z"
          db.pro!.clock=boundary;reconcileMonthly(db,boundary);return {...old,db}
        }
        if(body?.action==="arm-failure"&&detail==="failures") {
          const r=db.pro!.monthly!.records.find(r=>r.id===body.recordId&&!r.sent)
          if(!r||!["monthly-save","monthly-copy","monthly-send","generation","style"].includes(body.fault))throw new Error("실패 확인 대상과 처리를 선택해 주세요.")
          if(body.fault==="generation")r.simulateGenerationFailureOnce=true
          else if(body.fault==="style")r.simulateStyleFailureOnce=true
          else db.pro!.monthly!.validation!.fault={recordId:r.id,type:body.fault}
          return {...old,db}
        }
        if(body){
          if(!body.requestId||!body.command?.type)throw new Error("잘못된 요청입니다.")
          const actor=reviewActor(request,db)
          if(actor.role!=="agency")throw new Error("본사관리자는 조회만 가능합니다.")
          const type=body.command.type as string
          const fault=db.pro!.monthly?.validation?.fault
          if(fault?.type===type&&fault.recordId===body.command.id) {
            delete db.pro!.monthly!.validation!.fault
            failureMessage=type==="monthly-save"?"변경 내용을 저장하지 못했습니다. 다시 시도해 주세요.":type==="monthly-copy"?"문구를 복사하지 못했습니다. 다시 시도해 주세요.":"발송 기록을 저장하지 못했습니다. 다시 시도해 주세요."
            return {...old,db}
          }
          if(type.startsWith("monthly-")||["clock","clock-real","retry-parent","management-memo","limit","cancel-debit"].includes(type)) db=applyProCommand(db,body.command as ProCommand,actor,body.requestId,db.pro!.clock)
          else db=applyManagedReviewCommand(db,body.command as ReviewCommand,actor,body.requestId,db.pro!.clock)
        }
        return {...old,db}
      })
    }
    if(!fixture)throw new Error("검증 예시를 찾을 수 없습니다.")
    if(failureMessage)return NextResponse.json({message:failureMessage},{status:400,headers:studentTestResponseHeaders})
    const result=NextResponse.json(visibleReviewState(fixture.db,reviewActor(request,fixture.db),undefined,fixture.db.pro!.clock),{headers:studentTestResponseHeaders})
    if(workspace.cookie)result.cookies.set(workspace.cookie.name,workspace.cookie.value,workspace.cookie)
    return result
  }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"검증 예시 처리 실패"},{status:400,headers:studentTestResponseHeaders})}
}
export const GET=response
export const POST=response
