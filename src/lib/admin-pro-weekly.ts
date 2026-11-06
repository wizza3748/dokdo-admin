// @ts-expect-error Node native TS tests use explicit extensions.
import { addDays, kstDate, managementMonth, monthWeeks, weekStart } from "./pro-calendar.ts"
import type { ProMember } from "./pro-types"

export type WeeklyStudent = { id: string; name: string; institutionId: string; institutionName: string; at: string; reason?: string }
export type WeeklyInstitution = { id: string; name: string; previous: number | null; current: number | null; assigned: number; ended: number; average: number | null }
export type WeeklySort = keyof Pick<WeeklyInstitution, "name" | "previous" | "current" | "assigned" | "ended" | "average">
type Institution = { id: string; name: string }
type Segment = { member: ProMember; institutionId: string; start: number; end: number; reason: string }
export type AdminWeeklySummary = ReturnType<typeof summarizeAdminWeekly>
export const weeklyEnd = (week: string) => new Date(Date.parse(addDays(week, 7)) - 1).toISOString()
export const weeklyDateTime = (at: string) => new Date(Date.parse(at) + 9 * 3_600_000).toISOString().slice(0, 16).replace("T", " ")
// Group by the actual end instant; only the displayed last service day moves back.
export const weeklyStudentEndDate = (row: Pick<WeeklyStudent, "at" | "reason">) => kstDate(row.reason === "프로 이용 종료" ? addDays(row.at, -1) : row.at)
export const weeklyNumber = (value: number | null) => value === null ? "-" : `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value)}명`

/** Each academy segment starts/ends its own management, including transfers. */
function segments(member: ProMember): Segment[] {
  if (member.product !== "pro" || !member.external || !member.assignedAt) return []
  const start = Math.max(Date.parse(member.effectiveAt), Date.parse(member.assignedAt))
  const end = Math.min(Date.parse(member.serviceEnd), member.endedAt ? Date.parse(member.endedAt) : Infinity)
  const history = (member.matchingHistory?.length ? [...member.matchingHistory].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)) : [{ at: member.assignedAt, institutionId: member.institutionId ?? "" }])
    .filter((event, index, events) => index === 0 || event.institutionId !== events[index - 1].institutionId)
  return history.flatMap((event, index) => {
    const from = Math.max(start, Date.parse(event.at)), to = Math.min(end, history[index + 1] ? Date.parse(history[index + 1].at) : Infinity)
    const reason = to === end ? "프로 이용 종료" : history[index + 1]?.institutionId ? "학원 변경" : "학원 연결 해제"
    return event.institutionId && from < to ? [{ member, institutionId: event.institutionId, start: from, end: to, reason }] : []
  })
}

export function summarizeAdminWeekly(members: ProMember[], institutions: Institution[], requestedWeek: string, now: string, availableFrom: string) {
  const currentWeek = weekStart(now)
  const week = weekStart(requestedWeek) > currentWeek ? currentWeek : weekStart(requestedWeek)
  const current = week === currentWeek, asOf = current ? now : weeklyEnd(week)
  const from = Date.parse(week), until = Date.parse(asOf)
  const byStudent = new Map(members.map(member => [member.id, segments(member)]))
  const allSegments = [...byStudent.values()].flat()
  const names = new Map(institutions.map(item => [item.id, item.name]))
  const row = (segment: Segment, at: number): WeeklyStudent => ({ id: segment.member.id, name: segment.member.name, institutionId: segment.institutionId, institutionName: names.get(segment.institutionId) ?? segment.institutionId, at: new Date(at).toISOString() })
  const assigned: WeeklyStudent[] = [], ended: WeeklyStudent[] = []
  for (const periods of byStudent.values()) {
    const starts = new Map<string, Segment>(), ends = new Map<string, Segment>()
    for (const period of periods) {
      if (period.start >= from && period.start <= until && !starts.has(period.institutionId)) starts.set(period.institutionId, period)
      if (period.end >= from && period.end <= until) ends.set(period.institutionId, period)
    }
    assigned.push(...[...starts.values()].map(first => row(first, first.start)))
    ended.push(...[...ends.values()].map(last => ({ ...row(last, last.end), reason: last.reason })))
  }
  assigned.sort((a, b) => b.at.localeCompare(a.at) || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id, undefined, { numeric: true }))
  ended.sort((a, b) => weeklyStudentEndDate(b).localeCompare(weeklyStudentEndDate(a)) || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id, undefined, { numeric: true }))
  const month = managementMonth(week), weeks = monthWeeks(month)
  const confirmed = weeks.filter(w => weeklyEnd(w) < now)
  const count = (id: string, time: string): number | null => {
    if (Date.parse(time) < Date.parse(availableFrom)) return null
    return new Set(allSegments.filter(s => s.institutionId === id && s.start <= Date.parse(time) && Date.parse(time) < s.end).map(s => s.member.id)).size
  }
  const activeIds = new Set(allSegments.filter(s => s.start <= until).map(s => s.institutionId))
  const academies: WeeklyInstitution[] = institutions.filter(i => activeIds.has(i.id)).map(institution => {
    const counts = confirmed.map(w => count(institution.id, weeklyEnd(w)))
    return {
      ...institution, previous: count(institution.id, weeklyEnd(addDays(week, -7))), current: count(institution.id, asOf),
      assigned: assigned.filter(r => r.institutionId === institution.id).length, ended: ended.filter(r => r.institutionId === institution.id).length,
      average: !counts.length || counts.some(n => n === null) ? null : (counts as number[]).reduce((sum, n) => sum + n, 0) / counts.length,
    }
  })
  return { week, currentWeek, current, asOf, month, totalWeeks: weeks.length, confirmedWeeks: confirmed.length, monthInProgress: managementMonth(now) === month, assigned, ended, academies }
}

export function sortWeeklyInstitutions(rows: WeeklyInstitution[], column: WeeklySort, direction: "asc" | "desc") {
  return [...rows].sort((a, b) => {
    const left = a[column], right = b[column]
    if (left === null || right === null) return left === right ? a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id, undefined, { numeric: true }) : left === null ? 1 : -1
    const result = typeof left === "string" && typeof right === "string" ? left.localeCompare(right, "ko") : Number(left) - Number(right)
    return (direction === "asc" ? result : -result) || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id, undefined, { numeric: true })
  })
}

export function weeklyPage<T>(rows: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size)), current = Math.max(1, Math.min(page, pages))
  return { rows: rows.slice((current - 1) * size, current * size), pages, current, from: rows.length ? (current - 1) * size + 1 : 0, to: Math.min(current * size, rows.length) }
}
