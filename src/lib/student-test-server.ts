import { NextResponse } from "next/server"
import { emptyStudentTests, getStudentTest, runStudentTest, currentStudentTest, studentTestStore } from "./student-test-store"
import { visibleReviewState } from "./review-server"
import { testStudent } from "./student-test-scenarios"
import type { ReviewCommand } from "./review-domain"
import type { ProCommand } from "./pro-types"

export function localStudentTestsAvailable(request: Request) {
  return process.env.VERCEL !== "1" && process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
}
export function assertLocalStudentTest(request: Request) {
  const url = new URL(request.url)
  if (!localStudentTestsAvailable(request)) throw new Error("전용 학생 예시는 로컬 개발 환경에서만 사용할 수 있습니다.")
  const origin = request.headers.get("origin")
  if (origin && origin !== url.origin) throw new Error("같은 로컬 화면에서만 테스트할 수 있습니다.")
}
export async function studentTestReviewResponse(request: Request, kind: "review" | "pro") {
  try {
    assertLocalStudentTest(request)
    const params = new URL(request.url).searchParams, token = params.get("studentTest") || ""
    const now = new Date().toISOString()
    const payload = request.method === "POST" ? await request.json() as { command: ReviewCommand | ProCommand; requestId: string } : undefined
    if (payload && (!payload.command?.type || typeof payload.requestId !== "string" || !payload.requestId)) throw new Error("잘못된 요청입니다.")
    const state = payload ? await studentTestStore.update("sessions", emptyStudentTests, state => {
      getStudentTest(state, token)
      return { ...state, sessions: state.sessions.map(s => s.token === token ? runStudentTest(s, kind, payload.command, payload.requestId, now) : s) }
    }) : await studentTestStore.read("sessions", emptyStudentTests)
    const db = currentStudentTest(getStudentTest(state, token), now)
    return NextResponse.json(visibleReviewState(db, testStudent(db), params.get("recordId"), now), { headers: { "Cache-Control": "no-store" } })
  } catch (e) { return NextResponse.json({ message: e instanceof Error ? e.message : "전용 예시 처리 실패" }, { status: 400 }) }
}
