import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { SignJWT } from "jose"
import { bindCloudFeedbackSchedule, cloudScheduleConfig, createCloudFeedbackScheduler, openScheduleJob } from "../src/lib/feedback-schedule-cloud"
import { PrototypeStore } from "../src/lib/prototype-store"
import { applyManagedReviewCommand, proUsage } from "../src/lib/pro-domain"
import { feedbackScheduleRevision } from "../src/lib/review-schedule"
import { newStudentTestSession, emptyStudentTests, resetStudentTest } from "../src/lib/student-test-store"
import { testTeacher } from "../src/lib/student-test-scenarios"
import { emptyReviewDatabase } from "../src/lib/review-domain"

const before = "2026-10-26T04:00:00.000Z", due = "2026-10-26T04:01:00.000Z"
const env = { VERCEL: "1", VERCEL_ENV: "production", DOKDO_STATE_PROVIDER: "neon", DOKDO_STATE_NAMESPACE: "test:production", DOKDO_FEEDBACK_SCHEDULE_ORIGIN: "https://example.test", DOKDO_FEEDBACK_SCHEDULE_KEY: "ab".repeat(32), QSTASH_URL: "https://qstash-eu-central-1.upstash.io", QSTASH_TOKEN: "fake", QSTASH_CURRENT_SIGNING_KEY: "fake-current", QSTASH_NEXT_SIGNING_KEY: "fake-next" }
const key = Buffer.from(env.DOKDO_FEEDBACK_SCHEDULE_KEY, "hex")
const ownerA = `browser-${"a".repeat(64)}`, ownerB = `browser-${"b".repeat(64)}`
function fixture(id = "cloud-job", scheduledAt = due, caseId: "schedule-first" | "schedule-request" | "schedule-second" = "schedule-first") {
  const session = newStudentTestSession(caseId, before)
  const record = session.db.records.find(r => r.id === `${session.targetId}-${caseId === "schedule-second" ? "r2" : "r1"}`)!
  const review = session.db.reviews.find(r => r.id === record.reviewId)!
  session.db = applyManagedReviewCommand(session.db, { type: "schedule-feedback", recordId: record.id, scheduledAt, expectedRevision: feedbackScheduleRevision(review, record) }, testTeacher, id, before)
  return { session, recordId: record.id, scheduleId: id }
}
async function setup(run: (context: {
  directory: string; shared: PrototypeStore; workspaces: PrototypeStore;
  scheduler: ReturnType<typeof createCloudFeedbackScheduler>;
  deliveries: { body: { job: string }; at: number; dedup: string }[]; advance: (at: string) => void;
}) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), "dokdo-cloud-schedule-"))
  const shared = new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory })
  const workspaces = new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory: path.join(directory, "workspaces") })
  let at = before
  const deliveries: { body: { job: string }; at: number; dedup: string }[] = []
  const scheduler = createCloudFeedbackScheduler({ env, sharedStore: shared, workspaceStore: workspaces, now: () => at, publish: async (body, at, dedup) => { deliveries.push({ body, at, dedup }); return { messageId: `message-${deliveries.length}` } } })
  try { await run({ directory, shared, workspaces, scheduler, deliveries, advance: value => { at = value } }) }
  finally { await rm(directory, { recursive: true, force: true }) }
}

test("cloud delivery is production-only; absent configuration fails closed without changing local worker", () => {
  assert.equal(cloudScheduleConfig({ NODE_ENV: "development" }), null)
  assert.throws(() => cloudScheduleConfig({ ...env, VERCEL_ENV: "preview" }), /설정/)
  assert.throws(() => cloudScheduleConfig({ ...env, QSTASH_TOKEN: "" }), /설정/)
  assert.throws(() => cloudScheduleConfig({ ...env, QSTASH_URL: "https://attacker.test" }), /설정/)
})

test("queue failure never commits a registration, and transport errors do not expose secrets", async () => {
  const { session, recordId, scheduleId } = fixture()
  const original = JSON.stringify(session.db)
  const scheduler = createCloudFeedbackScheduler({ env, publish: async () => { throw new Error("secret-token") } })
  await assert.rejects(scheduler.prepare(session.db, { kind: "shared" }, recordId, scheduleId), error => error instanceof Error && /등록하지 못/.test(error.message) && !/secret-token/.test(error.message))
  assert.equal(JSON.stringify(session.db), original)
})

test("encrypted queue payload contains no student/feedback data, rejects tampering and cross-environment replay", async () => setup(async ({ scheduler, deliveries }) => {
  const { session, recordId, scheduleId } = fixture()
  await scheduler.prepare(session.db, { kind: "workspace", key: ownerA, token: session.token }, recordId, scheduleId)
  const body = JSON.stringify(deliveries[0].body)
  for (const value of [recordId, session.token, session.db.records[0].feedback, ownerA]) if (value) assert.equal(body.includes(value), false)
  const job = openScheduleJob(deliveries[0].body.job, key, env.DOKDO_STATE_NAMESPACE)
  assert.equal(job.recordId, recordId)
  assert.throws(() => openScheduleJob(deliveries[0].body.job, key, "preview"))
  const damaged = Buffer.from(deliveries[0].body.job, "base64url"); damaged[30] ^= 1
  assert.throws(() => openScheduleJob(damaged.toString("base64url"), key, env.DOKDO_STATE_NAMESPACE))
}))

test("browser-closed delivery, parallel duplicates, exact quota and parent completion remain isolated", async () => setup(async ({ directory, shared, workspaces, scheduler, deliveries, advance }) => {
  const { session, recordId, scheduleId } = fixture()
  const other = newStudentTestSession("apply-one", before)
  await shared.update("online-reviews", emptyReviewDatabase, s => s)
  await workspaces.update(ownerB, () => ({ day: "2026-10-26", sessions: [other] }), s => s)
  const untouchedFiles = [path.join(directory, "online-reviews.json"), path.join(directory, "workspaces", `${ownerB}.json`)]
  const snapshots = await Promise.all(untouchedFiles.map(file => readFile(file, "utf8")))
  const prepared = await scheduler.prepare(session.db, { kind: "workspace", key: ownerA, token: session.token }, recordId, scheduleId)
  const usageBefore = proUsage(session.db.pro!, session.db.pro!.members[0], before).used
  session.db = bindCloudFeedbackSchedule(session.db, recordId, scheduleId, prepared)
  await workspaces.update(ownerA, () => ({ day: "2026-10-26", sessions: [session, other] }), s => s)
  const job = openScheduleJob(deliveries[0].body.job, key, env.DOKDO_STATE_NAMESPACE)
  advance(due)
  await Promise.all([scheduler.process(job), scheduler.process(job), scheduler.process(job)])
  const state = await workspaces.read(ownerA, emptyStudentTests), result = state.sessions[0].db
  const record = result.records.find(r => r.id === recordId)!
  assert.equal(record.feedbackStatus, "전송완료")
  assert.equal(record.sentAt, due)
  assert.equal(record.history.filter(h => h.action === "send").length, 1)
  assert.equal(proUsage(result.pro!, result.pro!.members[0], due).used, usageBefore + 1)
  assert.equal(result.pro!.cases[0].closeReason, "1차 완료 전송")
  assert.equal(result.pro!.cases[0].parent.status, "sent")
  assert.equal(JSON.stringify(state.sessions[1]), JSON.stringify(other))
  assert.deepEqual(await Promise.all(untouchedFiles.map(file => readFile(file, "utf8"))), snapshots)
}))

test("cancel/reset before callback never sends or recreates the old session", async () => setup(async ({ workspaces, scheduler, deliveries, advance }) => {
  const { session, recordId, scheduleId } = fixture()
  session.db = bindCloudFeedbackSchedule(session.db, recordId, scheduleId, await scheduler.prepare(session.db, { kind: "workspace", key: ownerA, token: session.token }, recordId, scheduleId))
  session.db = applyManagedReviewCommand(session.db, { type: "cancel-feedback-schedule", recordId, scheduleId }, testTeacher, "cancel", before)
  await workspaces.update(ownerA, () => ({ day: "2026-10-26", sessions: [session] }), s => s)
  const job = openScheduleJob(deliveries[0].body.job, key, env.DOKDO_STATE_NAMESPACE)
  advance(due)
  assert.equal((await scheduler.process(job)).result, "obsolete")
  await workspaces.update(ownerA, emptyStudentTests, state => resetStudentTest(state, session.token, due))
  advance("2026-10-26T04:03:00.000Z")
  const reset = await workspaces.read(ownerA, emptyStudentTests)
  assert.equal((await scheduler.process(job)).result, "obsolete")
  assert.deepEqual(await workspaces.read(ownerA, emptyStudentTests), reset)
}))

test("queue/commit gap retries briefly; repeated registration binds only the first committed job", async () => setup(async ({ scheduler, deliveries, shared }) => {
  const { session, recordId, scheduleId } = fixture()
  const first = await scheduler.prepare(session.db, { kind: "shared" }, recordId, scheduleId)
  const second = await scheduler.prepare(session.db, { kind: "shared" }, recordId, scheduleId)
  const job = openScheduleJob(deliveries[0].body.job, key, env.DOKDO_STATE_NAMESPACE)
  assert.equal((await scheduler.process(job)).status, 503)
  let db = bindCloudFeedbackSchedule(session.db, recordId, scheduleId, first)
  db = bindCloudFeedbackSchedule(db, recordId, scheduleId, second)
  await shared.update("online-reviews", () => db, s => s)
  const redundant = openScheduleJob(deliveries[1].body.job, key, env.DOKDO_STATE_NAMESPACE)
  assert.equal((await scheduler.process(redundant)).result, "obsolete")
  assert.equal(await scheduler.prepare(db, { kind: "shared" }, recordId, scheduleId), undefined)
}))

test("long reservations use free six-day checkpoints without shortening the requested time", async () => setup(async ({ scheduler, deliveries, shared, advance }) => {
  const far = "2026-11-20T04:00:00.000Z", { session, recordId, scheduleId } = fixture("far", far)
  const db = bindCloudFeedbackSchedule(session.db, recordId, scheduleId, await scheduler.prepare(session.db, { kind: "shared" }, recordId, scheduleId))
  await shared.update("online-reviews", () => db, s => s)
  assert.equal(deliveries[0].at, Date.parse(before) / 1000 + 6 * 86400)
  advance(new Date(deliveries[0].at * 1000).toISOString())
  assert.equal((await scheduler.process(openScheduleJob(deliveries[0].body.job, key, env.DOKDO_STATE_NAMESPACE))).result, "checkpoint")
  assert.equal(deliveries.length, 2)
  assert.equal(JSON.stringify(await shared.read("online-reviews", emptyReviewDatabase)), JSON.stringify(db))
  assert.equal(db.records[0].feedbackSchedules![0].scheduledAt, far)
}))

test("transport exhaustion is terminal, preserves quota/feedback, and does not auto-retry business failure", async () => setup(async ({ scheduler, deliveries, shared, advance }) => {
  const { session, recordId, scheduleId } = fixture()
  const db = bindCloudFeedbackSchedule(session.db, recordId, scheduleId, await scheduler.prepare(session.db, { kind: "shared" }, recordId, scheduleId))
  await shared.update("online-reviews", () => db, s => s)
  const job = openScheduleJob(deliveries[0].body.job, key, env.DOKDO_STATE_NAMESPACE)
  advance(due)
  await scheduler.process(job, true)
  const failed = await shared.read("online-reviews", emptyReviewDatabase)
  assert.equal(failed.records[0].feedbackSchedules![0].status, "failed")
  assert.equal(failed.records[0].sentAt, undefined)
  assert.equal(failed.records[0].feedback, db.records[0].feedback)
  assert.equal(proUsage(failed.pro!, failed.pro!.members[0], due).used, proUsage(db.pro!, db.pro!.members[0], due).used)
  await scheduler.process(job)
  assert.deepEqual(await shared.read("online-reviews", emptyReviewDatabase), failed)
}))

test("fixed test clocks and unrelated due reservations are not advanced by one job", async () => setup(async ({ scheduler, deliveries, shared, advance }) => {
  const { session, recordId, scheduleId } = fixture()
  session.db.pro!.clockMode = "test"; session.db.pro!.clock = before
  const db = bindCloudFeedbackSchedule(session.db, recordId, scheduleId, await scheduler.prepare(session.db, { kind: "shared" }, recordId, scheduleId))
  await shared.update("online-reviews", () => db, s => s)
  advance(due)
  await scheduler.process(openScheduleJob(deliveries[0].body.job, key, env.DOKDO_STATE_NAMESPACE))
  assert.equal(JSON.stringify(await shared.read("online-reviews", emptyReviewDatabase)), JSON.stringify(db))
}))

test("signed HTTP delivery validates raw body, destination and signing key rotation", async () => setup(async ({ scheduler, deliveries, shared, advance }) => {
  const { session, recordId, scheduleId } = fixture()
  const db = bindCloudFeedbackSchedule(session.db, recordId, scheduleId, await scheduler.prepare(session.db, { kind: "shared" }, recordId, scheduleId))
  await shared.update("online-reviews", () => db, s => s)
  advance(due)
  const raw = JSON.stringify(deliveries[0].body)
  const sign = (url: string, secret: string) => new SignJWT({ body: createHash("sha256").update(raw).digest("base64url") }).setProtectedHeader({ alg: "HS256" }).setIssuer("Upstash").setSubject(url).setIssuedAt().setNotBefore("0s").setExpirationTime("5m").sign(new TextEncoder().encode(secret))
  assert.equal((await scheduler.receive(raw, "invalid")).status, 401)
  assert.equal((await scheduler.receive(raw, await sign("https://wrong.test", env.QSTASH_CURRENT_SIGNING_KEY))).status, 401)
  const signature = await sign(`${env.DOKDO_FEEDBACK_SCHEDULE_ORIGIN}/api/internal/feedback-schedules`, env.QSTASH_NEXT_SIGNING_KEY)
  assert.equal((await scheduler.receive(raw + " ", signature)).status, 401)
  assert.equal((await scheduler.receive(raw, signature)).status, 200)
  assert.equal((await shared.read("online-reviews", emptyReviewDatabase)).records[0].sentAt, due)
}))

for (const caseId of ["schedule-request", "schedule-second"] as const) test(`${caseId}: actual delivery keeps existing second-round and quota policies`, async () => setup(async ({ scheduler, deliveries, shared, advance }) => {
  const { session, recordId, scheduleId } = fixture(caseId, due, caseId)
  const db = bindCloudFeedbackSchedule(session.db, recordId, scheduleId, await scheduler.prepare(session.db, { kind: "shared" }, recordId, scheduleId))
  const usage = proUsage(db.pro!, db.pro!.members[0], before).used
  await shared.update("online-reviews", () => db, s => s)
  const actual = "2026-10-26T04:02:30.000Z"
  advance(actual)
  await scheduler.process(openScheduleJob(deliveries[0].body.job, key, env.DOKDO_STATE_NAMESPACE))
  const result = await shared.read("online-reviews", emptyReviewDatabase), c = result.pro!.cases.find(c => c.reviewId === session.targetId)!
  assert.equal(result.records.find(r => r.id === recordId)!.sentAt, actual)
  if (caseId === "schedule-request") {
    assert.equal(c.firstSentAt, actual)
    assert.ok(c.secondDeadline)
    assert.equal(c.closedAt, undefined)
    assert.notEqual(c.parent.status, "sent")
    assert.equal(proUsage(result.pro!, result.pro!.members[0], actual).used, usage + 1)
  } else {
    assert.equal(c.closeReason, "2차 완료 전송")
    assert.equal(c.parent.status, "sent")
    assert.equal(proUsage(result.pro!, result.pro!.members[0], actual).used, usage)
  }
}))

test("changed feedback fails once without sending, and signed failure callbacks cannot affect another reservation", async () => setup(async ({ scheduler, deliveries, shared, advance }) => {
  const { session, recordId, scheduleId } = fixture()
  const db = bindCloudFeedbackSchedule(session.db, recordId, scheduleId, await scheduler.prepare(session.db, { kind: "shared" }, recordId, scheduleId))
  db.records[0].feedback += " changed"
  await shared.update("online-reviews", () => db, s => s)
  advance(due)
  const job = openScheduleJob(deliveries[0].body.job, key, env.DOKDO_STATE_NAMESPACE)
  await scheduler.process(job)
  const failed = await shared.read("online-reviews", emptyReviewDatabase)
  assert.equal(failed.records[0].feedbackSchedules![0].status, "failed")
  assert.equal(failed.records[0].sentAt, undefined)
  const raw = JSON.stringify({ sourceBody: Buffer.from(JSON.stringify(deliveries[0].body)).toString("base64"), status: 503, retried: 5, maxRetries: 5 })
  const sig = await new SignJWT({ body: createHash("sha256").update(raw).digest("base64url") }).setProtectedHeader({ alg: "HS256" }).setIssuer("Upstash").setSubject(`${env.DOKDO_FEEDBACK_SCHEDULE_ORIGIN}/api/internal/feedback-schedules/failure`).setNotBefore("0s").setExpirationTime("5m").sign(new TextEncoder().encode(env.QSTASH_CURRENT_SIGNING_KEY))
  assert.equal((await scheduler.receive(raw, sig, true)).status, 200)
  assert.deepEqual(await shared.read("online-reviews", emptyReviewDatabase), failed)
}))
