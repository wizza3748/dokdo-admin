import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TypeScript sources directly.
import { feedbackDaySchedule } from "../src/lib/pro-feedback-day-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { addDays, midnight, weekStart } from "../src/lib/pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { applyProCommand, weekdayFor } from "../src/lib/pro-domain.ts"

const week = midnight("2026-10-19")
const teacher = { role: "agency" as const, institutionId: "dokdo", name: "설정 검증 선생님" }
const fixture = () => { const db = initializePro(emptyReviewDatabase()); db.pro!.clockMode = "test"; return db }

test("일요일 피드백 일정은 날짜 대신 요일과 마감 시각 표시", () => {
  assert.deepEqual(feedbackDaySchedule(week, 7), [
    { label: "제출·피드백 신청 마감", value: "토요일 밤 12시" },
    { label: "제출 독려 1회", value: "목요일 (마감 2일 전)" },
    { label: "제출 독려 2회", value: "금요일 (마감 전날)" },
  ])
})

test("월~일 모두 공통 일정 계산을 사용하고 월요일의 전주 마감을 올바르게 표시", () => {
  const expected = [
    ["일요일", "금요일", "토요일"], ["월요일", "토요일", "일요일"],
    ["화요일", "일요일", "월요일"], ["수요일", "월요일", "화요일"],
    ["목요일", "화요일", "수요일"], ["금요일", "수요일", "목요일"],
    ["토요일", "목요일", "금요일"],
  ]
  for (const [i, days] of expected.entries()) {
    const rows = feedbackDaySchedule(week, i + 1)
    assert.deepEqual(rows.map((row: { value: string }) => row.value), [
      `${days[0]} 밤 12시`, `${days[1]} (마감 2일 전)`, `${days[2]} (마감 전날)`,
    ])
  }
})

test("월·연도 경계와 실행 환경 시간대가 달라도 한국 요일 유지", () => {
  const oldTz = process.env.TZ
  try {
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Seoul"]) {
      process.env.TZ = tz
      for (const date of ["2026-10-26", "2026-12-28"]) {
        assert.deepEqual(feedbackDaySchedule(midnight(date), 7), feedbackDaySchedule(week, 7))
      }
    }
  } finally {
    if (oldTz === undefined) delete process.env.TZ
    else process.env.TZ = oldTz
  }
})

test("저장한 요일은 다음 주 적용, 기존 관리 건과 타기관 일정은 보존", () => {
  let db = fixture()
  const currentWeek = weekStart(db.pro!.clock), nextWeek = addDays(currentWeek, 7)
  const cases = structuredClone(db.pro!.cases)
  const other = structuredClone(db.pro!.schedules.filter((s: { institutionId: string }) => s.institutionId !== "dokdo"))
  db = applyProCommand(db, { type: "schedule", weekday: 1 }, teacher, "test-settings-save")
  const member = db.pro!.members.find((m: { institutionId?: string }) => m.institutionId === "dokdo")!
  assert.equal(weekdayFor(db.pro!, member, currentWeek), 7)
  assert.equal(weekdayFor(db.pro!, member, nextWeek), 1)
  assert.deepEqual(db.pro!.cases, cases)
  assert.deepEqual(db.pro!.schedules.filter((s: { institutionId: string }) => s.institutionId !== "dokdo"), other)
  db = applyProCommand(db, { type: "schedule", weekday: 3 }, teacher, "test-settings-replace")
  assert.equal(db.pro!.schedules.filter((s: { institutionId: string; from: string }) => s.institutionId === "dokdo" && s.from === nextWeek).length, 1)
  assert.equal(weekdayFor(db.pro!, member, nextWeek), 3)
})

test("중복 저장은 한 번만 반영하고 권한 없는 설정과 잘못된 요일 거부", () => {
  const db = fixture()
  const once = applyProCommand(db, { type: "schedule", weekday: 1 }, teacher, "test-repeat")
  const again = applyProCommand(once, { type: "schedule", weekday: 1 }, teacher, "test-repeat")
  assert.deepEqual(again, once)
  for (const weekday of [0, 8, 1.5]) assert.throws(() => applyProCommand(db, { type: "schedule", weekday }, teacher, `invalid-${weekday}`))
  assert.throws(() => applyProCommand(db, { type: "schedule", weekday: 1 }, { role: "admin", name: "본사" }, "invalid-admin"))
})

test("화면은 일요일 외 선택 안내를 유지하고 중복 영역과 폭 제한 제거", () => {
  const source = readFileSync(new URL("../src/components/pro-management/feedback-day-settings.tsx", import.meta.url), "utf8")
  assert.match(source, /weekday !== 7/)
  assert.match(source, /일요일을 권장합니다\. 다른 요일을 선택하면 제출 주차와 피드백 처리 주차가 달라질 수 있습니다\./)
  assert.match(source, /변경한 요일은 다음 주부터 적용됩니다\./)
  assert.doesNotMatch(source, /우리 기관의 프로 학생|현재 \{|학생 안내|적용 시작일|max-w-4xl|1차 독려|2차 독려/)
  assert.match(source, /selectedDay \?\? pending\?\.weekday \?\? current/)
})
