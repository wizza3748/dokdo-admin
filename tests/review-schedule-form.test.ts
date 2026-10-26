import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { feedbackScheduleInput, feedbackScheduleNotices, invalidFeedbackScheduleTime } from "../src/lib/review-schedule-form"
import { buildStudentTest, studentTestCases } from "../src/lib/student-test-scenarios"
import { prepareStudentTests, newStudentTestSession, studentTestRow } from "../src/lib/student-test-store"

test("schedule date inputs are KST minute instants and reject calendar rollover", () => {
  assert.equal(feedbackScheduleInput("2026-10-26", "09:15"), "2026-10-26T00:15:00.000Z")
  assert.equal(feedbackScheduleInput("2026-10-26", "00:00"), "2026-10-25T15:00:00.000Z")
  assert.equal(feedbackScheduleInput("2026-02-30", "15:00"), undefined)
  assert.equal(feedbackScheduleInput("2026-10-26", "24:00"), undefined)
  assert.equal(feedbackScheduleInput("", "15:00"), undefined)
})

test("schedule warnings separate first-complete/request/second and allow post-deadline registration", () => {
  assert.equal(feedbackScheduleNotices(1, "request").length, 1)
  assert.equal(feedbackScheduleNotices(1, "complete").length, 3)
  assert.equal(feedbackScheduleNotices(2, "complete").length, 2)
  assert.equal(feedbackScheduleNotices(1, "complete", "2026-10-27T00:01:00.000Z", "2026-10-27T00:00:00.000Z").length, 4)
  assert.equal(feedbackScheduleNotices(1, "request", "2026-10-27T00:00:00.000Z", "2026-10-27T00:00:00.000Z").length, 1)
})

test("예약 안내는 기본 문구와 차수·완료 방식·처리 기한 조건에 맞는 정확한 문구만 표시", () => {
  const base = "예약한 시간에 학생에게 피드백이 전송됩니다."
  const parent = "학생에게 피드백이 전송되면 학부모에게도 결과가 자동 발송됩니다."
  const second = "학생에게 피드백이 전송된 후에는 '2차 작성 요청'으로 변경할 수 없습니다."
  const overdue = "처리 기한이 지나면 전송 완료 전까지 '지연'으로 표시됩니다."
  assert.deepEqual(feedbackScheduleNotices(1, "request"), [base])
  assert.deepEqual(feedbackScheduleNotices(1, "complete"), [base, parent, second])
  assert.deepEqual(feedbackScheduleNotices(2, "request"), [base, parent])
  const due = "2026-11-01T14:59:59.999Z", afterDue = "2026-11-01T15:00:00.000Z"
  assert.deepEqual(feedbackScheduleNotices(1, "request", afterDue, due), [base, overdue])
  assert.deepEqual(feedbackScheduleNotices(1, "complete", afterDue, due), [base, parent, second, overdue])
  assert.deepEqual(feedbackScheduleNotices(2, "complete", afterDue, due), [base, parent, overdue])
  assert.deepEqual(feedbackScheduleNotices(1, "complete", due, due), [base, parent, second])
})

test("예약 일시 오류는 현재와 같은 시각·과거·잘못된 날짜에서 표시하고 미래 입력은 허용", () => {
  const now = Date.parse("2026-10-26T04:00:00.000Z")
  assert.equal(invalidFeedbackScheduleTime("2026-10-26", "12:59", now), true)
  assert.equal(invalidFeedbackScheduleTime("2026-10-26", "13:00", now), true)
  assert.equal(invalidFeedbackScheduleTime("2026-10-26", "13:01", now), false)
  assert.equal(invalidFeedbackScheduleTime("2026-10-25", "23:59", now), true)
  assert.equal(invalidFeedbackScheduleTime("2026-10-27", "00:00", now), false)
  assert.equal(invalidFeedbackScheduleTime("2026-02-30", "13:00", now), true)
  assert.equal(invalidFeedbackScheduleTime("", "13:00", now), false)
  assert.equal(invalidFeedbackScheduleTime("2026-10-26", "", now), false)
})

test("등록·확인 모달은 저장된 예약 기준 안내를 맨 위에서 공유하고 공통 모달 디자인은 변경하지 않음", async () => {
  const modal = await readFile("src/components/online-workbooks/review-schedule-dialog.tsx", "utf8")
  assert.match(modal, /feedbackScheduleNotices\(record\.round, snapshot\.secondDecision, current\?\.scheduledAt \?\? scheduledAt, due\)/)
  const content = modal.slice(modal.indexOf("return <ScheduleDialogFrame"))
  assert.ok(content.indexOf('aria-label="예약 전송 안내"') < content.indexOf('aria-label="예약 대상 정보"'))
  assert.ok(content.indexOf('aria-label="예약 전송 안내"') < content.indexOf('{current ? <>'))
  assert.match(content, /현재보다 늦은 날짜와 시간을 선택해 주세요\./)
  assert.match(content, /aria-invalid=\{invalidTime\}/)
  assert.match(content, /disabled=\{current \? !canCancel : !scheduledAt \|\| invalidTime\}/)
  assert.match(modal, /<Dialog\.Portal>/)
  assert.match(modal, /onCloseAutoFocus=/)
  assert.match(modal, /min-h-0 space-y-5 overflow-y-auto/)
  assert.doesNotMatch(modal, /<ReviewDialog/)
})

test("schedule test examples use real saved feedback and independent owner links without altering old sessions", () => {
  const now = "2026-10-26T03:00:00.000Z"
  const old = newStudentTestSession("apply-one", now)
  old.changedAt = now
  const state = prepareStudentTests({ day: "2026-10-26", sessions: [old] }, now)
  assert.deepEqual(state.sessions.find(s => s.token === old.token), old)
  assert.equal(state.sessions.length, studentTestCases.length)
  for (const id of ["schedule-first", "schedule-request", "schedule-second"] as const) {
    const fixture = buildStudentTest(id, now)
    const latest = fixture.db.records.at(-1)!
    assert.equal(latest.feedbackStatus, "작성완료")
    assert.equal(latest.round, id === "schedule-second" ? 2 : 1)
    assert.equal(latest.sentAt, undefined)
    assert.equal(fixture.db.reviews[0].sourceBookId, 297)
    assert.equal(fixture.db.pro!.clockMode, "real")
    const session = state.sessions.find(s => s.caseId === id)!
    const row = studentTestRow(session, now)
    assert.ok(row.teacherHref?.includes(session.token))
    assert.ok(row.weeklyHref?.includes(session.token))
    assert.ok(row.reviewListHref?.includes(session.token))
    assert.ok(row.href.includes(session.token))
  }
})

test("teacher reservation controls preserve the existing send label and render saved content while locked", async () => {
  const detail = await readFile("src/components/online-workbooks/review-teacher-detail.tsx", "utf8")
  const modal = await readFile("src/components/online-workbooks/review-schedule-dialog.tsx", "utf8")
  assert.match(detail, />학생에게 전송<\/Button>/)
  assert.match(detail, /피드백 예약 전송 확인/)
  assert.match(detail, /displaySaved \? record\.feedback : feedbackValue/)
  assert.match(detail, /displaySaved \? reviewFeedbackItems\(common\.template, record\.itemFeedback\)/)
  assert.match(detail, /학생 전송 일시 \{feedbackSentDate\(record\.sentAt\)\}/)
  assert.doesNotMatch(detail, /feedbackScheduleDate\(record\.sentAt\)/)
  const management = detail.slice(detail.indexOf('aria-label="프로 관리 항목"'), detail.indexOf('{role === "admin" && proCase && record.round'))
  assert.match(management, /학부모: \{caseParentLabel\(proCase\)\}<\/span>\s*<FeedbackScheduleStatus/)
  assert.match(management, /FeedbackScheduleStatus[^\n]+flex-nowrap whitespace-nowrap/)
  const footer = detail.slice(detail.indexOf('<footer'), detail.indexOf('</footer>'))
  assert.doesNotMatch(footer, /activeSchedule\.scheduledAt|feedbackScheduleDate|FeedbackScheduleStatus|학생 전송 일시/)
  assert.match(modal, /expectedRevision: initial\.revision/)
  assert.match(modal, /current\.status === "sending"/)
  assert.match(modal, /current\.status === "sent"/)
  assert.match(modal, /실패 사유:/)
})
