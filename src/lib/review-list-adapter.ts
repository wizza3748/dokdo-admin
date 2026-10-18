import { commandReview, readReviews, type ReviewRole } from "@/lib/review-client"
import { canAwardReview, canSendReview, sampleReviewAi, type ReviewDatabase } from "@/lib/review-domain"
import type { OnlineWorkbook } from "@/lib/online-workbooks"
import { dateLabel, weekLabel, weekStart } from "./pro-calendar"
import { autoCandidates, proUsage } from "./pro-domain"
import { caseParentLabel, selectionLabels } from "./pro-selectors"
import { reviewProPresentation, reviewRecordDates } from "./review-list-presentation"
export function reviewListRows(db: ReviewDatabase, role: ReviewRole = "agency"): OnlineWorkbook[] {
  return db.records.filter(r => r.writingStatus === "submitted").map(r => {
    const common = db.reviews.find(c => c.id === r.reviewId)!
    const member = db.pro?.members.find(m => m.id === common.studentId)
    const c = db.pro?.cases.find(c => c.reviewId === common.id)
    const expected = member && db.pro && c && db.pro.clock < c.cutoff ? autoCandidates(db, member, weekStart(db.pro.clock)).slice(0, proUsage(db.pro, member, db.pro.clock).available).some(candidate => candidate.reviewId === common.id) : false
    const proInfo = member?.product === "pro" || c ? { selected: !!c?.selectedAt, period: c ? `${weekLabel(c.week)}${r.round === 2 && c.secondWeek ? ` / 2차 ${weekLabel(c.secondWeek)}` : ""}` : "배정 대기", selection: r.round === 2 ? "2차 제출" : c?.selection ? selectionLabels[c.selection] : expected ? "자동 선정 예정" : "대상 아님", due: c && (c.selectedAt || expected) ? `${dateLabel(r.round === 2 ? c.secondDue : c.due)}${expected ? " (선정 시)" : (r.round === 2 ? c.secondDue : c.due)! < db.pro!.clock && !r.sentAt ? " 지연" : ""}` : "-", parentLabel: caseParentLabel(c) } : undefined
    const displayProInfo = proInfo && role !== "admin" ? { ...proInfo, ...reviewProPresentation(c, r.round, r.sentAt, !!expected, db.pro!.clock, r.feedbackStatus === "전송완료") } : proInfo
    const target = !proInfo || !!c?.selectedAt && !c.closedAt
    const actionEligibility = { ai: target && r.feedbackStatus === "작성전" && r.aiUsed < 2 && !r.aiHistory.some(h => h.status === "running"), send: target && canSendReview(common, r), parent: !proInfo && r.feedbackStatus === "전송완료" && !r.parentSentAt && r.parentContact, flower: (!proInfo || !!c?.selectedAt) && canAwardReview(r) }
    return { studentId: common.studentId, external: member?.external, pro: displayProInfo, actionEligibility, id: r.id, reviewId: common.id, writingRound: r.round, reportStatus: !common.reportEnabled ? "생성 불가" : r.report ? "생성 완료" : "생성 전", secondDecision: common.secondDecision, institution: common.institution, studentName: common.studentName, level: common.level, bookTitle: common.bookTitle, templateName: common.template.title, ...reviewRecordDates(r), status: r.feedbackStatus, aiUsed: r.aiUsed, flowers: r.flowers, anomaly: false, parentSent: !!r.parentSentAt, parentContactRegistered: r.parentContact, feedbackText: r.feedback }
  })
}
export function eligibleReviewListAction(record: OnlineWorkbook, action: "ai" | "send" | "parent" | "flower") {
  if (record.actionEligibility) return record.actionEligibility[action]
  if (record.pro && (!record.pro.selected || action === "parent")) return false
  if (action === "ai") return record.status === "작성전" && record.aiUsed < 2
  if (action === "send") return record.status === "작성완료"
  if (action === "parent") return record.status === "전송완료" && !record.parentSent && record.parentContactRegistered !== false
  return record.flowers === 0 && (!record.reviewId || record.status !== "작성전")
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
