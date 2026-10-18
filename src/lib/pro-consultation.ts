import type { ProConsultation } from "./pro-types"
// @ts-expect-error Node tests load TypeScript sources directly.
import { kstDate, managementMonth, monthWeeks, weekStart } from "./pro-calendar.ts"

/** Monthly status is shared by the weekly list and student detail, not a weekly snapshot. */
export function monthlyConsultationSummary(records: ProConsultation[], due: string | undefined, month: string, now: string) {
  const latest = [...records].sort((a, b) => b.actualAt.localeCompare(a.actualAt) || b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
  const completed = latest.find(c => c.result === "유선 상담 완료") ?? latest.find(c => c.result === "부재 후 카톡 상담으로 대체")
  if (completed) return { label: completed.result === "유선 상담 완료" ? "유선 완료" : "카톡 대체", date: completed.actualAt, tone: "green" as const, record: completed }
  if (month < managementMonth(now) || monthWeeks(month).at(-1)! <= weekStart(now)) return { label: "이번 달 상담 미완료", date: due, tone: "red" as const }
  if (latest[0]) return { label: "미진행", date: latest[0].actualAt, tone: "amber" as const, record: latest[0] }
  if (due && kstDate(due) === kstDate(now)) return { label: "오늘 상담", date: due, tone: "blue" as const }
  return { label: "예정", date: due, tone: "slate" as const }
}
