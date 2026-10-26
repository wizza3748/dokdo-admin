// Local integration smoke test. Only fresh, independently owned cookie workspaces are mutated.
// No HTTP request is made while the server worker is expected to execute the reservations.
// Usage: node --import ./scripts/register-test-ts.mjs --experimental-strip-types scripts/verify-feedback-schedule.mjs http://localhost:3000
import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { setTimeout as pause } from "node:timers/promises"
import { activeFeedbackSchedule, feedbackScheduleRevision, feedbackScheduleSnapshot } from "../src/lib/review-schedule.ts"
import { secondDeadline } from "../src/lib/pro-calendar.ts"

const base = new URL(process.argv[2] || "http://localhost:3000")
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname), "This worker smoke test is local-only")
const root = "/api/mock/student-front-tests"
const directory = process.env.DOKDO_LOCAL_STATE_DIR || path.join(process.cwd(), ".local-state")
const hash = value => createHash("sha256").update(value).digest("hex")
const sharedHash = async () => hash(await readFile(path.join(directory, "online-reviews.json")))
const sharedBefore = await sharedHash()
const results = []
let requestCount = 0

function client() {
  let cookie = ""
  return {
    async request(route = root, data, expectedOK = true) {
      requestCount++
      const response = await fetch(new URL(route, base), {
        method: data === undefined ? "GET" : "POST", cache: "no-store",
        headers: { Origin: base.origin, ...(cookie ? { Cookie: cookie } : {}), ...(data === undefined ? {} : { "Content-Type": "application/json" }) },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: AbortSignal.timeout(60_000),
      })
      const setCookie = response.headers.get("set-cookie")
      if (setCookie) {
        assert.match(setCookie, /HttpOnly/i)
        assert.match(setCookie, /SameSite=strict/i)
        cookie = setCookie.split(";")[0]
      }
      const value = await response.json()
      assert.equal(response.ok, expectedOK, `${route.split("?")[0]}: ${value.message || response.status}`)
      assert.match(response.headers.get("cache-control") || "", /no-store/)
      return value
    },
    workspaceFile() {
      assert.ok(cookie, "Only the fresh client's own workspace may be inspected")
      const secret = cookie.slice(cookie.indexOf("=") + 1)
      assert.match(secret, /^[a-f0-9]{64}$/)
      return path.join(directory, "student-front-tests", "workspaces", `browser-${hash(secret)}.json`)
    },
  }
}
const owner = client(), otherOwner = client(), stranger = client()
await owner.request(root, { action: "prepare" })
await otherOwner.request(root, { action: "prepare" })
let catalog = await owner.request()
const ids = ["schedule-first", "schedule-request", "schedule-second"]
assert.ok(ids.every(id => catalog.rows.some(row => row.id === id)), "All three scheduling examples must be available")
// A new local workspace can inherit legacy examples. Reset only these three owned cases.
for (const id of ids) {
  await owner.request(root, { action: "reset", token: catalog.rows.find(row => row.id === id).token })
}
catalog = await owner.request()
const otherBefore = hash(await readFile(otherOwner.workspaceFile()))
const readWorkspace = async () => {
  const stored = JSON.parse(await readFile(owner.workspaceFile(), "utf8"))
  return stored.format === "dokdo-state-v1" ? stored.value : stored
}
const session = (state, item) => {
  const found = state.sessions.find(value => value.token === item.token)
  assert.ok(found, "Owned case session must exist")
  return found
}
const route = (item, role = "agency") => `${root}/reviews?role=${role}&studentTest=${encodeURIComponent(item.token)}`
const read = (item, role = "agency") => owner.request(route(item, role))
const command = (item, value, ok = true, requestId = randomUUID()) => owner.request(route(item), { command: value, requestId }, ok)
const quota = db => {
  const { used, pending, available, rolloverAvailable } = db.studentPro.usage
  return { used, pending, available, rolloverAvailable }
}
const recordFor = (db, item) => {
  const record = db.records.find(value => value.id === item.recordId)
  assert.ok(record, `${item.id}: target record must exist`)
  return record
}
const commonFor = (db, item) => db.reviews.find(value => value.id === recordFor(db, item).reviewId)
const managementFor = (db, item) => db.pro.cases.find(value => value.reviewId === recordFor(db, item).reviewId)
const content = (db, item) => feedbackScheduleSnapshot(commonFor(db, item), recordFor(db, item))
const assertStudentPrivate = (db, item, scheduleId) => {
  assert.ok(db.records.every(record => !("feedbackSchedules" in record)), "Student must not receive reservation metadata or its saved snapshot")
  assert.ok(!JSON.stringify(db).includes(scheduleId), "Student response must not contain a reservation identifier")
  const record = recordFor(db, item)
  assert.equal(record.feedback, "")
  assert.equal(record.reportFeedback, "")
  assert.deepEqual(record.itemFeedback, [])
  assert.equal(record.report, undefined)
  assert.equal(record.teacherScores, undefined)
}
const items = []
for (const id of ids) {
  const row = catalog.rows.find(value => value.id === id)
  const item = { id, token: row.token, student: row.student, recordId: `test-${id}-target-r${id === "schedule-second" ? 2 : 1}` }
  const db = await read(item), student = await read(item, "student")
  assert.equal(db.pro.clockMode, "real")
  assert.equal(recordFor(db, item).feedbackStatus, "작성완료")
  assert.equal(activeFeedbackSchedule(recordFor(db, item)), undefined)
  item.initialContent = content(db, item)
  item.initialQuota = quota(student)
  item.initialCase = managementFor(db, item)
  items.push(item)
}
assert.deepEqual(items.map(item => item.initialQuota.used), [0, 0, 1])
results.push("Three isolated examples have consistent saved feedback, real clocks and initial usage 0/0/1")
const unrelatedBefore = hash(JSON.stringify((await readWorkspace()).sessions.filter(value => !ids.includes(value.caseId))))

const first = items[0]
let db = await read(first)
const cancelAt = new Date(Math.ceil(Date.now() / 60_000) * 60_000 + 120_000).toISOString()
db = await command(first, { type: "schedule-feedback", recordId: first.recordId, scheduledAt: cancelAt, expectedRevision: feedbackScheduleRevision(commonFor(db, first), recordFor(db, first)) })
const cancelledId = activeFeedbackSchedule(recordFor(db, first)).id
assertStudentPrivate(await read(first, "student"), first, cancelledId)
for (const blocked of [
  { type: "send", recordId: first.recordId },
  { type: "ai-start", recordId: first.recordId },
  { type: "save-feedback", recordId: first.recordId, feedback: "Should not be saved", items: recordFor(db, first).itemFeedback, decision: "complete" },
]) {
  const error = await command(first, blocked, false)
  assert.equal(error.message, "전송 예약을 취소한 후 처리해 주세요.")
}
await stranger.request(route(first), undefined, false)
await otherOwner.request(route(first), undefined, false)
await otherOwner.request(route(first), { command: { type: "cancel-feedback-schedule", recordId: first.recordId, scheduleId: cancelledId }, requestId: randomUUID() }, false)
await stranger.request(route(first), { command: { type: "send", recordId: first.recordId }, requestId: randomUUID() }, false)
results.push("Student sees no unsent feedback/reservation snapshot; manual send/save/AI and foreign/missing-cookie access are blocked")
db = await command(first, { type: "cancel-feedback-schedule", recordId: first.recordId, scheduleId: cancelledId })
assert.equal(activeFeedbackSchedule(recordFor(db, first)), undefined)
assert.equal(recordFor(db, first).feedbackSchedules.find(value => value.id === cancelledId).status, "cancelled")
assert.deepEqual(content(db, first), first.initialContent)
assert.deepEqual(quota(await read(first, "student")), first.initialQuota)
assert.equal(recordFor(db, first).history.filter(value => value.action === "cancel-feedback-schedule").length, 1)
results.push("Cancellation preserves saved content, evaluation, quota and the cancelled reservation history")

// Leave at least one full minute for all API assertions to complete before the no-HTTP interval.
const scheduledAt = new Date(Math.ceil(Date.now() / 60_000) * 60_000 + 60_000).toISOString()
for (const item of items) {
  db = await read(item)
  item.scheduleId = randomUUID()
  const scheduleCommand = { type: "schedule-feedback", recordId: item.recordId, scheduledAt, expectedRevision: feedbackScheduleRevision(commonFor(db, item), recordFor(db, item)) }
  db = await command(item, scheduleCommand, true, item.scheduleId)
  const duplicate = await command(item, scheduleCommand, true, item.scheduleId)
  assert.equal(recordFor(duplicate, item).feedbackSchedules.filter(value => value.id === item.scheduleId).length, 1)
  assert.equal(recordFor(duplicate, item).history.filter(value => value.requestId === item.scheduleId).length, 1)
  assert.equal(activeFeedbackSchedule(recordFor(db, item)).status, "waiting")
  assert.deepEqual(content(db, item), item.initialContent)
  const student = await read(item, "student")
  assertStudentPrivate(student, item, item.scheduleId)
  assert.deepEqual(quota(student), item.initialQuota)
}
const quietRequestCount = requestCount
assert.ok(Date.parse(scheduledAt) > Date.now(), "Reservations must still be future before polling stops")
console.log(JSON.stringify({ phase: "waiting-without-http", scheduledAt, requestsCompleted: quietRequestCount, students: items.map(({ student }) => student) }))
let executed
while (Date.now() <= Date.parse(scheduledAt) + 30_000) {
  const state = await readWorkspace()
  const schedules = items.map(item => recordFor(session(state, item).db, item).feedbackSchedules.find(value => value.id === item.scheduleId))
  const failed = schedules.find(value => value.status === "failed")
  assert.equal(failed, undefined, failed?.failureReason)
  if (schedules.every(value => value.status === "sent")) { executed = state; break }
  await pause(1_000)
}
assert.ok(executed, "Server worker must persist all three sends within 30 seconds of due time without any HTTP request")
assert.equal(requestCount, quietRequestCount)
results.push("Server worker persisted all three due sends without any HTTP request during the due-time interval")

const completed = []
for (const item of items) {
  const persisted = session(executed, item).db, record = recordFor(persisted, item), management = managementFor(persisted, item)
  const schedule = record.feedbackSchedules.find(value => value.id === item.scheduleId)
  assert.equal(record.feedbackStatus, "전송완료")
  assert.equal(schedule.executedAt, record.sentAt)
  assert.ok(Date.parse(record.sentAt) >= Date.parse(scheduledAt))
  assert.ok(Date.parse(record.sentAt) < Date.parse(scheduledAt) + 30_000)
  assert.deepEqual(content(persisted, item), item.initialContent)
  assert.equal(record.history.filter(value => value.action === "send").length, 1)
  assert.equal(record.history.filter(value => value.action === "feedback-schedule-claim").length, 1)
  assert.equal(schedule.events.filter(value => value.action === "sent").length, 1)
  assert.equal(persisted.pro.audit.filter(value => value.kind === "예약 전송 성공" && value.reviewId === record.reviewId).length, 1)
  assert.equal(management.finalSnapshots.filter(value => value.recordId === record.id).length, 1)
  if (item.id === "schedule-request") {
    assert.equal(management.firstSentAt, record.sentAt)
    assert.equal(management.secondDeadline, secondDeadline(record.sentAt, management.weekday))
    assert.equal(management.closedAt, undefined)
    assert.equal(management.parent.status, "none")
    assert.equal(management.parent.attempts.length, 0)
  } else {
    assert.equal(management.closedAt, record.sentAt)
    assert.equal(management.closeReason, item.id === "schedule-second" ? "2차 완료 전송" : "1차 완료 전송")
    assert.equal(management.parent.status, "sent")
    assert.equal(management.parent.attempts.length, 1)
    assert.equal(record.parentSentAt, record.sentAt)
  }
  if (item.id === "schedule-second") {
    assert.equal(management.firstSentAt, item.initialCase.firstSentAt)
    assert.equal(management.secondDeadline, item.initialCase.secondDeadline)
  }
  const student = await read(item, "student")
  assert.equal(quota(student).used, 1)
  assert.equal(quota(student).pending, 0)
  assert.equal(recordFor(student, item).feedback, item.initialContent.feedback)
  assert.ok(student.records.every(value => !("feedbackSchedules" in value)))
  completed.push({ case: item.id, student: item.student, scheduledAt, actualSentAt: record.sentAt, usageBefore: item.initialQuota.used, usageAfter: quota(student).used, secondDeadline: management.secondDeadline, parent: management.parent.status })
}
results.push("1st completion closes/sends parent once; 1st request starts the actual-send-based 2nd deadline; 2nd completion closes/sends parent without another debit")

const completedSignature = state => hash(JSON.stringify(state.sessions.filter(value => ids.includes(value.caseId)).map(value => value.db)))
const afterSendSignature = completedSignature(await readWorkspace())
await pause(3_000)
assert.equal(completedSignature(await readWorkspace()), afterSendSignature, "Repeated worker ticks must not duplicate sends, quota, snapshots or parent delivery")
assert.equal(hash(JSON.stringify((await readWorkspace()).sessions.filter(value => !ids.includes(value.caseId)))), unrelatedBefore)
assert.equal(hash(await readFile(otherOwner.workspaceFile())), otherBefore)
assert.equal(await sharedHash(), sharedBefore)
results.push("Repeated worker ticks are idempotent; unrelated owned examples, other owner's workspace and shared file remain unchanged")
console.log(JSON.stringify({ origin: base.origin, passed: results.length, results, completed, noHTTPDuringDueProcessing: true, sharedFileUnchanged: true, otherOwnerUnchanged: true }, null, 2))
