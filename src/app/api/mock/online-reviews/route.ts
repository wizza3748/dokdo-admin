import { NextResponse } from "next/server"
import { type ReviewCommand, type ReviewDatabase } from "@/lib/review-domain"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"
import { prototypeStore } from "@/lib/prototype-store"
import { applyManagedReviewCommand } from "@/lib/pro-domain"
import { updateReviewState, reviewActor, visibleReviewState } from "@/lib/review-server"
import { assertSharedReviewRequest } from "@/lib/review-request-scope"
import { bindCloudFeedbackSchedule, createCloudFeedbackScheduler } from "@/lib/feedback-schedule-cloud"
import { ensureProductionScheduleExamples } from "@/lib/review-schedule-example-server"
import { withSharedWorkbookDisplayNumbers } from "@/lib/workbook-display-number-server"
import { AGENCY_ONLINE_WORKBOOKS, normalizeStudentSubmittedRecord, type OnlineWorkbook } from "@/lib/online-workbooks"
export const runtime = "nodejs"
export async function GET(request: Request) {
  // Public results require an authenticated encrypted share token, not a guessed record ID.
  if (new URL(request.url).searchParams.get("role") === "external") return NextResponse.json({version:1,reviews:[],records:[]},{status:403,headers:{"Cache-Control":"no-store"}})
  try {
    assertSharedReviewRequest(request)
    try { await ensureProductionScheduleExamples() }
    catch { console.warn("[feedback-schedule] shared-example-registration-pending") } // Existing data remains readable during a queue outage.
    let serverNow = ""
    const db = await prototypeStore.update<ReviewDatabase>("online-reviews", getDefaultReviewDatabase, state => {
      serverNow = new Date().toISOString()
      return updateReviewState(state, serverNow)
    })
    const actor = reviewActor(request, db)
    let visible = visibleReviewState(db, actor, new URL(request.url).searchParams.get("recordId"), serverNow)
    if (["agency", "class", "admin"].includes(actor.role)) {
      const submissions = await prototypeStore.read<OnlineWorkbook[]>("student-workbook-submissions", () => [])
      const reserved = [...AGENCY_ONLINE_WORKBOOKS.map(row => row.id), ...submissions.map(row => normalizeStudentSubmittedRecord(row).id)]
      visible = await withSharedWorkbookDisplayNumbers(db, visible, reserved)
    }
    return NextResponse.json(visible, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "조회에 실패했습니다." }, { status: 503 }) }
}
export async function POST(request: Request) {
  try {
    assertSharedReviewRequest(request)
    const payload = await request.json() as { command: ReviewCommand; requestId: string }
    if (!payload.requestId || !payload.command?.type) throw new Error("잘못된 요청입니다.")
    const scheduleCommand = payload.command.type === "schedule-feedback" ? payload.command : undefined
    let prepared: Awaited<ReturnType<ReturnType<typeof createCloudFeedbackScheduler>["prepare"]>>
    if (scheduleCommand) {
      const scheduler = createCloudFeedbackScheduler()
      if (scheduler.enabled) {
        const snapshot = await prototypeStore.read("online-reviews", getDefaultReviewDatabase)
        const at = new Date().toISOString()
        const proposed = updateReviewState(snapshot, at, current => applyManagedReviewCommand(current, scheduleCommand, reviewActor(request, current), payload.requestId, at))
        prepared = await scheduler.prepare(proposed, { kind: "shared" }, scheduleCommand.recordId, payload.requestId)
      }
    }
    let serverNow = ""
    const db = await prototypeStore.update<ReviewDatabase>("online-reviews", getDefaultReviewDatabase, state => {
      serverNow = new Date().toISOString()
      return updateReviewState(state, serverNow, current => {
        const actor = reviewActor(request, current)
        const member = current.pro?.members.find(m => m.id === actor.studentId)
        const command = payload.command.type === "create" && member ? { ...payload.command, common: { ...payload.command.common, id: payload.command.common.id + "-" + member.id, studentId: member.id, studentName: member.name, institutionId: member.institutionId ?? "unassigned", institution: "독도학원", classId: "external" } } : payload.command
        const next = applyManagedReviewCommand(current, command, actor, payload.requestId, serverNow)
        return scheduleCommand ? bindCloudFeedbackSchedule(next, scheduleCommand.recordId, payload.requestId, prepared) : next
      })
    })
    return NextResponse.json(visibleReviewState(db, reviewActor(request, db), undefined, serverNow), { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "처리에 실패했습니다." }, { status: 400 }) }
}
export async function DELETE() {
  await prototypeStore.update("online-reviews", getDefaultReviewDatabase, () => getDefaultReviewDatabase())
  return NextResponse.json({ ok: true })
}
