// @ts-expect-error Node tests use explicit TypeScript extensions.
import { addDays, cutoffLabel, dateLabel, kstDate, managementMonth, monthWeeks, weekLabel, weekSchedule, weekStart } from "./pro-calendar.ts"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { autoCandidates, consultDue, currentConsultations, isActivePro, pendingFeedback, proUsage, weekdayFor } from "./pro-domain.ts"
import type { ReviewDatabase } from "./review-domain"
import type { ProCase, ProMember, ProState } from "./pro-types"
export const selectionLabels = { student: "학생 신청", auto: "자동 선정", teacher: "선생님 지정", migration: "기존 기록 승계" }
export const proStatuses = ["지연", "피드백 필요", "미제출", "2차 대기", "자동 선정 대기", "관리 완료", "한도 사용"]
export const taskLabels = ["지연된 피드백", "이번 주 피드백", "제출 독려", "수정본 독려", "오늘 상담", "이번 달 상담 미완료", "이번 달 소멸 예정"]
/** Past weeks are rendered as of their closing time, not today's sent/closed state. */
export function proSnapshotAt(db: ReviewDatabase, at: string): ReviewDatabase {
  const snapshot = structuredClone(db), pro = snapshot.pro!
  pro.clock = at
  snapshot.records = snapshot.records.map(r => ({ ...r, writingStatus: r.submittedAt && r.submittedAt > at ? "writing" : r.writingStatus, sentAt: r.sentAt && r.sentAt > at ? undefined : r.sentAt }))
  for (const c of pro.cases) {
    const events = pro.audit.filter(a => a.reviewId === c.reviewId && a.at <= at && ["대상 선정", "cancel", "1차 반려"].includes(a.kind)).sort((a, b) => a.at.localeCompare(b.at))
    const last = events.at(-1)
    if (last) { c.selectedAt = last.kind === "대상 선정" ? last.at : undefined; c.selection = last.kind === "대상 선정" ? last.after as ProCase["selection"] : undefined }
    else if (c.selectedAt && c.selectedAt > at) { c.selectedAt = undefined; c.selection = undefined }
    if (c.firstSentAt && c.firstSentAt > at) { c.firstSentAt = undefined; c.secondDeadline = undefined }
    if (c.closedAt && c.closedAt > at) { c.closedAt = undefined; c.closeReason = undefined }
    if (!snapshot.records.some(r => r.reviewId === c.reviewId && r.round === 2 && r.writingStatus === "submitted")) { c.secondWeek = undefined; c.secondDue = undefined }
  }
  for (const change of [...pro.audit].reverse().filter(a => a.kind === "limit" && a.at > at)) {
    const member = pro.members.find(m => m.id === change.studentId)
    const before = change.before as { limit?: number }
    if (member && change.month && before?.limit !== undefined) member.limits[change.month] = before.limit
  }
  pro.consultations = pro.consultations.filter(c => c.at <= at)
  pro.reminders = pro.reminders.filter(r => r.at <= at).map(r => ({ ...r, cancelledAt: r.cancelledAt && r.cancelledAt > at ? undefined : r.cancelledAt }))
  return snapshot
}
export function weeklyStudent(db: ReviewDatabase, member: ProMember, week: string) {
  if (db.pro && week < weekStart(db.pro.clock)) { db = proSnapshotAt(db, new Date(Date.parse(addDays(week, 7)) - 1).toISOString()); member = db.pro!.members.find(m => m.id === member.id)! }
  const pro = db.pro!, now = pro.clock, month = managementMonth(week), at = week === weekStart(now) ? now : new Date(Date.parse(addDays(week, 7)) - 1).toISOString()
  const usage = proUsage(pro, member, at, month)
  const cases = pro.cases.filter(c => c.studentId === member.id)
  const feedback = cases.flatMap(c => pendingFeedback(db, c).map(f => ({ ...f, c })))
  const relevant = feedback.filter(f => f.week <= week)
  const submissions = cases.filter(c => c.week === week && db.records.some(r => r.reviewId === c.reviewId && r.round === 1 && r.writingStatus === "submitted"))
  const waiting = cases.filter(c => c.secondDeadline && !c.closedAt && !c.secondWeek)
  const overdue = relevant.filter(f => f.due < now)
  const remainingReminders = pro.reminderSnapshots.filter(s => s.studentId === member.id && s.week === week && !pro.reminders.some(r => r.studentId === member.id && r.week === week && r.kind === s.kind && r.sequence === s.sequence && !r.cancelledAt))
  const consultation = currentConsultations(pro, member.id, month), consulted = consultation.some(c => c.result !== "미진행")
  const due = consultDue(member, month), lastWeek = monthWeeks(month).at(-1) === week
  const tasks = [overdue.length, relevant.filter(f => f.week === week && f.due >= now).length, !submissions.length && remainingReminders.some(r => r.kind === "submission") ? 1 : 0, waiting.length && remainingReminders.some(r => r.kind === "revision") ? 1 : 0, !consulted && due && kstDate(due) === kstDate(now) ? 1 : 0, !consulted && lastWeek ? 1 : 0, lastWeek && usage.available > 0 ? 1 : 0]
  const status = overdue.length ? "지연" : relevant.length ? "피드백 필요" : !submissions.length && usage.available > 0 ? "미제출" : waiting.length ? "2차 대기" : submissions.some(c => !c.selectedAt) && usage.available > 0 && now < weekSchedule(week, weekdayFor(pro, member, week)).cutoff ? "자동 선정 대기" : cases.some(c => c.week === week && c.closedAt) ? "관리 완료" : usage.used >= usage.limit ? "한도 사용" : submissions.length ? "관리 완료" : "미제출"
  let missed = 0
  for (let previous = addDays(week, -7); member.assignedAt && previous >= weekStart(member.assignedAt) && previous >= weekStart(member.effectiveAt); previous = addDays(previous, -7)) {
    if (cases.some(c => c.week === previous && db.records.some(r => r.reviewId === c.reviewId && r.writingStatus === "submitted"))) break
    if (proUsage(pro, member, new Date(Date.parse(addDays(previous, 7)) - 1).toISOString()).available > 0) missed++
  }
  return { member, usage, cases, submissions, waiting, feedback: relevant, overdue, tasks, status, consultation, consulted, consultDue: due, missed }
}
export function proTasks(db: ReviewDatabase, institutionId = "dokdo") {
  if (!db.pro) return { counts: taskLabels.map(() => 0), badge: 0 }
  const rows = db.pro.members.filter(m => m.institutionId === institutionId && isActivePro(m, db.pro!.clock)).map(m => weeklyStudent(db, m, weekStart(db.pro!.clock)))
  const counts = taskLabels.map((_, i) => rows.reduce((sum, r) => sum + r.tasks[i], 0))
  const badge = rows.reduce((sum, r) => sum + r.tasks.slice(0, 4).reduce((a, b) => a + b, 0) + (r.tasks[4] || r.tasks[5] ? 1 : 0), 0)
  return { counts, badge }
}
export function reminderCopy(db: ReviewDatabase, member: ProMember, kind: "submission" | "revision", week: string) {
  const row = weeklyStudent(db, member, week), schedule = weekSchedule(week, weekdayFor(db.pro!, member, week))
  if (kind === "revision") return row.waiting.map(c => `안녕하세요. 독도 관리 선생님입니다. ${member.name} 학생의 ${db.reviews.find(r => r.id === c.reviewId)?.bookTitle} 2차 글 제출을 안내드립니다.\n1차 피드백을 확인하고 ${dateLabel(c.secondDeadline)}까지 수정본을 제출해 주세요. 2차 피드백은 추가 권수 차감 없이 진행합니다.`).join("\n\n") || "현재 제출을 기다리는 수정본이 없습니다."
  const u = row.usage
  return `안녕하세요. 독도 관리 선생님입니다. ${member.name} 학생의 이번 주 온라인 독후감 제출을 안내드립니다.\n${cutoffLabel(schedule.cutoff)}까지 글을 제출해 주세요. 이번 주 추가 신청 가능 권수는 ${u.available}권입니다.\n이번 달 피드백은 ${u.used}권 이용했고, 아직 선정하지 않은 기회는 ${Math.max(0, u.limit - u.used - u.pending)}권입니다.${u.rollover ? `\n이전 주에서 이월된 ${u.rollover}권이 포함되어 있습니다.` : ""}${monthWeeks(u.month).at(-1) === week ? `\n이번 달에 사용하지 않은 기회는 다음 달로 이월되지 않습니다. 현재 소멸 예정 기회는 ${u.available}권입니다.` : ""}`
}
export type StudentProView = {
  studentId: string; name: string; now: string; active: boolean; assigned: boolean;
  usage: ReturnType<typeof proUsage>; period: string; cutoff: string; due: string;
  cases: { reviewId: string; week: string; period: string; selected: boolean; selection: string; locked: boolean; firstSent: boolean; cutoff: string; due: string; secondDeadline?: string; secondSubmitted: boolean; closed: boolean; expired: boolean; autoExpected: boolean; canApply: boolean; canCancel: boolean; reason: string }[];
}
/** Whitelist projection: never send institution identifiers, notes, audits or snapshots to students. */
export function studentProView(db: ReviewDatabase, studentId: string): StudentProView | undefined {
  const pro = db.pro, member = pro?.members.find(m => m.id === studentId)
  if (!pro || !member || member.product !== "pro") return undefined
  const now = pro.clock, week = weekStart(now), usage = proUsage(pro, member, now), schedule = weekSchedule(week, weekdayFor(pro, member, week))
  const expected = new Set(autoCandidates(db, member, week).slice(0, usage.available).map(c => c.reviewId))
  return { studentId, name: member.name, now, active: isActivePro(member, now), assigned: !!member.assignedAt && !!member.institutionId, usage, period: `${weekLabel(now)} (${kstDate(week)} ~ ${kstDate(addDays(week, 6))})`, cutoff: schedule.cutoff, due: schedule.due, cases: pro.cases.filter(c => c.studentId === studentId).map(c => {
    const reason = c.closedAt ? "관리가 종료되었어요." : c.selectedAt ? c.lockedAt ? "선생님이 피드백 작성을 시작했어요." : "피드백 대상으로 선정되었어요." : !isActivePro(member, now) ? "프로 이용이 종료되었어요." : c.week > week ? `${weekLabel(c.week)}에 관리해요. 해당 주가 시작되면 신청할 수 있어요.` : c.week < week || now >= c.cutoff ? "이번 주 피드백 대상으로 선정되지 않았어요." : usage.available <= 0 ? "남은 신청 권수가 없어요. 독후감은 계속 작성할 수 있어요." : ""
    return { reviewId: c.reviewId, week: c.week, period: weekLabel(c.week), selected: !!c.selectedAt, selection: c.selection ? selectionLabels[c.selection] : "", locked: !!c.lockedAt, firstSent: !!c.firstSentAt, cutoff: c.cutoff, due: c.due, secondDeadline: c.secondDeadline, secondSubmitted: db.records.some(r => r.reviewId === c.reviewId && r.round === 2 && r.writingStatus === "submitted"), closed: !!c.closedAt, expired: c.closeReason === "2차 미제출 기한 종료", autoExpected: !c.selectedAt && expected.has(c.reviewId) && now < c.cutoff, canApply: !reason && db.records.some(r => r.reviewId === c.reviewId && r.round === 1 && r.writingStatus === "submitted"), canCancel: !!c.selectedAt && !c.lockedAt && !c.firstSentAt && now < c.cutoff, reason }
  }) }
}
export function scopePro(pro: ProState, institutionId: string): ProState {
  const members = pro.members.filter(m => m.institutionId === institutionId), ids = new Set(members.map(m => m.id))
  return { ...pro, members, cases: pro.cases.filter(c => c.institutionId === institutionId), schedules: pro.schedules.filter(s => s.institutionId === institutionId), audit: pro.audit.filter(a => ids.has(a.studentId)), reminders: pro.reminders.filter(r => ids.has(r.studentId)), consultations: pro.consultations.filter(c => ids.has(c.studentId)), processed: [], reminderSnapshots: pro.reminderSnapshots.filter(s => ids.has(s.studentId)) }
}
export function caseParentLabel(c?: ProCase) { return !c ? "-" : c.parent.status === "sent" ? `발송 완료 ${dateLabel(c.parent.at)}` : c.parent.status === "missing" ? "연락처 미등록" : c.parent.status === "failed" ? "발송 실패" : "관리 종료 후 자동 발송" }
