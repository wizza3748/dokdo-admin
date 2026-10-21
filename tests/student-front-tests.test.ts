import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { buildStudentTest, studentTestCases, studentTestNames, testStudent } from "../src/lib/student-test-scenarios"
import { controlStudentTest, currentStudentTest, emptyStudentTests, getStudentTest, newStudentTestSession, prepareStudentTests, resetStudentTest, runStudentTest, studentTestRow } from "../src/lib/student-test-store"
import { applyProCommand, proUsage } from "../src/lib/pro-domain"
import { studentProView, scopePro } from "../src/lib/pro-selectors"
import { addDays, kstDate, managementMonth, weekStart } from "../src/lib/pro-calendar"
import { PrototypeStore } from "../src/lib/prototype-store"
import type { ReviewDatabase } from "../src/lib/review-domain"
import { READING_BOOKS } from "../src/lib/reading-books"
import { READING_BOOK_COVERS } from "../src/lib/reading-book-covers"
import { connectStudentTestBooks } from "../src/lib/student-test-books"

const now = "2026-10-21T04:00:00.000Z"
const usage = (db: ReviewDatabase) => proUsage(db.pro!, db.pro!.members[0], db.pro!.clock)
const view = (db: ReviewDatabase) => studentProView(db, db.pro!.members[0].id)!

for (const at of ["2026-10-01T00:00:00.000Z", "2026-10-04T14:59:59.000Z", now, "2026-10-31T14:59:00.000Z", "2026-11-01T03:00:00.000Z", "2026-11-01T15:00:00.000Z", "2026-11-02T03:00:00.000Z", "2026-12-31T14:59:59.000Z", "2027-01-01T00:00:00.000Z", "2027-02-01T03:00:00.000Z"]) {
  test(`all fixtures replay real policy on ${at}`, () => {
    for (const c of studentTestCases) {
      const f = buildStudentTest(c.id, at), db = f.db, v = view(db)
      assert.ok(db.pro)
      assert.equal(db.pro.members.length, 1)
      assert.equal(usage(db).month, managementMonth(f.baseAt))
      assert.equal(v.usage.available >= 0, true)
      if (!f.designated) assert.equal(f.baseAt, at)
      assert.equal(db.records.every(r => db.reviews.some(c => c.id === r.reviewId)), true)
      assert.equal(db.pro.cases.every(p => db.reviews.some(r => r.id === p.reviewId) && p.month === managementMonth(p.week)), true)
      assert.equal(db.records.every(r => r.history.every(h => h.at <= f.baseAt)), true, c.id)
      if (["apply-one", "apply-many"].includes(c.id)) { assert.equal(v.usage.available, 1); assert.equal(v.cases.every(x => x.canApply), true); assert.equal(f.listMonth, kstDate(f.baseAt).slice(0,7)) }
      if (c.id === "change-one") assert.equal(v.cases.find(x => x.reviewId.endsWith("target"))?.changeCandidates?.length, 1)
      if (c.id === "change-many") assert.equal(v.cases.find(x => x.reviewId.endsWith("target"))?.changeCandidates?.length, 2)
      if (c.id === "partial") { assert.equal(v.usage.available, 2); assert.equal(v.usage.rolloverAvailable, 1) }
      if (c.id === "locked") { assert.equal(v.usage.available, 0); assert.equal(v.cases.some(x => x.canCancel || x.changeCandidates?.length), false) }
      if (c.id.startsWith("expired")) assert.equal(v.cases[0].expired, true)
      if (c.id === "unassigned") { assert.equal(v.assigned, false); assert.equal(scopePro(db.pro, "dokdo").members.length, 0) }
    }
  })
}

test("apply/cancel changes only pending quota; repeated request is idempotent", () => {
  let s = newStudentTestSession("apply-one", now)
  const id = s.targetId!
  s = runStudentTest(s, "pro", { type: "apply", reviewId: id }, "apply", now)
  assert.deepEqual([usage(s.db).used, usage(s.db).pending, usage(s.db).available], [0,1,0])
  const repeated = runStudentTest(s, "pro", { type: "apply", reviewId: id }, "apply", now)
  assert.deepEqual(repeated.db, s.db)
  s = runStudentTest(s, "pro", { type: "cancel", reviewId: id }, "cancel", now)
  assert.equal(usage(s.db).available, 1)
  assert.ok(s.db.pro!.audit.some(a => a.reviewId === id && a.kind === "cancel"))
})
test("case detail links open the latest existing round", () => {
  for (const id of ["apply-one", "second-request", "second-draft", "second-sent", "reject-second", "expired-draft"] as const) {
    const session = newStudentTestSession(id, now)
    const expectedRound = ["apply-one", "second-request"].includes(id) ? 1 : 2
    assert.equal(new URL(studentTestRow(session, now).detailHref!, "http://localhost").searchParams.get("round"), String(expectedRound))
  }
})
test("every dedicated example uses a real book with its matching cover and level", () => {
  for (const item of studentTestCases) {
    const session = newStudentTestSession(item.id, now)
    for (const review of session.db.reviews) {
      const book = READING_BOOKS.find(book => book.id === review.sourceBookId)
      assert.ok(book, review.id)
      assert.equal(review.bookTitle, book.title)
      assert.equal(review.level, book.level)
      assert.equal(review.bookCoverSrc, READING_BOOK_COVERS[book.id])
      assert.ok(review.bookCoverSrc)
    }
    assert.doesNotMatch(studentTestRow(session, now).path, /‘(?:바꿀 글|도착한 글|미선정 글|다음 주 글)’/)
  }
})

test("case descriptions stay separate from student names in all examples", () => {
  assert.equal(new Set(Object.values(studentTestNames)).size, studentTestCases.length)
  for (const item of studentTestCases) {
    const session = newStudentTestSession(item.id, now), name = studentTestNames[item.id]
    assert.equal(session.db.pro!.members[0].name, name)
    assert.ok(session.db.reviews.every(review => review.studentName === name))
    assert.equal(view(session.db).name, name)
    assert.equal(studentTestRow(session, now).student, name)
    assert.equal(studentTestRow(session, now).name, item.name)
    assert.doesNotMatch(name, /테스트|신청|글|피드백/)
  }
})

test("existing test student names update without resetting identity, requests, writing or history", () => {
  let session = newStudentTestSession("apply-one", now)
  const legacyName = "테스트 · 신청 가능한 글 1편"
  session.db.pro!.members[0].name = legacyName
  session.db.reviews.forEach(review => { review.studentName = legacyName })
  session = runStudentTest(session, "pro", { type: "apply", reviewId: session.targetId! }, "existing-application", now)
  // Model the old on-disk identity, including after an application was recorded.
  session.db.pro!.members[0].name = legacyName
  session.db.reviews.forEach(review => { review.studentName = legacyName })
  const before = structuredClone(session)
  const state = { day: kstDate(now), sessions: [session] }
  const next = prepareStudentTests(state, now), updated = next.sessions[0]
  const expected = structuredClone(before)
  expected.db.pro!.members[0].name = studentTestNames[session.caseId]
  expected.db.reviews.forEach(review => { review.studentName = studentTestNames[session.caseId] })
  assert.deepEqual(updated, expected)
  assert.deepEqual(state.sessions[0], before)
  assert.deepEqual(usage(updated.db), usage(before.db))
  assert.equal(currentStudentTest(before, now).pro!.members[0].name, "박도윤")
  assert.equal(prepareStudentTests(next, now), next)
  updated.db.pro!.members[0].name = "직접 정한 이름"
  updated.db.reviews.forEach(review => { review.studentName = "직접 정한 이름" })
  assert.equal(prepareStudentTests(next, now), next)
})
test("legacy book metadata upgrade preserves tokens, writing, requests, quota and all history", () => {
  let session = newStudentTestSession("apply-one", now)
  session = runStudentTest(session, "pro", { type: "apply", reviewId: session.targetId! }, "existing-application", now)
  const real = { ...session.db.reviews[0] }
  session.db.reviews[0] = { ...real, bookTitle: "신청할 글", bookCoverSrc: undefined, sourceBookId: undefined, level: 4 }
  session.initial.books = ["신청할 글: 피드백 신청 가능"]
  const original = structuredClone(session)
  const other = newStudentTestSession("change-many", now)
  const state = { day: kstDate(now), sessions: [session, other] }
  const next = prepareStudentTests(state, now), upgraded = next.sessions[0]
  assert.equal(upgraded.token, original.token)
  assert.equal(upgraded.changedAt, original.changedAt)
  assert.deepEqual(upgraded.db.records, original.db.records)
  assert.deepEqual(upgraded.db.pro, original.db.pro)
  assert.deepEqual(usage(upgraded.db), usage(original.db))
  assert.deepEqual(upgraded.db.reviews[0], real)
  assert.equal(upgraded.initial.books[0], `${real.bookTitle}: 피드백 신청 가능`)
  assert.equal(next.sessions[1], other)
  assert.deepEqual(state.sessions[0], original)
  assert.equal(prepareStudentTests(next, now), next)
  assert.equal(connectStudentTestBooks(original.db, "unrelated"), original.db)
})
test("single/multiple change candidates use atomic swap and preserve quota", () => {
  for (const c of ["change-one", "change-many"] as const) {
    const s = newStudentTestSession(c, now), old = s.db.pro!.cases.find(c => c.selectedAt)!, before = usage(s.db)
    const result = runStudentTest(s, "pro", { type: "change", reviewId: s.targetId!, previousReviewId: old.reviewId }, "change", now)
    assert.equal(result.db.pro!.cases.find(c => c.reviewId === old.reviewId)!.selectedAt, undefined)
    assert.ok(result.db.pro!.cases.find(c => c.reviewId === s.targetId)!.selectedAt)
    assert.deepEqual([usage(result.db).used, usage(result.db).available, usage(result.db).rolloverAvailable], [before.used,before.available,before.rolloverAvailable])
    assert.ok(result.db.pro!.audit.length > s.db.pro!.audit.length)
  }
})
test("rollover is recomputed across remaining requests", () => {
  let s = newStudentTestSession("partial", now)
  s = runStudentTest(s, "pro", { type: "apply", reviewId: s.targetId! }, "apply", now)
  assert.equal(usage(s.db).rolloverAvailable, 0)
  s = runStudentTest(s, "pro", { type: "cancel", reviewId: s.targetId! }, "cancel", now)
  assert.equal(usage(s.db).rolloverAvailable, 1)
  const many = newStudentTestSession("change-many", now), old = many.db.pro!.cases.find(c => c.selectedAt)!
  const cancelled = runStudentTest(many, "pro", { type: "cancel", reviewId: old.reviewId }, "cancel", now)
  assert.equal(usage(cancelled.db).available, 1); assert.equal(usage(cancelled.db).rolloverAvailable, 0)
})
for (const action of ["teacher-start", "cutoff"] as const) for (const command of ["change", "cancel"] as const) {
  test(`${command} failure after ${action} preserves request and all history`, () => {
    const initial = newStudentTestSession("change-one", now), old = initial.db.pro!.cases.find(c => c.selectedAt)!
    const changed = controlStudentTest(initial, action, now), snapshot = JSON.stringify(changed)
    assert.throws(() => runStudentTest(changed, "pro", command === "cancel" ? { type: "cancel", reviewId: old.reviewId } : { type: "change", reviewId: changed.targetId!, previousReviewId: old.reviewId }, "failed", now))
    assert.equal(JSON.stringify(changed), snapshot)
    assert.ok(changed.db.pro!.cases.find(c => c.reviewId === old.reviewId)!.selectedAt)
  })
}
test("first and second submission/rejection use real transitions", () => {
  for (const c of ["draft", "reject-first", "second-draft", "reject-second"] as const) {
    let s = newStudentTestSession(c, now)
    const record = s.db.records.find(r => r.writingStatus === "writing")!, before = usage(s.db)
    if (record.stage === "items") s = runStudentTest(s, "review", { type: "enter-rewrite", recordId: record.id }, "rewrite", now)
    s = runStudentTest(s, "review", { type: "submit", recordId: record.id }, "submit", now)
    assert.equal(s.db.records.find(r => r.id === record.id)!.writingStatus, "submitted")
    assert.equal(usage(s.db).used, before.used)
    if (record.round === 2) assert.equal(s.db.pro!.cases[0].secondDeadline, newStudentTestSession(c, now).db.pro!.cases[0].secondDeadline)
    else assert.equal(view(s.db).cases[0].canApply, true)
  }
})
test("second start/read and deadline expiry retain first usage and draft", () => {
  let s = newStudentTestSession("second-request", now)
  const recordId = `${s.targetId}-r1`
  s = runStudentTest(s, "review", { type: "seen", recordId }, "seen", now)
  s = runStudentTest(s, "review", { type: "start-second", recordId }, "start", now)
  assert.equal(s.db.records.length, 2); assert.equal(usage(s.db).used, 1)
  const expired = newStudentTestSession("expired-draft", now), draft = expired.db.records.find(r => r.round === 2)!
  assert.ok(draft.body.length > 100)
  assert.throws(() => runStudentTest(expired, "review", { type: "submit", recordId: draft.id }, "late", now))
  assert.equal(draft.writingStatus, "writing")
})
test("auto cutoff / next-week attribution / new month are real policy outcomes", () => {
  const f = buildStudentTest("closed-next", now), cases = f.db.pro!.cases
  assert.equal(cases.find(c => c.reviewId.endsWith("auto"))!.selection, "auto")
  assert.equal(cases.find(c => c.reviewId.endsWith("old"))!.selectedAt, undefined)
  assert.equal(cases.find(c => c.reviewId.endsWith("next"))!.week, addDays(weekStart(f.baseAt),7))
  const boundary = buildStudentTest("month-boundary", now)
  assert.equal(usage(boundary.db).available, 1); assert.equal(usage(boundary.db).rolloverAvailable, 0)
})
test("same-day refresh preserves actions; next KST day creates new generation; old tab is not reset", () => {
  const midnightBefore = "2026-10-21T14:59:00.000Z", midnightAfter = "2026-10-21T15:01:00.000Z"
  let state = prepareStudentTests(emptyStudentTests(), midnightBefore)
  const old = state.sessions.find(s => s.caseId === "apply-one")!
  const applied = runStudentTest(old, "pro", { type: "apply", reviewId: old.targetId! }, "apply", midnightBefore)
  state = { ...state, sessions: state.sessions.map(s => s.token === old.token ? applied : s) }
  assert.equal(prepareStudentTests(state, midnightBefore), state)
  const next = prepareStudentTests(state, midnightAfter)
  assert.deepEqual(getStudentTest(next, old.token), applied)
  assert.equal(usage(currentStudentTest(getStudentTest(next, old.token), midnightAfter)).pending, 1)
  const fresh = next.sessions.find(s => s.caseId === "apply-one" && s.day === "2026-10-22")!
  assert.equal(usage(fresh.db).pending, 0); assert.notEqual(fresh.token, old.token)
  assert.equal(prepareStudentTests(next, midnightAfter), next)
})
test("individual reset replaces just one generation, rejects stale token, and persists independently", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "dokdo-student-tests-"))
  try {
    const store = new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory })
    const initial = await store.update("sessions", emptyStudentTests, s => prepareStudentTests(s, now)), old = initial.sessions[0]
    const reset = await store.update("sessions", emptyStudentTests, s => resetStudentTest(s, old.token, now))
    assert.equal(JSON.stringify(reset.sessions.slice(1)), JSON.stringify(initial.sessions.slice(1)))
    assert.throws(() => getStudentTest(reset, old.token))
    const reopenedStore = new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory })
    assert.equal(JSON.stringify(await reopenedStore.read("sessions", emptyStudentTests)), JSON.stringify(reset))
  } finally { await rm(directory, { recursive: true }) }
})
test("fixture generation does not mutate existing shared storage or widen agency scope", async () => {
  const filename = path.resolve(".local-state/online-reviews.json"), before = await readFile(filename)
  prepareStudentTests(emptyStudentTests(), now)
  assert.deepEqual(await readFile(filename), before)
  const f = buildStudentTest("unassigned", now)
  assert.equal(scopePro(f.db.pro!, "dokdo").members.length, 0)
  assert.throws(() => applyProCommand(f.db, { type: "apply", reviewId: f.targetId! }, testStudent(f.db), "illegal", now))
})
