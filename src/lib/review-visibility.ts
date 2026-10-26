import { canAccessReview, type ReviewActor, type ReviewDatabase } from "./review-domain"
import { atReviewTime, reviewNow } from "./review-clock"
import { scopePro, studentProView } from "./pro-selectors"

export function visibleReviewState(db: ReviewDatabase, actor: ReviewActor, sharedRecordId?: string | null, serverNow = new Date().toISOString()): ReviewDatabase {
  db = atReviewTime(db, serverNow)
  const sharedRecord = actor.role === "external" ? db.records.find(r => r.id === sharedRecordId && r.feedbackStatus === "전송완료") : undefined
  const reviews = db.reviews.filter(r => canAccessReview(r, actor, db.pro) || r.id === sharedRecord?.reviewId).map(r => actor.role === "student" || actor.role === "external" ? { ...r, institutionId: "", institution: "", classId: "", decidedBy: undefined } : r)
  const records = db.records.filter(r => reviews.some(c => c.id === r.reviewId) && (actor.role !== "external" || (r.feedbackStatus === "전송완료" && r.round <= sharedRecord!.round))).map(r => {
    if (actor.role !== "student" && actor.role !== "external") return r
    const privateFree = { ...r, feedbackSchedules: undefined, legacyAiScores: undefined, aiDraft: undefined, aiHistory: [], history: [], parentContact: false, itemFeedback: r.itemFeedback.filter(i => i.visible) }
    return r.feedbackStatus === "전송완료" ? privateFree : { ...privateFree, feedback: "", reportFeedback: "", itemFeedback: [], aiScores: undefined, teacherScores: undefined, report: undefined }
  })
  return { version: 1, currentTime: reviewNow(db, serverNow), reviews, records, ...(actor.role === "student" ? { studentPro: studentProView(db, actor.studentId!) } : actor.role === "external" ? {} : { pro: actor.role === "admin" ? db.pro : db.pro && scopePro(db.pro, actor.institutionId!) }) }
}
