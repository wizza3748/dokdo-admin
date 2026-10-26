import { expandLegacyReviewScores, upgradeUnscoredMockAssessments, hydrateLegacyReviewFeedback, mergeReviewSeeds, normalizeReviewFeedbackScope, normalizeReviewReportScores, type ReviewActor, type ReviewDatabase } from "./review-domain"
import { getDefaultReviewDatabase } from "./review-seeds"
import { initializePro } from "./pro-seeds"
import { ensureProAttentionExamples } from "./pro-attention-seeds"
import { reconcilePro } from "./pro-domain"
import { atReviewTime, persistReviewTime } from "./review-clock"
import { ensureFeedbackScheduleExamples, localFeedbackScheduleExamplesEnabled } from "./review-schedule-seeds"
export { visibleReviewState } from "./review-visibility"
export function normalizedReviewState(db: ReviewDatabase, serverNow: string) {
  const normalized = normalizeReviewReportScores(normalizeReviewFeedbackScope(hydrateLegacyReviewFeedback(upgradeUnscoredMockAssessments(expandLegacyReviewScores(mergeReviewSeeds(db, getDefaultReviewDatabase()))))))
  const attention = ensureProAttentionExamples(initializePro(normalized), serverNow)
  // Production seeds must be queued before commit by the shared example server helper.
  const examples = localFeedbackScheduleExamplesEnabled(process.env) ? ensureFeedbackScheduleExamples(attention, serverNow, process.env) : attention
  const next = reconcilePro(atReviewTime(examples, serverNow))
  return JSON.stringify(next) === JSON.stringify(db) ? db : next
}
/** Called inside the store's serialized update/CAS with a freshly sampled server time. */
export function updateReviewState(db: ReviewDatabase, serverNow: string, change: (current: ReviewDatabase) => ReviewDatabase = current => current) {
  return persistReviewTime(db, change(normalizedReviewState(structuredClone(db), serverNow)))
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
