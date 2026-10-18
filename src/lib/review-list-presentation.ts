import type { OnlineWorkbook } from "./online-workbooks"
import type { ProCase } from "./pro-types"
// @ts-expect-error Node tests load TypeScript sources directly.
import { kstDate, managementMonth, monthWeeks, weekStart } from "./pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { weeklyDate } from "./pro-weekly-presentation.ts"

export type ReviewAudience = "all" | "pro" | "institution"
/** Preserve timestamp sorting while displaying calendar dates in Korea. */
export function reviewRecordDates(record: { submittedAt?: string; savedAt?: string }) {
  return { submittedAt: record.submittedAt ? kstDate(record.submittedAt) : "", submittedAtTime: record.submittedAt ?? "", feedbackAt: record.savedAt ? kstDate(record.savedAt) : null }
}
export const reviewAudienceLabels: Record<ReviewAudience, string> = {
  all: "전체 학생", pro: "프로 학생", institution: "기관 학생",
}
export const reviewAudienceHelp = [
  "전체 학생: 조회 가능한 모든 학생입니다.",
  "프로 학생: 우리 기관에 매칭된 외부 프로 학생입니다.",
  "기관 학생: 외부 학생을 제외한 우리 기관 학생입니다.",
]

export function reviewAudienceFromParams(params: URLSearchParams): ReviewAudience {
  const audience = params.get("audience")
  if (audience === "all" || audience === "pro" || audience === "institution") return audience
  return params.get("pro") === "1" ? "pro" : "all"
}

export function reviewFiltersOpen(params: URLSearchParams, saved: string | null) {
  const requested = params.get("filters")
  if (requested === "open" || requested === "closed") return requested === "open"
  return saved !== "closed"
}

export function matchesReviewAudience(record: Pick<OnlineWorkbook, "pro" | "external">, audience: ReviewAudience) {
  if (audience === "pro") return !!record.pro && record.external === true
  if (audience === "institution") return !record.external
  return true
}

const selectionLabels = { student: "학생 신청", auto: "자동 선정", teacher: "선생님 지정", migration: "-" }
export const reviewSelectionFilterOptions = [
  { value: "all", label: "전체" },
  { value: "student", label: "학생 신청" },
  { value: "auto", label: "자동 선정" },
  { value: "teacher", label: "선생님 지정" },
  { value: "expected", label: "자동 선정 예정" },
  { value: "not-selected", label: "대상 아님" },
  { value: "unknown", label: "선정 경로 미확인(-)" },
] as const
export type ReviewSelectionFilter = typeof reviewSelectionFilterOptions[number]["value"]

export function reviewSelectionFilter(value: string | null, audience: ReviewAudience): ReviewSelectionFilter {
  if (audience !== "pro") return "all"
  return reviewSelectionFilterOptions.find(option => option.value === value)?.value ?? "all"
}

export function reviewStatusLocked(selection: ReviewSelectionFilter) {
  return selection === "expected" || selection === "not-selected"
}

export function reviewStatusForSelection(status: string, selection: ReviewSelectionFilter) {
  return reviewStatusLocked(selection) ? "all" : status
}

export function matchesReviewSelection(record: Pick<OnlineWorkbook, "pro">, selection: ReviewSelectionFilter) {
  if (selection === "all") return true
  const pro = record.pro
  if (!pro) return false
  if (selection === "expected") return !pro.selected && pro.selection === "자동 선정 예정"
  if (selection === "not-selected") return !pro.selected && pro.selection === "대상 아님"
  return pro.selected && pro.selection === (selection === "unknown" ? "-" : selectionLabels[selection])
}

export const reviewSelectionHelp = [
  "학생 신청: 학생이 피드백을 신청한 글입니다.",
  "자동 선정: 제출 마감 시 자동으로 선정된 글입니다.",
  "선생님 지정: 선생님이 피드백 대상으로 지정한 글입니다.",
  "자동 선정 예정: 현재 기준의 후보입니다. 마감 전 제출·신청 내역에 따라 달라질 수 있습니다.",
  "대상 아님: 현재 피드백 대상으로 선정되지 않은 글입니다.",
  "-: 선정 경로를 확인할 수 없는 기존 기록입니다.",
]
export const reviewDesignationCopy = {
  title: "피드백 대상 지정",
  blockedTitle: "피드백 대상 지정 불가",
  question: "이 글을 피드백 대상으로 지정하고 작성을 시작할까요?",
  available: "현재 남은 신청 권수",
  after: "지정 후 남은 신청 권수",
  usage: "사용 권수는 1차 피드백을 학생에게 전송하면 반영됩니다.",
}
export function reviewSelectionLabel(selection?: ProCase["selection"]) {
  return selection ? selectionLabels[selection] ?? "-" : "-"
}

/** Explain the displayed selection without reclassifying the underlying case. */
export function reviewManagementSelectionHelp(label: string) {
  if (label === "미선정") return ["미선정: 아직 피드백 대상으로 선정되지 않은 글입니다."]
  return [reviewSelectionHelp.find(line => line.startsWith(`${label}: `)) ?? "선정 방식 정보를 확인할 수 없습니다."]
}

/** Display only: split the existing status result, never recalculate lateness here. */
export function reviewManagementStatusPresentation(status: string) {
  const suffix = " · 지연", overdue = status.endsWith(suffix)
  const label = overdue ? status.slice(0, -suffix.length) : status
  const feedback = label.match(/^([12])차 (전송 대기|피드백 작성 중|피드백 대기)$/)
  const descriptions: Record<string, string> = {
    "매칭 기관 배정 전": "담당 기관이 아직 배정되지 않은 상태입니다.",
    "미선정": "아직 피드백 대상으로 선정되지 않은 글입니다.",
    "2차 글 제출 대기": "1차 피드백에서 다시 쓰기를 요청했으며, 학생의 2차 글 제출을 기다리고 있습니다.",
    "2차 제출 기한 종료": "학생이 기한 안에 2차 글을 제출하지 않아 관리가 종료되었습니다.",
    "1차 피드백 완료": "1차 피드백 전송이 완료된 상태입니다.",
    "2차 피드백 완료": "2차 피드백 전송이 완료된 상태입니다.",
  }
  const feedbackDescriptions: Record<string, string> = {
    "전송 대기": "피드백을 저장했지만 아직 학생에게 전송하지 않았습니다.",
    "피드백 작성 중": "피드백 작업을 시작했으며, 아직 피드백을 저장하지 않은 상태입니다.",
    "피드백 대기": "학생이 제출한 글의 피드백을 작성하고 학생에게 전송해야 합니다.",
  }
  const description = feedback ? feedbackDescriptions[feedback[2]] : descriptions[label]
  return {
    label, overdue,
    help: [description ? `${label}: ${description}` : `현재 관리 상태: ${label}`, ...(overdue ? ["지연: 처리 기한이 지났지만 아직 학생에게 피드백을 전송하지 않았습니다."] : [])],
  }
}

/** Shared agency list/detail label; management-month attribution is unchanged. */
export function reviewManagementWeekLabel(week?: string) {
  if (!week) return "-"
  const month = managementMonth(week)
  return `${Number(month.slice(5))}월 ${monthWeeks(month).indexOf(weekStart(week)) + 1}주차`
}

/** Display only: the stored selection, quota month, week and deadline stay unchanged. */
export function reviewProPresentation(c: ProCase | undefined, round: 1 | 2, sentAt: string | undefined, expected: boolean, now: string, sent = false) {
  const week = round === 2 ? c?.secondWeek : c?.week
  const due = c && (c.selectedAt || expected) ? round === 2 ? c.secondDue : c.due : undefined
  return {
    period: reviewManagementWeekLabel(week),
    selection: c?.selectedAt ? reviewSelectionLabel(c.selection) : expected ? "자동 선정 예정" : "대상 아님",
    due: weeklyDate(due),
    overdue: !!(c?.selectedAt && due && Date.parse(due) < Date.parse(now) && !sentAt && !sent),
  }
}

export const legacyAgencyReviewColumns = ["선택", "고유번호", "학생 이름", "레벨", "도서명", "학생 제출일", "피드백 작성일", "차수", "진행 상황", "관리 주차", "피드백 대상", "처리 기한", "피드백 상태", "학부모 발송 여부", "피드백 전송", "학부모 발송", "평가 보고서", "섬초롱꽃", "피드백 작성 (AI 잔여횟수)"]
export function agencyReviewColumns(showPro: boolean) {
  return [...legacyAgencyReviewColumns.slice(0, 6), ...(showPro ? legacyAgencyReviewColumns.slice(9, 12) : []), ...legacyAgencyReviewColumns.slice(6, 9), ...legacyAgencyReviewColumns.slice(12)]
}

/** Preserve column choices by name even when the pro columns appear or move. */
export function hiddenReviewColumnNames(saved: unknown, legacyColumns: string[]): string[] {
  if (!Array.isArray(saved)) return []
  return [...new Set(saved.flatMap(value => typeof value === "string" ? [value] : Number.isInteger(value) && legacyColumns[value] ? [legacyColumns[value]] : []))]
}
