import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources.
import { resetTodayProDemo, TODAY_DEMO_IDS } from "../src/lib/pro-today-demo.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { applyReviewCommand, emptyReviewDatabase, reviewWritingMode } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { proTasks, proStatuses, weeklyStudent } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { consultationSummary, weeklyReminderItems, weeklyRecord, weeklyWarning } from "../src/lib/pro-weekly-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { addDays, weekStart } from "../src/lib/pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { applyProCommand, autoCandidates, proUsage, reconcilePro } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { reviewProPresentation } from "../src/lib/review-list-presentation.ts"

const now = "2026-10-13T05:00:00.000Z"
const teacher = { role: "agency" as const, institutionId: "dokdo", name: "검증 선생님" }
const fixture = () => resetTodayProDemo(initializePro(emptyReviewDatabase()), now)

test("오늘 프로 예시의 4문항·체크리스트와 2차 항목별 고쳐쓰기", () => {
  let db = fixture()
  const reviews = db.reviews.filter(r => r.id.startsWith("review-pro-today-"))
  for (const review of reviews) {
    assert.equal(review.template.id, "51")
    assert.equal(reviewWritingMode(review.template), "items")
    assert.deepEqual(review.template.items.map(i => i.title), ["책을 선택한 이유", "중심 내용 요약", "느낀 점 / 감상", "독후 관련 활동 계획"])
    assert.equal(review.template.rewriteGuide.split("\n").filter(line => line.startsWith("✅")).length, 2)
    for (const record of db.records.filter(r => r.reviewId === review.id)) {
      assert.ok(review.template.items.every(item => record.answers[item.id]?.trim()))
    }
  }
  const first = db.records.find(r => r.id === "review-pro-today-waiting-r1")!
  const student = { role: "student" as const, studentId: "pro-demo-5", name: "한프로" }
  db = applyReviewCommand(db, { type: "seen", recordId: first.id }, student, "test:seen", now)
  db = applyReviewCommand(db, { type: "start-second", recordId: first.id }, student, "test:start-second", now)
  let second = db.records.find(r => r.id === "review-pro-today-waiting-r2")!
  assert.equal(second.stage, "items")
  assert.deepEqual(second.answers, first.answers)
  db = applyReviewCommand(db, { type: "enter-rewrite", recordId: second.id }, student, "test:rewrite", now)
  const edited = { ...second.answers, "2": "친구와 다른 생각을 나누면서 서로를 이해하는 장면을 더 자세히 정리했다." }
  db = applyReviewCommand(db, { type: "save-writing", recordId: second.id, stage: "rewrite", itemIndex: 1, answers: edited, body: "", rewriteChecklist: [0, 1] }, student, "test:edit", now)
  second = db.records.find(r => r.id === second.id)!
  assert.equal(second.answers["2"], edited["2"])
  assert.deepEqual(second.rewriteChecklist, [0, 1])
  assert.deepEqual(db.records.find(r => r.id === first.id)!.answers, first.answers)
})

test("프로 목록에 선정 경로 3종·선정 예정·대상 아님·기존 기록을 모두 제공", () => {
  const db = fixture(), pro = db.pro!, week = weekStart(now)
  const counts: Record<string, number> = {}
  for (const record of db.records.filter(r => r.writingStatus === "submitted")) {
    const c = pro.cases.find(c => c.reviewId === record.reviewId)
    const member = pro.members.find(m => m.id === c?.studentId)
    if (!c || !member?.external || member.product !== "pro" || member.institutionId !== "dokdo") continue
    const expected = now < c.cutoff && autoCandidates(db, member, week).slice(0, proUsage(pro, member, now).available).some(candidate => candidate.reviewId === c.reviewId)
    const label = reviewProPresentation(c, record.round, record.sentAt, expected, now).selection
    counts[label] = (counts[label] ?? 0) + 1
  }
  assert.deepEqual(counts, { "학생 신청": 7, "자동 선정": 4, "선생님 지정": 4, "자동 선정 예정": 1, "대상 아님": 1, "-": 2 })
  const unselected = pro.cases.find(c => c.reviewId === "review-pro-today-not-selected")!
  assert.equal(unselected.selectedAt, undefined)
  assert.equal(proUsage(pro, pro.members.find(m => m.id === unselected.studentId)!, now).available, 0)
  assert.equal(db.records.find(r => r.reviewId === unselected.reviewId)!.savedAt, undefined)
})

test("예시는 실제 선정 명령과 마감 처리를 거치고 이력·차수별 선정 경로가 일치", () => {
  const db = fixture(), pro = db.pro!
  const cases = pro.cases.filter(c => c.reviewId.startsWith("review-pro-today-") && c.selectedAt)
  assert.equal(cases.filter(c => c.selection === "migration").length, 1)
  for (const c of cases) {
    const selected = pro.audit.find(a => a.reviewId === c.reviewId && a.kind === "대상 선정")!
    assert.equal(selected.after, c.selection)
    assert.equal(selected.at, c.selectedAt)
    if (c.selection === "auto") assert.equal(c.selectedAt, c.cutoff)
    if (c.selection === "student") assert.ok(c.selectedAt! < c.cutoff)
    for (const r of db.records.filter(r => r.reviewId === c.reviewId)) {
      assert.ok(!r.savedAt || r.savedAt >= c.selectedAt!)
      assert.ok(!r.sentAt || r.sentAt >= c.selectedAt!)
      assert.ok(!r.sentAt || r.sentAt <= now)
      assert.equal(reviewProPresentation(c, r.round, r.sentAt, false, now).selection,
        reviewProPresentation(c, 1, undefined, false, now).selection)
    }
  }
  assert.equal(pro.cases.find(c => c.reviewId === "review-pro-today-writing")!.lockedAt, undefined)
  assert.ok(pro.cases.find(c => c.reviewId === "review-pro-today-saved")!.lockedAt)
})

test("기관 피드백 요일을 바꾸어도 자동 선정은 과거 마감 시각이며 설정 보존", () => {
  for (let weekday = 1; weekday <= 7; weekday++) {
    const input = initializePro(emptyReviewDatabase())
    input.pro!.schedules.filter(s => s.institutionId === "dokdo").forEach(s => { s.weekday = weekday })
    const db = resetTodayProDemo(input, now)
    assert.deepEqual(db.pro!.schedules, input.pro!.schedules)
    const automatic = db.pro!.cases.filter(c => c.reviewId.startsWith("review-pro-today-") && c.selection === "auto")
    assert.ok(automatic.length >= 3)
    for (const c of automatic) {
      assert.equal(c.selectedAt, c.cutoff)
      assert.ok(c.selectedAt! <= now)
    }
  }
})

test("오늘 초기 예시: 지연 1건, 모든 피드백 상태 및 상담 5종, 중복 학생 없음", () => {
  const db = fixture(), pro = db.pro!, week = weekStart(now)
  const members = pro.members.filter(m => TODAY_DEMO_IDS.includes(m.id))
  const rows = members.map(m => weeklyStudent(db, m, week))
  assert.equal(new Set(members.map(m => m.id)).size, TODAY_DEMO_IDS.length)
  assert.deepEqual(new Set(rows.map(r => r.status)), new Set(proStatuses))
  assert.deepEqual(new Set(rows.map(r => consultationSummary(r, week).label)), new Set(["예정", "오늘 상담", "유선 완료", "카톡 대체", "미진행"]))
  assert.deepEqual(proTasks(db).counts, [1, 3, 0, 0, 3, 0, 0])
  assert.equal(pro.clockMode, "real")
  assert.equal(pro.clock, now)
  const reminders = rows.flatMap(r => weeklyReminderItems(db, r, week).map(i => i.buttonLabel))
  for (const label of ["1회 · 목 · 완료", "2회 · 금 · 완료", "1회 · 목 · 예정", "2회 · 금 · 예정"]) assert.ok(reminders.includes(label), label)
})

test("과거 관리·미제출·제출 회복 이력을 구분하고 2주·3주 경고의 실제 기간 표시", () => {
  const db = fixture(), week = weekStart(now)
  const row = (id: string) => weeklyStudent(db, db.pro!.members.find(m => m.id === id)!, week)
  const records = (id: string) => [-14, -7, 0].map(days => weeklyRecord(db, row(id).member, addDays(week, days), now).label)
  assert.deepEqual(records("pro-demo-1"), ["피드백 전송", "피드백 전송", "제출 완료"])
  assert.deepEqual(records("pro-demo-2"), ["피드백 전송", "미제출", "제출 완료"])
  assert.deepEqual(records("pro-demo-complete"), ["피드백 전송", "피드백 전송", "피드백 전송"])
  assert.deepEqual(records("pro-demo-6"), ["미제출", "미제출", "제출 완료"])
  assert.deepEqual(records("pro-demo-second"), ["피드백 전송", "피드백 전송", "제출 완료"])
  assert.equal(weeklyWarning(row("pro-demo-6")), undefined, "현재 1차 제출은 경고만 해제하고 과거 미제출은 보존")
  const attention = row("pro-demo-attention"), hq = row("pro-demo-hq-check")
  assert.equal(weeklyWarning(attention)?.label, "집중 관리")
  assert.equal(attention.missed, 2)
  assert.deepEqual(attention.missedWeeks, [-14,-7].map(days => addDays(week,days)))
  assert.equal(weeklyWarning(hq)?.label, "본사 확인 필요")
  assert.equal(hq.missed, 3)
  assert.deepEqual(hq.missedWeeks, [-21,-14,-7].map(days => addDays(week,days)))
  assert.ok(weeklyWarning(hq)!.lines.some((line: string) => line.includes("9/21(월) ~ 9/27(일)")), "지난달을 포함한 실제 미제출 기간 표시")
  const warnings = TODAY_DEMO_IDS.map(row).filter(r => weeklyWarning(r))
  assert.deepEqual(warnings.map(r => r.member.id).sort(), ["pro-demo-attention", "pro-demo-hq-check"])
})

test("목요일 정확한 경계부터 1·2차 독려 집계, 완료 기록은 제외, 금요일 2회 집계", () => {
  let db = fixture()
  const travel = (at: string, id: string) => { db = applyProCommand(db, { type: "clock", at }, teacher, id, now); return proTasks(db).counts }
  assert.deepEqual(travel("2026-10-14T14:59:59.999Z", "before").slice(2,4), [0,0])
  assert.deepEqual(travel("2026-10-14T15:00:00.000Z", "thu").slice(2,4), [3,1])
  const week = weekStart(db.pro!.clock)
  db = applyProCommand(db, { type: "reminder", studentId: "pro-demo-hq-check", week, kind: "submission", sequence: 1 }, teacher, "sent", now)
  assert.deepEqual(proTasks(db).counts.slice(2,4), [2,1])
  assert.deepEqual(travel("2026-10-15T15:00:00.000Z", "fri").slice(2,4), [4,1])
  const before = JSON.stringify(proTasks(db))
  assert.equal(JSON.stringify(proTasks(reconcilePro(db))), before, "반복 조회는 초기화·중복 집계하지 않음")
})

test("월말 주차에 상담 미완료·소멸 예정 집계, 실제 시각 복원", () => {
  const original = fixture()
  const db = applyProCommand(original, { type: "clock", at: "2026-10-26T01:00:00.000Z" }, teacher, "month-end", now)
  assert.deepEqual(proTasks(db).counts.slice(5), [8,9])
  const rows = db.pro!.members.filter(m => TODAY_DEMO_IDS.includes(m.id)).map(m => weeklyStudent(db,m,weekStart(db.pro!.clock)))
  assert.ok(rows.some(r => consultationSummary(r, weekStart(db.pro!.clock)).label === "이번 달 상담 미완료"))
  const restored = applyProCommand(db, { type: "clock-real" }, teacher, "real", now)
  assert.equal(restored.pro!.clockMode, "real")
  assert.deepEqual(proTasks(restored), proTasks(original))
})

test("초기화는 데모 ID만 교체하고 일반/타기관 데이터 및 입력을 보존", () => {
  const original = initializePro(emptyReviewDatabase()), before = JSON.stringify(original)
  const db = resetTodayProDemo(original, now)
  assert.equal(JSON.stringify(original), before)
  const ids = new Set(TODAY_DEMO_IDS)
  assert.deepEqual(db.reviews.filter(r => !ids.has(r.studentId)), original.reviews.filter(r => !ids.has(r.studentId)))
  assert.deepEqual(db.pro!.members.filter(m => !ids.has(m.id)), original.pro!.members.filter(m => !ids.has(m.id)))
  const first = db.pro!.reminders[0]
  first.cancelledAt = now
  const reset = resetTodayProDemo(db, now)
  assert.equal(reset.pro!.reminders.find(r => r.id === first.id)?.cancelledAt, undefined)
  assert.deepEqual(proTasks(reset), proTasks(fixture()))
})

test("날짜 테스트 중 초기화해도 초기화 대상 밖의 기록을 과거 스냅샷으로 덮어쓰지 않음", () => {
  const original = fixture()
  const db = applyProCommand(original, { type: "clock", at: "2026-10-26T01:00:00.000Z" }, teacher, "test-reset", now)
  const outside = db.pro!.members.find(m => m.id === "pro-demo-8")!
  outside.name = "장프로(테스트 중 변경)"
  const reset = resetTodayProDemo(db, now)
  assert.equal(reset.pro!.members.find(m => m.id === outside.id)!.name, outside.name)
  assert.equal(reset.proTestBaseline, undefined)
  assert.equal(reset.pro!.clockMode, "real")
  assert.equal(reset.pro!.clock, now)
})

test("다른 오늘 날짜에도 이력을 미래로 만들지 않고 현재 관리월로 초기화", () => {
  for (const at of ["2026-11-02T01:00:00.000Z", "2026-11-30T01:00:00.000Z", "2027-01-01T01:00:00.000Z"]) {
    const db = resetTodayProDemo(initializePro(emptyReviewDatabase()), at)
    assert.equal(db.pro!.clock, at)
    assert.ok(db.records.filter(r => r.reviewId.startsWith("review-pro-today-")).every(r => !r.submittedAt || r.submittedAt <= at))
    assert.equal(proTasks(db).counts[0], 1)
  }
})
