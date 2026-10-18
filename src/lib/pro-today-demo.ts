// Explicitly resettable synthetic scenarios. Policy clocks/counts are never fabricated for the UI.
// @ts-expect-error Node tests load TypeScript sources.
import { addDays, kstDate, managementMonth, midnight, monthWeeks, submissionPeriod, weekStart } from "./pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { applyReviewCommand, emptyReviewDatabase, type ReviewDatabase, type ReviewCommand } from "./review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { applyManagedReviewCommand, applyProCommand, migrateProRecords, reconcilePro, weekdayFor } from "./pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { WORKBOOK_TEMPLATES } from "./workbook-templates.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { proDemoStudentName } from "./pro-demo-labels.ts"
import rewriteGuides from "./workbook-rewrite-guides.json" with { type: "json" }
import type { ProCase, ProMember, ProState } from "./pro-types"

export const TODAY_DEMO_IDS = ["pro-demo-1", "pro-demo-2", "pro-demo-3", "pro-demo-4", "pro-demo-5", "pro-demo-6", "pro-demo-attention", "pro-demo-hq-check", "pro-demo-complete", "pro-demo-second"]

export function resetTodayProDemo(input: ReviewDatabase, serverNow: string): ReviewDatabase {
  const week = weekStart(serverNow), month = managementMonth(serverNow), monthStart = monthWeeks(month)[0]
  const effectiveAt = [addDays(week, -21), monthStart].sort()[0]
  // At most one current-week opportunity is required for each normal example.
  const submittedAt = week, previousAt = addDays(week, -7)
  const today = midnight(kstDate(serverNow)), yesterday = addDays(today, -1)
  const members: ProMember[] = TODAY_DEMO_IDS.map((id, i) => {
    const start = i === 6 ? addDays(week, -14) : i === 7 ? addDays(week, -21) : effectiveAt
    return { id, name: proDemoStudentName(id)!, account: id.replaceAll("-", "_"), level: 4, age: 11, product: "pro", status: "active", external: true,
      institutionId: "dokdo", teacherId: "teacher-1", assignedAt: start, effectiveAt: start, effectiveMonth: managementMonth(start),
      serviceEnd: addDays(serverNow, 730), parentContact: true, limits: i === 2 ? { [month]: 1 } : {},
      consultation: { nth: 3, weekday: 4, time: "15:00" },
      overrides: { [month]: i === 0 || i === 9 ? today : i === 3 ? yesterday : addDays(today, 2) } }
  })
  let fixture = emptyReviewDatabase()
  const pro: ProState = { version: 1, clock: serverNow, clockMode: "real", effectiveAt, effectiveMonth: managementMonth(effectiveAt),
    members, cases: [], schedules: input.pro?.schedules.some(s => s.institutionId === "dokdo") ? structuredClone(input.pro.schedules.filter(s => s.institutionId === "dokdo")) : [{ institutionId: "dokdo", teacherId: "teacher-1", weekday: 7, from: effectiveAt }],
    audit: [], reminders: [], consultations: [], processed: [], reminderSnapshots: [] }
  fixture.pro = pro
  // Use the same four-question, item-rewrite template as reading-601-round-1.
  // Report generation remains off for these existing management-status fixtures.
  const sourceTemplate = WORKBOOK_TEMPLATES.find(t => t.id === 51)!
  const template = { id: String(sourceTemplate.id), title: sourceTemplate.studentTitle, reportEnabled: false,
    rewriteMode: sourceTemplate.rewriteMode, rewriteGuide: rewriteGuides["51"],
    items: sourceTemplate.questions.map(q => ({ ...q, id: String(q.id) })) }
  const sampleAnswers = [
    "친구와 생각이 달라서 다툰 적이 있어 이 책을 골랐다. 주인공은 친구와 마음이 맞지 않을 때 어떻게 문제를 해결하는지 알고 싶었다.",
    "주인공은 친구들과 서로 다른 생각 때문에 갈등을 겪었다. 처음에는 자기 생각만 말했지만, 친구의 이유를 듣고 모두에게 좋은 방법을 함께 찾아갔다.",
    "친구의 이야기를 끝까지 듣는 장면이 기억에 남았다. 나도 내 생각만 옳다고 말했던 적이 있어서 부끄러웠고, 다른 생각도 존중해야겠다고 느꼈다.",
    "다음에 친구와 하고 싶은 놀이가 다르면 먼저 이유를 물어볼 것이다. 서로 하고 싶은 놀이를 번갈아 해 보고, 그때 느낀 점을 독서록에 적어 보고 싶다.",
  ]
  const answers = Object.fromEntries(template.items.map((item, index) => [item.id, sampleAnswers[index]]))
  const itemFeedback = template.items.map(item => ({ itemId: item.id, text: "", visible: false }))
  const teacher = { role: "agency" as const, institutionId: "dokdo", name: "예시 선생님" }
  const steps: { at: string; run: () => void }[] = []
  function add(index: number, slug: string, title: string, at: string, state: "submitted" | "saved" | "sent", options: { selection?: ProCase["selection"]; decision?: "complete" | "request"; secondAt?: string } = {}) {
    const member = members[index], id = `review-pro-today-${slug}`, recordId = `${id}-r1`
    const student = { role: "student" as const, studentId: member.id, name: member.name }
    const { selection = state === "submitted" ? undefined : "student", decision = "complete", secondAt } = options
    const legacy = selection === "migration"
    let sequence = 0
    const run = (command: ReviewCommand, time = at, actor = student as typeof student | typeof teacher) => {
      const requestId = `${id}:${++sequence}`
      steps.push({ at: time, run: () => {
        fixture = legacy ? applyReviewCommand(fixture, command, actor, requestId, time)
          : applyManagedReviewCommand(fixture, command, actor, requestId, time)
      } })
    }
    const write = (recordId: string, time: string) => {
      run({ type: "save-writing", recordId, stage: "items", itemIndex: template.items.length - 1, answers, body: "" }, time)
      run({ type: "enter-rewrite", recordId }, time)
      run({ type: "submit", recordId }, time)
    }
    run({ type: "create", common: { id, sourceWorkbookId: id, studentId: member.id, studentName: member.name, institutionId: "dokdo", institution: "독도학원", classId: "external", bookTitle: title, month: kstDate(at).slice(0, 7), level: 4, template } })
    write(recordId, at)
    if (selection === "student" || selection === "teacher") steps.push({ at, run: () => {
      fixture = applyProCommand(fixture, { type: selection === "student" ? "apply" : "designate", reviewId: id }, selection === "student" ? student : teacher, `${id}:select`, at)
    } })
    // Automatic selections must actually reach the cutoff before feedback starts.
    const initial = submissionPeriod(at, weekdayFor(pro, member, weekStart(at)))
    const period = submissionPeriod(at, weekdayFor(pro, member, initial.week))
    const feedbackAt = selection === "auto" ? period.cutoff : at
    if (state !== "submitted") run({ type: "save-feedback", recordId, feedback: "주인공의 행동과 자신의 경험을 연결해 잘 썼어요. 기억에 남은 장면을 더 구체적으로 설명해 보세요.", items: itemFeedback, decision }, feedbackAt, teacher)
    if (state === "sent") {
      run({ type: "send", recordId }, feedbackAt, teacher)
      if (legacy && decision === "complete") run({ type: "parent", recordId }, feedbackAt, teacher)
      if (secondAt) {
        run({ type: "seen", recordId }, secondAt)
        run({ type: "start-second", recordId }, secondAt)
        write(`${id}-r2`, secondAt)
      }
    }
  }
  add(0, "writing", "마음이 자라는 나무", submittedAt, "submitted", { selection: "teacher" })
  add(1, "selection", "서로 다른 생각", submittedAt, "submitted")
  // An explicitly adjusted one-book limit provides a reachable exhausted example
  // even in the first week, without pretending four weekly opportunities existed.
  add(2, "quota", "내 친구의 이야기", monthStart, "sent")
  // A submitted book remains visible even when no selection opportunity remains.
  add(2, "not-selected", "새로운 길을 찾아서", submittedAt, "submitted")
  add(3, "overdue", "함께 만드는 약속", previousAt, "saved", { selection: "teacher" })
  add(4, "waiting", "용기 있는 한 걸음", submittedAt, "sent", { decision: "request" })
  add(5, "saved", "별을 찾는 아이", submittedAt, "saved")
  add(8, "complete", "바다를 건너온 편지", submittedAt, "sent")
  add(9, "second", "함께 걷는 길", previousAt, "sent", { selection: "auto", decision: "request", secondAt: submittedAt })
  // Vary real historical submissions rather than making every student miss
  // both prior weeks. Kim intentionally retains that history as a recovery case.
  for (const [index, days, title, selection] of [
    [0, -14, "작은 씨앗의 여행", "student"], [0, -7, "숲속의 약속", "auto"],
    [1, -14, "우리를 잇는 다리", "teacher"], [3, -14, "바람을 따라 걷다", "student"],
    [4, -7, "친구의 마음", "teacher"], [8, -14, "별빛 도서관", "migration"],
    [8, -7, "고래가 들려준 이야기", "auto"], [9, -14, "나무 아래에서", "student"],
  ] as const) add(index, `history-${index}-${-days}`, title, addDays(week, days), "sent", { selection })
  // Replay in time order so historical quotas and automatic selection use the
  // same rules as real interactions. Only the explicit legacy example migrates.
  for (const step of steps.sort((a, b) => a.at.localeCompare(b.at))) step.run()
  fixture = migrateProRecords(fixture)
  const nextPro = fixture.pro!
  nextPro.clock = serverNow
  nextPro.audit.push({ id: "today-demo:limit", studentId: members[2].id, kind: "limit", at: monthStart, actor: teacher.name, month, before: { limit: 4 }, after: { limit: 1 }, reason: "권수 소진 상태 확인용", memo: "이 예시 학생의 월 한도는 1권입니다." })
  for (const [index, result] of [[2, "유선 상담 완료"], [4, "부재 후 카톡 상담으로 대체"], [3, "미진행"]] as const) {
    nextPro.consultations.push({ id: `today-demo:consult:${index}`, studentId: members[index].id, month, result, actualAt: today, at: today, memo: "상담 상태 확인용 예시 기록입니다.", actor: teacher.name })
  }
  // Distinct completed/partial/planned reminder examples; manual early sending
  // is permitted, while due-task counts still use the actual Thu/Fri schedule.
  for (const [index, sequence] of [[6, 1], [5, 1], [5, 2]] as const) {
    nextPro.reminders.push({ id: `today-demo:reminder:${index}:${sequence}`, studentId: members[index].id, week, kind: "submission", sequence, at: today, actor: teacher.name })
  }
  fixture = reconcilePro(fixture, serverNow)

  // Do not restore the global clock-test snapshot: that would also overwrite
  // other students' records. Only the explicit fixture IDs below are replaced.
  const db = structuredClone(input)
  delete db.proTestBaseline
  if (!db.pro) db.pro = structuredClone(nextPro)
  const ids = new Set(TODAY_DEMO_IDS)
  const replacedReviews = new Set(db.reviews.filter(r => ids.has(r.studentId)).map(r => r.id))
  db.reviews = [...db.reviews.filter(r => !ids.has(r.studentId)), ...fixture.reviews]
  db.records = [...db.records.filter(r => !replacedReviews.has(r.reviewId)), ...fixture.records]
  const target = db.pro
  target.members = [...target.members.filter(m => !ids.has(m.id)), ...fixture.pro!.members]
  target.cases = [...target.cases.filter(c => !ids.has(c.studentId)), ...fixture.pro!.cases]
  target.audit = [...target.audit.filter(a => !ids.has(a.studentId)), ...fixture.pro!.audit]
  target.reminders = [...target.reminders.filter(r => !ids.has(r.studentId)), ...fixture.pro!.reminders]
  target.consultations = [...target.consultations.filter(c => !ids.has(c.studentId)), ...fixture.pro!.consultations]
  target.reminderSnapshots = [...target.reminderSnapshots.filter(r => !ids.has(r.studentId)), ...fixture.pro!.reminderSnapshots]
  target.processed = [...target.processed.filter(id => !TODAY_DEMO_IDS.some(student => id.includes(`:${student}:`)) && ![...replacedReviews].some(review => id === `expire:${review}`)), ...fixture.pro!.processed]
  // Keep shared/non-demo scheduling intact; cases use its actual weekday rules.
  target.effectiveAt = target.effectiveAt < effectiveAt ? target.effectiveAt : effectiveAt
  target.clockMode = "real"; target.clock = serverNow
  return db
}
