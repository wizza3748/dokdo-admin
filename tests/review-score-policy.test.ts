import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TypeScript sources directly.
import { calculateReviewScores, weightNote, roundingNote, reviewScoreLabel } from "../src/lib/review-score-policy.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { createSeededReviewDatabase, normalizeReviewReportScores, type ReviewSeed } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewAreaLabel, reviewCriterionLabel } from "../src/lib/review-assessment-config.ts"

test("각 차수에서 AI와 선생님 점수에 1:2를 적용하고 향상 폭은 원점수로 계산한다", () => {
  const score = calculateReviewScores(80, 90, { ai: 60, teacher: 70 })
  assert.equal(score.firstScore, 200 / 3)
  assert.equal(score.score, 260 / 3)
  assert.equal(score.improvement, score.score - score.firstScore!)
  assert.ok(!("finalScore" in score))
  assert.equal(reviewScoreLabel(score.firstScore!), "66.7")
  assert.equal(reviewScoreLabel(0), "0")
  assert.equal(calculateReviewScores(0, 0).score, 0)
})

const seed: ReviewSeed = {
  common: { id: "policy-test", sourceWorkbookId: "book", studentId: "student", studentName: "학생", institutionId: "institution", institution: "기관", classId: "class", bookTitle: "도서", level: 1, month: "2026-09", template: { id: "template", title: "독후감", reportEnabled: true, rewriteGuide: "", items: [{ id: "q", title: "질문", description: "" }] } },
  at: "2026-09-01T00:00:00Z", status: "전송완료", answers: ["책을 읽고 생각을 작성하였습니다."], secondAnswers: ["책을 읽고 생각과 이유를 더 자세하게 작성하였습니다."],
}

test("전송 완료된 기존 보고서는 파생 점수만 갱신하고 재조회는 멱등적이다", () => {
  const db = createSeededReviewDatabase([seed])
  for (const r of db.records) { r.report!.score = 1; delete r.report!.calculationVersion }
  db.records[1].report!.firstScore = 1
  db.records[1].report!.finalScore = 1
  const before = structuredClone(db)
  const next = normalizeReviewReportScores(db)
  assert.deepEqual(db, before)
  assert.equal(next.records[1].report!.finalScore, 1)
  assert.notEqual(next.records[1].report!.firstScore, 1)
  assert.equal(normalizeReviewReportScores(next), next)
  next.records.forEach((r, i) => {
    const { report, ...rest } = r, { report: oldReport, ...oldRest } = before.records[i]
    assert.deepEqual(rest, oldRest)
    for (const key of ["ai", "teacher", "generatedAt", "version"] as const) assert.equal(report![key], oldReport![key])
  })
})

test("미제공·누락·잘못된 차수 연결의 보고서를 임의 생성하거나 0점으로 보완하지 않는다", () => {
  const db = createSeededReviewDatabase([seed])
  db.records[1].linkedRecordId = "missing"
  delete db.records[0].report
  const second = structuredClone(db.records[1])
  const next = normalizeReviewReportScores(db)
  assert.equal(next.records[0].report, undefined)
  assert.deepEqual(next.records[1], second)
})

test("표시 명칭만 바꾸고 저장 기준명과 점수 연결 키는 보존한다", () => {
  const db = createSeededReviewDatabase([seed]), before = structuredClone(db)
  assert.equal(reviewAreaLabel("구성 및 조직력"), "구성과 조직력")
  const criterion = db.records[0].assessment!.criteria.find(c => c.id === "specific")!
  assert.equal(reviewCriterionLabel(criterion), "감상의 구체성")
  assert.deepEqual(db, before)
})

test("같은 보고서 본문으로 인쇄하며 두 안내와 차수별 결과를 표시한다", () => {
  const source = readFileSync(new URL("../src/components/online-workbooks/review-report-screen.tsx", import.meta.url), "utf8")
  assert.equal(weightNote, "선생님 평가를 AI 평가보다 두 배 중요하게 반영해요.")
  assert.ok(source.includes("{weightNote}"))
  assert.equal(roundingNote, "점수는 반올림해 표시해 합계와 0.1점 차이가 날 수 있어요.")
  assert.ok(source.includes("{roundingNote}"))
  assert.doesNotMatch(source, /finalScore|weightedTeacher|weightedAi|aiDraft/)
  const scores = calculateReviewScores(89, 93, { ai: 86, teacher: 88 })
  assert.deepEqual([scores.firstScore!, scores.score, scores.improvement!].map(reviewScoreLabel), ["87.3", "91.7", "4.3"])
})
