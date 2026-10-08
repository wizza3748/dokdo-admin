/** Calendar arithmetic is explicitly KST; host/browser time zone is irrelevant. */
export const DAY = 86_400_000
export function kstDate(at: string) { return new Date(Date.parse(at) + 9 * 3_600_000).toISOString().slice(0, 10) }
export function midnight(date: string) { return new Date(`${date}T00:00:00+09:00`).toISOString() }
export function addDays(at: string, days: number) { return new Date(Date.parse(at) + days * DAY).toISOString() }
export function weekStart(at: string) {
  const day = new Date(`${kstDate(at)}T00:00:00Z`).getUTCDay()
  return addDays(midnight(kstDate(at)), -((day + 6) % 7))
}
export function managementMonth(at: string) { return kstDate(addDays(weekStart(at), 3)).slice(0, 7) }
export function monthWeeks(month: string) {
  const first = weekStart(midnight(`${month}-01`))
  const start = managementMonth(first) === month ? first : addDays(first, 7)
  return Array.from({ length: 5 }, (_, i) => addDays(start, i * 7)).filter(w => managementMonth(w) === month)
}
export function weekLabel(at: string) { const m = managementMonth(at); return `${m} ${monthWeeks(m).indexOf(weekStart(at)) + 1}주차` }
export function dateLabel(at?: string) { return at ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(at)).replace("24:", "00:") : "-" }
export function cutoffLabel(at: string) { return `${kstDate(addDays(at, -1)).replaceAll("-", ". ")} 밤 12시` }
export const weekdayNames = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
/** weekday: ISO 1..7. Monday feedback uses the previous Sunday's management week. */
export function weekSchedule(week: string, weekday: number) {
  const cutoff = addDays(weekStart(week), weekday === 1 ? 7 : weekday - 1)
  return { cutoff, due: new Date(Date.parse(cutoff) + DAY - 60_000).toISOString(), remind1: addDays(cutoff, -3), remind2: addDays(cutoff, -2) }
}
export function submissionPeriod(at: string, weekday: number) {
  let week = weekStart(at)
  if (Date.parse(at) >= Date.parse(weekSchedule(week, weekday).cutoff)) week = addDays(week, 7)
  return { week, month: managementMonth(week), weekday, ...weekSchedule(week, weekday) }
}
export function secondDeadline(sentAt: string, weekday: number) {
  const month = managementMonth(sentAt), weeks = monthWeeks(month)
  const next = addDays(weeks[weeks.length - 1], 7)
  if (weekStart(sentAt) === weeks[weeks.length - 1]) return weekSchedule(next, weekday).cutoff
  const [year, m] = month.split("-").map(Number)
  const end = new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10)
  return new Date(Date.parse(midnight(end)) + DAY - 60_000).toISOString()
}
export function consultationDate(month: string, nth: number, weekday: number, time: string) {
  const [year, m] = month.split("-").map(Number)
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const firstDay = new Date(`${month}-01T00:00:00Z`).getUTCDay() || 7
  let day = 1 + (weekday - firstDay + 7) % 7 + (nth - 1) * 7
  if (day > days) day -= 7
  return new Date(`${month}-${String(day).padStart(2, "0")}T${time}:00+09:00`).toISOString()
}
