import { NextResponse } from "next/server"
import { studentTestWorkspace, studentTestWorkspaceStore, studentTestResponseHeaders } from "@/lib/student-test-workspace"
import { prototypeStore } from "@/lib/prototype-store"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"
import { initializePro } from "@/lib/pro-seeds"
import { reviewActor, visibleReviewState } from "@/lib/review-server"
import { reconcileMonthly } from "@/lib/pro-monthly"
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
    const body=request.method==="POST"?await request.json():undefined
    const workspace=studentTestWorkspace(request,body?.action==="prepare")
    if(!workspace)throw new Error("검증 도구에서 월간 피드백 예시를 먼저 열어 주세요.")
    if(params.get("role")==="admin"&&!adminWeeklyAllowed())return NextResponse.json({message:"조회 권한이 없습니다."},{status:403})
    const key=`monthly-${workspace.key}-${scenario}`
    let fixture:Fixture|null
    if(body?.action==="prepare"||body?.action==="reset"){
      const original=await prototypeStore.read("online-reviews",getDefaultReviewDatabase)
      fixture=await studentTestWorkspaceStore.update<Fixture|null>(key,()=>null,old=>old&&body.action!=="reset"?old:{db:buildMonthlyValidation(initializePro(original),scenario),createdAt:new Date().toISOString()})
    }else{
      fixture=await studentTestWorkspaceStore.update<Fixture|null>(key,()=>null,old=>{
        if(!old)throw new Error("검증 도구에서 월간 피드백 예시를 먼저 열어 주세요.")
        let db=reconcileMonthly(structuredClone(old.db),old.db.pro!.clock)
        if(body){
          if(!body.requestId||!body.command?.type)throw new Error("잘못된 요청입니다.")
          const actor=reviewActor(request,db)
          if(actor.role!=="agency")throw new Error("본사관리자는 조회만 가능합니다.")
          const type=body.command.type as string
          if(type.startsWith("monthly-")||["clock","clock-real","retry-parent","management-memo","limit","cancel-debit"].includes(type)) db=applyProCommand(db,body.command as ProCommand,actor,body.requestId,db.pro!.clock)
          else db=applyManagedReviewCommand(db,body.command as ReviewCommand,actor,body.requestId,db.pro!.clock)
        }
        return {...old,db}
      })
    }
    if(!fixture)throw new Error("검증 예시를 찾을 수 없습니다.")
    const result=NextResponse.json(visibleReviewState(fixture.db,reviewActor(request,fixture.db),undefined,fixture.db.pro!.clock),{headers:studentTestResponseHeaders})
    if(workspace.cookie)result.cookies.set(workspace.cookie.name,workspace.cookie.value,workspace.cookie)
    return result
  }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"검증 예시 처리 실패"},{status:400,headers:studentTestResponseHeaders})}
}
export const GET=response
export const POST=response
