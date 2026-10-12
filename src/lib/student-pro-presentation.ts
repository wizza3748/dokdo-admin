import type { StudentProView } from "./pro-selectors"
// @ts-expect-error Node tests load TypeScript sources directly.
import { addDays, kstDate, weekStart } from "./pro-calendar.ts"

/** Presentation only. Eligibility, quotas and deadlines remain server-owned. */
export function proStudentDate(at: string, reference: string) {
  const date = kstDate(at)
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" }).format(new Date(at))
  const year = date.slice(0, 4) !== kstDate(reference).slice(0, 4) ? `${date.slice(0, 4)}.` : ""
  return `${year}${Number(date.slice(5, 7))}.${Number(date.slice(8))}(${weekday})`
}

export function proStudentDeadline(at: string, reference: string) {
  const local = new Date(Date.parse(at) + 9 * 3_600_000)
  const hour = local.getUTCHours(), minute = local.getUTCMinutes()
  if (hour === 0 && minute === 0) return `${proStudentDate(addDays(at, -1), reference)} 밤 12시`
  return `${proStudentDate(at, reference)} ${hour < 12 ? "오전" : "오후"} ${hour % 12 || 12}시${minute ? ` ${minute}분` : ""}`
}

export function proSummaryText(view: StudentProView, loaded = true, error = "") {
  if (!loaded) return "피드백 이용 현황을 확인하고 있어요."
  if (error) return "이용 현황을 불러오지 못했어요. 다시 확인해 주세요."
  if (!view.assigned) return "담당 선생님 배정 중이에요."
  if (!view.active) return "프로 이용이 종료되었어요."
  if (view.usage.used >= view.usage.limit) return "이번 달 피드백을 모두 받았어요."
  if (view.now >= view.cutoff) return "이번 주 신청이 마감됐어요."
  if (view.usage.available <= 0) return "지금 신청할 수 있는 권수가 없어요."
  return `${view.usage.available}권 더 신청할 수 있어요.`
}

type BookPresentation = {
  status: string; listStatus: string; tone: "blue" | "teal" | "gray";
  action?: "apply" | "cancel"; enabled: boolean; guide?: string;
}
export function proRequestFailure(view: StudentProView | undefined, reviewId: string, action: "apply" | "cancel", fallback: string) {
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
  if (!view.assigned) return { status: "담당 선생님 배정 중이에요.", listStatus: "제출 완료", tone: "gray", action: "apply", enabled: false }
  if (!c) return null
  if (c.selected) {
    if (c.locked) return { status: "피드백 작성 중", listStatus: "피드백 작성 중", tone: "teal", enabled: false }
    if (c.selection === "학생 신청" && view.now < c.cutoff) return { status: "피드백 신청 완료", listStatus: "피드백 신청 완료", tone: "blue", action: "cancel", enabled: c.canCancel }
    return { status: "피드백 대상 확정", listStatus: "피드백 대상 확정", tone: "teal", enabled: false }
  }
  if (!view.active) return { status: "프로 이용이 종료되었어요.", listStatus: "제출 완료", tone: "gray", enabled: false }
  if (c.week > weekStart(view.now)) return { status: "다음 주 신청", listStatus: "다음 주 신청", tone: "gray", action: "apply", enabled: false, guide: `이 글은 ${c.period}에 관리해요. 해당 주가 시작되면 피드백을 신청할 수 있어요.` }
  if (c.week < weekStart(view.now) || view.now >= c.cutoff || c.closed) return { status: "신청 마감", listStatus: "신청 마감", tone: "gray", enabled: false, guide: "이번 주 피드백 대상으로 정해지지 않았어요. 작성한 글은 계속 볼 수 있어요." }
  if (view.usage.available <= 0) return { status: "신청 가능한 권수가 없어요.", listStatus: "제출 완료", tone: "gray", action: "apply", enabled: false, guide: view.usage.used >= view.usage.limit ? "이번 달 피드백을 모두 받았어요." : view.usage.selected > 0 ? "다른 글로 바꾸려면 신청한 글을 먼저 취소해 주세요." : undefined }
  return { status: c.autoExpected ? "피드백 선정 예정" : "피드백 신청 가능", listStatus: c.autoExpected ? "피드백 선정 예정" : "피드백 신청 가능", tone: "blue", action: "apply", enabled: c.canApply, guide: c.autoExpected ? `${proStudentDeadline(c.cutoff, view.now)}까지 다른 글을 신청하지 않으면 이 글이 피드백 대상으로 정해져요.` : undefined }
}
