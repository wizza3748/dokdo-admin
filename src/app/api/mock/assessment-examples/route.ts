import { NextResponse } from "next/server"
import { applyReviewCommand, type ReviewCommand } from "@/lib/review-domain"
import { getAssessmentExampleDatabase } from "@/lib/review-seeds"
import { reviewActor, visibleReviewState } from "@/lib/review-server"
import { studentTestResponseHeaders, studentTestWorkspace, studentTestWorkspaceStore } from "@/lib/student-test-workspace"

export const runtime = "nodejs"

async function assessmentExample(request: Request) {
  const params = new URL(request.url).searchParams
  const role = params.get("role")
  const isWrite = request.method === "POST"
  if ((role !== "agency" && role !== "admin") || (isWrite && role !== "agency")) {
    return NextResponse.json({ message: "이 작업을 처리할 권한이 없습니다." }, { status: 403, headers: studentTestResponseHeaders })
  }
  try {
    const workspace = studentTestWorkspace(request, !isWrite, process.env, "assessment-examples")
    if (!workspace) throw new Error("일감보드에서 평가 예시를 열어 주세요.")
    const key = `assessment-${workspace.key}`
    const now = new Date().toISOString()
    let db
    if (isWrite) {
      const { command, requestId } = await request.json() as { command: ReviewCommand; requestId: string }
      if (!command?.type || !requestId) throw new Error("잘못된 요청입니다.")
      db = await studentTestWorkspaceStore.update(key, getAssessmentExampleDatabase, state =>
        applyReviewCommand(state, command, reviewActor(request, state), requestId, now))
    } else {
      db = await studentTestWorkspaceStore.read(key, getAssessmentExampleDatabase)
    }
    const response = NextResponse.json(visibleReviewState(db, reviewActor(request, db), params.get("recordId"), now), { headers: studentTestResponseHeaders })
    if (workspace.cookie) response.cookies.set(workspace.cookie)
    return response
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "평가 예시를 불러오지 못했습니다." }, { status: 400, headers: studentTestResponseHeaders })
  }
}

export const GET = assessmentExample
export const POST = assessmentExample
