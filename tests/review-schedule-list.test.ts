import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import type { FeedbackSchedule, FeedbackScheduleStatus } from "../src/lib/review-schedule"
// @ts-expect-error Node tests load TypeScript sources directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { activeFeedbackSchedule, activeFeedbackScheduleAt, feedbackScheduleSnapshot } from "../src/lib/review-schedule.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewListRows, eligibleReviewListAction, reviewListActionExclusion } from "../src/lib/review-list-adapter.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { feedbackScheduleDate, feedbackSentDate, feedbackScheduleDisplay, feedbackScheduleLabels, feedbackScheduleBlockReason, matchesReviewSchedule, reviewScheduleFilter, reviewScheduleFilterOptions, scheduledReviewActionBlocked } from "../src/lib/review-schedule-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { matchesReviewAudience, matchesReviewSelection, reviewSelectionFilter } from "../src/lib/review-list-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { weeklyStudent, weeklyTaskBooks, proTasks, scopePro, caseParentLabel } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { proUsage } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { weekStart } from "../src/lib/pro-calendar.ts"

function fixture(status: FeedbackScheduleStatus) {
  const db = initializePro(emptyReviewDatabase())
  const c = db.pro!.cases.find(item => item.reviewId === "review-pro-overdue")!
  const record = db.records.find(item => item.reviewId === c.reviewId && item.round === 1)!
  const review = db.reviews.find(item => item.id === c.reviewId)!
  const schedule: FeedbackSchedule = {
    id: "schedule-list", recordId: record.id, reviewId: review.id, round: record.round,
    institutionId: c.institutionId, scheduledAt: "2026-10-26T01:30:00.000Z", status,
    createdAt: "2026-10-25T01:30:00.000Z", createdBy: { role: "agency", institutionId: c.institutionId, name: "목록 검증" },
    snapshot: feedbackScheduleSnapshot(review, record), revision: "list-fixture", events: [],
  }
  record.feedbackSchedules = [schedule]
  if (status === "sent") { record.feedbackStatus = "전송완료"; record.sentAt = schedule.scheduledAt }
  return { db, c, record, schedule }
}

test("예약 보조 상태는 대기·전송 중·실패만 표시하고 취소·완료는 제거", () => {
  assert.deepEqual(feedbackScheduleLabels, { waiting: "예약 전송 대기", sending: "예약 전송 중", failed: "예약 전송 실패" })
  for (const status of ["waiting", "sending", "failed", "cancelled", "sent"] as const) {
    const { db, record } = fixture(status)
    const before = structuredClone(db)
    const row = reviewListRows(db).find(item => item.id === record.id)!
    assert.equal(row.status, status === "sent" ? "전송완료" : "작성완료")
    assert.deepEqual(row.feedbackSchedule, ["cancelled", "sent"].includes(status) ? undefined : { status, scheduledAt: "2026-10-26T01:30:00.000Z" })
    assert.deepEqual(db, before)
  }
  assert.equal(feedbackScheduleDisplay(undefined), undefined)
  assert.equal(feedbackScheduleDisplay({ status: "cancelled", scheduledAt: "2026-10-26T01:30:00.000Z" }), undefined)
})

test("예약 일시는 한국 시간 기준으로 변환하고 시간대 문구는 모달에서만 명시", () => {
  assert.equal(feedbackScheduleDate("2026-10-26T01:30:00.000Z"), "2026.10.26(월) 10:30")
  assert.equal(feedbackScheduleDate("2026-10-25T15:00:00.000Z"), "2026.10.26(월) 00:00")
  assert.equal(feedbackScheduleDate("2026-12-31T15:01:00.000Z"), "2027.01.01(금) 00:01")
  assert.equal(feedbackScheduleDate("2026-10-26T01:30:00.000Z", true), "2026.10.26(월) 10:30 한국 시간")
  assert.equal(feedbackScheduleDate(undefined, true), "-")
  assert.equal(feedbackScheduleDate(), "-")
  assert.equal(feedbackScheduleDate("invalid"), "-")
})

test("전송 완료 목록은 학생·학부모 상태만 표시하고 실제 전송 일시는 상세용 데이터로 보존", () => {
  const { db, c, record, schedule } = fixture("sent")
  record.sentAt = "2026-10-26T01:32:17.000Z"
  c.parent.status = "sent"
  c.parent.at = "2026-10-26T01:35:00.000Z"
  const before = structuredClone(db)
  const row = reviewListRows(db).find(item => item.id === record.id)!
  assert.equal(row.sentAt, record.sentAt)
  assert.notEqual(row.sentAt, schedule.scheduledAt)
  assert.equal(row.feedbackSchedule, undefined)
  assert.equal(feedbackSentDate(row.sentAt), "2026.10.26(월) 10:32")
  assert.equal(row.pro?.parentLabel, "발송 완료")
  assert.match(caseParentLabel(c), /^발송 완료 .*10:35$/)
  for (const role of ["agency", "admin"] as const) assert.equal(reviewListRows(db, role).find(item => item.id === record.id)!.pro?.parentLabel, "발송 완료")
  assert.deepEqual(db, before)
  const ui = readFileSync(new URL("../src/components/online-workbooks/agency-workbook-list.tsx", import.meta.url), "utf8")
  assert.doesNotMatch(ui, /record\.sentAt|학생 전송 일시/)
  assert.match(ui, /FeedbackScheduleStatus schedule=\{record\.feedbackSchedule\}/)
  for (const status of ["none", "missing", "failed"] as const) {
    c.parent.status = status
    assert.equal(caseParentLabel(c, false), caseParentLabel(c))
  }
})

test("상세의 실제 전송 일시는 한국 시간으로 변환하되 시간대 문구 없이 표시", () => {
  assert.equal(feedbackSentDate("2026-10-25T15:00:00.000Z"), "2026.10.26(월) 00:00")
  assert.equal(feedbackSentDate("2026-12-31T15:01:00.000Z"), "2027.01.01(금) 00:01")
  assert.equal(feedbackSentDate(), "-")
  assert.equal(feedbackSentDate("invalid"), "-")
})

test("새 기관은 이전 기관 소유 관리 건을 조회하되 AI·전송·꽃 지급은 기존 기관만 허용", () => {
  const { db, c, record } = fixture("cancelled")
  const member = db.pro!.members.find(item => item.id === c.studentId)!
  member.institutionId = "new-agency"
  member.matchingHistory = [{ at: member.assignedAt!, institutionId: c.institutionId }, { at: db.pro!.clock, institutionId: "new-agency" }]
  record.flowers = 0
  db.records = [record]
  db.reviews = db.reviews.filter(item => item.id === record.reviewId)
  for (const feedbackStatus of ["작성전", "작성완료"] as const) {
    record.feedbackStatus = feedbackStatus
    const scoped = { ...db, pro: scopePro(db.pro!, "new-agency") }
    const rows = reviewListRows(scoped)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].pro?.selected, true)
    for (const action of ["ai", "send", "flower"] as const) assert.equal(eligibleReviewListAction(rows[0], action), false)
    const ownerRows = reviewListRows({ ...db, pro: scopePro(db.pro!, c.institutionId) })
    assert.equal(eligibleReviewListAction(ownerRows[0], feedbackStatus === "작성전" ? "ai" : "send"), true)
    assert.equal(eligibleReviewListAction(ownerRows[0], "flower"), feedbackStatus === "작성완료")
  }
})

test("본사관리자 목록은 저장·미작성 상태와 관계없이 변경 작업을 허용하지 않음", () => {
  const { db, record } = fixture("cancelled")
  record.flowers = 0
  for (const feedbackStatus of ["작성전", "작성완료", "전송완료"] as const) {
    record.feedbackStatus = feedbackStatus
    const row = reviewListRows(db, "admin").find(item => item.id === record.id)!
    for (const action of ["ai", "send", "flower", "parent"] as const) assert.equal(eligibleReviewListAction(row, action), false)
  }
})

test("예약 필터는 프로 조회에서만 허용하고 미선정 조건·잘못된 값은 전체", () => {
  assert.deepEqual(reviewScheduleFilterOptions.map(item => item.label), ["전체", "예약 없음", "예약 전송 대기", "예약 전송 중", "예약 전송 실패"])
  for (const option of reviewScheduleFilterOptions) {
    for (const selection of ["all", "student", "auto", "teacher", "unknown"]) assert.equal(reviewScheduleFilter(option.value, "pro", selection), option.value)
    for (const audience of ["all", "institution"]) assert.equal(reviewScheduleFilter(option.value, audience, "all"), "all")
    for (const selection of ["expected", "not-selected"]) assert.equal(reviewScheduleFilter(option.value, "pro", selection), "all")
  }
  assert.equal(reviewScheduleFilter(null, "pro", "all"), "all")
  assert.equal(reviewScheduleFilter("bad", "pro", "all"), "all")
})

test("전체 조회에서도 예약을 표시하며 기존 피드백 상태·대상 필터와 교집합으로 검색", () => {
  const { db, record } = fixture("waiting")
  const rows = reviewListRows(db)
  const target = rows.find(row => row.id === record.id)!
  assert.ok(matchesReviewAudience(target, "all"))
  assert.ok(matchesReviewAudience(target, "pro"))
  const selection = reviewSelectionFilter("all", "pro")
  assert.deepEqual(rows.filter(row => matchesReviewAudience(row, "pro") && matchesReviewSelection(row, selection) && row.status === "작성완료" && matchesReviewSchedule(row, "waiting")), [target])
  assert.deepEqual(rows.filter(row => row.status === "전송완료" && matchesReviewSchedule(row, "waiting")), [])
  assert.ok(!matchesReviewSchedule(target, "none"))
  assert.ok(matchesReviewSchedule({}, "none"))
  assert.ok(matchesReviewSchedule({}, "all"))
})

test("예약 대기·전송 중·실패는 일괄 AI·저장·전송에서 같은 사유로 제외하고 꽃 지급은 유지", () => {
  for (const status of ["waiting", "sending", "failed"] as const) {
    const { db, record } = fixture(status)
    const row = reviewListRows(db).find(item => item.id === record.id)!
    for (const action of ["ai", "send"] as const) {
      assert.equal(eligibleReviewListAction(row, action), false)
      assert.equal(reviewListActionExclusion(row, action), "피드백 예약 전송이 등록되어 있습니다.")
      assert.equal(eligibleReviewListAction({ ...row, actionEligibility: { ai: true, send: true, parent: false, flower: true } }, action), false)
    }
    assert.equal(scheduledReviewActionBlocked(row, "save"), true)
    assert.equal(scheduledReviewActionBlocked(row, "flower"), false)
    assert.equal(eligibleReviewListAction(row, "flower"), record.flowers === 0)
  }
  assert.equal(feedbackScheduleBlockReason, "피드백 예약 전송이 등록되어 있습니다.")
})

test("예약 취소 후 기존 저장 상태·전송 가능 여부가 복원되고 상태 카드 집계는 바뀌지 않음", () => {
  const { db, record, schedule } = fixture("waiting")
  const before = reviewListRows(db)
  schedule.status = "cancelled"
  const after = reviewListRows(db), target = after.find(item => item.id === record.id)!
  assert.equal(target.feedbackSchedule, undefined)
  assert.equal(target.status, "작성완료")
  assert.equal(eligibleReviewListAction(target, "send"), true)
  for (const status of ["작성전", "작성완료", "전송완료"]) assert.equal(after.filter(item => item.status === status).length, before.filter(item => item.status === status).length)
})

test("주간 대표 상태·지연·오늘 할 일·권수는 예약 보조 정보와 별개로 기존 판정 유지", () => {
  const { db, c, record } = fixture("waiting")
  const member = db.pro!.members.find(item => item.id === c.studentId)!, week = weekStart(db.pro!.clock)
  const original = structuredClone(db)
  delete original.records.find(item => item.id === record.id)!.feedbackSchedules
  const baseline = weeklyStudent(original, member, week)
  for (const status of ["waiting", "sending", "failed"] as const) {
    record.feedbackSchedules![0].status = status
    const row = weeklyStudent(db, member, week)
    assert.equal(row.status, baseline.status)
    assert.deepEqual(row.tasks, baseline.tasks)
    assert.deepEqual(row.usage, baseline.usage)
    assert.deepEqual(proTasks(db).counts, proTasks(original).counts)
    assert.deepEqual(proUsage(db.pro!, member, db.pro!.clock), proUsage(original.pro!, member, original.pro!.clock))
    const book = weeklyTaskBooks(row, week, row.asOf, null).feedback.find(item => item.record.id === record.id)!
    assert.equal(activeFeedbackSchedule(book.record)?.status, status)
  }
})

test("목록 복귀 URL은 예약 필터를 보존하고 전용 사례는 공용 행을 합치지 않음", () => {
  const list = readFileSync(new URL("../src/components/online-workbooks/agency-workbook-list.tsx", import.meta.url), "utf8")
  const data = readFileSync(new URL("../src/lib/online-workbooks.ts", import.meta.url), "utf8")
  const weekly = readFileSync(new URL("../src/components/pro-management/weekly-management.tsx", import.meta.url), "utf8")
  const action = readFileSync(new URL("../src/components/online-workbooks/review-feedback-action.tsx", import.meta.url), "utf8")
  assert.match(list, /reviewScheduleFilter\(p\.get\("schedule"\), nextAudience, nextSelection\)/)
  assert.match(list, /listParams\.set\("schedule", scheduleFilter\)/)
  assert.match(list, /listParams\.set\("studentTest", studentTest\)/)
  assert.match(list, /FeedbackScheduleStatus schedule=\{record\.feedbackSchedule\}/)
  assert.match(list, /FeedbackScheduleStatus schedule=\{record\.feedbackSchedule\} showScheduledAt=\{false\}/)
  const status = readFileSync(new URL("../src/components/online-workbooks/review-schedule-status.tsx", import.meta.url), "utf8")
  assert.match(status, /showScheduledAt && <span[^\n]+feedbackScheduleDate/)
  assert.match(list, /label="예약 상태"[^\n]+disabled=\{statusLocked\}/)
  assert.match(data, /if \(role === "agency" && agencyStudentTestToken\(\)\) return withWorkbookDisplayNumbers\(newRecords, \[\]\)/)
  assert.match(weekly, /!studentTest && <ProDemoTools/)
  assert.match(action, /returnParams\.get\("studentTest"\)/)
})

test("과거 주간에는 이후 등록한 예약을 숨기고 이후 취소·성공은 그 당시 상태로 표시", () => {
  const { db, c, record, schedule } = fixture("waiting")
  const at = "2026-10-11T14:59:59.999Z"
  assert.equal(activeFeedbackScheduleAt(record, at), undefined)
  schedule.createdAt = "2026-10-08T01:30:00.000Z"
  schedule.scheduledAt = "2026-10-12T01:30:00.000Z"
  schedule.events = [{ action: "registered", at: schedule.createdAt, actor: "목록 검증" }]
  const before = structuredClone(db)
  const member = db.pro!.members.find(item => item.id === c.studentId)!
  db.pro!.clock = "2026-10-14T03:00:00.000Z"
  for (const status of ["cancelled", "sent"] as const) {
    schedule.status = status
    schedule.events = [schedule.events[0], { action: status, at: "2026-10-12T01:30:00.000Z", actor: "목록 검증" }]
    const row = weeklyStudent(db, member, weekStart(at))
    const pending = row.feedback.find(item => item.record.id === record.id)!
    assert.ok(pending)
    assert.equal(row.asOf, at)
    assert.equal(activeFeedbackScheduleAt(pending.record, row.asOf)?.status, "waiting")
    assert.equal(activeFeedbackScheduleAt(record, "2026-10-12T01:30:00.000Z"), undefined)
  }
  assert.equal(before.records.find(item => item.id === record.id)!.feedbackSchedules![0].status, "waiting")
  const ui = readFileSync(new URL("../src/components/pro-management/weekly-student-row.tsx", import.meta.url), "utf8")
  assert.match(ui, /activeFeedbackScheduleAt\(f\.record, row\.asOf\)/)
})

test("오늘 기준 주간의 예약 표시는 기록된 최신 대기·전송 중·실패 상태와 일치", () => {
  const { record, schedule } = fixture("waiting")
  const now = "2026-10-26T03:00:00.000Z"
  schedule.events = [{ action: "registered", at: schedule.createdAt, actor: "목록 검증" }]
  assert.equal(activeFeedbackScheduleAt(record, now)?.status, "waiting")
  schedule.status = "sending"
  schedule.events.push({ action: "claimed", at: "2026-10-26T01:30:00.000Z", actor: "예약 처리" })
  assert.equal(activeFeedbackScheduleAt(record, now)?.status, "sending")
  schedule.status = "failed"
  schedule.events.push({ action: "failed", at: "2026-10-26T01:30:01.000Z", actor: "예약 처리", reason: "대상 변경" })
  assert.equal(activeFeedbackScheduleAt(record, now)?.status, "failed")
  assert.equal(activeFeedbackScheduleAt(record, now)?.failureReason, "대상 변경")
})

test("전용 예시의 학생 상세·목록 보고서·차수별 보고서 이동은 명시적 범위를 유지", () => {
  const detail = readFileSync(new URL("../src/components/pro-management/student-management-detail.tsx", import.meta.url), "utf8")
  const list = readFileSync(new URL("../src/components/online-workbooks/agency-workbook-list.tsx", import.meta.url), "utf8")
  const report = readFileSync(new URL("../src/components/online-workbooks/review-report.tsx", import.meta.url), "utf8")
  assert.match(detail, /studentId=\$\{encodeURIComponent\(id\)\}\$\{testQuery\}/)
  assert.match(detail, /pro-management\?role=\$\{hook\.role\}\$\{testQuery\}/)
  assert.match(list, /online-review\/report\/\$\{record\.id\}\?role=\$\{role\}\$\{studentTest/)
  assert.match(report, /const studentTest = role === "agency" \? agencyStudentTestToken\(\) : ""/)
  assert.match(report, /studentTest \? `&studentTest=\$\{encodeURIComponent\(studentTest\)\}`/)
})
