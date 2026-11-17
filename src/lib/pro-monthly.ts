import { monthlyMessages } from "./pro-monthly-messages"
import type { ReviewActor, ReviewDatabase } from "./review-domain"
import type { ProMember, ProState } from "./pro-types"
import type { AcademyStyle, MonthlyCommand, MonthlyRecord, MonthlyState } from "./pro-monthly-types"
// @ts-expect-error Node tests load TypeScript directly.
import { addDays, kstDate, managementMonth, midnight, monthWeeks, weekStart } from "./pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { canShortenMonthly, generateMonthly, monthlyDirections, monthlyInput } from "./pro-monthly-generation.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { monthlyExpressionKey, monthlyStyleObservations } from "./pro-monthly-language.ts"

export const MONTHLY_LAUNCH_DAY = "2026-11-25"
function assert(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message) }
export function isMonthlyCommand(command: { type: string }): command is MonthlyCommand { return command.type.startsWith("monthly-") }
export function emptyMonthly(): MonthlyState { return { records: [], exclusions: [], evaluatedMonths: [], styles: [], schedules: [] } }
export function monthlyState(pro: ProState) { return pro.monthly ??= emptyMonthly() }
export const monthlyId = (studentId: string, month: string) => `monthly:${studentId}:${month}`
export const monthlyDateTime = (at?: string) => at ? `${kstDate(at)} ${new Date(Date.parse(at) + 9*3600000).toISOString().slice(11,16)}` : "-"
export const monthlyDate = (at: string) => kstDate(at)
export const monthlyPeriod = (r: Pick<MonthlyRecord, "periodStart" | "periodEnd">) => `${kstDate(r.periodStart)}~${kstDate(addDays(r.periodEnd,-1))}`
export function monthlyRegularAt(month: string) { return month === "2026-11" ? midnight(MONTHLY_LAUNCH_DAY) : new Date(Date.parse(monthWeeks(month)[3]) + 6*3600000).toISOString() }
export function monthlyDue(month: string) { return new Date(Date.parse(addDays(monthWeeks(month)[3],7)) - 60000).toISOString() }
export function firstMatchingAt(member: ProMember) { return [member.assignedAt, ...(member.matchingHistory ?? []).map(h => h.at)].filter((s): s is string => !!s).sort()[0] }
export function monthlyOwner(pro: ProState, member: ProMember) {
  return member.institutionId || [...(member.matchingHistory ?? [])].sort((a,b) => b.at.localeCompare(a.at))[0]?.institutionId || pro.monthly?.records.filter(r => r.studentId === member.id).at(-1)?.institutionId || pro.cases.filter(c => c.studentId === member.id).sort((a,b) => b.week.localeCompare(a.week))[0]?.institutionId
}
export function monthlyIsEnded(member: ProMember, at: string) { return member.status === "ended" || !!member.endedAt && member.endedAt <= at || member.serviceEnd <= at || member.product !== "pro" }
export function monthlyLate(record: MonthlyRecord, at: string) { return record.required && !record.sent && Date.parse(record.due) < Date.parse(at) }
export function monthlyStatus(record?: MonthlyRecord) { return !record ? "생성 전" : record.sent ? "발송 완료" : record.job ? "생성 중" : !record.generations.length && record.error ? "생성 실패" : record.saved ? "저장됨" : "작성 전" }
export function monthlyScheduleAt(pro: ProState, record: MonthlyRecord) {
  const schedule = pro.monthly?.schedules.find(s => s.studentId === record.studentId)
  if (record.earlyEnd || !schedule || schedule.weekday === null) return record.earlyEnd ? record.firstGeneratedAt : undefined
  return new Date(`${kstDate(addDays(monthWeeks(record.month)[3],schedule.weekday-1))}T${schedule.time}:00+09:00`).toISOString()
}
export function monthlyTasks(pro: ProState, studentId?: string, at = pro.clock) {
  const rows = (pro.monthly?.records ?? []).filter(r => (!studentId || r.studentId === studentId) && r.required && !r.sent)
  const late = rows.filter(r => monthlyLate(r,at))
  const write = rows.filter(r => !monthlyLate(r,at) && Date.parse(monthlyScheduleAt(pro,r) ?? r.firstGeneratedAt) <= Date.parse(at))
  return { write, late }
}
export function monthlyCanWrite(pro: ProState, record: MonthlyRecord, actor: ReviewActor) {
  const member = pro.members.find(m => m.id === record.studentId)
  return actor.role === "agency" && !!member && actor.institutionId === monthlyOwner(pro,member) && !record.sent
}
export function monthlyCanRead(pro: ProState, record: MonthlyRecord, actor: ReviewActor) {
  const member = pro.members.find(m => m.id === record.studentId)
  return actor.role === "admin" || actor.role === "agency" && (record.sent ? record.sent.institutionId : member && monthlyOwner(pro,member)) === actor.institutionId
}
export function academyStyle(pro: ProState, institutionId: string): AcademyStyle {
  return pro.monthly?.styles.find(s => s.institutionId === institutionId) ?? { institutionId, enabled: true, revision: 0, items: [], sentIds: [], handledIds: [], history: [] }
}
export function academyName(db: ReviewDatabase, id: string) { return db.reviews.find(r => r.institutionId === id && r.institution)?.institution ?? (id === "dokdo" ? "독도학원" : id === "other-agency" ? "다른 예시기관" : id) }

/** One-time transition snapshot. A rerun never reevaluates consultations or changes the execution timestamp. */
export function executeMonthlyTransition(pro: ProState, at: string) {
  const state = monthlyState(pro)
  if (state.transition || kstDate(at) < MONTHLY_LAUNCH_DAY) return false
  const consultations = pro.consultations.filter(c => c.month === "2026-11" && c.at <= at)
  const valid = consultations.filter(c => !consultations.some(n => n.previousId === c.id) && ["유선 상담 완료", "부재 후 카톡 상담으로 대체"].includes(c.result))
  const optional: Record<string,string[]> = {}
  for (const c of valid) (optional[c.studentId] ??= []).push(c.id)
  state.transition = { at, optional }
  return true
}

export function monthlyEligibility(db: ReviewDatabase, member: ProMember, month: string, at: string) {
  const pro = db.pro!, state = pro.monthly, existing = state?.records.find(r => r.studentId === member.id && r.month === month)
  if (existing) return { existing, eligible: true, scheduled: existing.scheduledGenerationAt, early: existing.earlyEnd }
  const assigned = firstMatchingAt(member), owner = monthlyOwner(pro,member)
  const end = member.endedAt ?? member.serviceEnd
  if (!assigned || !owner || assigned > at || month < "2026-11" || (member.product !== "pro" && !member.endedAt) || managementMonth(assigned) > month || end && managementMonth(end) < month) return { eligible: false }
  const regular = month === "2026-11" && state?.transition ? state.transition.at : new Date(monthlyRegularAt(month)).toISOString()
  const ending = !!end && managementMonth(end) === month
  const early = ending && weekStart(end) < monthWeeks(month)[3]
  const confirmed = member.endConfirmedAt ?? (member.status === "ended" ? end : undefined)
  const earlyDate = early ? confirmed && confirmed > weekStart(end) ? confirmed : new Date(Date.parse(weekStart(end)) + 6*3600000).toISOString() : undefined
  // The November launch overrides the usual early/regular calendar for existing students.
  const scheduled = month === "2026-11" ? regular : earlyDate ?? regular
  if (scheduled > at) return { eligible: false, scheduled, early }
  if (state?.exclusions.some(e => e.studentId === member.id && e.month === month && e.reason === "first-month")) return { eligible: false, reason: "first-month" as const, scheduled, early }
  const feedbackBefore = pro.cases.filter(c => c.studentId === member.id).some(c => db.records.some(r => r.reviewId === c.reviewId && r.sentAt && r.sentAt >= assigned && r.sentAt <= at))
  if (managementMonth(assigned) === month && !feedbackBefore) return { eligible: false, reason: "first-month" as const, scheduled, early }
  if (assigned > regular && !ending) return { eligible: false, reason: "late-assignment" as const, scheduled, early }
  return { eligible: true, scheduled: ending && assigned > regular ? (confirmed && confirmed > assigned ? confirmed : end) : scheduled, early }
}

function startJob(db: ReviewDatabase, r: MonthlyRecord, member: ProMember, at: string, id: string, options: { regenerate: boolean; direction?: import("./pro-monthly-types").MonthlyDirection; request?: string; body?: string }) {
  const input = monthlyInput(db,member,r)
  // A regeneration preserves the original message type and fixed target period.
  if (r.generations[0]) input.kind = r.generations[0].kind
  r.job = { id, at, readyAt: new Date(Date.parse(at)+800).toISOString(), institutionId: monthlyOwner(db.pro!,member)!, input, ...options }
  r.error = undefined
}
function log(pro: ProState, r: MonthlyRecord, id: string, action: string, at: string, actor: string, institutionId: string) {
  r.audit.push({ id, action, at, actor, institutionId })
  pro.audit.push({ id, studentId: r.studentId, kind: action, at, actor, institutionId, month: r.month })
}

/** Called under the existing store lock/CAS and by the local worker; never resets existing records. */
export function reconcileMonthly(db: ReviewDatabase, at = db.pro?.clock ?? new Date().toISOString()) {
  if (!db.pro || !db.pro.monthly && kstDate(at) < MONTHLY_LAUNCH_DAY) return db
  const pro = db.pro, state = monthlyState(pro)
  const queuedBefore = new Set(state.records.flatMap(r => r.job ? [r.job.id] : []))
  executeMonthlyTransition(pro,at)
  if (!state.transition) return db
  for (let month = "2026-11"; month <= managementMonth(at); ) {
    if (Date.parse(monthlyRegularAt(month)) <= Date.parse(at) && !state.evaluatedMonths.includes(month)) state.evaluatedMonths.push(month)
    for (const member of pro.members) {
      const eligibility = monthlyEligibility(db,member,month,at)
      if (eligibility.existing) { if (!eligibility.existing.sent) eligibility.existing.institutionId = monthlyOwner(pro,member)!; continue }
      if (!eligibility.eligible || !eligibility.scheduled || eligibility.scheduled > at) {
        if (eligibility.reason && !state.exclusions.some(e => e.studentId === member.id && e.month === month)) state.exclusions.push({ studentId: member.id, month, reason: eligibility.reason, at })
        continue
      }
      const prior = state.records.filter(r => r.studentId === member.id && r.month < month).sort((a,b) => b.month.localeCompare(a.month))[0]
      const first = firstMatchingAt(member)!
      const periodStart = prior ? midnight(kstDate(prior.firstGeneratedAt)) : month === "2026-11" && first < midnight("2026-11-02") ? midnight("2026-11-02") : midnight(kstDate(first))
      const periodEnd = month === "2026-11" ? midnight("2026-11-25") : midnight(kstDate(at))
      const optionalIds = month === "2026-11" ? state.transition.optional[member.id] ?? [] : []
      const r: MonthlyRecord = { id: monthlyId(member.id,month), studentId: member.id, month, institutionId: monthlyOwner(pro,member)!, required: !optionalIds.length, optionalConsultationIds: [...optionalIds],
        scheduledGenerationAt: eligibility.scheduled, firstGeneratedAt: at, periodStart, periodEnd,
        due: eligibility.early && month !== "2026-11" ? new Date(Date.parse(addDays(weekStart(member.endedAt ?? member.serviceEnd),7))-60000).toISOString() : monthlyDue(month),
        earlyEnd: !!eligibility.early && month !== "2026-11", revision: 0, generations: [], regenerationCount: 0, audit: [] }
      state.records.push(r)
      state.exclusions = state.exclusions.filter(e => !(e.studentId === member.id && e.month === month))
      startJob(db,r,member,at,`${r.id}:initial`,{ regenerate: false })
    }
    const [y,m] = month.split("-").map(Number); month = `${m === 12 ? y+1 : y}-${String(m === 12 ? 1 : m+1).padStart(2,"0")}`
  }
  for (const r of state.records) {
    const job = r.job
    if (!job || !queuedBefore.has(job.id) || r.sent) continue
    try {
      if (r.simulateGenerationFailureOnce) { r.simulateGenerationFailureOnce = false; throw new Error("월간 피드백 AI초안을 만들지 못했습니다. 다시 시도해 주세요.") }
      const output = generateMonthly(job.input, { direction: job.direction, request: job.request, body: job.body, previousComposition: r.generations.at(-1)?.composition })
      r.generations.push({ ...output, id: job.id, at, institutionId: job.institutionId, input: job.input, direction: job.direction, request: job.request })
      if (job.regenerate) r.regenerationCount++
      r.revision++
      log(pro,r,job.id,job.regenerate ? "월간 피드백 다시 만들기" : "월간 피드백 생성",at,"AI 초안 생성",job.institutionId)
    } catch (error) { r.error = error instanceof Error ? error.message : "월간 피드백 생성에 실패했습니다." }
    r.job = undefined
  }
  return db
}

function updateStyle(pro: ProState, record: MonthlyRecord, actor: ReviewActor, at: string, id: string) {
  const state = monthlyState(pro), institutionId = record.sent!.institutionId
  let style = state.styles.find(s => s.institutionId === institutionId)
  if (!style) { style = academyStyle(pro,institutionId); state.styles.push(style) }
  if (!style.sentIds.includes(record.id)) style.sentIds.push(record.id)
  if (style.handledIds.includes(record.id)) return
  // Consume the source once even on failure. The sent record and previous tone stay intact.
  style.handledIds.push(record.id)
  if (record.simulateStyleFailureOnce) { record.simulateStyleFailureOnce = false; record.styleUpdate = "failed"; return }
  const before = JSON.stringify(style.items)
  const generation = record.generations.find(g => g.id === record.sent!.sourceId)!
  const requested = [generation.request ?? "", generation.direction === "더 따뜻하게" ? "말투를 더 따뜻하게" : generation.direction === "더 간결하게" ? "문장을 더 간결하게" : ""].join("\n")
  const observations = monthlyStyleObservations(generation.body, record.sent!.body, requested)
  for (const observation of observations) {
    const item = style.items.find(i => i.text === observation.text)
    if (item) item.observations++
    else {
      // A contrary expression replaces the current preference; history retains the previous value.
      const contrary = style.items.findIndex(i => monthlyExpressionKey(i.text) === observation.key)
      if (contrary >= 0) style.items[contrary] = { text: observation.text, observations: 1 }
      else if (style.items.length < 10) style.items.push({ text: observation.text, observations: 1 })
    }
  }
  style.revision++; style.updatedAt = at
  style.history.push({ id, at, actor: actor.name, kind: "발송본 반영", before, after: JSON.stringify(style.items) })
  record.styleUpdate = "applied"
}

export function applyMonthlyCommand(input: ReviewDatabase, command: MonthlyCommand, actor: ReviewActor, requestId: string, at: string) {
  const db = structuredClone(input), pro = db.pro
  assert(pro && actor.role === "agency" && actor.institutionId, "기관관리자만 월간 피드백을 작성할 수 있습니다.")
  const state = monthlyState(pro)
  assert(!pro.scopeInstitutionId, "전체 저장 데이터에서 처리해 주세요.")
  if (pro.audit.some(a => a.id === requestId) || state.records.some(r => r.audit.some(a => a.id === requestId)) || state.styles.some(s => s.history.some(h => h.id === requestId))) return db
  if (command.type === "monthly-style-save" || command.type === "monthly-style-reset") {
    assert(pro.members.some(m => monthlyOwner(pro,m) === actor.institutionId) || state.records.some(r => r.institutionId === actor.institutionId), "학원 말투 설정 권한이 없습니다.")
    let style = state.styles.find(s => s.institutionId === actor.institutionId)
    if (!style) { style = academyStyle(pro,actor.institutionId); state.styles.push(style) }
    assert(style.revision === command.revision, "학원 말투가 다른 화면에서 변경되었습니다. 다시 확인해 주세요.")
    const before = JSON.stringify({ enabled: style.enabled, items: style.items })
    if (command.type === "monthly-style-save") {
      assert(typeof command.enabled === "boolean" && Array.isArray(command.items) && command.items.length <= 10 && command.items.every(t => typeof t === "string" && t.trim()), "말투 항목: 최대 10개 / 공백 항목 저장 불가")
      assert(command.items.every(t => !/\d{2,}|학생.*(이름|성적)|전화번호|개인정보|본사.*(무시|변경)|재등록/.test(t)), "개인정보와 내용 지침을 제외하고 표현 방식만 입력해 주세요.")
      const previous = style.items
      style.items = command.items.map(text => ({ text: text.trim(), observations: previous.find(item => item.text === text.trim())?.observations ?? 1 })); style.enabled = command.enabled
    } else { assert(style.items.length, "초기화할 말투가 없습니다."); style.items = [] }
    style.revision++; style.updatedAt = at
    const after = JSON.stringify({ enabled: style.enabled, items: style.items })
    style.history.push({ id: requestId, at, actor: actor.name, kind: command.type === "monthly-style-reset" ? "초기화" : JSON.parse(before).enabled !== style.enabled ? "사용 여부 변경" : "직접 수정", before, after })
    return db
  }
  if (command.type === "monthly-schedule") {
    const member = pro.members.find(m => m.id === command.studentId)
    assert(member && member.institutionId === actor.institutionId && !member.caseOnly, "현재 매칭 학원에서만 일정을 변경할 수 있습니다.")
    assert(command.weekday === null || Number.isInteger(command.weekday) && command.weekday >= 1 && command.weekday <= 7 && /^([01]\d|2[0-3]):[0-5]\d$/.test(command.time), "요일과 시간을 확인해 주세요.")
    state.schedules = state.schedules.filter(s => s.studentId !== member.id)
    state.schedules.push({ studentId: member.id, weekday: command.weekday, time: command.weekday === null ? "23:59" : command.time, at, actor: actor.name })
    pro.audit.push({ id: requestId, studentId: member.id, kind: "월간 피드백 발송 일정 변경", at, actor: actor.name, institutionId: actor.institutionId })
    return db
  }
  const r = state.records.find(r => r.id === command.id)
  assert(r && monthlyCanRead(pro,r,actor), "월간 피드백 조회·처리 권한이 없습니다.")
  assert(r.revision === command.revision, "다른 화면에서 변경된 월간 피드백입니다. 최신 내용을 확인해 주세요.")
  assert(!r.job, "월간 피드백 AI초안을 만들고 있습니다.")
  if (command.type === "monthly-copy") {
    const copy = r.sent ?? r.saved
    assert(copy && copy.body.trim(), "먼저 본문을 저장해 주세요.")
    r.copied = { at, revision: copy.revision }
    log(pro,r,requestId,"월간 피드백 문구 복사",at,actor.name,actor.institutionId)
    return db
  }
  assert(monthlyCanWrite(pro,r,actor), "발송 완료 기록은 변경할 수 없습니다.")
  const member = pro.members.find(m => m.id === r.studentId)!
  if (command.type === "monthly-retry" || command.type === "monthly-regenerate") {
    if (command.type === "monthly-retry") assert(!r.generations.length && r.error, "생성 실패 상태에서 다시 시도해 주세요.")
    else {
      assert(r.generations.length && r.regenerationCount < 2, monthlyMessages.exhausted)
      assert(typeof command.body === "string" && (!command.direction || monthlyDirections.includes(command.direction)) && (command.direction || command.request?.trim()), "생성 방향 또는 직접 요청을 입력해 주세요.")
      assert(command.direction !== "더 간결하게" || canShortenMonthly(r.generations[0].kind,command.body), monthlyMessages.cannotShorten)
    }
    startJob(db,r,member,at,requestId,{ regenerate: command.type === "monthly-regenerate", ...(command.type === "monthly-regenerate" ? { direction: command.direction, request: command.request?.trim(), body: command.body } : {}) })
    return db
  }
  if (command.type === "monthly-save") {
    assert(typeof command.body === "string" && command.body.trim() && Array.isArray(command.carry) && command.carry.every(i => typeof i?.text === "string" && typeof i.continued === "boolean"), "메시지와 다음 달 이어 볼 항목을 확인해 주세요.")
    assert(r.generations.some(g => g.id === command.sourceId), "생성 이력을 확인해 주세요.")
    r.revision++
    r.saved = { body: command.body, carry: command.carry.filter(i => i.text.trim()).map(i => ({ ...i,text:i.text.trim() })), sourceId: command.sourceId, at, actor: actor.name, revision: r.revision }
    r.copied = undefined
    log(pro,r,requestId,"월간 피드백 저장",at,actor.name,actor.institutionId)
  } else if (command.type === "monthly-send") {
    assert(r.saved && r.saved.body.trim(), "먼저 본문을 저장해 주세요.")
    const actual = command.actualAt ? new Date(command.actualAt) : new Date(at)
    assert(Number.isFinite(actual.getTime()) && actual.getTime() >= Date.parse(r.firstGeneratedAt) && actual.getTime() <= Date.parse(at), "생성 이후부터 현재 시각까지의 발송 일시를 입력해 주세요.")
    assert(command.actualAt || r.copied?.revision === r.saved.revision, "현재 저장본을 복사한 뒤 발송 기록을 남겨 주세요.")
    r.sent = { ...structuredClone(r.saved), actualAt: actual.toISOString(), recordedAt: at, actor: actor.name, institutionId: actor.institutionId, manual: !!command.actualAt }
    r.revision++
    log(pro,r,requestId,"월간 피드백 발송 기록",at,actor.name,actor.institutionId)
    updateStyle(pro,r,actor,at,`${requestId}:style`)
  }
  return db
}
