import test from "node:test"
import assert from "node:assert/strict"
import { completedQuizRounds, consecutiveQuizRounds, getReadingRoundResultsByBook, markReadingRoundCompleted, STUDENT_MOCK_STORAGE_KEYS } from "../src/lib/student-mock-state"
import { canEnterReadingWorkbook, readingWorkbookEntry } from "../src/lib/reading-workbook-entry"
import { getLinkedWorkbookRoundSetting } from "../src/lib/workbook-round-settings"
import { buildStudentTest } from "../src/lib/student-test-scenarios"
import { emptyStudentTests, openStudentRewriteExample } from "../src/lib/student-test-store"
import { connectStudentTestBooks } from "../src/lib/student-test-books"

test("같은 브라우저에서 학생과 예시를 전환해도 0/6 기록은 소유자만 읽고 공용 원본은 보존한다", (t) => {
  const storage = () => {
    const values = new Map<string, string>()
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }
  }
  const localStorage = storage(), sessionStorage = storage()
  const location = { search: "?demoStudent=student-test-reject-first&studentTest=first" }
  const before = Object.getOwnPropertyDescriptor(globalThis, "window")
  const oldSession = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage")
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage, sessionStorage, location, dispatchEvent() {} } })
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: sessionStorage })
  t.after(() => {
    if (before) Object.defineProperty(globalThis, "window", before); else Reflect.deleteProperty(globalThis, "window")
    if (oldSession) Object.defineProperty(globalThis, "sessionStorage", oldSession); else Reflect.deleteProperty(globalThis, "sessionStorage")
  })
  const score = { correctCount: 0, totalQuestions: 6, completedAt: "2026-10-03" }
  const shared = JSON.stringify({ 601: { 1: score }, 726: { 1: { ...score, studentId: "student-test-reject-first", studentTest: "first" } } })
  localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.readingRoundResults, shared)
  markReadingRoundCompleted(297, 1, { correctCount: 0, totalQuestions: 6 })
  for (const search of ["?demoStudent=student-test-reject-second&studentTest=second", "?demoStudent=normal", "?demoStudent=student-test-reject-first&studentTest=another"]) {
    location.search = search
    assert.equal(getReadingRoundResultsByBook()[297], undefined)
    assert.deepEqual([...completedQuizRounds(297)], [])
    assert.deepEqual([...completedQuizRounds(726)], [])
  }
  location.search = "?demoStudent=student-test-reject-first&studentTest=first"
  assert.equal(getReadingRoundResultsByBook()[297][1].correctCount, 0)
  assert.deepEqual([...completedQuizRounds(297)], [1])
  assert.deepEqual([...completedQuizRounds(601)], [])
  assert.deepEqual([...completedQuizRounds(726)], [1])
  assert.equal(localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.readingRoundResults), shared)
})

test("1·2차 반려와 2차 요청은 도서 바로가기에서 원래 글과 작성 차수로 연결된다", () => {
  for (const caseId of ["reject-first", "reject-second", "second-request"] as const) {
    const { db, targetId } = buildStudentTest(caseId, "2026-11-19T03:00:00.000Z")
    const round = caseId === "reject-second" ? 2 : 1
    const expected = `/student/online-workbook/${targetId}?round=${round}`
    assert.equal(readingWorkbookEntry(db, 297, 1), expected)
    const legacy = { ...db, reviews: db.reviews.map(review => ({ ...review, sourceReadingWorkbookId: undefined, sourceReadingRound: undefined })) }
    const connected = connectStudentTestBooks(legacy, caseId)
    assert.equal(readingWorkbookEntry(connected, 297, 1), expected)
    assert.equal(connected.records, legacy.records)
    assert.equal(connectStudentTestBooks(connected, caseId), connected)
  }
})

test("퀴즈 완료는 회차별 기록으로 판단하고 중간 회차 누락 및 미연결 양식을 제외한다", () => {
  assert.equal(consecutiveQuizRounds(new Set([1, 3]), 3), 1)
  assert.equal(consecutiveQuizRounds(new Set([2]), 2), 0)
  assert.equal(consecutiveQuizRounds(new Set([1, 2]), 2), 2)
  assert.equal(getLinkedWorkbookRoundSetting(601, 1)?.templates.length, 5)
  assert.equal(getLinkedWorkbookRoundSetting(601, 2), undefined)
  const book = { id: 601, rounds: 1, activeOnlineCount: 1 }
  const template = { id: 64, reviewed: true }
  assert.equal(canEnterReadingWorkbook(book, 1, [template]), true)
  assert.equal(canEnterReadingWorkbook(book, 0, [template]), false)
  assert.equal(canEnterReadingWorkbook({ ...book, activeOnlineCount: 0 }, 1, [template]), false)
  assert.equal(canEnterReadingWorkbook({ ...book, rounds: 2 }, 2, [template]), false)
  assert.equal(canEnterReadingWorkbook(book, 1, [{ ...template, reviewed: false }]), false)
  assert.equal(canEnterReadingWorkbook(book, 1, []), false)
})

test("완독 바로가기는 같은 책·마지막 회차의 실제 저장 글과 차수를 재사용한다", () => {
  const { db } = buildStudentTest("draft", "2026-11-19T03:00:00.000Z")
  const base = db.reviews[0], record = db.records[0]
  const common = { ...base, id: "my-reading", sourceWorkbookId: "historical-alias", sourceBookId: 601, sourceReadingRound: 1 }
  const first = { ...record, reviewId: common.id, round: 1 as const }
  assert.match(readingWorkbookEntry({ reviews: [], records: [] }, 601, 1), /reading-601-round-1\?round=1$/)
  for (const writingStatus of ["writing", "submitted"] as const) {
    const second = { ...first, round: 2 as const, writingStatus }
    assert.match(readingWorkbookEntry({ reviews: [common], records: [second, first] }, 601, 1), /historical-alias\?round=2$/)
  }
  const rejected = { ...first, round: 2 as const, writingStatus: "writing" as const, rejectedAt: "2026-11-20T03:00:00.000Z" }
  const unstarted = { ...common, id: "empty-review", sourceWorkbookId: "reading-601-round-1", createdAt: "2026-12-01T00:00:00Z" }
  assert.match(readingWorkbookEntry({ reviews: [common, unstarted], records: [first, rejected] }, 601, 1), /historical-alias\?round=2$/)
})

test("새 브라우저의 고쳐쓰기 예시는 1·2차를 직접 열고 작성글과 체크리스트를 재사용한다", () => {
  const now = "2026-11-19T03:00:00.000Z"
  for (const caseId of ["draft", "second-draft"] as const) {
    const opened = openStudentRewriteExample(emptyStudentTests(), caseId, now)
    const record = opened.session.db.records.find(r => r.reviewId === opened.session.targetId && r.round === (caseId === "draft" ? 1 : 2))!
    assert.equal(record.stage, "rewrite")
    record.body = "이전에 작성한 글"
    record.rewriteChecklist = [1, 2]
    const again = openStudentRewriteExample(opened.state, caseId, now)
    assert.equal(again.session.token, opened.session.token)
    assert.deepEqual(again.session.db, opened.session.db)
    record.writingStatus = "submitted"
    const another = openStudentRewriteExample(again.state, caseId, now)
    assert.notEqual(another.session.token, opened.session.token)
    assert.equal(another.state.sessions.find(s => s.token === opened.session.token)!.db.records.find(r => r.id === record.id)!.body, "이전에 작성한 글")
    assert.equal(openStudentRewriteExample(another.state, caseId, now).session.token, another.session.token)
  }
})
