import type { StudentProView } from "./pro-selectors"
import type { ReviewDatabase, ReviewRecord } from "./review-domain"
// @ts-expect-error Node tests load TypeScript sources directly.
import { addDays, kstDate, weekStart } from "./pro-calendar.ts"

export const studentProCopy = {
  summaryTitle: "이번 주 선생님 피드백",
  loading: "피드백 신청 가능 권수를 확인하고 있어요.",
  error: "피드백 정보를 불러오지 못했어요. 다시 확인해 주세요.",
  unassigned: "아직 피드백을 신청할 수 없어요. 선생님에게 물어보세요.",
  monthUsed: "이번 달 피드백 이용 권수를 모두 썼어요.",
  closed: "이번 주 피드백 신청이 끝났어요.",
  noSlots: "지금은 피드백을 신청할 수 있는 권수가 없어요.",
  available: "피드백을 신청할 독후감을 골라 주세요.",
  requestTitle: "신청 방법",
  request: "온라인 독후감이 있는 책을 끝까지 읽고 독후감을 제출해요. 목록에서 원하는 독후감의 [피드백 신청]을 눌러 주세요.",
  changeTitle: "신청 취소·변경",
  change: "직접 신청한 독후감은 마감 전, 선생님이 피드백 작성을 시작하기 전까지만 취소하고 바꿀 수 있어요.",
  selectionTitle: "직접 신청하지 않아도",
  selection: "마감 때 이번 주 신청 가능한 독후감 중 최근 제출한 것부터 남은 신청 권수만큼 자동으로 골라요.",
  expired: "이 글은 신청 마감까지 피드백 대상으로 정해지지 않았어요. 작성한 글은 계속 볼 수 있어요.",
  cancelNotice: "신청을 취소한 글도 마감 때 자동으로 선정될 수 있어요.",
  usageTitle: "2차 독후감은",
  usage: "선생님이 요청한 2차 독후감은 따로 신청하지 않아도 돼요. 이용 권수도 추가로 쓰지 않아요.",
  secondUsage: "피드백 이용 권수는 추가로 줄어들지 않아요.",
  waiting: "피드백 대기",
  selected: "이번 주 피드백 받을 독후감이 정해졌어요.",
  noReviews: "피드백을 신청할 독후감이 없어요.",
  noReviewsGuide: "책을 끝까지 읽고 독후감을 제출해 주세요. 작성 중인 독후감이 있다면 이어서 완성해 주세요.",
} as const

export function proRemainingText(available: number) {
  return `이번 주 남은 신청 권수 ${available}권`
}

export function proRolloverText(usage: Pick<StudentProView["usage"], "available" | "rolloverAvailable">) {
  const remaining = Math.min(usage.available, usage.rolloverAvailable)
  return remaining > 0 ? `(지난주에서 넘어온 ${remaining}권 포함)` : ""
}

/** Use the same server-owned eligibility on the list and the detail screen. */
export function canRequestProFeedback(view: StudentProView | undefined, record?: Pick<ReviewRecord, "reviewId" | "round" | "writingStatus">) {
  if (!view?.active || !view.assigned || !record || record.round !== 1 || record.writingStatus !== "submitted") return false
  const state = proBookPresentation(view, record.reviewId)
  return state?.action === "apply" && state.enabled
}

/** Consume a successful first submission once; all entry points share application eligibility. */
export function consumeProSubmissionPrompt(storage: Pick<Storage, "getItem" | "removeItem">, view: StudentProView | undefined, record?: Pick<ReviewRecord, "reviewId" | "round" | "writingStatus">) {
  if (!view || !record || record.round !== 1 || record.writingStatus !== "submitted") return null
  const key = `pro-submit-prompt:${record.reviewId}`
  if (!storage.getItem(key)) return null
  storage.removeItem(key)
  return { message: "독후감을 제출했어요.", openApplication: canRequestProFeedback(view, record) }
}

/** Current-week guidance is independent of the month selected for the timeline. */
export function proListGuidance(db: ReviewDatabase) {
  const view = db.studentPro
  if (!view?.active || !view.assigned || view.usage.available <= 0 || view.now >= view.cutoff || view.usage.used >= view.usage.limit) return null
  if (proSelectedCases(view).length) return null
  const records = db.records.flatMap(record => {
    const review = db.reviews.find(item => item.id === record.reviewId && item.studentId === view.studentId)
    return review ? [{ record, review }] : []
  }).sort((a, b) => (b.record.savedAt ?? b.record.submittedAt ?? b.review.createdAt).localeCompare(a.record.savedAt ?? a.record.submittedAt ?? a.review.createdAt))
  if (records.some(({ record }) => canRequestProFeedback(view, record))) return null
  const draft = records.find(({ record, review }) => record.round === 1 && record.writingStatus === "writing" && !view.cases.some(c => c.reviewId === review.id && (c.selected || c.firstSent)))
  return {
    message: studentProCopy.noReviews,
    description: studentProCopy.noReviewsGuide,
    label: draft ? "독후감 이어쓰기" : "책 읽으러 가기",
    href: draft ? `/student/online-workbook/${draft.review.sourceWorkbookId}?round=1` : "/reading/index",
  }
}

/** Presentation only. Eligibility, quotas and deadlines remain server-owned. */
export function proStudentDate(at: string, reference: string) {
  const date = kstDate(at)
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" }).format(new Date(at))
  const year = date.slice(0, 4) !== kstDate(reference).slice(0, 4) ? `${date.slice(0, 4)}/` : ""
  return `${year}${Number(date.slice(5, 7))}/${Number(date.slice(8))}(${weekday})`
}

export function proStudentDeadline(at: string, reference: string) {
  const local = new Date(Date.parse(at) + 9 * 3_600_000)
  const hour = local.getUTCHours(), minute = local.getUTCMinutes()
  if (hour === 0 && minute === 0) return `${proStudentDate(addDays(at, -1), reference)} 밤 12시`
  return `${proStudentDate(at, reference)} ${hour < 12 ? "오전" : "오후"} ${hour % 12 || 12}시${minute ? ` ${minute}분` : ""}`
}

export function proSecondDeadlineText(at: string, reference: string) {
  return `2차 글은 ${proStudentDeadline(at, reference)}까지 제출해 주세요.`
}

export function proSecondDeadlineDay(at: string, reference: string) {
  const days = Math.max(0, Math.round((Date.parse(kstDate(at)) - Date.parse(kstDate(reference))) / 86_400_000))
  return days === 0 ? "D-day" : `D-${days}`
}

export function proSummaryText(view: StudentProView, loaded = true, error = "") {
  if (!loaded) return studentProCopy.loading
  if (error) return studentProCopy.error
  if (!view.assigned) return studentProCopy.unassigned
  if (!view.active) return "프로 이용이 종료되었어요."
  if (proSelectedCases(view).length) return studentProCopy.selected
  if (view.usage.used >= view.usage.limit) return studentProCopy.monthUsed
  if (view.now >= view.cutoff) return studentProCopy.closed
  if (view.usage.available <= 0) return studentProCopy.noSlots
  return studentProCopy.available
}

export function proSelectedCases(view: StudentProView) {
  return view.cases.filter(c => c.week === weekStart(view.now) && c.selected && !c.firstSent && !c.closed)
}

export function proSummaryRemainingText(view: StudentProView) {
  return proSelectedCases(view).length && view.now < view.cutoff && view.usage.available > 0
    ? `${view.usage.available}권 더 신청할 수 있어요.` : proRemainingText(view.usage.available)
}

type BookPresentation = {
  status: string; listStatus: string | null; tone: "blue" | "teal" | "gray";
  action?: "apply" | "cancel" | "change"; enabled: boolean; guide?: string;
}
export function proRequestFailure(view: StudentProView | undefined, reviewId: string, action: "apply" | "cancel" | "change", fallback: string, previousReviewId?: string) {
  if (action === "change" && view) {
    const old = view.cases.find(c => c.reviewId === previousReviewId)
    const target = view.cases.find(c => c.reviewId === reviewId)
    if (old?.locked) return "선생님이 피드백 작성을 시작했어요. 신청을 바꿀 수 없어요."
    if ((old && view.now >= old.cutoff) || (target && view.now >= target.cutoff)) return "신청 마감이 지나 바꿀 수 없어요."
  }
  const c = view?.cases.find(c => c.reviewId === reviewId)
  if (action === "cancel" && c && view) {
    if (c.locked) return "선생님이 피드백 작성을 시작했어요. 신청을 취소할 수 없어요."
    if (view.now >= c.cutoff) return "신청 마감이 지나 취소할 수 없어요."
  }
  return fallback
}
export function proBookPresentation(view: StudentProView, reviewId: string): BookPresentation | null {
  const c = view.cases.find(c => c.reviewId === reviewId)
  if (c?.firstSent) return null
  if (!view.assigned) return { status: studentProCopy.unassigned, listStatus: null, tone: "gray", action: "apply", enabled: false }
  if (!c) return null
  if (c.selected) {
    if (c.locked) return { status: "피드백 작성 중", listStatus: "피드백 작성 중", tone: "teal", enabled: false, guide: "선생님이 피드백을 쓰고 있어요. 조금만 기다려 주세요." }
    if (c.selection === "학생 신청" && view.now < c.cutoff) return { status: studentProCopy.waiting, listStatus: studentProCopy.waiting, tone: "blue", action: "cancel", enabled: c.canCancel, guide: "이 독후감으로 선생님 피드백을 받을 예정이에요." }
    return { status: studentProCopy.waiting, listStatus: studentProCopy.waiting, tone: "teal", enabled: false, guide: "이 독후감으로 선생님 피드백을 받을 예정이에요." }
  }
  if (!view.active) return { status: "프로 이용이 종료되었어요.", listStatus: null, tone: "gray", enabled: false }
  if (c.week > weekStart(view.now)) return { status: "다음 주 신청", listStatus: "다음 주 신청", tone: "gray", action: "apply", enabled: false, guide: `이 글은 ${c.period}에 관리해요. 해당 주가 시작되면 피드백을 신청할 수 있어요.` }
  if (c.week < weekStart(view.now) || view.now >= c.cutoff || c.closed) return { status: "신청 마감", listStatus: "신청 마감", tone: "gray", enabled: false, guide: studentProCopy.expired }
  if (view.usage.available <= 0) {
    const canChange = view.usage.used < view.usage.limit && !!c.changeCandidates?.length
    const guide = view.usage.used >= view.usage.limit ? studentProCopy.monthUsed
      : canChange ? "신청한 독후감 대신 이 글로 바꿀 수 있어요."
      : view.cases.some(item => item.selected && !item.firstSent && !item.closed) ? "신청한 글의 피드백을 기다려 주세요."
      : "다음 주에 신청 가능한 권수를 다시 확인해 주세요."
    return { status: studentProCopy.noSlots, listStatus: null, tone: "gray", action: canChange ? "change" : "apply", enabled: canChange, guide }
  }
  return { status: "피드백 신청 가능", listStatus: "피드백 신청 가능", tone: "blue", action: "apply", enabled: c.canApply, guide: "이 독후감으로 선생님 피드백을 신청할 수 있어요." }
}
/** Never advertise an expired or unconfirmed date as an upcoming appointment. */
export function proScheduleVisible(view: StudentProView, reviewId?: string) {
  const c = reviewId ? view.cases.find(item => item.reviewId === reviewId) : undefined
  if (!view.assigned || (!view.active && !c?.selected)) return false
  if (reviewId && (!c || c.closed || (!c.selected && (c.week < weekStart(view.now) || view.now >= c.cutoff)))) return false
  return view.now <= (c?.due ?? view.due)
}
