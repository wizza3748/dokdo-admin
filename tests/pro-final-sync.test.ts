import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TypeScript sources directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { resetTodayProDemo } from "../src/lib/pro-today-demo.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { currentConsultations, reconcilePro } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { weeklyStudent, studentProView } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { consultationSummary, weeklyReminderItems } from "../src/lib/pro-weekly-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { studentConsultation } from "../src/lib/pro-student-detail.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewRecordDates } from "../src/lib/review-list-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { proBookPresentation } from "../src/lib/student-pro-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { addDays, weekStart } from "../src/lib/pro-calendar.ts"

const now = "2026-10-15T05:00:00.000Z"
const fixture = () => reconcilePro(resetTodayProDemo(initializePro(emptyReviewDatabase()), now))
const source = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8")

test("상담은 지난 주 조회에서도 같은 달의 최신 유효 기록과 예정일 유지", () => {
  const db = fixture(), pro = db.pro!, member = pro.members.find(m => m.id === "pro-demo-4")!
  pro.consultations = [{ id: "saved-today", studentId: member.id, month: "2026-10", result: "유선 상담 완료", actualAt: now, at: now, memo: "상담", actor: "선생님" }]
  member.overrides["2026-10"] = "2026-10-17T06:00:00.000Z"
  const before = structuredClone(db), week = weekStart(now)
  const current = weeklyStudent(db, member, week), prior = weeklyStudent(db, member, addDays(week, -7))
  assert.deepEqual(consultationSummary(prior, addDays(week, -7)), consultationSummary(current, week))
  assert.equal(prior.consultDue, member.overrides["2026-10"])
  assert.equal(prior.consultationAsOf, now)
  assert.notEqual(prior.asOf, now, "피드백은 기존 과거 주차 기준 유지")
  assert.deepEqual(db, before)
})

test("유선·카톡·미진행이 함께 있어도 공통 우선순위와 실제 상담 일시로 표시", () => {
  const db = fixture(), pro = db.pro!, member = pro.members.find(m => m.id === "pro-demo-4")!
  const base = { studentId: member.id, month: "2026-10", memo: "상담", actor: "선생님", at: now }
  pro.consultations = [
    { ...base, id: "voice-old", result: "유선 상담 완료", actualAt: "2026-10-12T03:00:00.000Z" },
    { ...base, id: "voice-new", result: "유선 상담 완료", actualAt: "2026-10-14T03:00:00.000Z", at: "2026-10-14T04:00:00.000Z" },
    { ...base, id: "chat", result: "부재 후 카톡 상담으로 대체", actualAt: now },
    { ...base, id: "missed", result: "미진행", actualAt: now },
  ]
  const summary = consultationSummary(weeklyStudent(db, member, weekStart(now)), weekStart(now))
  const detail = studentConsultation(pro, member, "2026-10")
  assert.equal(summary.label, "유선 완료")
  assert.equal(summary.record?.id, "voice-new")
  assert.equal(detail.status.label, "유선 상담 완료")
  assert.equal(detail.status.date, summary.date)
  pro.consultations.push({ ...base, id: "corrected", previousId: "voice-new", result: "미진행", actualAt: now })
  assert.ok(!currentConsultations(pro, member.id, "2026-10").some(c => c.id === "voice-new"))
  assert.equal(studentConsultation(pro, member, "2026-10").status.record?.id, "voice-old")
})

test("월말 미완료·오늘 상담도 조회 주차가 아닌 현재 시각으로 일치", () => {
  const db = fixture(), pro = db.pro!, member = pro.members.find(m => m.id === "pro-demo-4")!
  pro.consultations = []
  member.overrides["2026-10"] = now
  const week = weekStart(now), priorWeek = addDays(week, -7)
  assert.equal(consultationSummary(weeklyStudent(db, member, priorWeek), priorWeek).label, "오늘 상담")
  pro.clock = "2026-10-29T05:00:00.000Z"
  assert.equal(consultationSummary(weeklyStudent(db, member, priorWeek), priorWeek).label, "이번 달 상담 미완료")
  assert.equal(studentConsultation(pro, member, "2026-10").status.label, "이번 달 상담 미완료")
})

test("목록의 제출·피드백 날짜는 한국 자정과 월·연도 경계를 반영", () => {
  for (const [at, expected] of [["2026-10-11T14:59:59.999Z", "2026-10-11"], ["2026-10-11T15:00:00.000Z", "2026-10-12"], ["2026-10-31T15:00:00.000Z", "2026-11-01"], ["2026-12-31T15:00:00.000Z", "2027-01-01"]]) {
    assert.deepEqual(reviewRecordDates({ submittedAt: at, savedAt: at }), { submittedAt: expected, feedbackAt: expected, submittedAtTime: at })
  }
  assert.deepEqual(reviewRecordDates({}), { submittedAt: "", feedbackAt: null, submittedAtTime: "" })
  assert.match(source("lib/review-list-adapter.ts"), /\.\.\.reviewRecordDates\(r\)/)
})

test("독려 대상이 아닌 학생에게 별도 기록 진입이나 종류 선택을 추가하지 않음", () => {
  const db = fixture(), pro = db.pro!, submitted = pro.cases.find(c => c.reviewId === "review-pro-today-writing")!
  const member = pro.members.find(m => m.id === submitted.studentId)!, week = weekStart(now)
  pro.clockMode = "test"
  pro.reminders = []
  const row = weeklyStudent(db, member, week)
  assert.ok(row.submissions.length)
  assert.equal(weeklyReminderItems(db, row, week).filter(i => i.kind === "submission").length, 0)
  assert.equal(weeklyReminderItems(db, row, week).length, 0)
  pro.reminders.push({ id: "existing-reminder", studentId: member.id, week, kind: "submission", sequence: 1, at: now, actor: "검증 선생님" })
  const items = weeklyReminderItems(db, weeklyStudent(db, member, week), week)
  assert.equal(items[0].record?.id, "existing-reminder", "기존 발송 기록은 학생 제출 후에도 유지")
  assert.ok(items.every(item => item.kind === "submission"), "2차 요청이 없으면 2차 회차를 생성하지 않음")
  const ui = source("components/pro-management/weekly-reminders.tsx")
  assert.doesNotMatch(ui, /hiddenUnrecorded|allItems|includeInactive|>발송 기록 추가<|<select/)
  assert.match(ui, /selection && items\.find/)
  assert.match(ui, /!items\.length && <span className="text-slate-400">-<\/span>/)
  assert.match(ui, /이미 보낸 독려 기록/)
  assert.match(ui, /선택 기록 취소/)
})

test("학생 상세의 독후감 목록 링크는 프로 조회와 해당 학생 조건 포함", () => {
  assert.match(source("components/pro-management/student-management-detail.tsx"), /\/agency\/online-workbooks\?role=\$\{hook\.role\}&audience=pro&studentId=\$\{encodeURIComponent\(id\)\}/)
})

test("요일 설명은 선택 아래 항상 표시하고 기존 조건부 권장 안내 유지", () => {
  const ui = source("components/pro-management/feedback-day-settings.tsx")
  const explanation = "매주 피드백을 학생에게 보내야 하는 기준 요일입니다. 선택한 요일에 따라 제출·피드백 신청 마감일과 제출 독려일이 함께 정해집니다."
  assert.ok(ui.indexOf(explanation) > ui.indexOf('role="radiogroup"'))
  assert.ok(ui.indexOf(explanation) < ui.indexOf('{weekday !== 7'))
  assert.match(ui, /변경한 요일은 다음 주부터 적용됩니다/)
})

test("2차 진입 모달은 기본 명세 문구·버튼과 프로 공통 기한을 사용", () => {
  const ui = source("components/student/second-review-start-modal.tsx")
  assert.match(ui, /선생님의 피드백을 반영해 2차 작성을 시작할까요\?/)
  assert.match(ui, /작성 중에는 저장하고 이어서 쓸 수 있어요\./)
  assert.match(ui, /confirmLabel=\{busy \? "시작하는 중…" : "2차 작성하기"\}/)
  assert.match(ui, /proSecondDeadlineText\(deadline/)
})

test("배정 전·이용 종료를 제출 완료로 표시하지 않고 진행 중 상태 유지", () => {
  const view = studentProView(fixture(), "pro-demo-2")!
  const c = view.cases.find(c => !c.firstSent)!
  c.selected = false
  view.assigned = false
  assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, null)
  view.assigned = true; view.active = false
  assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, null)
  c.selected = true; c.locked = true
  assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, "피드백 작성 중")
})
