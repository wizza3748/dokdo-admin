import { addDays, kstDate, managementMonth, midnight, weekStart } from "./pro-calendar"
import { applyManagedReviewCommand, applyProCommand, claimDueFeedbackSchedules, executeFeedbackSchedule } from "./pro-domain"
import { emptyReviewDatabase, type ReviewActor, type ReviewCommand, type ReviewDatabase } from "./review-domain"
import { feedbackScheduleRevision } from "./review-schedule"
import { READING_BOOKS } from "./reading-books"
import { READING_BOOK_COVERS } from "./reading-book-covers"
import { WORKBOOK_TEMPLATES } from "./workbook-templates"
import { WORKBOOK_TEMPLATE_LIVE_DETAILS } from "./workbook-template-live-data"
import rewriteGuides from "./workbook-rewrite-guides.json" with { type: "json" }

/** Separate identities: never repurpose an existing shared or browser-owned example. */
export const FEEDBACK_SCHEDULE_EXAMPLES = [
  { id: "pro-demo-schedule-waiting", name: "박서준", bookId: 297, status: "waiting" },
  { id: "pro-demo-schedule-failed", name: "이하린", bookId: 726, status: "failed" },
] as const
type Example = typeof FEEDBACK_SCHEDULE_EXAMPLES[number]
type Environment = Readonly<Record<string, string | undefined>>

export function localFeedbackScheduleExamplesEnabled(env: Environment) {
  return env.NODE_ENV === "development" && env.VERCEL !== "1"
    && (!env.DOKDO_STATE_PROVIDER || env.DOKDO_STATE_PROVIDER === "local")
    && !env.UPSTASH_REDIS_REST_URL && !env.KV_REST_API_URL
}

export function productionFeedbackScheduleExamplesEnabled(env: Environment) {
  return env.VERCEL === "1" && env.VERCEL_ENV === "production"
    && env.DOKDO_STATE_PROVIDER === "neon" && env.DOKDO_STATE_NAMESPACE === "dokdo-admin:production:v1"
}

function feedbackScheduleExamplesEnabled(env: Environment) {
  return localFeedbackScheduleExamplesEnabled(env) || productionFeedbackScheduleExamplesEnabled(env)
}

function buildExample(input: ReviewDatabase, example: Example, now: string) {
  const minute = Math.floor(Date.parse(now) / 60_000) * 60_000
  const registeredAt = new Date(minute - (example.status === "failed" ? 120_000 : 0)).toISOString()
  const submittedAt = weekStart(registeredAt)
  const book = READING_BOOKS.find(item => item.id === example.bookId)!
  // This non-report template is actually connected to both books' final reading round.
  const configured = WORKBOOK_TEMPLATES.find(item => item.id === 56)!
  const linked = WORKBOOK_TEMPLATE_LIVE_DETAILS.find(item => item.id === configured.id)
  if (!configured.levels.includes(book.level) || !linked?.connectedBooks.some(([, title, level, round]) => title === book.title && level === book.level && round === book.rounds)) {
    throw new Error("예약 예시의 도서·레벨·독서 회차 양식 연결을 확인해 주세요.")
  }
  const reviewId = `review-${example.id}`, recordId = `${reviewId}-r1`
  const template = {
    id: String(configured.id), title: configured.studentTitle, reportEnabled: configured.reportEnabled ?? false,
    rewriteMode: configured.rewriteMode, rewriteGuide: rewriteGuides["56"],
    items: configured.questions.map(item => ({ ...item, id: String(item.id) })),
  }
  const student: ReviewActor = { role: "student", studentId: example.id, name: example.name }
  const teacher: ReviewActor = { role: "agency", institutionId: "dokdo", name: "예약 예시 선생님" }
  // Replay real commands in an isolated aggregate, then append only its new records.
  // Reconciliation here must never change existing users, quotas, histories or clocks.
  let db: ReviewDatabase = { ...emptyReviewDatabase(), pro: {
    version: 1, clock: submittedAt, clockMode: "real", effectiveAt: submittedAt, effectiveMonth: managementMonth(submittedAt),
    members: [{ id: example.id, name: example.name, account: example.id, level: book.level, age: 9,
      product: "pro", status: "active", external: true, institutionId: "dokdo", teacherId: "teacher-1",
      assignedAt: submittedAt, effectiveAt: submittedAt, effectiveMonth: managementMonth(submittedAt),
      serviceEnd: addDays(now, 730), parentContact: true, limits: {}, overrides: {},
    }],
    schedules: structuredClone(input.pro!.schedules), cases: [], audit: [], processed: [], reminders: [], consultations: [], reminderSnapshots: [],
  } }
  let sequence = 0
  const run = (command: ReviewCommand, at: string, actor = student) => {
    db = applyManagedReviewCommand(db, command, actor, `${example.id}:fixture:${++sequence}`, at)
  }
  run({ type: "create", common: {
    id: reviewId, sourceWorkbookId: reviewId, studentId: example.id, studentName: example.name,
    institutionId: "dokdo", institution: "독도학원", classId: "external", bookTitle: book.title,
    sourceBookId: book.id, bookCoverSrc: READING_BOOK_COVERS[book.id], sourceReadingRound: book.rounds,
    sourceReadingRecordId: `reading-complete-${reviewId}`, sourceReadingWorkbookId: `reading-${book.id}-round-${book.rounds}`,
    level: book.level, month: kstDate(submittedAt).slice(0, 7), template,
  } }, submittedAt)
  const answers = [
    `${book.title}이라는 제목을 보고 어떤 이야기가 펼쳐질지 궁금해서 골랐습니다. 책 속 인물은 어떤 마음일지 생각하면서 읽었습니다.`,
    "책 속 인물은 다른 사람과 생각이 달라서 어려움을 겪었습니다. 서로의 이야기를 듣고 상대방의 마음을 이해하면서 문제를 해결해 나갔습니다.",
    "나도 내 생각만 말하기보다 친구의 이야기를 끝까지 들어야겠다고 느꼈습니다. 서로 다른 마음을 이해하고 배려하는 친구가 되고 싶습니다.",
  ]
  run({ type: "save-writing", recordId, stage: "items", itemIndex: template.items.length - 1,
    answers: Object.fromEntries(template.items.map((item, index) => [item.id, answers[index]])), body: "" }, submittedAt)
  run({ type: "enter-rewrite", recordId }, submittedAt)
  run({ type: "submit", recordId }, submittedAt)
  db = applyProCommand(db, { type: "apply", reviewId }, student, `${example.id}:apply`, submittedAt)
  run({ type: "save-feedback", recordId, decision: "complete",
    feedback: "인물의 마음을 자신의 경험과 연결해서 잘 썼어요. 기억에 남는 장면과 그때 느낀 마음을 조금 더 구체적으로 표현해 보세요.",
    items: template.items.map(item => ({ itemId: item.id, text: "", visible: false })),
  }, registeredAt, teacher)
  const scheduledAt = example.status === "waiting"
    ? addDays(midnight(kstDate(now)), 1 + 18 / 24)
    : new Date(minute - 60_000).toISOString()
  const scheduleId = `${example.id}:reservation`
  db = applyManagedReviewCommand(db, { type: "schedule-feedback", recordId, scheduledAt,
    expectedRevision: feedbackScheduleRevision(db.reviews[0], db.records[0]),
  }, teacher, scheduleId, registeredAt)
  if (example.status === "failed") {
    db = executeFeedbackSchedule(claimDueFeedbackSchedules(db, scheduledAt), recordId, scheduleId, scheduledAt,
      { simulateFailure: "목 데이터 검증용 전송 실패입니다. 예약을 취소한 후 다시 등록해 주세요." })
  }
  return db
}

/** Install once in shared prototype state. Never reset, reschedule or re-add edited examples. */
export function ensureFeedbackScheduleExamples(input: ReviewDatabase, serverNow: string, env: Environment): ReviewDatabase {
  if (!feedbackScheduleExamplesEnabled(env) || !input.pro || input.pro.clockMode === "test" || input.proTestBaseline) return input
  const missing = FEEDBACK_SCHEDULE_EXAMPLES.filter(example => {
    const reviewId = `review-${example.id}`
    return !input.pro!.members.some(member => member.id === example.id)
      && !input.reviews.some(review => review.id === reviewId || review.studentId === example.id)
      && !input.records.some(record => record.reviewId === reviewId || record.id === `${reviewId}-r1`)
      && !input.pro!.cases.some(item => item.reviewId === reviewId || item.studentId === example.id)
  })
  if (!missing.length) return input
  const additions = missing.map(example => buildExample(input, example, serverNow))
  return { ...input,
    reviews: [...input.reviews, ...additions.flatMap(db => db.reviews)],
    records: [...input.records, ...additions.flatMap(db => db.records)],
    pro: { ...input.pro,
      members: [...input.pro.members, ...additions.flatMap(db => db.pro!.members)],
      cases: [...input.pro.cases, ...additions.flatMap(db => db.pro!.cases)],
      audit: [...input.pro.audit, ...additions.flatMap(db => db.pro!.audit)],
      processed: [...input.pro.processed, ...additions.flatMap(db => db.pro!.processed)],
      reminders: [...input.pro.reminders, ...additions.flatMap(db => db.pro!.reminders)],
      reminderSnapshots: [...input.pro.reminderSnapshots, ...additions.flatMap(db => db.pro!.reminderSnapshots)],
    },
  }
}

/** Only an explicit example reset may replace these two synthetic students' results. */
export function resetFeedbackScheduleExamples(input: ReviewDatabase, serverNow: string, env: Environment): ReviewDatabase {
  if (!feedbackScheduleExamplesEnabled(env) || !input.pro || input.pro.clockMode === "test" || input.proTestBaseline) return input
  const ids = new Set<string>(FEEDBACK_SCHEDULE_EXAMPLES.map(example => example.id))
  const reviewIds = new Set([
    ...FEEDBACK_SCHEDULE_EXAMPLES.map(example => `review-${example.id}`),
    ...input.reviews.filter(review => ids.has(review.studentId)).map(review => review.id),
    ...input.pro.cases.filter(item => ids.has(item.studentId)).map(item => item.reviewId),
  ])
  const cleared: ReviewDatabase = { ...input,
    reviews: input.reviews.filter(review => !ids.has(review.studentId) && !reviewIds.has(review.id)),
    records: input.records.filter(record => !reviewIds.has(record.reviewId)),
    pro: { ...input.pro,
      members: input.pro.members.filter(member => !ids.has(member.id)),
      cases: input.pro.cases.filter(item => !ids.has(item.studentId) && !reviewIds.has(item.reviewId)),
      audit: input.pro.audit.filter(item => !ids.has(item.studentId) && !reviewIds.has(item.reviewId ?? "")),
      processed: input.pro.processed.filter(id => ![...ids].some(student => id.includes(`:${student}:`)) && ![...reviewIds].some(review => id === `expire:${review}`)),
      reminders: input.pro.reminders.filter(item => !ids.has(item.studentId)),
      consultations: input.pro.consultations.filter(item => !ids.has(item.studentId)),
      reminderSnapshots: input.pro.reminderSnapshots.filter(item => !ids.has(item.studentId)),
    },
  }
  return ensureFeedbackScheduleExamples(cleared, serverNow, env)
}
