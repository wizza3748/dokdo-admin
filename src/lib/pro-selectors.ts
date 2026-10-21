// @ts-expect-error Node tests use explicit TypeScript extensions.
import { addDays, cutoffLabel, dateLabel, kstDate, managementMonth, monthWeeks, weekLabel, weekSchedule, weekStart } from "./pro-calendar.ts"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { autoCandidates, consultDue, currentConsultations, isActivePro, pendingFeedback, proChangeCandidates, proUsage, weekdayFor } from "./pro-domain.ts"
import type { ReviewDatabase, ReviewRecord } from "./review-domain"
import type { ProCase, ProMember, ProState } from "./pro-types"
export const selectionLabels = { student: "학생 신청", auto: "자동 선정", teacher: "선생님 지정", migration: "기존 기록 승계" }
export const proStatuses = ["지연", "피드백 필요", "미제출", "2차 대기", "자동 선정 대기", "관리 완료", "한도 사용"]
export const taskLabels = ["지연된 피드백", "이번 주 피드백", "1차 제출 독려", "2차 제출 독려", "상담 필요", "이번 달 상담 미완료", "이번 달 소멸 예정"]
/** Past weeks are rendered as of their closing time, not today's sent/closed state. */
export function proSnapshotAt(db: ReviewDatabase, at: string): ReviewDatabase {
  const snapshot = structuredClone(db), pro = snapshot.pro!
  pro.clock = at
  snapshot.records = snapshot.records.map(r => {
    const savedAt = r.savedAt && r.savedAt <= at ? r.savedAt : undefined
    const sentAt = r.sentAt && r.sentAt <= at ? r.sentAt : undefined
    return { ...r, writingStatus: r.submittedAt && r.submittedAt > at ? "writing" : r.writingStatus, savedAt, sentAt, feedbackStatus: sentAt ? "전송완료" : savedAt ? "작성완료" : "작성전" }
  })
  for (const c of pro.cases) {
    const events = pro.audit.filter(a => a.reviewId === c.reviewId && a.at <= at && ["대상 선정", "cancel", "1차 반려"].includes(a.kind)).sort((a, b) => a.at.localeCompare(b.at))
    const last = events.at(-1)
    if (last) { c.selectedAt = last.kind === "대상 선정" ? last.at : undefined; c.selection = last.kind === "대상 선정" ? last.after as ProCase["selection"] : undefined }
    else if (c.selectedAt && c.selectedAt > at) { c.selectedAt = undefined; c.selection = undefined }
    if (c.firstSentAt && c.firstSentAt > at) { c.firstSentAt = undefined; c.secondDeadline = undefined }
    if (c.closedAt && c.closedAt > at) { c.closedAt = undefined; c.closeReason = undefined }
    if (c.lockedAt && c.lockedAt > at) c.lockedAt = undefined
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
  const consultationAsOf = db.pro!.clock
  const consultation = currentConsultations(db.pro!, member.id, managementMonth(week))
  const due = consultDue(member, managementMonth(week))
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
  const consulted = consultation.some(c => c.result !== "미진행")
  const consultationDue = !consulted && !!due && kstDate(due) <= kstDate(consultationAsOf)
  const lastWeek = monthWeeks(month).at(-1) === week
  const tasks = [overdue.length, relevant.filter(f => weekStart(f.due) === week && f.due >= now).length, !submissions.length && remainingReminders.some(r => r.kind === "submission") ? 1 : 0, waiting.length && remainingReminders.some(r => r.kind === "revision") ? 1 : 0, consultationDue ? 1 : 0, !consulted && lastWeek ? 1 : 0, lastWeek && usage.available > 0 ? 1 : 0]
  const status = overdue.length ? "지연" : relevant.length ? "피드백 필요" : !submissions.length && usage.available > 0 ? "미제출" : waiting.length ? "2차 대기" : submissions.some(c => !c.selectedAt) && usage.available > 0 && now < weekSchedule(week, weekdayFor(pro, member, week)).cutoff ? "자동 선정 대기" : cases.some(c => c.week === week && c.closedAt) ? "관리 완료" : usage.used >= usage.limit ? "한도 사용" : submissions.length ? "관리 완료" : "미제출"
  const missedWeeks: string[] = []
  const submittedRecords = cases.flatMap(c => db.records.filter(r => r.reviewId === c.reviewId && r.writingStatus === "submitted" && r.submittedAt && r.submittedAt <= at).map(r => ({ week: r.round === 1 ? c.week : c.secondWeek, at: r.submittedAt! })))
  // Submission clears the warning immediately, including a post-cutoff submission
  // assigned to next week's feedback. Both rounds count; drafts do not.
  const submittedNow = submittedRecords.some(r => r.week === week || r.at >= week)
  for (let previous = addDays(week, -7); !submittedNow && member.assignedAt && previous >= weekStart(member.assignedAt) && previous >= weekStart(member.effectiveAt); previous = addDays(previous, -7)) {
    if (submittedRecords.some(r => r.week === previous)) break
    if (proUsage(pro, member, new Date(Date.parse(addDays(previous, 7)) - 1).toISOString()).available > 0) missedWeeks.unshift(previous)
  }
  return { member, usage, cases, submissions, waiting, feedback: relevant, overdue, tasks, status, consultation, consulted, consultDue: due, consultationDue, consultationAsOf, missed: missedWeeks.length, missedWeeks, asOf: now }
}
/** Task filters apply to books as well as students; prior work appears only once. */
export function weeklyTaskBooks(row: ReturnType<typeof weeklyStudent>, week: string, now: string, task: number | null) {
  const feedback = row.feedback.filter(f => task === 0 ? f.due < now : task === 1 ? weekStart(f.due) === week && f.due >= now : task === null)
    .filter((f, i, items) => items.findIndex(item => item.record.id === f.record.id) === i)
    .sort((a, b) => a.due.localeCompare(b.due) || a.record.id.localeCompare(b.record.id))
  const currentFeedback = feedback.filter(f => f.week === week)
  const submissions = task === null ? row.submissions : task === 0 || task === 1 ? row.submissions.filter(c => currentFeedback.some(f => f.c.reviewId === c.reviewId)) : []
  return { feedback, currentFeedback, submissions, waiting: task === null || task === 3 ? row.waiting : [] }
}
export function feedbackActionLabel(record: Pick<ReviewRecord, "savedAt" | "feedbackStatus">, readOnly = false) {
  return readOnly ? "피드백 조회" : record.savedAt || record.feedbackStatus === "작성완료" ? "피드백 확인" : "피드백 작성"
}
export function proTasks(db: ReviewDatabase, institutionId = "dokdo") {
  if (!db.pro) return { counts: taskLabels.map(() => 0), badge: 0 }
  const rows = db.pro.members.filter(m => m.institutionId === institutionId && isActivePro(m, db.pro!.clock)).map(m => weeklyStudent(db, m, weekStart(db.pro!.clock)))
  const counts = taskLabels.map((_, i) => rows.reduce((sum, r) => sum + r.tasks[i], 0))
  const badge = rows.reduce((sum, r) => sum + r.tasks.slice(0, 4).reduce((a, b) => a + b, 0) + (r.tasks[4] || r.tasks[5] ? 1 : 0), 0)
  return { counts, badge }
}
export function reminderCopy(db: ReviewDatabase, member: ProMember, kind: "submission" | "revision", week: string, recordedAt?: string) {
  // Completed reminders show a reference copy, never a fabricated sent-message archive.
  if (recordedAt) { db = proSnapshotAt(db, recordedAt); member = db.pro!.members.find(m => m.id === member.id)! }
  const row = weeklyStudent(db, member, week), schedule = weekSchedule(week, weekdayFor(db.pro!, member, week))
  const greeting = "안녕하세요, 책글섬 독도 관리 선생님입니다."
  if (kind === "revision") {
    if (!row.waiting.length) return "현재 제출을 기다리는 2차 작성글이 없습니다."
    const books = row.waiting.map(c => `▶ 도서: ${db.reviews.find(r => r.id === c.reviewId)?.bookTitle ?? "온라인 독후감"}\n▶ 2차 작성글 제출 기한: ${dateLabel(c.secondDeadline)}`).join("\n\n")
    return `${greeting}\n${member.name} 학생의 요청받은 2차 작성글 제출이 아직 확인되지 않아 안내드립니다.\n\n${books}\n▶ 같은 독후감의 2차 피드백은 추가 권수를 사용하지 않습니다.\n\n1차 피드백을 확인하고 기한 안에 2차 작성글을 제출할 수 있도록 독려 부탁드립니다.`
  }
  const u = row.usage
  const rollover = monthWeeks(u.month).at(-1) === week ? `이번 달에 아직 선정하지 않은 ${u.available}권은 다음 관리월로 이월되지 않습니다.` : "이번 주에 사용하지 않은 기회는 다음 주로 이월되며, 같은 관리월 안에서만 쓸 수 있습니다."
  return `${greeting}\n이번 주 ${member.name} 학생의 온라인 독후감 1차 작성글 제출이 아직 확인되지 않아 안내드립니다.\n\n▶ 제출 마감: ${cutoffLabel(schedule.cutoff)}\n▶ 이번 달 사용: ${u.used} / ${u.limit}권\n▶ 이번 주 남은 신청 권수: ${u.available}권\n▶ ${rollover}\n\n짧게라도 작성하여 제출할 수 있도록 독려 부탁드립니다.`
}
export type StudentProView = {
  studentId: string; name: string; now: string; active: boolean; assigned: boolean;
  usage: ReturnType<typeof proUsage>; period: string; cutoff: string; due: string;
  cases: { reviewId: string; week: string; period: string; selected: boolean; selection: string; locked: boolean; firstSent: boolean; cutoff: string; due: string; secondDeadline?: string; secondSubmitted: boolean; closed: boolean; expired: boolean; autoExpected: boolean; canApply: boolean; canCancel: boolean; changeCandidates?: string[]; reason: string }[];
}
/** Whitelist projection: never send institution identifiers, notes, audits or snapshots to students. */
export function studentProView(db: ReviewDatabase, studentId: string): StudentProView | undefined {
  const pro = db.pro, member = pro?.members.find(m => m.id === studentId)
  if (!pro || !member || member.product !== "pro") return undefined
  const now = pro.clock, week = weekStart(now), usage = proUsage(pro, member, now), schedule = weekSchedule(week, weekdayFor(pro, member, week))
  const expected = new Set(autoCandidates(db, member, week).slice(0, usage.available).map(c => c.reviewId))
  return { studentId, name: member.name, now, active: isActivePro(member, now), assigned: !!member.assignedAt && !!member.institutionId, usage, period: `${weekLabel(now)} (${kstDate(week)} ~ ${kstDate(addDays(week, 6))})`, cutoff: schedule.cutoff, due: schedule.due, cases: pro.cases.filter(c => c.studentId === studentId).map(c => {
    const reason = c.closedAt ? "관리가 종료되었어요." : c.selectedAt ? c.lockedAt ? "선생님이 피드백 작성을 시작했어요." : "피드백 대상으로 선정되었어요." : !isActivePro(member, now) ? "프로 이용이 종료되었어요." : c.week > week ? `${weekLabel(c.week)}에 관리해요. 해당 주가 시작되면 신청할 수 있어요.` : c.week < week || now >= c.cutoff ? "이 글은 신청 마감까지 피드백 대상으로 정해지지 않았어요." : usage.available <= 0 ? "남은 신청 권수가 없어요. 독후감은 계속 작성할 수 있어요." : ""
    return { reviewId: c.reviewId, week: c.week, period: weekLabel(c.week), selected: !!c.selectedAt, selection: c.selection ? selectionLabels[c.selection] : "", locked: !!c.lockedAt, firstSent: !!c.firstSentAt, cutoff: c.cutoff, due: c.due, secondDeadline: c.secondDeadline, secondSubmitted: db.records.some(r => r.reviewId === c.reviewId && r.round === 2 && r.writingStatus === "submitted"), closed: !!c.closedAt, expired: c.closeReason === "2차 미제출 기한 종료", autoExpected: !c.selectedAt && expected.has(c.reviewId) && now < c.cutoff, canApply: !reason && db.records.some(r => r.reviewId === c.reviewId && r.round === 1 && r.writingStatus === "submitted"), canCancel: !!c.selectedAt && c.selection === "student" && !c.lockedAt && !c.firstSentAt && now < c.cutoff, changeCandidates: proChangeCandidates(db, c.reviewId).map(item => item.reviewId), reason }
  }) }
}
export function scopePro(pro: ProState, institutionId: string): ProState {
  const members = pro.members.filter(m => m.institutionId === institutionId), ids = new Set(members.map(m => m.id))
  return { ...pro, members, cases: pro.cases.filter(c => ids.has(c.studentId)), schedules: pro.schedules.filter(s => s.institutionId === institutionId || members.some(m => m.matchingHistory?.some(h => h.institutionId === s.institutionId))), audit: pro.audit.filter(a => ids.has(a.studentId) || a.institutionId === institutionId), reminders: pro.reminders.filter(r => ids.has(r.studentId)), consultations: pro.consultations.filter(c => ids.has(c.studentId)), processed: [], reminderSnapshots: pro.reminderSnapshots.filter(s => ids.has(s.studentId)) }
}
export function caseParentLabel(c?: ProCase) { return !c?.selectedAt && !c?.firstSentAt ? "-" : c.parent.status === "sent" ? `발송 완료 ${dateLabel(c.parent.at)}` : c.parent.status === "missing" ? "연락처 미등록" : c.parent.status === "failed" ? "발송 실패" : "관리 종료 후 자동 발송" }
export function proCaseStatus(db: ReviewDatabase, c: ProCase) {
  if (c.closedAt) {
    if (c.closeReason === "2차 미제출 기한 종료") return "2차 제출 기한 종료"
    // Display legacy completions without rewriting the saved close reason or timestamps.
    return c.closeReason === "2차 완료 전송" || c.closeReason === "기존 2차 완료" ? "2차 피드백 완료" : "1차 피드백 완료"
  }
  const pending = pendingFeedback(db, c)[0]
  if (pending) return `${pending.record.round}차 ${pending.record.savedAt ? "전송 대기" : c.lockedAt && pending.record.round === 1 ? "피드백 작성 중" : "피드백 대기"}${pending.due < db.pro!.clock ? " · 지연" : ""}`
  if (c.secondDeadline) return "2차 글 제출 대기"
  return c.selectedAt ? "1차 피드백 대기" : "미선정"
}
