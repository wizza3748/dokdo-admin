import { commandReview, readReviews, type ReviewRole } from "@/lib/review-client"
import { sampleReviewAi, type ReviewDatabase } from "@/lib/review-domain"
import type { OnlineWorkbook } from "@/lib/online-workbooks"
export function reviewListRows(db: ReviewDatabase): OnlineWorkbook[] {
  return db.records.filter(r => r.writingStatus === "submitted").map(r => {
    const common = db.reviews.find(c => c.id === r.reviewId)!
    return { id: r.id, reviewId: common.id, writingRound: r.round, reportStatus: !common.reportEnabled ? "생성 불가" : r.report ? "생성 완료" : "생성 전", secondDecision: common.secondDecision, institution: common.institution, studentName: common.studentName, level: common.level, bookTitle: common.bookTitle, templateName: common.template.title, submittedAt: r.submittedAt?.slice(0, 10) ?? "", submittedAtTime: r.submittedAt ?? "", feedbackAt: r.savedAt?.slice(0, 10) ?? null, status: r.feedbackStatus, aiUsed: r.aiUsed, flowers: r.flowers, anomaly: false, parentSent: !!r.parentSentAt, parentContactRegistered: r.parentContact, feedbackText: r.feedback }
  })
}
export async function performReviewListAction(recordId: string, action: "ai" | "send" | "parent" | "flower", amount = 0, role: ReviewRole = "agency") {
  if (action !== "ai") return commandReview(action === "flower" ? { type: "flower", recordId, amount } : { type: action, recordId }, role)
  const db = await readReviews(role)
  const record = db.records.find(r => r.id === recordId)
  const common = db.reviews.find(c => c.id === record?.reviewId)
  if (!record || !common || record.feedbackStatus !== "작성전") throw new Error("일괄 AI 생성 대상이 아닙니다.")
  const runId = crypto.randomUUID()
  await commandReview({ type: "ai-start", recordId }, role, runId)
  return commandReview({ type: "ai-result", recordId, runId, result: sampleReviewAi(common, record) }, role)
}
