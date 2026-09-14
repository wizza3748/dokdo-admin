type WorkbookClassificationSource = {
  reviewId?: string
  submittedAt?: string
  writingRound?: 1 | 2
  secondDecision?: "request" | "complete"
  reportStatus?: string
}

export const ONLINE_REVIEW_POLICY_START_DATE = "2026-09-01"
export const WRITING_TYPE_OPTIONS = ["전체", "기존 방식", "1차", "2차"]
export const SECOND_DECISION_OPTIONS = ["전체", "미결정", "2차 작성 요청", "1차 완료"]
export const REPORT_STATUS_OPTIONS = ["전체", "생성 불가", "생성 전", "생성 완료"]

/** Records created before the policy date retain their original workflow. */
export function workbookClassification(record: WorkbookClassificationSource) {
  const isLegacy = record.submittedAt
    ? record.submittedAt.slice(0, 10) < ONLINE_REVIEW_POLICY_START_DATE
    : !record.reviewId
  if (isLegacy) return { writing: "기존 방식", decision: "-", report: "-" }
  return {
    writing: `${record.writingRound ?? 1}차`,
    decision: record.secondDecision === "request" ? "2차 작성 요청" : record.secondDecision === "complete" ? "1차 완료" : "미결정",
    report: record.reportStatus ?? "생성 불가",
  }
}

export function matchesWorkbookClassification(record: WorkbookClassificationSource, writing: string, decision: string, report: string) {
  const labels = workbookClassification(record)
  return (writing === "전체" || labels.writing === writing)
    && (decision === "전체" || labels.decision === decision)
    && (report === "전체" || labels.report === report)
}
