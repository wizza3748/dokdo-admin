// @ts-expect-error Node tests load TypeScript sources directly.
import { assessmentCriteria, validAiScores, validScores, type ReviewCommon, type ReviewRecord } from "./review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { weightedReviewScore } from "./review-score-policy.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewAreaLabel } from "./review-assessment-config.ts"

export function reportAreaScores(common: ReviewCommon, record: ReviewRecord, first?: ReviewRecord) {
  if (!validAiScores(common.level, record.aiScores, record) || !validScores(common.level, record.teacherScores, record)) return null
  if (record.round === 2 && (!first || first.reviewId !== record.reviewId || first.id !== record.linkedRecordId || first.round !== 1 || !validAiScores(common.level, first.aiScores, first) || !validScores(common.level, first.teacherScores, first))) return null
  const criteria = assessmentCriteria(common.level, record)
  // One activity keeps the same rubric across rounds; do not compare incompatible scales.
  if (first && JSON.stringify(assessmentCriteria(common.level, first)) !== JSON.stringify(criteria)) return null
  return [...new Set(criteria.map(c => c.area))].map(area => {
    const details = criteria.filter(c => c.area === area)
    const sum = (r: ReviewRecord, kind: "aiScores" | "teacherScores") => kind === "aiScores" ? r.aiScores![area] : details.reduce((total, c) => total + r.teacherScores![c.id], 0)
    const ai = sum(record, "aiScores"), teacher = sum(record, "teacherScores")
    const current = weightedReviewScore(ai, teacher)
    const firstScore = first ? weightedReviewScore(sum(first, "aiScores"), sum(first, "teacherScores")) : current
    return { area: reviewAreaLabel(area), details, max: details.reduce((total, c) => total + c.max, 0), ai, teacher, current, first: firstScore, final: record.round === 2 ? weightedReviewScore(firstScore, current) : current }
  })
}
export type ReportArea = NonNullable<ReturnType<typeof reportAreaScores>>[number]
export function reportDate(value?: string, monthOnly = false) {
  if (!value || Number.isNaN(Date.parse(value))) return "—"
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: monthOnly ? "long" : "2-digit", ...(monthOnly ? {} : { day: "2-digit" as const }) }).format(new Date(value))
}
