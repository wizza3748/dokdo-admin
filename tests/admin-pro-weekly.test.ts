import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node native TS tests use explicit extensions.
import { summarizeAdminWeekly, sortWeeklyInstitutions, weeklyDateTime, weeklyNumber, weeklyPage, weeklyEnd } from "../src/lib/admin-pro-weekly.ts"
// @ts-expect-error Node native TS tests use explicit extensions.
import { adminWeeklyMembers, adminWeeklyInstitutions, adminWeeklyAvailableFrom } from "../src/lib/admin-pro-weekly-data.ts"
// @ts-expect-error Node native TS tests use explicit extensions.
import { weekStart, addDays } from "../src/lib/pro-calendar.ts"
// @ts-expect-error Node native TS tests use explicit extensions.
import { adminStudents, adminInstitutions } from "../src/lib/admin-local-catalog.ts"
// @ts-expect-error Node native TS tests use explicit extensions.
import { canViewAdminWeekly } from "../src/lib/admin-operator.ts"

const now = "2026-11-05T03:00:00.000Z", week = weekStart(now)
const summarize = (selected = week, time = now, available = adminWeeklyAvailableFrom) => summarizeAdminWeekly(adminWeeklyMembers(), adminWeeklyInstitutions, selected, time, available)

test("이번 주는 조회 시각 기준, 종료·이전 학원은 현재 인원에서 제외", () => {
  const result = summarize()
  assert.equal(result.current, true)
  assert.equal(result.asOf, now)
  assert.deepEqual(result.academies.map(i => [i.id, i.current]), [["1085", 2], ["1082", 1], ["1070", 1], ["1066", 1]])
  assert.equal(result.academies.reduce((sum, i) => sum + i.current!, 0), 5)
  assert.equal(summarize(week, "2026-11-02T00:00:00.000Z").assigned.length, 1)
})

test("신규·종료 각 5명, 두 목록의 중복 학생은 김민한 한 명이며 학원별 집계 일치", () => {
  const result = summarize()
  assert.equal(result.assigned.length, 5)
  assert.equal(result.ended.length, 5)
  // 이서연(26757)의 연속 학원 변경은 어느 목록에도 포함하지 않는다.
  assert.equal(result.assigned.some(i => i.id === "26757"), false)
  assert.equal(result.ended.some(i => i.id === "26757"), false)
  assert.equal(result.assigned.find(i => i.id === "26756")?.at, "2026-11-02T01:00:00.000Z")
  assert.deepEqual(result.assigned.filter(i => result.ended.some(e => e.id === i.id)).map(i => [i.id, i.name]), [["26760", "김민한"]])
  assert.equal(new Set([...result.assigned, ...result.ended].map(i => i.name)).size, 9)
  assert.equal(result.ended.find(i => i.id === "26761")?.reason, "프로 이용 종료")
  assert.equal(result.ended.find(i => i.id === "26760")?.reason, "학원 연결 해제")
  for (const institution of result.academies) {
    assert.equal(institution.assigned, result.assigned.filter(r => r.institutionId === institution.id).length)
    assert.equal(institution.ended, result.ended.filter(r => r.institutionId === institution.id).length)
  }
  assert.deepEqual(result.academies.map(i => [i.id, i.assigned, i.ended]), [["1085", 2, 2], ["1082", 1, 1], ["1070", 1, 1], ["1066", 1, 1]])
})

test("같은 주 여러 종료는 마지막 종료, 신규는 첫 시작과 최종 학원", () => {
  const member = adminWeeklyMembers()[0]
  member.matchingHistory = [
    { at: "2026-11-02T00:00:00Z", institutionId: "1085" },
    { at: "2026-11-02T02:00:00Z", institutionId: "" },
    { at: "2026-11-03T00:00:00Z", institutionId: "1085" },
    { at: "2026-11-03T01:00:00Z", institutionId: "1082" },
    { at: "2026-11-04T00:00:00Z", institutionId: "" },
  ]
  const result = summarizeAdminWeekly([member], adminWeeklyInstitutions, week, now, adminWeeklyAvailableFrom)
  assert.equal(result.assigned.length, 1); assert.equal(result.ended.length, 1)
  assert.equal(result.assigned[0].institutionId, "1082")
  assert.equal(result.assigned[0].at, "2026-11-02T00:00:00.000Z")
  assert.equal(result.ended[0].at, "2026-11-04T00:00:00.000Z")
})

test("과거 일요일 종료 기준으로 산출, 현재 매칭으로 과거 인원을 덮어쓰지 않음", () => {
  const result = summarize(addDays(week, -7))
  assert.equal(result.current, false)
  assert.equal(result.asOf, "2026-11-01T14:59:59.999Z")
  assert.equal(result.academies.find(i => i.id === "1085")?.current, 3)
  assert.equal(result.academies.find(i => i.id === "1082")?.current, 0)
  assert.equal(result.month, "2026-10")
  assert.equal(result.totalWeeks, 5)
})

test("월평균은 선택 주 이후 확정 주와 0명 주도 포함, 최종 표시만 반올림", () => {
  const result = summarize("2026-10-12T00:00:00+09:00")
  assert.equal(result.confirmedWeeks, 5)
  assert.equal(result.academies.find(i => i.id === "1085")?.average, 2.6)
  assert.equal(result.academies.find(i => i.id === "1082")?.average, 0)
  assert.equal(result.academies.find(i => i.id === "1066")?.average, 0.6)
  assert.equal(weeklyNumber(1000.345), "1,000.35명")
  assert.equal(weeklyNumber(1.6), "1.6명")
  assert.equal(weeklyNumber(0), "0명")
  assert.equal(weeklyNumber(null), "-")
})

test("확정 주 없음·자료 없음·빈 목록을 0명과 구분", () => {
  assert.equal(summarize().confirmedWeeks, 0)
  assert.ok(summarize().academies.every(i => i.average === null))
  const missing = summarize("2026-10-05T00:00:00+09:00", now, "2026-10-05T00:00:00+09:00")
  assert.ok(missing.academies.every(i => i.previous === null && i.average === null))
  const empty = summarize("2026-09-21T00:00:00+09:00")
  assert.deepEqual([empty.assigned, empty.ended, empty.academies], [[], [], []])
})

test("종료 목록은 같은 날짜일 때 시각 대신 학생명 순서", () => {
  const members = adminWeeklyMembers().slice(0, 2).map((m, i) => ({ ...m, name: i ? "가학생" : "나학생", status: "ended" as const, serviceEnd: "2027-12-31T14:59:59.999Z", endedAt: i ? "2026-11-04T00:00:00Z" : "2026-11-04T05:00:00Z" }))
  assert.deepEqual(summarizeAdminWeekly(members, adminWeeklyInstitutions, week, now, adminWeeklyAvailableFrom).ended.map(r => r.name), ["가학생", "나학생"])
})

test("정렬은 수치 없음 마지막·동률 학원명/기관 ID, 페이지 크기와 범위", () => {
  const rows = summarize().academies
  assert.deepEqual(sortWeeklyInstitutions(rows, "current", "desc").map(r => r.id), ["1085", "1070", "1082", "1066"])
  const ties = ["20", "3", "9"].map((id, i) => ({ ...rows[0], id, name: "같은 학원", current: i === 2 ? null : 0 }))
  for (const direction of ["asc", "desc"] as const) assert.deepEqual(sortWeeklyInstitutions(ties, "current", direction).map(r => r.id), ["3", "20", "9"])
  const many = Array.from({ length: 53 }, (_, i) => i)
  assert.deepEqual(weeklyPage(many, 3, 20), { rows: many.slice(40), current: 3, pages: 3, from: 41, to: 53 })
  assert.deepEqual(weeklyPage([], 1, 20), { rows: [], current: 1, pages: 1, from: 0, to: 0 })
})

test("주가 바뀌어도 선택 주 유지, 재조회 시 확정 / 미래 주 제한 / KST 형식", () => {
  const later = summarize(week, "2026-11-08T15:00:00.000Z")
  assert.equal(later.week, week); assert.equal(later.current, false)
  assert.equal(later.asOf, weeklyEnd(week))
  assert.equal(summarize(addDays(week, 14)).week, week)
  assert.equal(weeklyDateTime("2026-11-01T15:00:00.000Z"), "2026-11-02 00:00")
})

test("로컬 예시 학생·학원은 기존 카탈로그 ID 사용, 입력과 공용 데이터 불변", () => {
  const members = adminWeeklyMembers(), copy = JSON.stringify(members)
  for (const member of members) assert.equal(adminStudents.find(s => s.id === member.id)?.name, member.name)
  for (const institution of adminWeeklyInstitutions) assert.equal(adminInstitutions.find(i => i.id === institution.id)?.name, institution.name)
  summarizeAdminWeekly(members, adminWeeklyInstitutions, week, now, adminWeeklyAvailableFrom)
  assert.equal(JSON.stringify(members), copy)
  const route = readFileSync(new URL("../src/app/api/mock/admin-pro-weekly/route.ts", import.meta.url), "utf8")
  assert.doesNotMatch(route, /prototypeStore|updateReview|reset|POST|PUT|DELETE/)
})

test("최고관리 또는 운영관리 포함 시만 조회 허용", () => {
  assert.equal(canViewAdminWeekly(["최고관리"]), true)
  assert.equal(canViewAdminWeekly(["고객관리", "운영관리"]), true)
  assert.equal(canViewAdminWeekly(["고객관리"]), false)
  assert.equal(canViewAdminWeekly([]), false)
})
