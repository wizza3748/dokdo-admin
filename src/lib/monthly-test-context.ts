// @ts-expect-error Node tests load TypeScript sources directly.
import { weekStart } from "./pro-calendar.ts"

export const monthlyValidationCases = {
  november: { label: "11월 전환·작성·발송 선택", at: "2026-11-25T03:00:00.000Z", month: "2026-11", tone: "저장된 말투 적용 가능" },
  overdue: { label: "11월 기한 경과", at: "2026-11-30T00:00:00.000Z", month: "2026-11", tone: "발송본 부족으로 적용 대기" },
  december: { label: "12월 정기 생성·이전 달 지연", at: "2026-12-21T01:00:00.000Z", month: "2026-12", tone: "저장된 말투 사용 안 함" },
} as const
export type MonthlyValidationCase = keyof typeof monthlyValidationCases
export function monthlyTestCase(value: string | null): MonthlyValidationCase | null {
  return value && Object.hasOwn(monthlyValidationCases, value) ? value as MonthlyValidationCase : null
}
export function monthlyContextPath(path: string) {
  return path === "/admin/b2c/monthly-feedback" || /^\/agency\/pro-management(?:\/(?:academy-style|feedback-day|students\/[^/]+))?$/.test(path) || /^\/agency\/online-workbooks(?:\/[^/]+)?$/.test(path) || path.startsWith("/online-review/report/")
}

/** A validation case belongs to the URL, never to a global browser's data selection. */
export function monthlyContextHref(href: string, currentHref: string, options?: { select: MonthlyValidationCase | null }): string {
  const base = new URL(currentHref, "https://prototype.invalid")
  const target = new URL(href, base)
  if (target.origin !== base.origin || !monthlyContextPath(target.pathname)) return href
  const current = options ? options.select : monthlyTestCase(base.searchParams.get("monthlyTest"))
  const previous = monthlyTestCase(target.searchParams.get("monthlyTest"))
  if (current) {
    target.searchParams.set("monthlyTest", current)
    for (const key of ["studentTest", "studentTestScreen", "monthlyLive"]) target.searchParams.delete(key)
    if (base.searchParams.get("demoAgency") === "other-agency" && !target.searchParams.has("demoAgency")) target.searchParams.set("demoAgency", "other-agency")
  } else {
    target.searchParams.delete("monthlyTest")
    if (options || base.searchParams.get("monthlyLive") === "1") target.searchParams.set("monthlyLive", "1")
  }
  if (options || previous !== current) {
    for (const key of ["week", "month", "status", "task", "ended", "books", "returnTo"]) target.searchParams.delete(key)
    if (current) {
      const scenario = monthlyValidationCases[current]
      if (target.pathname === "/agency/pro-management") target.searchParams.set("week", weekStart(scenario.at))
      if (target.pathname === "/admin/b2c/monthly-feedback" || target.pathname.startsWith("/agency/pro-management/students/")) target.searchParams.set("month", scenario.month)
    }
  }
  return `${target.pathname}${target.search}${target.hash}`
}
