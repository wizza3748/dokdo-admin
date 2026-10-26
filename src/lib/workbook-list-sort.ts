import type { OnlineWorkbook } from "./online-workbooks"

type Sortable = Pick<OnlineWorkbook, "id" | "displayNumber" | "submittedAt" | "submittedAtTime" | "feedbackSchedule">
export type WorkbookSort = { key: "id" | "submittedAt"; direction: "asc" | "desc" }
const reservationRank = (row: Sortable) => row.feedbackSchedule?.status === "waiting" || row.feedbackSchedule?.status === "sending" ? 0 : row.feedbackSchedule?.status === "failed" ? 1 : 2

/** Keep actionable reservation badges at the top, then respect the selected column/direction. */
export function compareAgencyWorkbooks(a: Sortable, b: Sortable, sort: WorkbookSort) {
  const priority = reservationRank(a) - reservationRank(b)
  if (priority) return priority
  const aNumber = a.displayNumber ?? a.id.padStart(5, "0"), bNumber = b.displayNumber ?? b.id.padStart(5, "0")
  const aValue = sort.key === "id" ? aNumber : a.submittedAtTime || a.submittedAt
  const bValue = sort.key === "id" ? bNumber : b.submittedAtTime || b.submittedAt
  const result = String(aValue).localeCompare(String(bValue), "ko", { numeric: true })
    || aNumber.localeCompare(bNumber, "ko", { numeric: true }) || a.id.localeCompare(b.id, "en")
  return sort.direction === "asc" ? result : -result
}
