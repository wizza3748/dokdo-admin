/** Supplementary display only; scheduled feedback keeps the existing feedback status. */
export type FeedbackScheduleDisplay = { status: "waiting" | "sending" | "failed"; scheduledAt: string }

export const feedbackScheduleLabels = {
  waiting: "예약 전송 대기",
  sending: "예약 전송 중",
  failed: "예약 전송 실패",
} as const

export const feedbackScheduleBlockReason = "피드백 예약 전송이 등록되어 있습니다."

/** The persisted instant is rendered in Korea, independent of the browser timezone. */
export function feedbackSentDate(at?: string) {
  if (!at || !Number.isFinite(Date.parse(at))) return "-"
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(at))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ""
  return `${part("year")}.${part("month")}.${part("day")}(${part("weekday")}) ${part("hour")}:${part("minute")}`
}

/** Normal displays omit timezone text; reservation confirmations opt into guidance. */
export function feedbackScheduleDate(at?: string, showTimezone = false) {
  const date = feedbackSentDate(at)
  return date === "-" || !showTimezone ? date : `${date} 한국 시간`
}

export function feedbackScheduleDisplay(schedule?: { status: string; scheduledAt: string } | null): FeedbackScheduleDisplay | undefined {
  if (!schedule || !["waiting", "sending", "failed"].includes(schedule.status)) return undefined
  return { status: schedule.status as FeedbackScheduleDisplay["status"], scheduledAt: schedule.scheduledAt }
}

export const reviewScheduleFilterOptions = [
  { value: "all", label: "전체" },
  { value: "none", label: "예약 없음" },
  { value: "waiting", label: feedbackScheduleLabels.waiting },
  { value: "sending", label: feedbackScheduleLabels.sending },
  { value: "failed", label: feedbackScheduleLabels.failed },
] as const
export type ReviewScheduleFilter = typeof reviewScheduleFilterOptions[number]["value"]

export function reviewScheduleFilter(value: string | null, audience: string, selection: string): ReviewScheduleFilter {
  if (audience !== "pro" || selection === "expected" || selection === "not-selected") return "all"
  return reviewScheduleFilterOptions.find(option => option.value === value)?.value ?? "all"
}

export function matchesReviewSchedule(record: { feedbackSchedule?: FeedbackScheduleDisplay }, filter: ReviewScheduleFilter) {
  if (filter === "all") return true
  if (filter === "none") return !record.feedbackSchedule
  return record.feedbackSchedule?.status === filter
}

export function scheduledReviewActionBlocked(record: { feedbackSchedule?: FeedbackScheduleDisplay }, action: string) {
  return !!record.feedbackSchedule && (action === "ai" || action === "save" || action === "send")
}
