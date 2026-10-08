import { canAccessReview, expandLegacyReviewScores, upgradeUnscoredMockAssessments, hydrateLegacyReviewFeedback, mergeReviewSeeds, normalizeReviewFeedbackScope, normalizeReviewReportScores, type ReviewActor, type ReviewDatabase } from "./review-domain"
import { getDefaultReviewDatabase } from "./review-seeds"
import { initializePro } from "./pro-seeds"
import { reconcilePro } from "./pro-domain"
import { scopePro, studentProView } from "./pro-selectors"
export function normalizedReviewState(db: ReviewDatabase) {
  const normalized = normalizeReviewReportScores(normalizeReviewFeedbackScope(hydrateLegacyReviewFeedback(upgradeUnscoredMockAssessments(expandLegacyReviewScores(mergeReviewSeeds(db, getDefaultReviewDatabase()))))))
  const next = reconcilePro(initializePro(normalized))
  return JSON.stringify(next) === JSON.stringify(db) ? db : next
}
// Explicit, synthetic prototype identities only; not production authentication.
export function reviewActor(request: Request, db: ReviewDatabase): ReviewActor {
  const params = new URL(request.url).searchParams, role = params.get("role")
  if (role === "admin") return { role, name: "본사관리자" }
  if (role === "agency" || role === "class") return { role, institutionId: params.get("demoAgency") === "other-agency" ? "other-agency" : "dokdo", classId: "class-1", name: "담당 선생님" }
  if (role === "external") return { role, name: "외부 조회" }
  const member = db.pro?.members.find(m => m.id === params.get("demoStudent"))
  return { role: "student", studentId: member?.id ?? "26142", name: member?.name ?? "진독도" }
}
export function visibleReviewState(db: ReviewDatabase, actor: ReviewActor, sharedRecordId?: string | null): ReviewDatabase {
  const sharedRecord = actor.role === "external" ? db.records.find(r => r.id === sharedRecordId && r.feedbackStatus === "전송완료") : undefined
  const reviews = db.reviews.filter(r => canAccessReview(r, actor) || r.id === sharedRecord?.reviewId).map(r => actor.role === "student" || actor.role === "external" ? { ...r, institutionId: "", institution: "", classId: "", decidedBy: undefined } : r)
  const records = db.records.filter(r => reviews.some(c => c.id === r.reviewId) && (actor.role !== "external" || (r.feedbackStatus === "전송완료" && r.round <= sharedRecord!.round))).map(r => {
    if (actor.role !== "student" && actor.role !== "external") return r
    const privateFree = { ...r, legacyAiScores: undefined, aiDraft: undefined, aiHistory: [], history: [], parentContact: false, itemFeedback: r.itemFeedback.filter(i => i.visible) }
    return r.feedbackStatus === "전송완료" ? privateFree : { ...privateFree, feedback: "", reportFeedback: "", itemFeedback: [], aiScores: undefined, teacherScores: undefined, report: undefined }
  })
  return { version: 1, reviews, records, ...(actor.role === "student" ? { studentPro: studentProView(db, actor.studentId!) } : actor.role === "external" ? {} : { pro: actor.role === "admin" ? db.pro : db.pro && scopePro(db.pro, actor.institutionId!) }) }
}
