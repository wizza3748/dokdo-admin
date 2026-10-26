import { NextResponse } from "next/server"
import { prototypeStore } from "@/lib/prototype-store"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"
import type { ReviewDatabase } from "@/lib/review-domain"
import { initializePro } from "@/lib/pro-seeds"
import { resetTodayProDemo } from "@/lib/pro-today-demo"
import { isProDemoResetRequest } from "@/lib/pro-demo-reset"
import { resetLocalFeedbackScheduleExamples } from "@/lib/review-schedule-seeds"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isProDemoResetRequest(request)) {
    return NextResponse.json({ message: "기관관리자 검증 도구에서만 예시를 초기화할 수 있습니다." }, { status: 403 })
  }
  try {
    const { requestId, confirmed } = await request.json() as { requestId?: string; confirmed?: boolean }
    if (confirmed !== true) return NextResponse.json({ message: "예시 데이터 초기화를 확인해 주세요." }, { status: 400 })
    if (!requestId || !/^[a-zA-Z0-9-]{1,80}$/.test(requestId)) throw new Error("잘못된 초기화 요청입니다.")
    await prototypeStore.update<ReviewDatabase>("online-reviews", getDefaultReviewDatabase, state => {
      const id = `today-demo:reset:${requestId}`
      if (state.pro?.audit.some(a => a.id === id)) return state
      const now = new Date().toISOString()
      const next = resetLocalFeedbackScheduleExamples(resetTodayProDemo(initializePro(state), now), now, process.env)
      next.pro!.audit = next.pro!.audit.filter(a => a.kind !== "로컬 예시 초기화" && a.kind !== "예시 초기화")
      next.pro!.audit.push({ id, studentId: "", kind: "예시 초기화", at: now, actor: "프로토타입" })
      return next
    })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ message: "예시 데이터를 초기화하지 못했습니다. 다시 시도해 주세요." }, { status: 500 })
  }
}
