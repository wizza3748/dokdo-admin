// @ts-expect-error Node tests use explicit TypeScript extensions.
import { addDays, consultationDate, kstDate, managementMonth, monthWeeks, secondDeadline, submissionPeriod, weekSchedule, weekStart } from "./pro-calendar.ts"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { applyReviewCommand, canAccessReview, canSendReview, type ReviewActor, type ReviewCommand, type ReviewDatabase, type ReviewRecord } from "./review-domain.ts"
import type { ProCase, ProCommand, ProMember, ProState } from "./pro-types"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { atReviewTime, beginProClockTest, endProClockTest, reviewNow } from "./review-clock.ts"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { activeFeedbackSchedule, feedbackScheduleRevision, feedbackScheduleSnapshot, validFeedbackScheduleTime, type FeedbackSchedule } from "./review-schedule.ts"
export const PRO_SEND_CONFIRM = "피드백을 전송하면 학부모에게 결과가 자동 발송됩니다. 전송 후에는 '2차 작성 요청'으로 변경할 수 없습니다."
export const PRO_BULK_SEND_CONFIRM = "프로 학생의 '1차 완료' 건은 학부모에게 결과가 자동 발송됩니다. 전송 후에는 '2차 작성 요청'으로 변경할 수 없습니다."
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
export function isActivePro(member?: ProMember, at?: string) { return !!member && member.product === "pro" && member.status === "active" && (!at || (!member.endedAt || at < member.endedAt) && at <= member.serviceEnd) }
export function memberFor(db: ReviewDatabase, studentId: string) { return db.pro?.members.find(m => m.id === studentId) }
export function weekdayFor(pro: ProState, member: ProMember, week: string) {
  const history = [...(member.matchingHistory ?? [])].sort((a, b) => a.at.localeCompare(b.at))
  const matching = history.filter((entry, i) => (i === 0 ? weekStart(entry.at) : addDays(weekStart(entry.at), 7)) <= week).at(-1)
  const institutionId = matching?.institutionId ?? member.institutionId
  // Legacy teacherId is retained as historical data, not a scheduling partition.
  return pro.schedules.filter(s => s.institutionId === institutionId && s.from <= week).sort((a, b) => b.from.localeCompare(a.from))[0]?.weekday ?? 7
}
export function proUsage(pro: ProState, member: ProMember, at: string, month = managementMonth(at)) {
  const cases = pro.cases.filter(c => c.studentId === member.id && c.month === month)
  const used = cases.filter(c => c.firstSentAt && c.firstSentAt <= at && (!c.debitCancelledAt || c.debitCancelledAt > at)).length
  const pending = cases.filter(c => c.selectedAt && c.selectedAt <= at && (!c.firstSentAt || c.firstSentAt > at) && (!c.closedAt || c.closedAt > at)).length
  const elapsed = monthWeeks(month).filter(w => w <= weekStart(at) && !!member.assignedAt && w >= weekStart(member.assignedAt) && w >= weekStart(member.effectiveAt) && (!member.endedAt || w <= weekStart(member.endedAt))).length
  const limit = member.limits[month] ?? 4
  const available = month === managementMonth(at) && isActivePro(member, at) && member.institutionId ? Math.max(0, Math.min(elapsed, limit) - used - pending) : 0
  const week = weekStart(at)
  const selected = cases.filter(c => c.week === week && c.selectedAt && c.selectedAt <= at).length
  const previousUsed = cases.filter(c => c.firstSentAt && c.firstSentAt < week && (!c.debitCancelledAt || c.debitCancelledAt >= week)).length
  const previousPending = cases.filter(c => c.selectedAt && c.selectedAt < week && (!c.firstSentAt || c.firstSentAt >= week) && (!c.closedAt || c.closedAt >= week)).length
  const rollover = Math.max(0, Math.min(Math.max(0, elapsed - 1), limit) - previousUsed - previousPending)
  // Use older opportunities first. Keep the week-start snapshot separate from the remaining balance.
  const rolloverAvailable = Math.min(available, Math.max(0, Math.min(Math.max(0, elapsed - 1), limit) - used - pending))
  return { month, week, used, pending, elapsed, limit, available, selected, total: selected + available, rollover, rolloverAvailable }
}
function firstRecord(db: ReviewDatabase, id: string) { return db.records.find(r => r.reviewId === id && r.round === 1)! }
/** Read-only candidate calculation, reused by the projection and atomic write. */
export function proChangeCandidates(db: ReviewDatabase, reviewId: string): ProCase[] {
  const pro = db.pro, target = pro?.cases.find(c => c.reviewId === reviewId)
  const member = pro?.members.find(m => m.id === target?.studentId)
  if (!pro || !target || !member || !isActivePro(member, pro.clock) || !member.assignedAt || !member.institutionId) return []
  if (target.selectedAt || target.closedAt || target.firstSentAt || target.week !== weekStart(pro.clock) || pro.clock >= target.cutoff || firstRecord(db, reviewId)?.writingStatus !== "submitted") return []
  const before = proUsage(pro, member, pro.clock)
  if (before.available !== 0 || before.used >= before.limit) return []
  return pro.cases.filter(old => {
    if (old.reviewId === reviewId || old.studentId !== member.id || old.month !== target.month || !old.selectedAt || old.selection !== "student" || old.lockedAt || old.firstSentAt || old.closedAt || pro.clock >= old.cutoff) return false
    const released = { ...pro, cases: pro.cases.map(c => c === old ? { ...c, selectedAt: undefined, selection: undefined } : c) }
    return proUsage(released, member, pro.clock).available === before.available + 1
  })
}
/** Shared by designation entry points and the final server-side write. */
export function proDesignationIssue(db: ReviewDatabase, reviewId: string) {
  const pro = db.pro, c = pro?.cases.find(item => item.reviewId === reviewId)
  const common = db.reviews.find(item => item.id === reviewId)
  const member = pro?.members.find(item => item.id === common?.studentId)
  if (!pro || !member || !c || !member.institutionId) return "매칭 기관이 배정된 프로 학생의 제출글만 피드백 대상으로 지정할 수 있습니다."
  if (c.selectedAt) return "이미 피드백 대상으로 선정된 글입니다. 목록에서 다시 확인해 주세요."
  if (c.closedAt || c.firstSentAt) return "이미 처리가 종료된 글은 피드백 대상으로 지정할 수 없습니다."
  if (firstRecord(db, reviewId)?.writingStatus !== "submitted") return "학생이 제출을 완료한 글만 피드백 대상으로 지정할 수 있습니다."
  if (c.week < weekStart(pro.clock)) return "이전 주에 제출한 미선정 글은 피드백 대상으로 지정할 수 없습니다."
  if (c.week > weekStart(pro.clock)) return "해당 관리 주차가 시작된 뒤 피드백 대상으로 지정할 수 있습니다."
  if (!isActivePro(member, pro.clock)) return "프로 이용이 종료된 학생의 글은 피드백 대상으로 지정할 수 없습니다."
  if (proUsage(pro, member, pro.clock).available <= 0) return "현재 남은 신청 권수가 0권이므로 이 글을 피드백 대상으로 지정할 수 없습니다."
  return ""
}
export type ProDesignationPreview = { issue: string; quota?: { available: number; after: number } }
/** Read-only confirmation snapshot; the final command still rechecks eligibility. */
export function proDesignationPreview(db: ReviewDatabase, reviewId: string): ProDesignationPreview {
  const issue = proDesignationIssue(db, reviewId)
  if (issue) return { issue }
  const pro = db.pro!, common = db.reviews.find(item => item.id === reviewId)!
  const member = pro.members.find(item => item.id === common.studentId)!
  const available = proUsage(pro, member, pro.clock).available
  return { issue: "", quota: { available, after: available - 1 } }
}
function audit(pro: ProState, id: string, kind: string, at: string, actor: string, studentId: string, extra: Partial<ProState["audit"][number]> = {}) { pro.audit.push({ id, kind, at, actor, studentId, ...extra }) }
function newCase(pro: ProState, member: ProMember, reviewId: string, submittedAt: string): ProCase {
  const initial = submissionPeriod(submittedAt, weekdayFor(pro, member, weekStart(submittedAt)))
  const period = submissionPeriod(submittedAt, weekdayFor(pro, member, initial.week))
  return { reviewId, studentId: member.id, institutionId: member.institutionId!, teacherId: member.teacherId, ...period, parent: { status: "none", attempts: [] }, finalSnapshots: [], aiSnapshots: [] }
}
function select(pro: ProState, c: ProCase, at: string, selection: ProCase["selection"], actor: string) {
  const member = pro.members.find(item => item.id === c.studentId)
  const historical = member?.matchingHistory?.filter(item => item.at <= at).sort((a, b) => a.at.localeCompare(b.at)).at(-1)
  c.institutionId = historical?.institutionId ?? member?.institutionId ?? c.institutionId
  c.selectedAt = at; c.selection = selection
  audit(pro, `select:${c.reviewId}:${at}`, "대상 선정", at, actor, c.studentId, { reviewId: c.reviewId, month: c.month, week: c.week, after: selection })
}
/** Prototype delivery adapter: no SMS/network is sent. Called inside the atomic aggregate update. */
function deliverParent(db: ReviewDatabase, c: ProCase, at: string) {
  if (c.parent.status === "sent") return
  const sent = db.records.filter(r => r.reviewId === c.reviewId && r.feedbackStatus === "전송완료").sort((a, b) => b.round - a.round)
  const prior = sent.find(r => r.parentSentAt)
  if (prior) { c.parent.status = "sent"; c.parent.at = prior.parentSentAt; return }
  const record = sent[0]
  if (!record || !record.parentContact) { c.parent.status = "missing"; c.parent.at = at; c.parent.attempts.push({ at, result: "연락처 없음" }); return }
  if (db.pro?.clockMode === "test" && c.parent.simulateFailureOnce) {
    delete c.parent.simulateFailureOnce
    c.parent.status = "failed"; c.parent.at = at; c.parent.attempts.push({ at, result: "프로토타입 발송 실패" }); return
  }
  c.parent.status = "sent"; c.parent.at = at; c.parent.attempts.push({ at, result: "프로토타입 발송 성공" }); record.parentSentAt = at
}
function close(db: ReviewDatabase, c: ProCase, at: string, reason: string) {
  if (c.closedAt) return
  c.closedAt = at; c.closeReason = reason
  audit(db.pro!, `close:${c.reviewId}`, "관리 종료", at, "자동 처리", c.studentId, { reviewId: c.reviewId, after: reason })
  deliverParent(db, c, at)
}
/** Idempotent migration. No ordinary records are rewritten and no raw AI output is invented. */
export function migrateProRecords(db: ReviewDatabase) {
  const pro = db.pro; if (!pro) return db
  for (const member of pro.members) {
    if (member.product !== "pro" || !member.institutionId || !member.assignedAt) continue
    for (const common of db.reviews.filter(r => r.studentId === member.id)) {
      const first = firstRecord(db, common.id)
      if (!first?.submittedAt || first.writingStatus !== "submitted" || pro.cases.some(c => c.reviewId === common.id)) continue
      const c = newCase(pro, member, common.id, first.submittedAt)
      pro.cases.push(c)
      if (first.sentAt || first.savedAt || first.aiHistory.length) {
        select(pro, c, first.aiHistory[0]?.at ?? first.savedAt ?? first.sentAt!, "migration", "기존 기록 승계")
        c.lockedAt = c.selectedAt
      }
      if (first.sentAt) {
        c.firstSentAt = first.sentAt
        if (common.secondDecision === "request") c.secondDeadline = secondDeadline(first.sentAt, c.weekday)
        else { c.closedAt = first.sentAt; c.closeReason = "기존 1차 완료" }
        // Old successful parent deliveries are inherited without sending again.
        const parent = db.records.find(r => r.reviewId === common.id && r.parentSentAt)
        if (parent) c.parent = { status: "sent", at: parent.parentSentAt, attempts: [] }
      }
      const second = db.records.find(r => r.reviewId === common.id && r.round === 2)
      if (second?.writingStatus === "submitted" && second.submittedAt) {
        const period = submissionPeriod(second.submittedAt, c.weekday); c.secondWeek = period.week; c.secondDue = period.due
        if (second.sentAt) { c.closedAt = second.sentAt; c.closeReason = "기존 2차 완료" }
      }
      audit(pro, `migration:${c.reviewId}`, "기존 기록 승계", pro.effectiveAt, "자동 처리", member.id, { reviewId: c.reviewId, month: c.month, week: c.week })
    }
  }
  return db
}
export function autoCandidates(db: ReviewDatabase, member: ProMember, week: string) {
  return (db.pro?.cases ?? []).filter(c => c.studentId === member.id && c.week === week && !c.selectedAt && !c.firstSentAt && !c.closedAt && firstRecord(db, c.reviewId)?.writingStatus === "submitted")
    .sort((a, b) => (firstRecord(db, b.reviewId).submittedAt ?? "").localeCompare(firstRecord(db, a.reviewId).submittedAt ?? "") || firstRecord(db, b.reviewId).id.localeCompare(firstRecord(db, a.reviewId).id, undefined, { numeric: true }))
}
/** Catch-up events are ordered by policy time, never by the late read time. */
export function reconcilePro(db: ReviewDatabase, at = db.pro?.clock ?? new Date().toISOString()) {
  if (!db.pro) return db
  migrateProRecords(db)
  const pro = db.pro
  const events: { id: string; at: string; member?: ProMember; week?: string; kind: "auto" | "submission" | "revision" | "expire"; sequence?: 1 | 2; c?: ProCase }[] = []
  for (const member of pro.members) {
    if (!member.assignedAt || !member.institutionId) continue
    for (let week = weekStart(pro.effectiveAt); week <= weekStart(at); week = addDays(week, 7)) {
      if (week < weekStart(member.assignedAt)) continue
      const schedule = weekSchedule(week, weekdayFor(pro, member, week))
      events.push({ id: `auto:${member.id}:${week}`, at: schedule.cutoff, kind: "auto", member, week })
      for (const sequence of [1, 2] as const) for (const kind of ["submission", "revision"] as const) events.push({ id: `${kind}:${sequence}:${member.id}:${week}`, at: sequence === 1 ? schedule.remind1 : schedule.remind2, kind, member, week, sequence })
    }
  }
  for (const c of pro.cases) if (c.secondDeadline && !c.closedAt) events.push({ id: `expire:${c.reviewId}`, at: c.secondDeadline, kind: "expire", c })
  for (const event of events.sort((a, b) => a.at.localeCompare(b.at))) {
    if (event.at > at || pro.processed.includes(event.id) || event.at < pro.effectiveAt) continue
    if (event.kind === "expire") {
      const c = event.c!, submitted = db.records.find(r => r.reviewId === c.reviewId && r.round === 2 && r.writingStatus === "submitted" && r.submittedAt && r.submittedAt < c.secondDeadline!)
      if (!submitted) close(db, c, event.at, "2차 미제출 기한 종료")
    } else {
      const member = event.member!, week = event.week!
      if (isActivePro(member, event.at) && event.at >= member.effectiveAt) {
        if (event.kind === "auto") {
          // At a Monday midnight cutoff the opportunity still belongs to the previous week.
          const usageAt = new Date(Date.parse(event.at) - 1).toISOString()
          const remaining = proUsage(pro, member, usageAt, managementMonth(week)).available
          for (const c of autoCandidates(db, member, week).filter(c => firstRecord(db, c.reviewId).submittedAt! < event.at).slice(0, remaining)) select(pro, c, event.at, "auto", "자동 처리")
        } else if (week !== weekStart(member.assignedAt!)) {
          const hasSubmission = pro.cases.some(c => c.studentId === member.id && c.week === week && (firstRecord(db, c.reviewId)?.submittedAt ?? "z") < event.at && firstRecord(db, c.reviewId)?.writingStatus === "submitted")
          const waiting = pro.cases.some(c => c.studentId === member.id && c.firstSentAt && c.firstSentAt < event.at && c.secondDeadline && c.secondDeadline > event.at && (!c.closedAt || c.closedAt > event.at) && !db.records.some(r => r.reviewId === c.reviewId && r.round === 2 && r.writingStatus === "submitted" && r.submittedAt! < event.at))
          if (event.kind === "submission" ? !hasSubmission && proUsage(pro, member, event.at).available > 0 : waiting) pro.reminderSnapshots.push({ studentId: member.id, week, kind: event.kind, sequence: event.sequence!, due: event.at })
        }
      }
    }
    pro.processed.push(event.id)
  }
  return db
}
function access(pro: ProState, actor: ReviewActor, member: ProMember) { check(actor.role === "student" ? actor.studentId === member.id : actor.role === "agency" && actor.institutionId === member.institutionId, "해당 학생의 처리 권한이 없습니다.") }
export function applyProCommand(input: ReviewDatabase, command: ProCommand, actor: ReviewActor, requestId: string, serverNow = new Date().toISOString()) {
  if (command.type === "clock-real") {
    check(actor.role === "agency" && !!actor.institutionId, "기관관리자만 테스트 시각을 변경할 수 있습니다.")
    return reconcilePro(endProClockTest(structuredClone(input), serverNow))
  }
  const db = reconcilePro(atReviewTime(structuredClone(input), serverNow)), pro = db.pro!
  check(pro, "프로 관리 데이터가 없습니다.")
  if (pro.audit.some(h => h.id === requestId)) return db
  const at = pro.clock
  if (command.type === "clock") {
    check(actor.role === "agency" && !!actor.institutionId && !Number.isNaN(Date.parse(command.at)) && Date.parse(command.at) >= Date.parse(at) && Date.parse(command.at) <= Date.parse(addDays(at, 370)), "테스트 시간은 현재 시점 이후 1년 이내로만 진행할 수 있습니다.")
    beginProClockTest(db)
    pro.clockMode = "test"
    pro.clock = new Date(command.at).toISOString(); audit(pro, requestId, "테스트 시간 진행", pro.clock, actor.name, "", { before: at, after: pro.clock }); return reconcilePro(db)
  }
  if (command.type === "schedule") {
    check(actor.role === "agency" && Number.isInteger(command.weekday) && command.weekday >= 1 && command.weekday <= 7 && pro.members.some(m => m.institutionId === actor.institutionId && m.product === "pro"), "요일 설정 권한 또는 입력값을 확인해 주세요.")
    const from = addDays(weekStart(at), 7)
    const before = pro.schedules.filter(s => s.institutionId === actor.institutionId)
    pro.schedules = pro.schedules.filter(s => !(s.institutionId === actor.institutionId && s.from === from))
    pro.schedules.push({ institutionId: actor.institutionId!, teacherId: "", from, weekday: command.weekday })
    audit(pro, requestId, "피드백 요일 변경", at, actor.name, "", { institutionId: actor.institutionId, before, after: { from, weekday: command.weekday } }); return db
  }
  const c = "reviewId" in command ? pro.cases.find(c => c.reviewId === command.reviewId) : undefined
  const reminder = command.type === "cancel-reminder" ? pro.reminders.find(r => r.id === command.id) : undefined
  const member = pro.members.find(m => m.id === ("studentId" in command ? command.studentId : c?.studentId ?? reminder?.studentId))
  check(member, "학생을 찾을 수 없습니다.")
  if (command.type === "retry-parent" && (c?.selectedAt || c?.firstSentAt)) check(actor.role === "agency" && actor.institutionId === c.institutionId, "해당 관리 건의 처리 권한이 없습니다.")
  else access(pro, actor, member)
  if (["apply", "cancel", "change"].includes(command.type)) check(actor.role === "student", "학생만 신청·취소·변경할 수 있습니다.")
  else check(actor.role === "agency", "기관관리자만 처리할 수 있습니다.")
  if (command.type === "management-memo") {
    check(member.product === "pro" && typeof command.text === "string", "관리 메모 입력값을 확인해 주세요.")
    check(command.expectedRevision === (member.managementMemo?.revision ?? null), "관리 메모가 다른 화면에서 변경되었습니다. 입력 내용은 유지되니 최신 내용을 확인한 뒤 다시 저장해 주세요.")
    const previous = member.managementMemo
    member.managementMemo = { text: command.text, revision: requestId, at, actor: actor.name }
    audit(pro, requestId, command.type, at, actor.name, member.id, { institutionId: actor.institutionId, before: previous, after: structuredClone(member.managementMemo) })
    return db
  }
  const month = managementMonth(at), before = proUsage(pro, member, at)
  const auditMonth = c?.month ?? ("month" in command && command.month ? command.month : month)
  const auditBefore = command.type === "consult-schedule" ? structuredClone({ consultation: member.consultation, overrides: member.overrides }) : proUsage(pro, member, at, auditMonth)
  if (command.type === "apply" || command.type === "designate") {
    if (command.type === "designate") { const issue = proDesignationIssue(db, command.reviewId); check(!issue, issue) }
    if (command.type === "apply" && c) check(at < c.cutoff, "제출 및 신청 마감이 지났습니다.")
    check(c && !c.selectedAt && !c.closedAt && !c.firstSentAt && c.week === weekStart(at) && firstRecord(db, c.reviewId).writingStatus === "submitted" && before.available > 0, "현재 주차의 제출글과 남은 신청 권수를 확인해 주세요.")
    select(pro, c, at, command.type === "apply" ? "student" : "teacher", actor.name)
  } else if (command.type === "change") {
    const previous = pro.cases.find(item => item.reviewId === command.previousReviewId)
    check(c && previous && previous.studentId === member.id, "변경할 신청을 확인해 주세요.")
    check(!previous.lockedAt, "선생님이 피드백 작성을 시작했어요. 신청을 바꿀 수 없어요.")
    check(at < previous.cutoff && at < c.cutoff, "신청 마감이 지나 바꿀 수 없어요.")
    check(proChangeCandidates(db, c.reviewId).some(item => item.reviewId === previous.reviewId), "신청 상태가 달라졌어요. 변경 가능한 독후감을 다시 확인해 주세요.")
    // Both validations precede all writes; the store commits this aggregate once.
    previous.selectedAt = undefined; previous.selection = undefined
    audit(pro, `${requestId}:cancel`, "cancel", at, actor.name, member.id, { reviewId: previous.reviewId, month: previous.month, week: previous.week, before: auditBefore, after: { changedTo: c.reviewId } })
    select(pro, c, at, "student", actor.name)
    const after = proUsage(pro, member, at)
    check(after.used === before.used && after.available === before.available && after.rolloverAvailable === before.rolloverAvailable, "권수 정보가 변경되었어요. 다시 확인해 주세요.")
  } else if (command.type === "cancel") {
    check(c?.selectedAt && c.selection === "student" && !c.lockedAt && !c.firstSentAt && at < c.cutoff, "본인이 신청한 글만 선생님 작성 시작 및 마감 전에 취소할 수 있습니다.")
    c.selectedAt = undefined; c.selection = undefined
  } else if (command.type === "limit") {
    check(Number.isInteger(command.limit) && command.limit >= before.used + before.pending && command.reason.trim(), "한도는 사용·선정 권수 이상인 정수이며 조정 사유가 필요합니다.")
    member.limits[month] = command.limit
  } else if (command.type === "cancel-debit") {
    check(c?.firstSentAt && !c.debitCancelledAt && command.reason.trim() && command.memo.trim(), "차감 취소 가능 여부, 사유와 메모를 확인해 주세요.")
    c.debitCancelledAt = at
  } else if (command.type === "retry-parent") {
    check(c?.closedAt && c.parent.status !== "sent", "성공 발송 이력이 있거나 관리 종료 전입니다.")
    check(db.records.some(r => r.reviewId === c.reviewId && r.feedbackStatus === "전송완료" && r.parentContact), "학부모 연락처가 등록되어 있지 않습니다.")
    deliverParent(db, c, at)
  } else if (command.type === "reminder") {
    check(weekStart(command.week) === weekStart(at), "이번 주 독려만 기록할 수 있습니다.")
    const previous = pro.reminders.filter(r => r.studentId === member.id && r.week === command.week && r.kind === command.kind && !r.cancelledAt)
    check(!previous.some(r => r.sequence === command.sequence), "이미 기록한 회차입니다.")
    check(command.sequence === 1 || previous.some(r => r.sequence === 1), "같은 종류의 1회 발송부터 기록해 주세요.")
    pro.reminders.push({ id: requestId, studentId: member.id, week: command.week, kind: command.kind, sequence: command.sequence, at, actor: actor.name })
  } else if (command.type === "cancel-reminder") {
    check(reminder && !reminder.cancelledAt && kstDate(reminder.at) === kstDate(at), "당일 기록만 취소할 수 있습니다.")
    check(reminder.sequence === 2 || !pro.reminders.some(r => r.studentId === member.id && r.week === reminder.week && r.kind === reminder.kind && r.sequence === 2 && !r.cancelledAt), "2회 기록을 먼저 취소해 주세요.")
    reminder.cancelledAt = at
  } else if (command.type === "consult-schedule") {
    check(Number.isInteger(command.nth) && command.nth >= 1 && command.nth <= 5 && Number.isInteger(command.weekday) && command.weekday >= 1 && command.weekday <= 7 && /^([01]\d|2[0-3]):[0-5]\d$/.test(command.time), "상담 일정을 확인해 주세요.")
    if (command.month && command.override) { check(!Number.isNaN(Date.parse(command.override)) && kstDate(command.override).slice(0, 7) === command.month, "해당 월의 날짜를 확인해 주세요."); member.overrides[command.month] = command.override }
    else member.consultation = { nth: command.nth, weekday: command.weekday, time: command.time }
  } else if (command.type === "consult") {
    check(command.memo.trim() && !Number.isNaN(Date.parse(command.actualAt)) && command.actualAt <= at && /^\d{4}-\d{2}$/.test(command.month) && ["유선 상담 완료", "부재 후 카톡 상담으로 대체", "미진행"].includes(command.result), "실제 상담 시각, 결과, 메모를 확인해 주세요.")
    if (command.previousId) check(pro.consultations.some(c => c.id === command.previousId && c.studentId === member.id && c.month === command.month), "수정할 상담 기록이 없습니다.")
    pro.consultations.push({ ...command, id: requestId, actor: actor.name, at })
  }
  audit(pro, requestId, command.type, at, actor.name, member.id, { institutionId: actor.institutionId ?? member.institutionId, month: auditMonth, reviewId: c?.reviewId, before: auditBefore, after: command.type === "consult-schedule" ? structuredClone({ consultation: member.consultation, overrides: member.overrides }) : proUsage(pro, member, at, auditMonth), ...("reason" in command ? { reason: command.reason, memo: command.memo } : {}) })
  return db
}
/** Review and Pro changes commit together; failed commands never reserve/debit. */
export function applyManagedReviewCommand(input: ReviewDatabase, command: ReviewCommand, actor: ReviewActor, requestId: string, realAt: string) {
  let db = reconcilePro(atReviewTime(structuredClone(input), realAt))
  const record = "recordId" in command ? db.records.find(r => r.id === command.recordId) : undefined
  const common = db.reviews.find(r => r.id === record?.reviewId)
  const member = memberFor(db, common?.studentId ?? (command.type === "create" ? actor.studentId ?? "" : ""))
  const pro = db.pro, c = pro?.cases.find(c => c.reviewId === common?.id)
  const managed = !!member && (member.product === "pro" || !!c)
  const at = managed ? pro!.clock : realAt
  if (db.records.some(r => r.history.some(h => h.requestId === requestId))) return db
  if (command.type === "schedule-feedback" || command.type === "cancel-feedback-schedule") {
    check(record && common && pro && member?.product === "pro" && member.external, "외부 프로 학생의 피드백만 예약 전송할 수 있습니다.")
    const owner = c?.institutionId ?? member.institutionId
    check(actor.role === "agency" && !!owner && actor.institutionId === owner && canAccessReview(common, actor, pro), "해당 관리 건의 예약 처리 권한이 없습니다.")
    if (command.type === "schedule-feedback") {
      check(c?.selectedAt && !c.closedAt, "선정된 프로 관리 대상만 예약 전송할 수 있습니다.")
      check(!activeFeedbackSchedule(record), "이미 등록된 전송 예약이 있습니다. 예약을 취소한 후 다시 등록해 주세요.")
      check(canSendReview(common, record), "저장 및 평가 완료 후 예약할 수 있습니다.")
      check(!record.sentAt && !record.history.some(item => item.action === "send"), "이미 전송된 피드백은 예약할 수 없습니다.")
      check(record.round !== 2 || !!c.firstSentAt && db.records.some(item => item.reviewId === common.id && item.round === 1 && item.feedbackStatus === "전송완료"), "1차 피드백 전송 후 2차 피드백을 예약할 수 있습니다.")
      check(validFeedbackScheduleTime(command.scheduledAt, at), "예약 일시는 현재보다 이후의 날짜와 시간으로 분 단위까지 선택해 주세요.")
      const revision = feedbackScheduleRevision(common, record)
      check(typeof command.expectedRevision === "string" && command.expectedRevision === revision, "피드백 정보가 변경되었습니다. 최신 내용을 확인한 후 다시 예약해 주세요.")
      const schedule: FeedbackSchedule = {
        id: requestId, recordId: record.id, reviewId: common.id, round: record.round, institutionId: owner,
        scheduledAt: new Date(command.scheduledAt).toISOString(), status: "waiting", createdAt: at, createdBy: structuredClone(actor),
        snapshot: feedbackScheduleSnapshot(common, record), revision, firstSentAt: c.firstSentAt,
        events: [{ action: "registered", at, actor: actor.name }],
      }
      record.feedbackSchedules = [...(record.feedbackSchedules ?? []), schedule]
      audit(pro, requestId, "예약 등록", at, actor.name, member.id, { institutionId: owner, reviewId: common.id, month: c.month, week: c.week, after: { scheduleId: schedule.id, scheduledAt: schedule.scheduledAt, round: record.round } })
    } else {
      const schedule: FeedbackSchedule | undefined = activeFeedbackSchedule(record)
      check(schedule && schedule.id === command.scheduleId, "예약 상태가 변경되었습니다. 최신 내용을 확인해 주세요.")
      check(schedule.status === "waiting" || schedule.status === "failed", "예약 전송을 처리 중이어서 취소할 수 없습니다.")
      schedule.status = "cancelled"; schedule.cancelledAt = at; schedule.cancelledBy = actor.name
      schedule.events.push({ action: "cancelled", at, actor: actor.name })
      audit(pro, requestId, "예약 취소", at, actor.name, member.id, { institutionId: owner, reviewId: common.id, month: c?.month, week: c?.week, after: { scheduleId: schedule.id } })
    }
    record.history.push({ requestId, action: command.type, actor: actor.name, at })
    return db
  }
  if (managed && record) {
    if (c && !c.selectedAt && command.proDesignate && ["ai-start", "save-feedback"].includes(command.type)) {
      check(actor.role === "agency" && actor.institutionId === member.institutionId, "해당 학생의 처리 권한이 없습니다.")
      const issue = proDesignationIssue(db, c.reviewId); check(!issue, issue)
      select(pro!, c, at, "teacher", actor.name)
    }
    if (["ai-start", "save-feedback", "send", "flower"].includes(command.type)) check(c?.selectedAt && (!c.closedAt || command.type === "flower"), "선정된 프로 관리 대상만 처리할 수 있습니다. 미선정 글은 대상 지정 확인 후 진행해 주세요.")
    if (command.type === "parent") throw new Error("프로 결과는 관리 종료 시 자동 발송합니다.")
    if (command.type === "start-second" || record.round === 2 && ["save-writing", "enter-rewrite", "submit", "reject"].includes(command.type)) check(c?.secondDeadline && at < c.secondDeadline && !c.closedAt, "2차 제출 기한이 종료되었습니다. 저장된 초안은 읽기 전용으로 보존됩니다.")
    if (c && record.round === 1 && ["ai-start", "save-feedback"].includes(command.type) && c.week > weekStart(at)) throw new Error("해당 관리 주차가 시작된 뒤 처리할 수 있습니다.")
  }
  db = applyReviewCommand(db, command, actor, requestId, at)
  if (!managed || !record || !pro) return db
  const nextPro = db.pro!, nextRecord = db.records.find(r => r.id === record.id)!, nextCommon = db.reviews.find(r => r.id === common!.id)!
  let nextCase = nextPro.cases.find(c => c.reviewId === common!.id)
  if (command.type === "submit" && record.round === 1 && member.institutionId && member.assignedAt && isActivePro(member, at)) {
    nextCase = newCase(nextPro, member, common!.id, at)
    nextPro.cases = nextPro.cases.filter(c => c.reviewId !== common!.id); nextPro.cases.push(nextCase)
  }
  if (!nextCase) return db
  if (command.type === "submit" && record.round === 2) { const period = submissionPeriod(at, nextCase.weekday); nextCase.secondWeek = period.week; nextCase.secondDue = period.due }
  if (command.type === "reject" && record.round === 1) { nextCase.selectedAt = undefined; nextCase.selection = undefined; nextCase.lockedAt = undefined; audit(nextPro, `reject:${requestId}`, "1차 반려", at, actor.name, member.id, { reviewId: nextCase.reviewId, month: nextCase.month, week: nextCase.week }) }
  if (command.type === "reject" && record.round === 2) { nextCase.secondWeek = undefined; nextCase.secondDue = undefined }
  if (["ai-start", "save-feedback"].includes(command.type)) nextCase.lockedAt ??= at
  if (command.type === "ai-result" && command.result && nextRecord.aiHistory.find(h => h.requestId === command.runId)?.status === "success") nextCase.aiSnapshots.push({ recordId: record.id, at, runId: command.runId, result: structuredClone(command.result) })
  if (command.type === "send") {
    nextCase.finalSnapshots.push({ recordId: record.id, at, feedback: nextRecord.feedback, body: nextRecord.finalBody, report: nextRecord.report })
    if (record.round === 1) {
      nextCase.firstSentAt ??= at
      if (nextCommon.secondDecision === "request") nextCase.secondDeadline ??= secondDeadline(at, nextCase.weekday)
      else close(db, nextCase, at, "1차 완료 전송")
    } else close(db, nextCase, at, "2차 완료 전송")
  }
  return db
}

/** First durable transaction: cancellation and claim compete for the same aggregate revision. */
export function claimDueFeedbackSchedules(input: ReviewDatabase, realAt: string): ReviewDatabase {
  const at = reviewNow(input, realAt)
  const due = input.records.filter(record => {
    const schedule = activeFeedbackSchedule(record)
    return schedule?.status === "waiting" && schedule.scheduledAt <= at
  })
  if (!due.length) return input
  const db = atReviewTime(structuredClone(input), realAt)
  for (const original of due) {
    const record = db.records.find(item => item.id === original.id)!, schedule = activeFeedbackSchedule(record)!
    schedule.status = "sending"; schedule.claimedAt = at
    schedule.events.push({ action: "claimed", at, actor: "예약 자동 처리" })
    record.history.push({ requestId: `${schedule.id}:claim`, action: "feedback-schedule-claim", actor: "예약 자동 처리", at })
  }
  return db
}

/** Second durable transaction. Safe to repeat after process restart or a store CAS conflict. */
export function executeFeedbackSchedule(input: ReviewDatabase, recordId: string, scheduleId: string, realAt: string, options: { simulateFailure?: string } = {}): ReviewDatabase {
  const original = input.records.find(record => record.id === recordId)?.feedbackSchedules?.find(schedule => schedule.id === scheduleId)
  if (original?.status !== "sending") return input
  const db = atReviewTime(structuredClone(input), realAt), at = reviewNow(db, realAt)
  const record = db.records.find(item => item.id === recordId)!, schedule = record.feedbackSchedules!.find(item => item.id === scheduleId)!
  const common = db.reviews.find(item => item.id === record.reviewId), member = memberFor(db, common?.studentId ?? "")
  const c = db.pro?.cases.find(item => item.reviewId === common?.id)
  const auditResult = (target: ReviewDatabase, kind: string, reason?: string) => {
    if (target.pro && common) audit(target.pro, `${scheduleId}:${kind}`, kind, at, "예약 자동 처리", common.studentId, { institutionId: schedule.institutionId, reviewId: common.id, month: c?.month, week: c?.week, after: { scheduleId, round: record.round }, reason })
  }
  try {
    check(schedule.scheduledAt <= at, "예약 전송 시간이 아직 되지 않았습니다.")
    check(common && member?.product === "pro" && member.external && c?.selectedAt && !c.closedAt, "피드백 관리 대상 또는 선정 상태가 변경되었습니다.")
    check(record.reviewId === schedule.reviewId && record.round === schedule.round && schedule.createdBy.role === "agency" && c.institutionId === schedule.institutionId && schedule.createdBy.institutionId === schedule.institutionId && canAccessReview(common, schedule.createdBy, db.pro), "예약 등록 기관의 처리 권한이 변경되었습니다.")
    check(!record.sentAt && record.feedbackStatus !== "전송완료" && !record.history.some(item => item.action === "send"), "이미 전송된 피드백이어서 예약 전송하지 않았습니다.")
    check(record.round !== 2 || !!c.firstSentAt && db.records.some(item => item.reviewId === common.id && item.round === 1 && item.feedbackStatus === "전송완료"), "1차 피드백 전송 상태가 변경되었습니다.")
    check(feedbackScheduleRevision(common, record) === schedule.revision && c.firstSentAt === schedule.firstSentAt, "예약 당시 저장된 피드백 또는 전송 이력이 변경되었습니다.")
    // This transition is private to this transaction: no intermediate 'sent' state is persisted.
    schedule.status = "sent"
    check(canSendReview(common, record), "저장 내용 또는 평가 정보가 전송 조건을 충족하지 않습니다.")
    if (options.simulateFailure) throw new Error(options.simulateFailure)
    const executionRequestId = `${scheduleId}:execute`
    const next = applyManagedReviewCommand(db, { type: "send", recordId }, schedule.createdBy, executionRequestId, at)
    const sentRecord = next.records.find(item => item.id === recordId)!
    check(sentRecord.feedbackStatus === "전송완료" && sentRecord.sentAt === at && sentRecord.history.some(item => item.requestId === executionRequestId && item.action === "send" && item.at === at), "예약 전송 완료를 확인하지 못했습니다. 예약을 취소한 후 다시 등록해 주세요.")
    const completed = sentRecord.feedbackSchedules!.find(item => item.id === scheduleId)!
    completed.executedAt = at
    completed.events.push({ action: "sent", at, actor: "예약 자동 처리" })
    auditResult(next, "예약 전송 성공")
    return next
  } catch (error) {
    // Failed execution never commits a partially sent record, debit or parent delivery.
    const failed = atReviewTime(structuredClone(input), realAt)
    const failedRecord = failed.records.find(item => item.id === recordId)!, failedSchedule = failedRecord.feedbackSchedules!.find(item => item.id === scheduleId)!
    const reason = error instanceof Error ? error.message : "예약 전송 처리에 실패했습니다."
    failedSchedule.status = "failed"; failedSchedule.executedAt = at; failedSchedule.failureReason = reason
    failedSchedule.events.push({ action: "failed", at, actor: "예약 자동 처리", reason })
    failedRecord.history.push({ requestId: `${scheduleId}:failure`, action: "feedback-schedule-failed", actor: "예약 자동 처리", at })
    auditResult(failed, "예약 전송 실패", reason)
    return failed
  }
}
export function consultDue(member: ProMember, month: string) { const schedule = member.consultation; return member.overrides[month] ?? (schedule ? consultationDate(month, schedule.nth, schedule.weekday, schedule.time) : undefined) }
export function currentConsultations(pro: ProState, studentId: string, month: string) { return pro.consultations.filter(c => c.studentId === studentId && c.month === month && !pro.consultations.some(n => n.previousId === c.id)) }
export function pendingFeedback(db: ReviewDatabase, c: ProCase): { record: ReviewRecord; due: string; week: string }[] {
  const first = firstRecord(db, c.reviewId), second = db.records.find(r => r.reviewId === c.reviewId && r.round === 2)
  if (c.closedAt) return []
  if (c.selectedAt && first?.writingStatus === "submitted" && !first.sentAt) return [{ record: first, due: c.due, week: c.week }]
  if (second?.writingStatus === "submitted" && !second.sentAt) return [{ record: second, due: c.secondDue!, week: c.secondWeek! }]
  return []
}
