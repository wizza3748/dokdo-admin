import { NextResponse } from "next/server"
import { prototypeStore } from "@/lib/prototype-store"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"
import { type ReviewDatabase } from "@/lib/review-domain"
import { type ProCommand } from "@/lib/pro-types"
import { applyProCommand } from "@/lib/pro-domain"
import { updateReviewState, reviewActor, visibleReviewState } from "@/lib/review-server"
export const runtime = "nodejs"
export async function POST(request: Request) {
  try {
    const { command, requestId } = await request.json() as { command: ProCommand; requestId: string }
    if (!requestId || !command?.type) throw new Error("잘못된 요청입니다.")
    let serverNow = ""
    const db = await prototypeStore.update<ReviewDatabase>("online-reviews", getDefaultReviewDatabase, state => {
      serverNow = new Date().toISOString()
      return updateReviewState(state, serverNow, current => applyProCommand(current, command, reviewActor(request, current), requestId, serverNow))
    })
    return NextResponse.json(visibleReviewState(db, reviewActor(request, db), undefined, serverNow), { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "프로 관리 처리 실패" }, { status: 400 }) }
}
