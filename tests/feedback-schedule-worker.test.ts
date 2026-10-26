import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createFeedbackScheduleWorker, localFeedbackScheduleWorkerEnabled } from "../src/lib/feedback-schedule-worker"
import { PrototypeStore } from "../src/lib/prototype-store"
import { applyManagedReviewCommand, applyProCommand, claimDueFeedbackSchedules, executeFeedbackSchedule, proUsage } from "../src/lib/pro-domain"
import { feedbackScheduleRevision } from "../src/lib/review-schedule"
import { buildStudentTest, testFeedback, testStudent, testTeacher } from "../src/lib/student-test-scenarios"
import { emptyStudentTests, newStudentTestSession } from "../src/lib/student-test-store"
import { emptyReviewDatabase, type ReviewDatabase } from "../src/lib/review-domain"
import { visibleReviewState } from "../src/lib/review-visibility"
import { sharedReviewState } from "../src/lib/review-share-projection"
import { runAgencyStudentTest, studentTestRequestActor } from "../src/lib/student-test-agency"
import { proTasks, scopePro, weeklyStudent } from "../src/lib/pro-selectors"
import { weekStart } from "../src/lib/pro-calendar"

const before = "2026-10-21T04:00:00.000Z", due = "2026-10-21T04:01:00.000Z"
const browserA = `browser-${"a".repeat(64)}`, browserB = `browser-${"b".repeat(64)}`
function scheduled(id = "scheduled"): ReviewDatabase {
  const fixture = buildStudentTest("apply-one", before)
  const reviewId = fixture.targetId!, recordId = `${reviewId}-r1`
  let db = applyProCommand(fixture.db, { type: "apply", reviewId }, testStudent(fixture.db), `${id}:apply`, before)
  db = applyManagedReviewCommand(db, testFeedback(recordId), testTeacher, `${id}:save`, before)
  return applyManagedReviewCommand(db, { type: "schedule-feedback", recordId, scheduledAt: due, expectedRevision: feedbackScheduleRevision(db.reviews[0], db.records[0]) }, testTeacher, id, before)
}
function stores(directory: string) {
  return {
    shared: new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory }),
    workspace: new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory: path.join(directory, "student-front-tests", "workspaces") }),
  }
}
async function temporary(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), "dokdo-feedback-worker-"))
  try { await run(directory) } finally { await rm(directory, { recursive: true, force: true }) }
}

test("the autonomous local worker never starts for production or remote data providers", () => {
  assert.equal(localFeedbackScheduleWorkerEnabled({ NODE_ENV: "development" }), true)
  assert.equal(localFeedbackScheduleWorkerEnabled({ NODE_ENV: "development", DOKDO_STATE_PROVIDER: "local" }), true)
  for (const env of [{ NODE_ENV: "production" }, { NODE_ENV: "test" }, { NODE_ENV: "development", VERCEL: "1" }, { NODE_ENV: "development", DOKDO_STATE_PROVIDER: "neon" }, { NODE_ENV: "development", KV_REST_API_URL: "https://example.test" }]) {
    assert.equal(localFeedbackScheduleWorkerEnabled(env), false)
  }
})

test("relative and absolute local storage paths use the same interactive/worker transaction queue", async () => temporary(async directory => {
  const absolute = new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory })
  const relative = new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory: path.relative(process.cwd(), directory) })
  const fallback = () => ({ count: 0 })
  await absolute.update("queue-test", fallback, state => state)
  await Promise.all(Array.from({ length: 30 }, (_, i) => (i % 2 ? absolute : relative).update("queue-test", fallback, state => ({ count: state.count + 1 }))))
  assert.equal((await absolute.read("queue-test", fallback)).count, 30)
}))

test("empty/no-due ticks neither create fixtures nor rewrite unrelated shared or workspace data", async () => temporary(async directory => {
  const worker = createFeedbackScheduleWorker({ directory, now: () => before })
  await worker.tick()
  assert.deepEqual(await readdir(directory), [])
  const { shared, workspace } = stores(directory)
  await shared.update("online-reviews", () => scheduled(), state => state)
  await workspace.update(browserA, () => ({ day: "2026-10-21", sessions: [newStudentTestSession("apply-one", before)] }), state => state)
  const sharedFile = path.join(directory, "online-reviews.json"), workspaceFile = path.join(directory, "student-front-tests", "workspaces", `${browserA}.json`)
  const snapshots = [await readFile(sharedFile, "utf8"), await readFile(workspaceFile, "utf8")]
  await worker.tick()
  assert.deepEqual([await readFile(sharedFile, "utf8"), await readFile(workspaceFile, "utf8")], snapshots)
}))

test("due feedback sends without any page request and repeated or concurrent ticks send only once", async () => temporary(async directory => {
  const { shared } = stores(directory), db = scheduled()
  const usage = proUsage(db.pro!, db.pro!.members[0], before)
  await shared.update("online-reviews", () => db, state => state)
  const errors: unknown[] = []
  const first = createFeedbackScheduleWorker({ directory, now: () => due, onError: error => errors.push(error) })
  const second = createFeedbackScheduleWorker({ directory, now: () => due, onError: error => errors.push(error) })
  await Promise.all([first.tick(), first.tick(), second.tick()])
  await first.tick()
  const result = await shared.read("online-reviews", emptyReviewDatabase)
  assert.deepEqual(errors, [])
  assert.equal(result.records[0].feedbackStatus, "전송완료")
  assert.equal(result.records[0].sentAt, due)
  assert.equal(result.records[0].feedbackSchedules![0].status, "sent")
  assert.deepEqual(result.records[0].feedbackSchedules![0].events.map(event => event.action), ["registered", "claimed", "sent"])
  assert.equal(result.records[0].history.filter(item => item.action === "send").length, 1)
  assert.equal(result.pro!.cases[0].finalSnapshots.length, 1)
  assert.equal(proUsage(result.pro!, result.pro!.members[0], due).used, usage.used + 1)
}))

test("browser workspace due execution stays isolated and designated-date clocks do not advance", async () => temporary(async directory => {
  const { shared, workspace } = stores(directory)
  await shared.update("online-reviews", emptyReviewDatabase, state => state)
  const real = { ...newStudentTestSession("apply-one", before), db: scheduled("real") }
  const fixedDb = scheduled("fixed"); fixedDb.pro!.clockMode = "test"; fixedDb.pro!.clock = before
  const fixed = { ...newStudentTestSession("apply-one", before), db: fixedDb }
  const unrelated = newStudentTestSession("draft", before)
  await workspace.update(browserA, () => ({ day: "2026-10-21", sessions: [real, fixed, unrelated] }), state => state)
  await workspace.update(browserB, () => ({ day: "2026-10-21", sessions: [newStudentTestSession("apply-one", before)] }), state => state)
  const sharedBefore = await readFile(path.join(directory, "online-reviews.json"), "utf8")
  const otherBefore = await readFile(path.join(directory, "student-front-tests", "workspaces", `${browserB}.json`), "utf8")
  await createFeedbackScheduleWorker({ directory, now: () => due }).tick()
  const result = await workspace.read(browserA, emptyStudentTests)
  assert.equal(result.sessions[0].db.records[0].feedbackStatus, "전송완료")
  assert.equal(JSON.stringify(result.sessions[1]), JSON.stringify(fixed))
  assert.equal(JSON.stringify(result.sessions[2]), JSON.stringify(unrelated))
  assert.equal(await readFile(path.join(directory, "online-reviews.json"), "utf8"), sharedBefore)
  assert.equal(await readFile(path.join(directory, "student-front-tests", "workspaces", `${browserB}.json`), "utf8"), otherBefore)
}))

test("persisted sending work survives worker replacement and cancellation wins only before claim", async () => temporary(async directory => {
  const { shared } = stores(directory), initial = scheduled()
  const claimed = claimDueFeedbackSchedules(initial, due)
  assert.throws(() => applyManagedReviewCommand(claimed, { type: "cancel-feedback-schedule", recordId: initial.records[0].id, scheduleId: "scheduled" }, testTeacher, "too-late", due), /처리 중/)
  await shared.update("online-reviews", () => claimed, state => state)
  await createFeedbackScheduleWorker({ directory, now: () => due }).tick()
  assert.equal((await shared.read("online-reviews", emptyReviewDatabase)).records[0].feedbackSchedules![0].status, "sent")
  const cancelled = applyManagedReviewCommand(initial, { type: "cancel-feedback-schedule", recordId: initial.records[0].id, scheduleId: "scheduled" }, testTeacher, "cancel-first", due)
  await shared.update("online-reviews", emptyReviewDatabase, () => cancelled)
  await createFeedbackScheduleWorker({ directory, now: () => due }).tick()
  assert.equal((await shared.read("online-reviews", emptyReviewDatabase)).records[0].feedbackStatus, "작성완료")
}))

test("failed execution is durable, preserves unsent feedback/quota, and never retries automatically", async () => temporary(async directory => {
  const { shared } = stores(directory), initial = scheduled()
  await shared.update("online-reviews", () => initial, state => state)
  const failedWorker = createFeedbackScheduleWorker({ directory, now: () => due, execute: (db, recordId, scheduleId, at) => executeFeedbackSchedule(db, recordId, scheduleId, at, { simulateFailure: "테스트 전송 실패" }) })
  await failedWorker.tick()
  const failed = await shared.read("online-reviews", emptyReviewDatabase)
  assert.equal(failed.records[0].feedbackSchedules![0].status, "failed")
  assert.equal(failed.records[0].feedbackSchedules![0].failureReason, "테스트 전송 실패")
  assert.equal(failed.records[0].feedbackStatus, "작성완료")
  assert.equal(failed.records[0].sentAt, undefined)
  assert.equal(failed.records[0].feedback, initial.records[0].feedback)
  assert.deepEqual(proUsage(failed.pro!, failed.pro!.members[0], due), proUsage(initial.pro!, initial.pro!.members[0], due))
  const snapshot = await readFile(path.join(directory, "online-reviews.json"), "utf8")
  await createFeedbackScheduleWorker({ directory, now: () => due }).tick()
  assert.equal(await readFile(path.join(directory, "online-reviews.json"), "utf8"), snapshot)
}))

test("student and external projections never expose reservation dates, snapshots or histories", () => {
  const db = scheduled(), recordId = db.records[0].id
  const teacher = visibleReviewState(db, testTeacher, undefined, before)
  assert.ok(teacher.records[0].feedbackSchedules?.length)
  const student = visibleReviewState(db, testStudent(db), undefined, before)
  assert.equal(JSON.stringify(student).includes("feedbackSchedules"), false)
  assert.equal(student.records[0].feedback, "")
  assert.equal(student.records[0].history.length, 0)
  const unsentShare = sharedReviewState(db, recordId)
  assert.equal(JSON.stringify(unsentShare).includes("feedbackSchedules"), false)
  assert.equal(unsentShare.records[0].feedback, "")
  assert.equal(unsentShare.records[0].report, undefined)
  const sent = executeFeedbackSchedule(claimDueFeedbackSchedules(db, due), recordId, "scheduled", due)
  const external = visibleReviewState(sent, { role: "external", name: "외부 조회" }, recordId, due)
  assert.ok(external.records[0].feedback)
  assert.equal(JSON.stringify(external).includes("feedbackSchedules"), false)
  assert.equal(external.records[0].history.length, 0)
  const sentShare = sharedReviewState(sent, recordId)
  assert.ok(sentShare.records[0].feedback)
  assert.equal(JSON.stringify(sentShare).includes("feedbackSchedules"), false)
})

test("old student fixtures cannot gain agency/admin/class/external access or teacher mutations", () => {
  const session = newStudentTestSession("apply-one", before)
  assert.equal(studentTestRequestActor(session, null).role, "student")
  assert.equal(studentTestRequestActor(session, "student").studentId, session.db.pro!.members[0].id)
  for (const role of ["agency", "admin", "class", "external", ""]) assert.throws(() => studentTestRequestActor(session, role), /권한/)
  assert.throws(() => runAgencyStudentTest(session, "review", testFeedback(session.db.records[0].id), "unauthorized", before), /권한/)
})

test("only schedule fixtures expose scoped agency commands while student and unrelated commands stay restricted", () => {
  const session = newStudentTestSession("schedule-first", before), common = session.db.reviews[0], record = session.db.records[0]
  assert.equal(studentTestRequestActor(session, "agency").institutionId, "dokdo")
  const result = runAgencyStudentTest(session, "review", { type: "schedule-feedback", recordId: record.id, scheduledAt: due, expectedRevision: feedbackScheduleRevision(common, record) }, "scoped-schedule", before)
  assert.equal(result.db.records[0].feedbackSchedules?.[0].status, "waiting")
  assert.equal(session.db.records[0].feedbackSchedules, undefined)
  assert.throws(() => runAgencyStudentTest(session, "pro", { type: "clock", at: due }, "no-clock", before), /해당 관리 작업/)
  assert.throws(() => runAgencyStudentTest(session, "review", { type: "seen", recordId: record.id }, "no-student", before), /해당 관리 작업/)
  assert.throws(() => runAgencyStudentTest(session, "review", { type: "send", recordId: "other-workspace-record" }, "no-other", before))
  for (const role of ["admin", "class", "external"]) assert.throws(() => studentTestRequestActor(session, role), /권한/)
})

test("selected case owners retain their own schedule metadata without seeing the new agency's case or notes", () => {
  const db = scheduled(), pro = db.pro!, member = pro.members[0], oldCase = pro.cases[0]
  oldCase.due = before
  member.institutionId = "new-agency"
  member.teacherId = "new-private-teacher"
  member.managementMemo = { text: "새 기관 비공개 메모", revision: "new", at: due, actor: "새 담당자" }
  member.consultation = { nth: 1, weekday: 1, time: "15:00" }; member.overrides = { "2026-10": due }
  member.matchingHistory = [{ at: before, institutionId: "dokdo" }, { at: due, institutionId: "new-agency" }]
  pro.cases.push({ ...structuredClone(oldCase), reviewId: "new-agency-book", institutionId: "new-agency", aiSnapshots: [{ recordId: "new-private-record", at: due, runId: "new", result: "새 기관 비공개 평가" }] })
  pro.audit.push({ id: "new-audit", studentId: member.id, kind: "상담", at: due, actor: "새 담당자", institutionId: "new-agency", memo: "새 기관 비공개 상담" })
  pro.consultations.push({ id: "new-consultation", studentId: member.id, month: "2026-10", result: "미진행", actualAt: due, memo: "새 기관 비공개 상담", actor: "새 담당자", at: due })
  const original = scopePro(pro, "dokdo"), current = scopePro(pro, "new-agency")
  assert.deepEqual(original.cases.map(c => c.reviewId), [oldCase.reviewId])
  assert.equal(original.members[0].institutionId, "new-agency")
  assert.equal(original.members[0].managementMemo, undefined)
  assert.equal(original.members[0].consultation, undefined)
  assert.equal(original.members[0].teacherId, "")
  assert.equal(original.consultations.length, 0)
  assert.equal(JSON.stringify(original).includes("새 기관 비공개"), false)
  assert.deepEqual(current.cases.map(c => c.reviewId), [oldCase.reviewId, "new-agency-book"])
  const oldRow = weeklyStudent({ ...db, pro: original }, original.members[0], weekStart(before))
  assert.deepEqual(oldRow.tasks, [0, 1, 0, 0, 0, 0, 0])
  assert.equal(oldRow.member.caseOnly, true)
  assert.equal(oldRow.missed, 0)
  assert.deepEqual(oldRow.consultation, [])
  assert.deepEqual(proTasks(db, "dokdo"), { counts: oldRow.tasks, badge: 1 })
  const currentRow = weeklyStudent({ ...db, pro: current }, current.members[0], weekStart(before))
  assert.deepEqual(currentRow.tasks.slice(0, 2), [0, 0])
  assert.equal(currentRow.member.caseOnly, undefined)
  assert.deepEqual(currentRow.usage, proUsage(pro, member, before))
  assert.deepEqual(proTasks(db, "new-agency").counts, currentRow.tasks)
})
