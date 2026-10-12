import { NextResponse } from "next/server"
import { type ReviewCommand, type ReviewDatabase } from "@/lib/review-domain"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"
import { prototypeStore } from "@/lib/prototype-store"
import { applyManagedReviewCommand } from "@/lib/pro-domain"
import { updateReviewState, reviewActor, visibleReviewState } from "@/lib/review-server"
export const runtime = "nodejs"
export async function GET(request: Request) {
  try {
    let serverNow = ""
    const db = await prototypeStore.update<ReviewDatabase>("online-reviews", getDefaultReviewDatabase, state => {
      serverNow = new Date().toISOString()
      return updateReviewState(state, serverNow)
    })
    return NextResponse.json(visibleReviewState(db, reviewActor(request, db), new URL(request.url).searchParams.get("recordId"), serverNow), { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "조회에 실패했습니다." }, { status: 503 }) }
}
export async function POST(request: Request) {
  try {
    const payload = await request.json() as { command: ReviewCommand; requestId: string }
    if (!payload.requestId || !payload.command?.type) throw new Error("잘못된 요청입니다.")
    let serverNow = ""
    const db = await prototypeStore.update<ReviewDatabase>("online-reviews", getDefaultReviewDatabase, state => {
      serverNow = new Date().toISOString()
      return updateReviewState(state, serverNow, current => {
        const actor = reviewActor(request, current)
        const member = current.pro?.members.find(m => m.id === actor.studentId)
        const command = payload.command.type === "create" && member ? { ...payload.command, common: { ...payload.command.common, id: payload.command.common.id + "-" + member.id, studentId: member.id, studentName: member.name, institutionId: member.institutionId ?? "unassigned", institution: "독도학원", classId: "external" } } : payload.command
        return applyManagedReviewCommand(current, command, actor, payload.requestId, serverNow)
      })
    })
    return NextResponse.json(visibleReviewState(db, reviewActor(request, db), undefined, serverNow), { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "처리에 실패했습니다." }, { status: 400 }) }
}
export async function DELETE() {
  await prototypeStore.update("online-reviews", getDefaultReviewDatabase, () => getDefaultReviewDatabase())
  return NextResponse.json({ ok: true })
}
