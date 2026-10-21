import { NextResponse } from "next/server"
import { assertLocalStudentTest, localStudentTestsAvailable } from "@/lib/student-test-server"
import { controlStudentTest, emptyStudentTests, getStudentTest, prepareStudentTests, resetStudentTest, studentTestRow, studentTestStore } from "@/lib/student-test-store"
import { prototypeStore } from "@/lib/prototype-store"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"
import { visibleReviewState, reviewActor } from "@/lib/review-server"
import { studentFrontTestRows } from "@/lib/pro-demo-navigation"
import { studentTestSummary } from "@/lib/student-test-scenarios"
import { atReviewTime } from "@/lib/review-clock"

export const runtime = "nodejs"
export async function GET(request: Request) {
  try {
    const now = new Date().toISOString(), token = new URL(request.url).searchParams.get("studentTest")
    const local = localStudentTestsAvailable(request)
    if (token) assertLocalStudentTest(request)
    const state = local ? await studentTestStore.read("sessions", emptyStudentTests) : emptyStudentTests()
    if (token) return NextResponse.json(studentTestRow(getStudentTest(state, token), now), { headers: { "Cache-Control": "no-store" } })
    // A test catalog read must not reconcile, seed, reset, or write the shared aggregate.
    const shared = atReviewTime(await prototypeStore.read("online-reviews", getDefaultReviewDatabase), now)
    const scoped = visibleReviewState(shared, reviewActor(new Request(`${new URL(request.url).origin}/?role=agency`), shared), undefined, now)
    const common = scoped.pro ? studentFrontTestRows(scoped.pro).map(row => {
      const member = scoped.pro!.members.find(m => m.id === row.id)
      const summary = member?.product === "pro" ? studentTestSummary({ ...shared, pro: { ...shared.pro!, members: [member] } }, now) : undefined
      return { ...row, current: summary?.summary, books: summary?.books }
    }) : []
    return NextResponse.json({ local, day: state.day, now, rows: state.sessions.filter(s => s.day === state.day).map(s => studentTestRow(s, now)), common }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) { return NextResponse.json({ message: e instanceof Error ? e.message : "조회 실패" }, { status: 400 }) }
}
export async function POST(request: Request) {
  try {
    assertLocalStudentTest(request)
    const now = new Date().toISOString(), { action, token } = await request.json() as { action: string; token?: string }
    const state = await studentTestStore.update("sessions", emptyStudentTests, state => {
      if (action === "prepare") return prepareStudentTests(state, now)
      if (action === "reset" && token) return resetStudentTest(state, token, now)
      if ((action === "teacher-start" || action === "cutoff") && token) {
        getStudentTest(state, token)
        return { ...state, sessions: state.sessions.map(s => s.token === token ? controlStudentTest(s, action, now) : s) }
      }
      throw new Error("잘못된 테스트 요청입니다.")
    })
    return NextResponse.json({ ok: true, day: state.day })
  } catch (e) { return NextResponse.json({ message: e instanceof Error ? e.message : "처리 실패" }, { status: 400 }) }
}
