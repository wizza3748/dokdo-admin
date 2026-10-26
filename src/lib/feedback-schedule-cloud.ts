import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto"
import { Client, Receiver } from "@upstash/qstash"
import { claimDueFeedbackSchedules, executeFeedbackSchedule, failFeedbackScheduleDelivery } from "./pro-domain"
import { emptyReviewDatabase, type ReviewDatabase } from "./review-domain"
import type { FeedbackSchedule } from "./review-schedule"
import { reviewNow } from "./review-clock"
import { PrototypeStore } from "./prototype-store"
import { createStudentTestWorkspaceStore } from "./student-test-workspace"
import { emptyStudentTests } from "./student-test-store"

type Environment = Readonly<Record<string, string | undefined>>
export type ScheduleScope = { kind: "shared" } | { kind: "workspace"; key: string; token: string }
type Job = { version: 1; namespace: string; scope: ScheduleScope; recordId: string; scheduleId: string; nonce: string; queuedAt: string }
type Binding = NonNullable<FeedbackSchedule["cloudDelivery"]>
type Prepared = { binding: Binding; fingerprint: string }
const endpoint = "/api/internal/feedback-schedules"
const checkpointSeconds = 6 * 24 * 60 * 60 // Free permits at most seven days per message, not per reservation.
const hash = (value: string) => createHash("sha256").update(value).digest("hex")
const fingerprint = (schedule: FeedbackSchedule) => hash(JSON.stringify([schedule.id, schedule.recordId, schedule.reviewId, schedule.round, schedule.scheduledAt, schedule.revision]))
const findSchedule = (db: ReviewDatabase, recordId: string, id: string) => db.records.find(r => r.id === recordId)?.feedbackSchedules?.find(s => s.id === id)

export function cloudScheduleConfig(env: Environment) {
  if (env.VERCEL !== "1") return null // Local persisted worker remains unchanged.
  const origin = env.DOKDO_FEEDBACK_SCHEDULE_ORIGIN
  if (env.VERCEL_ENV !== "production" || env.DOKDO_STATE_PROVIDER !== "neon" || !env.DOKDO_STATE_NAMESPACE
    || !origin || new URL(origin).origin !== origin || !origin.startsWith("https://")
    || !/^[a-f0-9]{64}$/.test(env.DOKDO_FEEDBACK_SCHEDULE_KEY || "")
    || !env.QSTASH_TOKEN || !env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY
    || !/^https:\/\/qstash(?:-[a-z0-9-]+)?\.upstash\.io$/.test(env.QSTASH_URL || "")) {
    throw new Error("예약 전송 서버 연결 설정을 확인해 주세요. 예약은 등록되지 않았습니다.")
  }
  return { origin, namespace: env.DOKDO_STATE_NAMESPACE, key: Buffer.from(env.DOKDO_FEEDBACK_SCHEDULE_KEY!, "hex"), url: `${origin}${endpoint}` }
}

export function sealScheduleJob(job: Job, key: Buffer) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(job), "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url")
}

export function openScheduleJob(value: unknown, key: Buffer, namespace: string): Job {
  if (typeof value !== "string" || value.length > 4096 || !/^[\w-]+$/.test(value)) throw new Error("Invalid job")
  const bytes = Buffer.from(value, "base64url"), decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12))
  decipher.setAuthTag(bytes.subarray(12, 28))
  const job = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8")) as Job
  if (job.version !== 1 || job.namespace !== namespace || !job.scope || !job.recordId || !job.scheduleId || !job.nonce || !Number.isFinite(Date.parse(job.queuedAt))
    || !(job.scope.kind === "shared" || job.scope.kind === "workspace" && /^browser-[a-f0-9]{64}$/.test(job.scope.key) && /^[a-f0-9-]{36}$/.test(job.scope.token))) throw new Error("Invalid job")
  return job
}

type Publish = (body: { job: string }, notBefore: number, deduplicationId: string) => Promise<{ messageId: string }>
type Options = { env?: Environment; now?: () => string; publish?: Publish; sharedStore?: PrototypeStore; workspaceStore?: PrototypeStore }

/** Event driven: no database polling or browser timer, no feedback/PII sent to QStash. */
export function createCloudFeedbackScheduler(options: Options = {}) {
  const env = options.env ?? process.env, config = cloudScheduleConfig(env)
  const now = options.now ?? (() => new Date().toISOString())
  const shared = options.sharedStore ?? new PrototypeStore({ env })
  const workspaces = options.workspaceStore ?? createStudentTestWorkspaceStore(env)
  const publish: Publish = options.publish ?? (async (body, notBefore, deduplicationId) => {
    const client = new Client({ token: env.QSTASH_TOKEN!, baseUrl: env.QSTASH_URL!, retry: { retries: 1 } })
    const result = await client.publishJSON({ url: config!.url, body, notBefore, deduplicationId, retries: 3,
      retryDelay: "30000 * (1 + retried)", timeout: "60s", failureCallback: `${config!.url}/failure` })
    if (!("messageId" in result) || !result.messageId) throw new Error("Queue not accepted")
    return { messageId: result.messageId }
  })
  async function enqueue(job: Job, scheduledAt: string) {
    const current = Math.floor(Date.parse(now()) / 1000)
    const notBefore = Math.min(Math.max(Math.ceil(Date.parse(scheduledAt) / 1000), current + 2), current + checkpointSeconds)
    // Stable time slot deduplication supplements (but never replaces) the database CAS guard.
    const slot = Math.floor(notBefore / 60)
    return publish({ job: sealScheduleJob(job, config!.key) }, notBefore, hash(JSON.stringify([job.namespace, job.scope, job.recordId, job.scheduleId, job.nonce, slot])))
  }
  return {
    enabled: !!config,
    /** Publish BEFORE committing a reservation: queue outages cannot leave a successful but unscheduled registration. */
    async prepare(db: ReviewDatabase, scope: ScheduleScope, recordId: string, scheduleId: string): Promise<Prepared | undefined> {
      if (!config) return
      const schedule = findSchedule(db, recordId, scheduleId)
      if (!schedule || !["waiting", "sending"].includes(schedule.status) || schedule.cloudDelivery) return
      const job: Job = { version: 1, namespace: config.namespace, scope, recordId, scheduleId, nonce: randomUUID(), queuedAt: now() }
      try {
        const result = await enqueue(job, schedule.scheduledAt)
        return { binding: { nonce: job.nonce, messageId: result.messageId, queuedAt: job.queuedAt }, fingerprint: fingerprint(schedule) }
      } catch (error) {
        // Fixed vocabulary only: provider errors can contain URLs, tokens or submitted payloads.
        const message = error instanceof Error ? error.message : ""
        const category = /token|authoriz|credential/i.test(message) ? "credentials" : /retries|retry|timeout|delay|limit|quota/i.test(message) ? "delivery-options-or-limit" : /fetch|network|connect/i.test(message) ? "connection" : "unknown"
        const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : undefined
        console.warn("[feedback-schedule] queue-registration-failed", { category, status })
        throw new Error("예약 전송 서버에 등록하지 못했습니다. 잠시 후 다시 시도해 주세요. 기존 내용은 유지됩니다.")
      }
    },
    async receive(raw: string, signature: string, failure = false) {
      if (!config) return { status: 503, result: "unavailable" }
      let job: Job
      try {
        const receiver = new Receiver({ currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY!, nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY!, devMode: false })
        if (!await receiver.verify({ body: raw, signature, url: `${config.url}${failure ? "/failure" : ""}` })) throw new Error("Invalid signature")
        let body = JSON.parse(raw)
        if (failure) {
          if (typeof body.sourceBody !== "string" || body.sourceBody.length > 16384) throw new Error("Invalid failure")
          body = JSON.parse(Buffer.from(body.sourceBody, "base64").toString("utf8"))
        }
        job = openScheduleJob(body.job, config.key, config.namespace)
      } catch { return { status: 401, result: "unauthorized" } }
      return this.process(job, failure)
    },
    /** Only the signature-verified route calls this; exported factory also supports offline transaction tests. */
    async process(job: Job, failure = false) {
      if (!config) throw new Error("Cloud scheduler disabled")
      const scope = job.scope
      const initial = scope.kind === "shared" ? await shared.read("online-reviews", emptyReviewDatabase)
        : (await workspaces.read(scope.key, emptyStudentTests)).sessions.find(s => s.token === scope.token)?.db
      const schedule = initial && findSchedule(initial, job.recordId, job.scheduleId)
      if (!schedule?.cloudDelivery) {
        // A very near reservation can reach us between queue acceptance and database commit.
        return Date.parse(now()) - Date.parse(job.queuedAt) < 120_000 && !failure
          ? { status: 503, result: "registration-pending" } : { status: 200, result: "obsolete" }
      }
      if (schedule.cloudDelivery.nonce !== job.nonce || !["waiting", "sending"].includes(schedule.status)) return { status: 200, result: "obsolete" }
      if (!failure && Date.parse(schedule.scheduledAt) > Date.parse(reviewNow(initial!, now()))) {
        // Fixed-clock examples stay frozen; check again only at the next six-day checkpoint.
        const next = initial!.pro?.clockMode === "test" ? new Date(Date.parse(now()) + checkpointSeconds * 1000).toISOString() : schedule.scheduledAt
        await enqueue(job, next)
        return { status: 200, result: "checkpoint" }
      }
      const update = (db: ReviewDatabase) => {
        const current = findSchedule(db, job.recordId, job.scheduleId)
        if (!current || current.cloudDelivery?.nonce !== job.nonce || !["waiting", "sending"].includes(current.status)) return db
        if (failure) return failFeedbackScheduleDelivery(db, job.recordId, job.scheduleId, now())
        // Recheck the clock inside CAS as well: another request may have changed it.
        if (current.scheduledAt > reviewNow(db, now())) return db
        return executeFeedbackSchedule(claimDueFeedbackSchedules(db, now(), job), job.recordId, job.scheduleId, now())
      }
      if (scope.kind === "shared") await shared.update("online-reviews", emptyReviewDatabase, update)
      else await workspaces.update(scope.key, emptyStudentTests, state => {
        const session = state.sessions.find(s => s.token === scope.token)
        if (!session) return state // Reset/day rotation cannot revive or recreate old examples.
        const db = update(session.db)
        return db === session.db ? state : { ...state, sessions: state.sessions.map(s => s === session ? { ...s, db, changedAt: now() } : s) }
      })
      return { status: 200, result: failure ? "failure-recorded" : "processed" }
    },
  }
}

/** Pure CAS callback: never publish externally inside a retryable database update. */
export function bindCloudFeedbackSchedule(db: ReviewDatabase, recordId: string, scheduleId: string, prepared?: Prepared) {
  if (!prepared) return db
  const schedule = findSchedule(db, recordId, scheduleId)
  if (!schedule || fingerprint(schedule) !== prepared.fingerprint) throw new Error("예약 정보가 변경되었습니다. 최신 내용을 확인해 주세요.")
  if (!["waiting", "sending"].includes(schedule.status)) return db
  if (schedule.cloudDelivery) return db // Concurrent identical request: the first committed queue owns it.
  const next = structuredClone(db)
  findSchedule(next, recordId, scheduleId)!.cloudDelivery = prepared.binding
  return next
}

export async function receiveCloudFeedbackSchedule(request: Request, failure = false) {
  try {
    if (Number(request.headers.get("content-length")) > 24576) return Response.json({ result: "too-large" }, { status: 413 })
    const raw = await request.text()
    if (raw.length > 24576) return Response.json({ result: "too-large" }, { status: 413 })
    const result = await createCloudFeedbackScheduler().receive(raw, request.headers.get("upstash-signature") || "", failure)
    return Response.json({ result: result.result }, { status: result.status, headers: { "Cache-Control": "no-store" } })
  } catch {
    // Never log request bodies, provider responses, connection strings or tokens.
    return Response.json({ result: "temporarily-unavailable" }, { status: 503 })
  }
}
