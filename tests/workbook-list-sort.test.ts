import { test } from "node:test"
import assert from "node:assert/strict"
import type { OnlineWorkbook } from "../src/lib/online-workbooks"
// @ts-expect-error Node native TS tests use explicit extensions.
import { compareAgencyWorkbooks } from "../src/lib/workbook-list-sort.ts"

type Row = Pick<OnlineWorkbook, "id" | "displayNumber" | "submittedAt" | "submittedAtTime" | "feedbackSchedule">
const row = (id: string, displayNumber: string, status?: "waiting" | "sending" | "failed", submittedAtTime = "2026-10-26T01:00:00.000Z"): Row => ({
  id, displayNumber, submittedAt: submittedAtTime.slice(0, 10), submittedAtTime,
  feedbackSchedule: status ? { status, scheduledAt: "2026-10-27T09:00:00.000Z" } : undefined,
})

for (const key of ["id", "submittedAt"] as const) for (const direction of ["asc", "desc"] as const) {
  test(`${key} ${direction} 정렬에서도 예약 대기 다음 실패가 일반 항목보다 위에 표시`, () => {
    const rows = [row("ordinary-new", "50099"), row("failure", "50067", "failed"), row("ordinary-old", "50001"), row("waiting", "50068", "waiting", "2026-10-20T01:00:00.000Z")]
    const before = structuredClone(rows)
    const sort = (values: Row[]) => [...values].sort((a, b) => compareAgencyWorkbooks(a, b, { key, direction })).map(r => r.id)
    const expected = ["waiting", "failure", ...(direction === "desc" ? ["ordinary-new", "ordinary-old"] : ["ordinary-old", "ordinary-new"])]
    assert.deepEqual(sort(rows), expected)
    assert.deepEqual(sort([...rows].reverse()), expected)
    assert.deepEqual(rows, before)
  })
}

test("동일 제출일은 공용 고유번호로 정렬하고 전송 중도 예약 우선 그룹에 유지", () => {
  const rows = [row("b", "50082", "sending"), row("a", "50081", "waiting"), row("c", "50083", "failed")]
  assert.deepEqual(rows.sort((a, b) => compareAgencyWorkbooks(a, b, { key: "submittedAt", direction: "desc" })).map(r => r.id), ["b", "a", "c"])
})

test("예약 표시가 사라진 전송 완료·취소 항목은 일반 정렬로 복귀", () => {
  const cancelled = row("cancelled", "50068", "waiting", "2026-10-20T01:00:00.000Z")
  cancelled.feedbackSchedule = undefined
  const rows = [cancelled, row("sent", "50085"), row("failure", "50067", "failed")]
  assert.deepEqual(rows.sort((a, b) => compareAgencyWorkbooks(a, b, { key: "submittedAt", direction: "desc" })).map(r => r.id), ["failure", "sent", "cancelled"])
})
