import { NextResponse } from "next/server"
import { emptyStudentTests, getStudentTest, runStudentTest, currentStudentTest } from "./student-test-store"
import { requireStudentTestWorkspace, studentTestResponseHeaders, studentTestWorkspaceStore } from "./student-test-workspace"
import { visibleReviewState } from "./review-server"
import { runAgencyStudentTest, studentTestRequestActor } from "./student-test-agency"
import type { ReviewCommand } from "./review-domain"
import type { ProCommand } from "./pro-types"
import { bindCloudFeedbackSchedule, createCloudFeedbackScheduler } from "./feedback-schedule-cloud"

export async function studentTestReviewResponse(request: Request, kind: "review" | "pro") {
  try {
    const workspace = requireStudentTestWorkspace(request)
    const params = new URL(request.url).searchParams, token = params.get("studentTest") || ""
    const role = params.get("role")
    let now = new Date().toISOString()
    const payload = request.method === "POST" ? await request.json() as { command: ReviewCommand | ProCommand; requestId: string } : undefined
    if (payload && (!payload.command?.type || typeof payload.requestId !== "string" || !payload.requestId)) throw new Error("잘못된 요청입니다.")
    const scheduleCommand = kind === "review" && payload?.command.type === "schedule-feedback" ? payload.command : undefined
    let prepared: Awaited<ReturnType<ReturnType<typeof createCloudFeedbackScheduler>["prepare"]>>
    if (scheduleCommand && payload) {
      const scheduler = createCloudFeedbackScheduler()
      if (scheduler.enabled) {
        const snapshot = await studentTestWorkspaceStore.read(workspace.key, emptyStudentTests)
        const session = getStudentTest(snapshot, token)
        studentTestRequestActor(session, role)
        const proposed = (role === "agency" ? runAgencyStudentTest : runStudentTest)(session, kind, scheduleCommand, payload.requestId, now)
        prepared = await scheduler.prepare(proposed.db, { kind: "workspace", key: workspace.key, token }, scheduleCommand.recordId, payload.requestId)
      }
    }
    const state = payload ? await studentTestWorkspaceStore.update(workspace.key, emptyStudentTests, state => {
      now = new Date().toISOString()
      const session = getStudentTest(state, token)
      studentTestRequestActor(session, role)
      return { ...state, sessions: state.sessions.map(s => {
        if (s.token !== token) return s
        const next = (role === "agency" ? runAgencyStudentTest : runStudentTest)(s, kind, payload.command, payload.requestId, now)
        return scheduleCommand ? { ...next, db: bindCloudFeedbackSchedule(next.db, scheduleCommand.recordId, payload.requestId, prepared) } : next
      }) }
    }) : await studentTestWorkspaceStore.read(workspace.key, emptyStudentTests)
    const session = getStudentTest(state, token)
    const actor = studentTestRequestActor(session, role)
    const db = currentStudentTest(session, now)
    return NextResponse.json(visibleReviewState(db, actor, params.get("recordId"), now), { headers: studentTestResponseHeaders })
  } catch (e) { return NextResponse.json({ message: e instanceof Error ? e.message : "전용 예시 처리 실패" }, { status: 400, headers: studentTestResponseHeaders }) }
}
