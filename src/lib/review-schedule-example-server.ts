import { bindCloudFeedbackSchedule, createCloudFeedbackScheduler } from "./feedback-schedule-cloud"
import { prototypeStore, type PrototypeStore } from "./prototype-store"
import type { ReviewDatabase } from "./review-domain"
import { ensureFeedbackScheduleExamples, FEEDBACK_SCHEDULE_EXAMPLES, productionFeedbackScheduleExamplesEnabled } from "./review-schedule-seeds"
import { initializePro } from "./pro-seeds"

type Environment = Readonly<Record<string, string | undefined>>
type Scheduler = Pick<ReturnType<typeof createCloudFeedbackScheduler>, "prepare">
type Options = { env?: Environment; store?: PrototypeStore; scheduler?: Scheduler; now?: () => string; defaults?: () => ReviewDatabase }

/** Queue only the two shared examples, before their atomic commit. Never touch browser workspaces. */
export async function updateSharedScheduleExamples(change: (db: ReviewDatabase, at: string) => ReviewDatabase, options: Options = {}) {
  const env = options.env ?? process.env, store = options.store ?? prototypeStore
  const defaults = options.defaults ?? (await import("./review-seeds")).getDefaultReviewDatabase
  const at = (options.now ?? (() => new Date().toISOString()))()
  if (!productionFeedbackScheduleExamplesEnabled(env)) return store.update("online-reviews", defaults, db => change(db, at))
  const snapshot = await store.read("online-reviews", defaults)
  const proposed = change(structuredClone(snapshot), at)
  const recordIds = new Set<string>(FEEDBACK_SCHEDULE_EXAMPLES.map(example => `review-${example.id}-r1`))
  const pending = proposed.records.filter(record => recordIds.has(record.id)).flatMap(record =>
    (record.feedbackSchedules ?? []).filter(schedule => ["waiting", "sending"].includes(schedule.status) && !schedule.cloudDelivery)
      .map(schedule => ({ recordId: record.id, scheduleId: schedule.id })))
  if (!pending.length && JSON.stringify(snapshot) === JSON.stringify(proposed)) return snapshot
  const scheduler = pending.length ? options.scheduler ?? createCloudFeedbackScheduler({ env }) : undefined
  const prepared: { recordId: string; scheduleId: string; binding: NonNullable<Awaited<ReturnType<Scheduler["prepare"]>>> }[] = []
  for (const item of pending) {
    const binding = await scheduler!.prepare(proposed, { kind: "shared" }, item.recordId, item.scheduleId)
    if (!binding) throw new Error("예약 예시를 예약 전송 서버에 연결하지 못했습니다.")
    prepared.push({ ...item, binding })
  }
  // Reapply only the intended addition/reset to the latest data. External queue calls must not run in CAS.
  return store.update("online-reviews", defaults, current => {
    let next = change(current, at)
    for (const item of prepared) next = bindCloudFeedbackSchedule(next, item.recordId, item.scheduleId, item.binding)
    return next
  })
}

/** Local creation stays in normalization; production requires successful background registration first. */
export async function ensureProductionScheduleExamples(options: Options = {}) {
  const env = options.env ?? process.env
  if (!productionFeedbackScheduleExamplesEnabled(env)) return
  return updateSharedScheduleExamples((db, at) => ensureFeedbackScheduleExamples(initializePro(db), at, env), options)
}
