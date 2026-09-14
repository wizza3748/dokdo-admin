import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node native TS tests require explicit extensions.
import { matchesWorkbookClassification, workbookClassification } from "../src/lib/workbook-classification.ts"

test("9월 이전 기존 데이터는 신규 차수와 보고서 상태를 추정하지 않는다", () => {
  const legacy = workbookClassification({ reviewId: "legacy-adapter-record", submittedAt: "2026-08-31" })
  assert.deepEqual(legacy, { writing: "기존 방식", decision: "-", report: "-" })
  assert.equal(matchesWorkbookClassification({ submittedAt: "2026-08-31" }, "기존 방식", "전체", "전체"), true)
  assert.equal(matchesWorkbookClassification({ submittedAt: "2026-08-31" }, "1차", "전체", "전체"), false)
})

test("9월 이후 데이터는 연결 직전 상태라도 신규 1차로 분류한다", () => {
  assert.deepEqual(workbookClassification({ submittedAt: "2026-09-01" }), { writing: "1차", decision: "미결정", report: "생성 불가" })
})

test("신규 레코드는 차수·결정·보고서 상태를 그대로 구분한다", () => {
  const record = { reviewId: "review-1", writingRound: 2 as const, secondDecision: "request" as const, reportStatus: "생성 완료" }
  assert.deepEqual(workbookClassification(record), { writing: "2차", decision: "2차 작성 요청", report: "생성 완료" })
  assert.equal(matchesWorkbookClassification(record, "2차", "2차 작성 요청", "생성 완료"), true)
})

test("1차 종료 결정은 화면에서 1차 완료로 표시한다", () => {
  const record = { reviewId: "review-2", writingRound: 1 as const, secondDecision: "complete" as const, reportStatus: "생성 완료" }
  assert.equal(workbookClassification(record).decision, "1차 완료")
})
