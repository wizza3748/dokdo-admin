// @ts-expect-error Node tests load TypeScript sources directly.
import { kstDate, monthWeeks, weekStart } from "./pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { monthlyConsultationSummary } from "./pro-consultation.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { consultDue, currentConsultations } from "./pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { weeklyDate } from "./pro-weekly-presentation.ts"
import type { ReviewDatabase } from "./review-domain"
import type { ProAudit, ProConsultation, ProMember, ProState } from "./pro-types"

export const consultationResults: ProConsultation["result"][] = ["유선 상담 완료", "부재 후 카톡 상담으로 대체", "미진행"]
export const consultationResultLabel = (result: ProConsultation["result"]) => result === "부재 후 카톡 상담으로 대체" ? "부재 → 카톡 상담으로 대체" : result
export const nthNames = ["첫째", "둘째", "셋째", "넷째", "다섯째"]
export const dayNames = ["월", "화", "수", "목", "금", "토", "일"]
export function localDateTime(at?: string) { return at ? new Date(Date.parse(at) + 9 * 3600000).toISOString().slice(0, 16) : "" }
export function detailDateTime(at?: string) { return at ? `${weeklyDate(at)} ${localDateTime(at).slice(11)}` : "미설정" }
export function regularConsultationLabel(schedule?: ProMember["consultation"]) {
  return schedule ? `매월 ${nthNames[schedule.nth - 1]} ${dayNames[schedule.weekday - 1]}요일 ${schedule.time}` : "정기 일정 없음"
}
export function studentConsultation(pro: ProState, member: ProMember, month: string) {
  const records = currentConsultations(pro, member.id, month).slice().sort((a, b) => b.actualAt.localeCompare(a.actualAt) || b.at.localeCompare(a.at))
  const due = consultDue(member, month)
  const summary = monthlyConsultationSummary(records, due, month, pro.clock)
  const status = { ...summary, label: summary.record ? consultationResultLabel(summary.record.result) : summary.label }
  return { records, due, status, unrecordedOverdue: !records.length && !!due && kstDate(due) < kstDate(pro.clock) }
}
/** Use the original case and its own cancellation audit; never match by week alone. */
export function studentFeedbackRows(db: ReviewDatabase, studentId: string, month: string) {
  const pro = db.pro!
  return pro.cases.filter(c => c.studentId === studentId && c.month === month).slice()
    .sort((a, b) => a.week.localeCompare(b.week) || a.reviewId.localeCompare(b.reviewId))
    .map(c => {
      const cancellation = pro.audit.filter(a => a.studentId === studentId && a.reviewId === c.reviewId && a.kind === "cancel-debit").sort((a, b) => b.at.localeCompare(a.at))[0]
      const review = db.reviews.find(r => r.id === c.reviewId)
      const finishMethod = review?.secondDecision === "complete" ? "1차 완료" : review?.secondDecision === "request" ? "2차 작성 요청" : "-"
      return { c, title: review?.bookTitle ?? "온라인 독후감", finishMethod,
        week: `${monthWeeks(c.month).indexOf(weekStart(c.week)) + 1}주차`, cancellation }
    })
}
/** A compact human-readable projection; raw audit payloads stay stored, not rendered. */
export function adjustmentValues(entry: ProAudit) {
  const before = entry.before as { used?: number; limit?: number } | undefined
  const after = entry.after as { used?: number; limit?: number } | undefined
  if (entry.kind === "limit" && before?.limit !== undefined && after?.limit !== undefined) return `한도 ${before.limit}권 → ${after.limit}권`
  if (entry.kind === "cancel-debit" && before?.used !== undefined && after?.used !== undefined) return `사용 ${before.used}권 → ${after.used}권`
  return undefined
}
