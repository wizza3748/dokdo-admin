import { NextResponse } from "next/server"
import { applyReviewCommand, canAccessReview, expandLegacyReviewScores, upgradeUnscoredMockAssessments, hydrateLegacyReviewFeedback, mergeReviewSeeds, normalizeReviewFeedbackScope, normalizeReviewReportScores, type ReviewActor, type ReviewCommand, type ReviewDatabase } from "@/lib/review-domain"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"
import { prototypeStore } from "@/lib/prototype-store"

export const runtime = "nodejs"
function normalizedState(db: ReviewDatabase) {
  const scoped = normalizeReviewReportScores(normalizeReviewFeedbackScope(db))
  return normalizeReviewReportScores(normalizeReviewFeedbackScope(hydrateLegacyReviewFeedback(upgradeUnscoredMockAssessments(expandLegacyReviewScores(mergeReviewSeeds(scoped, getDefaultReviewDatabase()))))))
}
// Explicit demo identities, not production authentication. Replace at the real auth boundary.
function actorFor(request: Request): ReviewActor {
  const role = new URL(request.url).searchParams.get("role")
  if (role === "admin") return { role: "admin", name: "본사관리자" }
  if (role === "agency" || role === "class") return { role, institutionId: "dokdo", classId: "class-1", name: "담당 선생님" }
  if (role === "external") return { role: "external", name: "외부 조회" }
  return { role: "student", studentId: "26142", name: "진독도" }
}
function visibleState(db: ReviewDatabase, actor: ReviewActor, sharedRecordId?: string | null) {
  // Local prototype sharing: an explicit unguessable record URL grants read-only access.
  // Production must replace this with signed, expiring share credentials.
  const sharedRecord = actor.role === "external" ? db.records.find(r => r.id === sharedRecordId && r.feedbackStatus === "전송완료") : undefined
  const reviews = db.reviews.filter(r => canAccessReview(r, actor) || r.id === sharedRecord?.reviewId)
  const records = db.records.filter(r => reviews.some(common => common.id === r.reviewId) && (actor.role !== "external" || (r.feedbackStatus === "전송완료" && r.round <= sharedRecord!.round))).map(record => {
    if (actor.role !== "student" && actor.role !== "external") return record
    // Unsent drafts/evaluations never reach student clients.
    if (record.feedbackStatus !== "전송완료") return { ...record, feedback: "", reportFeedback: "", itemFeedback: [], aiDraft: undefined, aiScores: undefined, legacyAiScores: undefined, teacherScores: undefined, report: undefined, aiHistory: [] }
    return { ...record, legacyAiScores: undefined, aiDraft: undefined, aiHistory: [], history: [], parentContact: false, itemFeedback: record.itemFeedback.filter(i => i.visible) }
  })
  return { version: 1, reviews, records }
}
export async function GET(request: Request) {
  try {
    const db = await prototypeStore.update<ReviewDatabase>("online-reviews", getDefaultReviewDatabase, state => {
      const scoped = normalizeReviewReportScores(normalizeReviewFeedbackScope(state))
      return scoped
    })
    return NextResponse.json(visibleState(normalizedState(db), actorFor(request), new URL(request.url).searchParams.get("recordId")), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "조회에 실패했습니다." }, { status: 503 })
  }
}
export async function POST(request: Request) {
  const actor = actorFor(request)
  const payload = await request.json() as { command: ReviewCommand; requestId: string }
  try {
    if (!payload.requestId || !payload.command?.type) throw new Error("잘못된 요청입니다.")
    const at = new Date().toISOString()
    const db = await prototypeStore.update<ReviewDatabase>("online-reviews", getDefaultReviewDatabase, state => applyReviewCommand(normalizedState(state), payload.command, actor, payload.requestId, at))
    return NextResponse.json(visibleState(db, actor))
  }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "처리에 실패했습니다." }, { status: 400 }) }
}
export async function DELETE() {
  await prototypeStore.update("online-reviews", getDefaultReviewDatabase, () => getDefaultReviewDatabase())
  return NextResponse.json({ ok: true })
}
