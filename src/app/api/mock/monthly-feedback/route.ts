import { NextResponse } from "next/server"
import { adminWeeklyAllowed } from "@/lib/admin-operator"
import { prototypeStore } from "@/lib/prototype-store"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"
import { updateReviewState, visibleReviewState } from "@/lib/review-server"
import type { ReviewDatabase } from "@/lib/review-domain"
export const runtime = "nodejs"
export async function GET() {
  const headers={"Cache-Control":"no-store"}
  if(!adminWeeklyAllowed())return NextResponse.json({message:"조회 권한이 없습니다."},{status:403,headers})
  try {
    const now=new Date().toISOString()
    const db=await prototypeStore.update<ReviewDatabase>("online-reviews",getDefaultReviewDatabase,state=>updateReviewState(state,now))
    return NextResponse.json(visibleReviewState(db,{role:"admin",name:"본사관리자"},undefined,now),{headers})
  } catch { return NextResponse.json({message:"월간 피드백 현황을 불러오지 못했습니다."},{status:503,headers}) }
}
