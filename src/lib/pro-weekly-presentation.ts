// @ts-expect-error Node tests use explicit TypeScript extensions.
import { addDays, kstDate, managementMonth, weekLabel, weekSchedule, weekStart } from "./pro-calendar.ts"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { proUsage, weekdayFor } from "./pro-domain.ts"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { monthlyConsultationSummary } from "./pro-consultation.ts"
import type { ReviewDatabase } from "./review-domain"
import type { ProMember } from "./pro-types"
import type { weeklyStudent } from "./pro-selectors"

type Row = ReturnType<typeof weeklyStudent>
/** A display-only formatter. Stored instants and cutoff comparisons are untouched. */
export function weeklyDate(at?: string) {
  if (!at) return "-"
  const day = kstDate(at).split("-").map(Number)
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" }).format(new Date(at))
  return `${day[1]}/${day[2]}(${weekday})`
}
export function weeklyDeadline(at?: string) {
  if (!at) return "-"
  const midnight = new Date(at).toISOString().endsWith("T15:00:00.000Z")
  return weeklyDate(midnight ? new Date(Date.parse(at) - 1).toISOString() : at)
}
export function consultationSummary(row: Row, week: string) {
  return monthlyConsultationSummary(row.consultation, row.consultDue, managementMonth(week), row.consultationAsOf)
}
export function hasPriorOverdue(row: Row, week: string) {
  return row.feedback.some(f => f.week < week && f.due < row.asOf)
}
export function weeklyRecord(db: ReviewDatabase, member: ProMember, week: string, now: string, currentAt = now) {
  const current = weekStart(now)
  const before = !member.assignedAt || week < weekStart(member.assignedAt) || week < weekStart(member.effectiveAt)
  const cases = db.pro!.cases.filter(c => c.studentId === member.id)
  const firstIds = new Set(cases.filter(c => c.week === week).map(c => c.reviewId))
  const secondIds = new Set(cases.filter(c => c.secondWeek === week).map(c => c.reviewId))
  // Use each writing's stored management week without changing its quota or deadline.
  // Both the marker and consecutive-missing warnings include submissions from either round.
  const submitted = new Set(db.records.filter(r => (r.round === 1 ? firstIds : secondIds).has(r.reviewId)
    && r.writingStatus === "submitted" && r.submittedAt && r.submittedAt <= now).map(r => `${r.reviewId}:${r.round}`)).size
  const firstSent = new Set(cases.filter(c => c.week === week && c.firstSentAt && c.firstSentAt <= now).map(c => c.reviewId)).size
  const secondSent = new Set(db.records.filter(r => secondIds.has(r.reviewId) && r.round === 2 && r.sentAt && r.sentAt <= now).map(r => r.reviewId)).size
  const sent = firstSent + secondSent
  const close = new Date(Date.parse(addDays(week, 7)) - 1).toISOString()
  const opportunity = proUsage(db.pro!, member, close).available > 0
  const label = before || week > current ? "-" : sent ? "피드백 전송" : submitted ? "제출 완료" : week < current && opportunity ? "미제출" : "-"
  return { label, submitted, sent, firstSent, secondSent, current: week === weekStart(currentAt) }
}
export const weeklyRecordLegend = ["미제출", "제출 완료", "피드백 전송"] as const
/** Keep a submitted writing visibly distinct from a week with no record yet. */
export function weeklyRecordAppearance(label: string) {
  if (label === "피드백 전송") return { label, symbol: "✓", className: "border-[#00C040] bg-[#00C040] text-white" }
  if (label === "미제출") return { label, symbol: "−", className: "border-[#FF3220] bg-[#FF3220] text-white" }
  if (label === "제출 완료") return { label, symbol: "↑", className: "border-[#FFC800] bg-[#FFC800] text-white" }
  return { label, symbol: "·", className: "border-slate-200 bg-slate-50 text-slate-500" }
}
export function weeklyWarning(row: Pick<Row, "missed" | "missedWeeks">) {
  if (row.missed < 2) return undefined
  return {
    label: row.missed >= 3 ? "본사 확인 필요" : "집중 관리",
    level: row.missed >= 3 ? "hq" as const : "attention" as const,
    lines: [
      `${row.missed}주 연속 온라인 독후감을 제출하지 않았습니다.`,
      ...row.missedWeeks.map(w => `${weekLabel(w)}: ${weeklyDate(w)} ~ ${weeklyDate(addDays(w, 6))}`),
      "신청 가능한 권수가 있었지만 제출 없이 끝난 주만 셉니다. 지난달 기록도 포함합니다.",
      "1차·2차 구분 없이 온라인 독후감을 제출하면 경고가 해제됩니다.",
      ...(row.missed === 2 ? ["학부모와 상담해 제출을 도와주세요."] : []),
    ],
  }
}
export function weeklyUsageHelp(usage: Pick<ReturnType<typeof proUsage>, "pending" | "available">) {
  if (!usage.available) return "현재 추가로 신청할 수 있는 권수가 없습니다."
  if (!usage.pending) return `지금 ${usage.available}권을 추가로 신청할 수 있습니다.`
  return `피드백을 받을 글로 정해진 ${usage.pending}권을 제외하고, ${usage.available}권을 더 신청할 수 있습니다.`
}
/** Display-only reminder buttons; recording eligibility remains server-validated. */
export function weeklyReminderItems(db: ReviewDatabase, row: Row, week: string, includeInactive = false) {
  const pro = db.pro!, schedule = weekSchedule(week, weekdayFor(pro, row.member, week))
  const records = pro.reminders.filter(r => r.studentId === row.member.id && r.week === week && !r.cancelledAt)
  const assignedWeek = !!row.member.assignedAt && weekStart(row.member.assignedAt) === week
  return (["submission", "revision"] as const).flatMap(kind => {
    const relevant = !assignedWeek && (kind === "submission" ? !row.submissions.length && row.usage.available > 0 : row.waiting.length > 0)
    if (!includeInactive && !relevant && !records.some(r => r.kind === kind)) return []
    return ([1, 2] as const).map(sequence => {
      const record = records.find(r => r.kind === kind && r.sequence === sequence)
      const due = sequence === 1 ? schedule.remind1 : schedule.remind2
      const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" }).format(new Date(due))
      return { kind, sequence, record, due, late: !record && relevant && due < row.asOf,
        label: kind === "submission" ? "1차 제출 독려" : "2차 제출 독려",
        buttonLabel: `${sequence}회 · ${weekday} · ${record ? "완료" : "예정"}` }
    })
  })
}
export const weeklyTaskHelp = [
  ["처리 기한이 지났는데 학생에게 아직 보내지 않은 피드백입니다. 이전 주의 미완료 건도 포함합니다.", "1차와 2차 피드백은 각각 1건으로 셉니다."],
  ["처리 기한이 이번 주이고, 학생에게 아직 보내지 않은 피드백입니다.", "기한이 지난 건은 ‘지연된 피드백’에서 확인하세요."],
  ["피드백 신청은 가능하지만 이번 주 1차 작성글을 아직 제출하지 않은 학생입니다.", "독려 예정일이 되었는데 발송 기록이 없는 학생만 셉니다."],
  ["선생님이 요청한 2차 작성글을 아직 제출하지 않은 학생입니다.", "독려 예정일이 되었는데 발송 기록이 없는 학생만 셉니다. 대상 글이 여러 개여도 한 명으로 셉니다."],
  ["상담 예정일이 오늘이거나 지났고, 이번 달 상담 완료 기록이 없는 학생입니다.", "‘미진행’도 포함하며, 유선 완료 또는 카톡 대체로 기록하면 제외됩니다."],
  ["이번 달 마지막 관리 주까지 상담 완료 기록이 없는 학생입니다.", "‘미진행’으로 기록한 학생도 포함합니다."],
  ["이번 달 마지막 관리 주에만 표시합니다.", "이번 달이 끝나면 사라지는 신청 가능 권수와 해당 학생 수입니다.", "이미 피드백 대상으로 정해진 글과 2차 작성글은 제외합니다."],
]
export const weeklyColumnHelp: Record<string, string[]> = {
  "월 주차별 기록": ["학생의 제출과 선생님의 피드백 전송 기록입니다. 1차·2차 모두 포함합니다.", "미제출: 신청 가능한 권수가 있었지만 독후감 제출 없이 끝난 주입니다.", "제출 완료: 학생이 독후감을 제출했고, 아직 피드백 전송 기록이 없는 주입니다.", "피드백 전송: 학생에게 보낸 피드백이 있는 주입니다. 남은 처리 건은 피드백 현황에서 확인하세요.", "각 기호를 누르면 해당 주에 제출한 독후감과 전송한 피드백의 건수를 볼 수 있습니다."],
  "피드백 이용 권수": ["기본 월 한도는 4권이며, 매주 신청 가능한 권수가 1권씩 추가됩니다.", "사용: 학생에게 1차 피드백을 보낸 권수입니다. 차감 취소한 건은 제외합니다.", "남은 신청 권수: 이미 신청·선정된 글을 제외하고, 새 독후감을 신청하거나 지정할 수 있는 권수입니다.", "이월: 이전 주에서 넘어온 권수 중 지금 신청할 수 있는 권수입니다. 신청하면 이월분부터 사용하며, 같은 관리월 안에서만 쓸 수 있습니다.", "같은 글의 2차 피드백은 추가로 차감하지 않습니다."],
  "피드백 현황": ["현재 처리할 온라인 독후감의 상태와 기한입니다. 이전 주의 미완료 글도 포함합니다.", "작성 필요: 피드백을 작성해 주세요.", "전송 대기: 저장한 피드백을 확인한 뒤 학생에게 보내 주세요.", "글이 여러 개면 ‘모두 보기’를 눌러 각각 처리할 수 있습니다."],
  "제출 독려 현황": ["피드백이 일요일이면 목요일에 1회, 금요일에 2회 독려합니다. 다른 요일은 설정에 따라 달라집니다.", "예정 버튼을 눌러 문구를 복사하고, 카톡으로 직접 보내 주세요.", "보낸 뒤 ‘보냈어요’를 누르면 완료로 기록됩니다. 자동 발송은 하지 않습니다."],
  "상담 현황": ["학생마다 한 달에 한 번 상담합니다. 주가 바뀌어도 같은 달의 기록을 보여 줍니다.", "‘유선 완료’와 ‘카톡 대체’는 상담 완료, ‘미진행’은 미완료입니다.", "상담 후 ‘상담 기록’에서 결과를 남겨 주세요."],
}
