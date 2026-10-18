// @ts-expect-error Node tests use explicit TypeScript extensions.
import { addDays, weekSchedule } from "./pro-calendar.ts"

/** Recurring schedule labels only; the stored cutoff and due instants are unchanged. */
export function feedbackDaySchedule(week: string, weekday: number) {
  const schedule = weekSchedule(week, weekday)
  const day = (at: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "long" }).format(new Date(at))
  return [
    { label: "제출·피드백 신청 마감", value: `${day(addDays(schedule.cutoff, -1))} 밤 12시` },
    { label: "제출 독려 1회", value: `${day(schedule.remind1)} (마감 2일 전)` },
    { label: "제출 독려 2회", value: `${day(schedule.remind2)} (마감 전날)` },
  ]
}
