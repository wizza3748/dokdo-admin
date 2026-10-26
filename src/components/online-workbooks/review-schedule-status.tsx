import { ProBadge } from "@/components/pro-management/pro-common"
import { feedbackScheduleDate, feedbackScheduleLabels, type FeedbackScheduleDisplay } from "@/lib/review-schedule-presentation"
import { cn } from "@/lib/utils"

export function FeedbackScheduleStatus({ schedule, className, showScheduledAt = true }: { schedule?: FeedbackScheduleDisplay; className?: string; showScheduledAt?: boolean }) {
  if (!schedule) return null
  return <div className={cn("flex flex-wrap items-center gap-1.5", className)} data-feedback-schedule={schedule.status}>
    <ProBadge tone={schedule.status === "failed" ? "red" : schedule.status === "sending" ? "amber" : "blue"}>{feedbackScheduleLabels[schedule.status]}</ProBadge>
    {showScheduledAt && <span className="text-xs text-slate-600">{feedbackScheduleDate(schedule.scheduledAt)}</span>}
  </div>
}
