// @ts-expect-error Node tests load TypeScript sources directly.
import { kstDate } from "./pro-calendar.ts"

export function validStudentMonth(month?: string | null): month is string {
  return !!month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
}
export function studentCalendar(now: string, selectedMonth?: string) {
  const today = kstDate(now)
  const [currentYear, currentMonth, currentDay] = today.split("-").map(Number)
  const [year, month] = (validStudentMonth(selectedMonth) ? selectedMonth : today.slice(0, 7)).split("-").map(Number)
  return { year, month, currentYear, currentMonth, currentDay }
}
export function studentTodayLabel(now: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "long" }).format(new Date(now))
}
