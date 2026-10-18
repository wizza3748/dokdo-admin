import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { weeklyStudent, reminderCopy } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { weeklyReminderItems, weeklyColumnHelp } from "../src/lib/pro-weekly-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { weekStart } from "../src/lib/pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { applyProCommand } from "../src/lib/pro-domain.ts"

function fixture() {
  const db = initializePro(emptyReviewDatabase())
  db.pro!.clockMode = "test"
  db.pro!.clock = "2026-10-13T05:00:00.000Z"
  const member = db.pro!.members.find(m => m.id === "pro-demo-2")!
  member.assignedAt = "2026-09-28T00:00:00.000Z"
  member.effectiveAt = "2026-09-28T00:00:00.000Z"
  const week = weekStart(db.pro!.clock)
  return { db, member, week }
}
test("독려 버튼은 실제 설정으로 목·금 예정일을 표시하고 기록을 변경하지 않음", () => {
  const {db,member,week} = fixture(), before = JSON.stringify(db)
  const items = weeklyReminderItems(db, weeklyStudent(db,member,week),week)
  assert.deepEqual(items.map(i => i.buttonLabel), ["1회 · 목 · 예정", "2회 · 금 · 예정"])
  assert.equal(JSON.stringify(db),before)
  db.pro!.schedules.push({ ...db.pro!.schedules[0], from: week, weekday: 1 })
  const changed = weeklyReminderItems(db,weeklyStudent(db,member,week),week)
  assert.deepEqual(changed.map(i => i.buttonLabel), ["1회 · 금 · 예정", "2회 · 토 · 예정"])
})
test("완료 기록을 버튼에 반영하고 취소된 기록은 완료로 표시하지 않음", () => {
  const {db,member,week} = fixture()
  db.pro!.reminders.push({id:"qa-reminder",studentId:member.id,week,kind:"submission",sequence:1,at:db.pro!.clock,actor:"검증"})
  assert.equal(weeklyReminderItems(db,weeklyStudent(db,member,week),week)[0].buttonLabel,"1회 · 목 · 완료")
  db.pro!.reminders.at(-1)!.cancelledAt = db.pro!.clock
  assert.equal(weeklyReminderItems(db,weeklyStudent(db,member,week),week)[0].buttonLabel,"1회 · 목 · 예정")
})
test("독려 대상이 아니면 기본 목록에 버튼을 만들지 않음", () => {
  const {db,member,week} = fixture()
  member.limits["2026-10"] = 0
  assert.equal(weeklyReminderItems(db,weeklyStudent(db,member,week),week).length,0)
  assert.equal(weeklyReminderItems(db,weeklyStudent(db,member,week),week,true).length,4)
})
test("복사 문구는 명세의 안내와 실제 계산값을 포함", () => {
  const {db,member,week} = fixture(), row = weeklyStudent(db,member,week)
  const copy = reminderCopy(db,member,"submission",week)
  assert.ok(copy.startsWith("안녕하세요, 책글섬 독도 관리 선생님입니다."))
  assert.ok(copy.includes(`${member.name} 학생의 온라인 독후감 1차 작성글`))
  assert.ok(copy.includes(`이번 달 사용: ${row.usage.used} / ${row.usage.limit}권`))
  assert.ok(copy.includes(`이번 주 남은 신청 권수: ${row.usage.available}권`))
  assert.doesNotMatch(copy, /이번 달 피드백:|지금 추가로 신청할 수 있는 피드백:|권 남음/)
  assert.ok(copy.includes("밤 12시"))
  assert.ok(weeklyColumnHelp["제출 독려 현황"].some((line: string) => line.includes("예정 버튼")))
})
test("완료된 2차 독려의 참고 문구는 기록 시점으로 계산하며 현재 상태를 바꾸지 않음", () => {
  const {db,week} = fixture(), member = db.pro!.members.find(m => m.id === "pro-demo-5")!
  const at = db.pro!.clock, before = reminderCopy(db,member,"revision",week)
  const managed = db.pro!.cases.find(c => c.studentId === member.id && c.secondDeadline)!
  managed.closedAt = "2026-11-01T01:00:00.000Z"
  db.pro!.clock = "2026-11-02T01:00:00.000Z"
  const unchanged = JSON.stringify(db)
  assert.equal(reminderCopy(db,member,"revision",week,at),before)
  assert.ok(before.includes("2차 작성글 제출 기한:"))
  assert.equal(JSON.stringify(db),unchanged)
})

test("간단한 독려 화면에서도 순서·중복·당일 취소 조건 유지", () => {
  const {db,member,week} = fixture()
  const teacher = {role:"agency" as const,institutionId:member.institutionId!,name:"검증 선생님"}
  const command = {type:"reminder" as const,studentId:member.id,week,kind:"submission" as const,sequence:1 as const}
  assert.throws(() => applyProCommand(db,{...command,sequence:2},teacher,"qa-second-before"),/1회 발송/)
  const first = applyProCommand(db,command,teacher,"qa-first")
  assert.throws(() => applyProCommand(first,command,teacher,"qa-duplicate"),/이미 기록/)
  const second = applyProCommand(first,{...command,sequence:2},teacher,"qa-second")
  assert.throws(() => applyProCommand(second,{type:"cancel-reminder",id:"qa-first"},teacher,"qa-cancel-first"),/2회 기록/)
  const cancelled = applyProCommand(second,{type:"cancel-reminder",id:"qa-second"},teacher,"qa-cancel-second")
  assert.ok(cancelled.pro!.reminders.find(r=>r.id === "qa-second")?.cancelledAt)
  cancelled.pro!.clock = "2026-10-14T05:00:00.000Z"
  assert.throws(() => applyProCommand(cancelled,{type:"cancel-reminder",id:"qa-first"},teacher,"qa-cancel-late"),/당일/)
})
