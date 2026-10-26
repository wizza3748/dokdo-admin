import { readdir } from "node:fs/promises"
import path from "node:path"
import { claimDueFeedbackSchedules, executeFeedbackSchedule } from "./pro-domain"
import { emptyReviewDatabase, type ReviewDatabase } from "./review-domain"
import { reviewNow } from "./review-clock"
import { PrototypeStore } from "./prototype-store"
import { emptyStudentTests, type StudentTestState } from "./student-test-store"

type Environment = Readonly<Record<string, string | undefined>>
type ScheduleExecutor = typeof executeFeedbackSchedule
type WorkerOptions = {
  directory: string
  now?: () => string
  execute?: ScheduleExecutor
  onError?: (error: unknown) => void
}
type Scope<T> = {
  store: PrototypeStore
  key: string
  fallback: () => T
  databases: (state: T) => { id: string; db: ReviewDatabase }[]
  change: (state: T, id: string, update: (db: ReviewDatabase) => ReviewDatabase) => T
}

function needsWork(db: ReviewDatabase, realAt: string) {
  const now = Date.parse(reviewNow(db, realAt))
  return db.records.some(record => record.feedbackSchedules?.some(schedule => schedule.status === "sending" || (schedule.status === "waiting" && Date.parse(schedule.scheduledAt) <= now)))
}

/** Each claim and final result uses the same serialized update as interactive actions. */
async function processScope<T>(scope: Scope<T>, now: () => string, execute: ScheduleExecutor) {
  const snapshot = await scope.store.read(scope.key, scope.fallback)
  if (!scope.databases(snapshot).some(({ db }) => needsWork(db, now()))) return

  const claimed = await scope.store.update(scope.key, scope.fallback, state => {
    let next = state
    for (const { id } of scope.databases(state)) next = scope.change(next, id, db => claimDueFeedbackSchedules(db, now()))
    return next
  })
  const jobs = scope.databases(claimed).flatMap(({ id, db }) => db.records.flatMap(record =>
    (record.feedbackSchedules ?? []).filter(schedule => schedule.status === "sending").map(schedule => ({ id, recordId: record.id, scheduleId: schedule.id }))))
  for (const job of jobs) {
    await scope.store.update(scope.key, scope.fallback, state => scope.change(state, job.id, db => execute(db, job.recordId, job.scheduleId, now())))
  }
}

/** Local-only adapter: persisted browser workspaces are never merged or regenerated. */
export function createFeedbackScheduleWorker(options: WorkerOptions) {
  const directory = path.resolve(options.directory)
  const workspaceDirectory = path.join(directory, "student-front-tests", "workspaces")
  const sharedStore = new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory })
  const workspaceStore = new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory: workspaceDirectory })
  const now = options.now ?? (() => new Date().toISOString())
  const execute = options.execute ?? executeFeedbackSchedule
  let running: Promise<void> | undefined

  const sharedScope: Scope<ReviewDatabase> = {
    store: sharedStore, key: "online-reviews", fallback: emptyReviewDatabase,
    databases: db => [{ id: "shared", db }],
    change: (db, _id, update) => update(db),
  }
  const workspaceScope = (key: string): Scope<StudentTestState> => ({
    store: workspaceStore, key, fallback: emptyStudentTests,
    databases: state => state.sessions.map(session => ({ id: session.token, db: session.db })),
    change: (state, id, update) => {
      let changed = false
      const sessions = state.sessions.map(session => {
        if (session.token !== id) return session
        const db = update(session.db)
        if (db === session.db) return session
        changed = true
        return { ...session, db, changedAt: now() }
      })
      return changed ? { ...state, sessions } : state
    },
  })
  async function safely<T>(scope: Scope<T>) {
    try { await processScope(scope, now, execute) }
    catch (error) { options.onError?.(error) }
  }
  async function run() {
    await safely(sharedScope)
    let entries
    try { entries = await readdir(workspaceDirectory, { withFileTypes: true }) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") options.onError?.(error)
      return
    }
    // Ignore unrelated/legacy files and symlinks. Browser hashes contain no credentials.
    for (const entry of entries) {
      if (entry.isFile() && /^browser-[a-f0-9]{64}\.json$/.test(entry.name)) await safely(workspaceScope(entry.name.slice(0, -5)))
    }
  }
  return {
    tick() {
      if (running) return running
      running = run().finally(() => { running = undefined })
      return running
    },
  }
}

export function localFeedbackScheduleWorkerEnabled(env: Environment) {
  return env.NODE_ENV === "development" && env.VERCEL !== "1"
    && (!env.DOKDO_STATE_PROVIDER || env.DOKDO_STATE_PROVIDER === "local")
    && !env.UPSTASH_REDIS_REST_URL && !env.KV_REST_API_URL
}

type WorkerHandle = { timer: ReturnType<typeof setInterval>; tick: () => Promise<void> }
const globalWorker = globalThis as typeof globalThis & { dokdoFeedbackScheduleWorker?: WorkerHandle }

/** Next's Node server owns this timer; closing every browser tab does not stop it. */
export function startLocalFeedbackScheduleWorker(env: Environment = process.env) {
  if (!localFeedbackScheduleWorkerEnabled(env)) return
  if (globalWorker.dokdoFeedbackScheduleWorker) return globalWorker.dokdoFeedbackScheduleWorker
  let warnedAt = 0
  const worker = createFeedbackScheduleWorker({
    directory: env.DOKDO_LOCAL_STATE_DIR || path.join(process.cwd(), ".local-state"),
    onError: () => {
      if (Date.now() - warnedAt < 30_000) return
      warnedAt = Date.now()
      console.warn("[feedback-schedule] 예약 처리 저장소를 확인해 주세요. 다음 확인에서 저장된 처리 상태를 다시 확인합니다.")
    },
  })
  const tick = () => worker.tick()
  const timer = setInterval(() => { void tick() }, 1_000)
  timer.unref()
  const handle = { timer, tick }
  globalWorker.dokdoFeedbackScheduleWorker = handle
  console.info("[feedback-schedule] 로컬 예약 전송 작업자 실행 중 (1초 간격, 브라우저 없이 처리)")
  void tick()
  return handle
}
