import type { ItemFeedback, ReviewActor, ReviewCommon, ReviewRecord, ReviewReport, ReviewScores } from "./review-domain"

export type FeedbackScheduleStatus = "waiting" | "sending" | "sent" | "failed" | "cancelled"
export type FeedbackScheduleSnapshot = {
  savedAt?: string;
  feedback: string;
  reportFeedback?: string;
  itemFeedback: ItemFeedback[];
  report?: ReviewReport;
  aiScores?: ReviewScores;
  teacherScores?: ReviewScores;
  secondDecision?: ReviewCommon["secondDecision"];
  decidedBy?: string;
  decidedAt?: string;
}
export type FeedbackSchedule = {
  id: string;
  recordId: string;
  reviewId: string;
  round: 1 | 2;
  institutionId: string;
  scheduledAt: string;
  status: FeedbackScheduleStatus;
  createdAt: string;
  createdBy: ReviewActor;
  snapshot: FeedbackScheduleSnapshot;
  revision: string;
  firstSentAt?: string;
  claimedAt?: string;
  executedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  failureReason?: string;
  events: { action: "registered" | "claimed" | "sent" | "failed" | "cancelled"; at: string; actor: string; reason?: string }[];
}
export type ActiveFeedbackSchedule = FeedbackSchedule & { status: "waiting" | "sending" | "failed" }

export function activeFeedbackSchedule(record?: Pick<ReviewRecord, "feedbackSchedules">): ActiveFeedbackSchedule | undefined {
  return record?.feedbackSchedules?.findLast(schedule => ["waiting", "sending", "failed"].includes(schedule.status)) as ActiveFeedbackSchedule | undefined
}

/** Past-week rendering follows recorded transitions, never today's later reservation state. */
export function activeFeedbackScheduleAt(record: Pick<ReviewRecord, "feedbackSchedules"> | undefined, at: string): ActiveFeedbackSchedule | undefined {
  const states: Record<FeedbackSchedule["events"][number]["action"], FeedbackScheduleStatus> = { registered: "waiting", claimed: "sending", sent: "sent", failed: "failed", cancelled: "cancelled" }
  const schedules = record?.feedbackSchedules?.filter(schedule => schedule.createdAt <= at).map(schedule => {
    const events = schedule.events.filter(event => event.at <= at)
    const last = events.at(-1)
    return {
      ...schedule, status: last ? states[last.action] : "waiting" as const, events,
      claimedAt: schedule.claimedAt && schedule.claimedAt <= at ? schedule.claimedAt : undefined,
      executedAt: schedule.executedAt && schedule.executedAt <= at ? schedule.executedAt : undefined,
      cancelledAt: schedule.cancelledAt && schedule.cancelledAt <= at ? schedule.cancelledAt : undefined,
      cancelledBy: schedule.cancelledAt && schedule.cancelledAt <= at ? schedule.cancelledBy : undefined,
      failureReason: events.findLast(event => event.action === "failed")?.reason,
    }
  })
  return activeFeedbackSchedule({ feedbackSchedules: schedules })
}

/** A saved send payload, not a pointer to an editor's current draft. */
export function feedbackScheduleSnapshot(review: ReviewCommon, record: ReviewRecord): FeedbackScheduleSnapshot {
  return structuredClone({
    savedAt: record.savedAt, feedback: record.feedback, reportFeedback: record.reportFeedback,
    itemFeedback: record.itemFeedback, report: record.report, aiScores: record.aiScores, teacherScores: record.teacherScores,
    ...(record.round === 1 ? { secondDecision: review.secondDecision, decidedBy: review.decidedBy, decidedAt: review.decidedAt } : {}),
  })
}

/** The server compares this again at confirmation and execution; flowers are independently editable. */
export function feedbackScheduleRevision(review: ReviewCommon, record: ReviewRecord) {
  return JSON.stringify({
    recordId: record.id, round: record.round, reviewId: review.id, studentId: review.studentId,
    writingStatus: record.writingStatus, feedbackStatus: record.feedbackStatus, submittedAt: record.submittedAt,
    sentAt: record.sentAt, reportEnabled: review.reportEnabled, level: review.level,
    finalBody: record.finalBody, assessment: record.assessment, linkedRecordId: record.linkedRecordId,
    aiDraft: record.aiDraft, pendingAi: record.aiHistory.filter(item => item.status === "running"),
    sendHistory: record.history.filter(item => item.action === "send"),
    snapshot: feedbackScheduleSnapshot(review, record),
  })
}

/** Accept an explicit instant only, preserving the selected KST minute exactly. */
export function validFeedbackScheduleTime(value: unknown, now: string): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false
  const [year, month, day, hour, minute] = value.slice(0, 16).split(/[-T:]/).map(Number)
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute))
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || calendar.getUTCHours() !== hour || calendar.getUTCMinutes() !== minute) return false
  const instant = Date.parse(value)
  return Number.isFinite(instant) && instant % 60_000 === 0 && instant > Date.parse(now)
}
