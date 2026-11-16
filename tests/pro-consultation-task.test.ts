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
import { applyProCommand, isActivePro, reconcilePro } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { proTasks, taskLabels, weeklyStudent } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { consultationSummary, weeklyTaskHelp } from "../src/lib/pro-weekly-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { weekStart } from "../src/lib/pro-calendar.ts"
import type { ProConsultation } from "../src/lib/pro-types"

const now = "2026-10-15T05:00:00.000Z"
const teacher = { role: "agency" as const, institutionId: "dokdo", name: "상담 검증" }
const fixture = () => reconcilePro(resetTodayProDemo(initializePro(emptyReviewDatabase()), now))

test("기존 상담 예정 상태는 보존하고 새 월간 할 일과 메뉴에는 합산하지 않음", () => {
  const db = fixture(), before = structuredClone(db), week = weekStart(now)
  const rows = db.pro!.members.filter(m => m.institutionId === "dokdo" && isActivePro(m, now)).map(m => weeklyStudent(db, m, week))
  assert.deepEqual(rows.filter(r => r.consultationDue).map(r => r.member.id).sort(), ["pro-demo-1", "pro-demo-4", "pro-demo-second"])
  const tasks = proTasks(db)
  assert.deepEqual(tasks.counts, [2, 3, 3, 1, 0, 0, 0])
  assert.equal(tasks.badge, 9)
  assert.equal(tasks.badge, tasks.counts.slice(0, 5).reduce((sum, count) => sum + count, 0))
  assert.deepEqual(db, before, "조회만으로 상담 기록이나 테스트 시각을 변경하지 않음")
})

test("상담 필요는 한국 날짜 기준 오늘 전체와 지난 예정일을 포함하고 미래·미설정은 제외", () => {
  const db = fixture(), pro = db.pro!, member = pro.members.find(m => m.id === "pro-demo-4")!
  pro.consultations = []
  member.consultation = undefined
  for (const [due, expected] of [
    ["2026-10-13T15:00:00.000Z", 1],
    ["2026-10-14T15:00:00.000Z", 1],
    ["2026-10-15T14:59:59.999Z", 1],
    ["2026-10-15T15:00:00.000Z", 0],
  ] as const) {
    member.overrides["2026-10"] = due
    assert.equal(Number(weeklyStudent(db, member, weekStart(now)).consultationDue), expected, due)
  }
  delete member.overrides["2026-10"]
  assert.equal(weeklyStudent(db, member, weekStart(now)).tasks[4], 0)
})

test("미진행은 포함하되 상담 완료 두 종류는 제외하고 같은 학생은 한 번만 집계", () => {
  for (const result of ["미진행", "유선 상담 완료", "부재 후 카톡 상담으로 대체"] as const) {
    const db = fixture(), pro = db.pro!, member = pro.members.find(m => m.id === "pro-demo-4")!
    const record: ProConsultation = { id: "result", studentId: member.id, month: "2026-10", result, actualAt: now, at: now, memo: "검증", actor: "선생님" }
    pro.consultations = [record, { ...record, id: "additional" }]
    assert.equal(Number(weeklyStudent(db, member, weekStart(now)).consultationDue), result === "미진행" ? 1 : 0)
    pro.consultations = [{ ...record, month: "2026-09" }]
    assert.equal(Number(weeklyStudent(db, member, weekStart(now)).consultationDue), 1, "지난달 완료는 이번 달 상담을 완료시키지 않음")
  }
})

test("전환 전 상담 저장과 일정 변경은 보존되며 월간 카드·메뉴에 영향 없음", () => {
  for (const type of ["consult", "consult-schedule"] as const) {
    const db = fixture(), previous = proTasks(db)
    const command = type === "consult"
      ? { type, studentId: "pro-demo-4", month: "2026-10", result: "유선 상담 완료" as const, actualAt: now, memo: "완료 검증" }
      : { type, studentId: "pro-demo-4", month: "2026-10", nth: 3, weekday: 4, time: "15:00", override: "2026-10-16T06:00:00.000Z" }
    const next = proTasks(applyProCommand(db, command, teacher, `consult-task-${type}`, now))
    assert.equal(next.counts[4], previous.counts[4])
    assert.equal(next.badge, previous.badge)
    assert.deepEqual(next.counts.slice(0, 4), previous.counts.slice(0, 4))
  }
})

test("기존 월말 상담은 월간 할 일에 미포함하며 소멸 예정 권수는 메뉴에 합산하지 않음", () => {
  let db = fixture()
  db.pro!.clock = "2026-10-26T05:00:00.000Z"
  db = reconcilePro(db)
  const pro = db.pro!, week = weekStart(pro.clock)
  const rows = pro.members.filter(m => m.institutionId === "dokdo" && isActivePro(m, pro.clock)).map(m => weeklyStudent(db, m, week))
  const tasks = proTasks(db), overlap = rows.filter(r => r.tasks[4] && r.tasks[5]).length
  assert.equal(overlap, 0)
  assert.ok(tasks.counts[6] > 0)
  assert.equal(tasks.badge, tasks.counts.slice(0, 6).reduce((sum, count) => sum + count, 0) - overlap)
})

test("월간 기록이 없는 종료·타 기관 학생의 상담은 월간 할 일에 반영하지 않음", () => {
  for (const excluded of ["ended", "other-institution"] as const) {
    const db = fixture(), before = proTasks(db), member = db.pro!.members.find(m => m.id === "pro-demo-4")!
    if (excluded === "ended") member.status = "ended"
    else member.institutionId = "other"
    const after = proTasks(db)
    assert.equal(after.counts[4], before.counts[4])
  }
})

test("월간 할 일 제목·툴팁으로 전환하며 기존 상담 조회 상태 유지", () => {
  const db = fixture(), week = weekStart(now)
  const row = (id: string) => weeklyStudent(db, db.pro!.members.find(m => m.id === id)!, week)
  assert.equal(taskLabels[4], "월간 피드백 작성")
  assert.match(weeklyTaskHelp[4][0], /월간 피드백/)
  assert.match(weeklyTaskHelp[4][1], /발송|일정|종료|생성/)
  assert.equal(consultationSummary(row("pro-demo-1"), week).label, "오늘 상담")
  assert.equal(consultationSummary(row("pro-demo-4"), week).label, "미진행")
  const nav = readFileSync(new URL("../src/components/app/nav.tsx", import.meta.url), "utf8")
  assert.match(nav, /item\.id === "agency-pro" && proBadge > 0/)
  assert.match(nav, /rounded-full bg-blue-600/)
  assert.match(nav, /남은 할 일 /)
  assert.doesNotMatch(nav, /title: `\$\{original\.title\} \(\$\{proBadge\}\)`/)
})
