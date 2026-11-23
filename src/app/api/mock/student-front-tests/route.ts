import { NextResponse } from "next/server"
import { studentTestWorkspace, requireStudentTestWorkspace, studentTestWorkspaceStore, studentTestResponseHeaders } from "@/lib/student-test-workspace"
import { controlStudentTest, emptyStudentTests, openStudentRewriteExample, getStudentTest, prepareStudentTests, resetStudentTest, studentTestRow, legacyStudentTestStore } from "@/lib/student-test-store"
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
    const workspace = token !== null ? requireStudentTestWorkspace(request) : studentTestWorkspace(request)
    const state = workspace ? await studentTestWorkspaceStore.read(workspace.key, emptyStudentTests) : emptyStudentTests()
    if (token !== null) return NextResponse.json(studentTestRow(getStudentTest(state, token), now), { headers: studentTestResponseHeaders })
    // A test catalog read must not reconcile, seed, reset, or write the shared aggregate.
    const shared = atReviewTime(await prototypeStore.read("online-reviews", getDefaultReviewDatabase), now)
    const scoped = visibleReviewState(shared, reviewActor(new Request(`${new URL(request.url).origin}/?role=agency`), shared), undefined, now)
    const common = scoped.pro ? studentFrontTestRows(scoped.pro).map(row => {
      const member = scoped.pro!.members.find(m => m.id === row.id)
      const summary = member?.product === "pro" ? studentTestSummary({ ...shared, pro: { ...shared.pro!, members: [member] } }, now) : undefined
      return { ...row, current: summary?.summary, books: summary?.books }
    }) : []
    return NextResponse.json({ available: true, day: state.day, now, rows: state.sessions.filter(s => !s.boardOnly && s.day === state.day).map(s => studentTestRow(s, now)), common }, { headers: studentTestResponseHeaders })
  } catch (e) { return NextResponse.json({ message: e instanceof Error ? e.message : "조회 실패" }, { status: 400, headers: studentTestResponseHeaders }) }
}
export async function POST(request: Request) {
  try {
    const { action, token, scenario } = await request.json() as { action: string; token?: string; scenario?: string }
    const workspace = action === "prepare" || action === "open-rewrite" ? studentTestWorkspace(request, true)! : requireStudentTestWorkspace(request)
    // Copy pre-isolation LOCAL results only on the first visit; never overwrite or import shared/cloud data.
    const initial = workspace.local && workspace.cookie ? await legacyStudentTestStore.read("sessions", emptyStudentTests) : emptyStudentTests()
    let detailHref: string | undefined
    const state = await studentTestWorkspaceStore.update(workspace.key, () => initial, state => {
      const now = new Date().toISOString()
      if (action === "open-rewrite" && (scenario === "draft" || scenario === "second-draft")) {
        const opened = openStudentRewriteExample(state, scenario, now)
        const href = studentTestRow(opened.session, now).detailHref
        if (!href) throw new Error("고쳐쓰기 예시를 찾을 수 없습니다.")
        detailHref = href + "&studentTestScreen=normal"
        return opened.state
      }
      if (action === "prepare") return prepareStudentTests(state, now)
      if (action === "reset" && token) return resetStudentTest(state, token, now)
      if ((action === "teacher-start" || action === "cutoff") && token) {
        getStudentTest(state, token)
        return { ...state, sessions: state.sessions.map(s => s.token === token ? controlStudentTest(s, action, now) : s) }
      }
      throw new Error("잘못된 테스트 요청입니다.")
    })
    const response = NextResponse.json({ ok: true, day: state.day, detailHref }, { headers: studentTestResponseHeaders })
    if (workspace.cookie) response.cookies.set(workspace.cookie)
    return response
  } catch (e) { return NextResponse.json({ message: e instanceof Error ? e.message : "처리 실패" }, { status: 400, headers: studentTestResponseHeaders }) }
}
