import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TypeScript sources directly.
import { calculateReviewScores, reviewImprovementMessage, reviewScoreExplanation, reviewScoreLabel } from "../src/lib/review-score-policy.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { createSeededReviewDatabase, normalizeReviewReportScores, type ReviewSeed } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewAreaLabel, reviewCriterionLabel } from "../src/lib/review-assessment-config.ts"

test("평가 주체와 작성 차수에 각각 1:2를 적용하고 중간 값을 반올림하지 않는다", () => {
  const score = calculateReviewScores(80, 90, { ai: 60, teacher: 70 })
  assert.equal(score.firstScore, 200 / 3)
  assert.equal(score.score, 260 / 3)
  assert.equal(score.weightedAi, 220 / 3)
  assert.equal(score.weightedTeacher, 250 / 3)
  assert.equal(score.finalScore, (220 / 3 + 250 / 3 * 2) / 3)
  assert.ok(Math.abs(score.finalScore! - (score.firstScore! + score.score * 2) / 3) < 1e-10)
  assert.equal(reviewScoreLabel(score.finalScore!), "80")
  assert.equal(reviewScoreLabel(score.firstScore!), "66.7")
  assert.equal(reviewScoreLabel(0), "0")
  assert.equal(calculateReviewScores(0, 0).score, 0)
})

test("향상 때만 안내하며 1차 안내에는 2차 가중치를 설명하지 않는다", () => {
  assert.equal(reviewImprovementMessage(29), "29점 향상되었어요.")
  assert.equal(reviewImprovementMessage(1.26), "1.3점 향상되었어요.")
  for (const value of [0, -0, -1, -29]) assert.equal(reviewImprovementMessage(value), null)
  assert.equal(reviewScoreExplanation(1), "1차 독후감 점수는 AI 평가보다 선생님 평가에 두 배 가중치를 두어 산출한 점수입니다.")
  assert.doesNotMatch(reviewScoreExplanation(1), /2차/)
  assert.equal(reviewScoreExplanation(2), "독후감 평가 점수는 학생의 작성 회차(1차·2차)와 평가 주체(AI·선생님)에 따라 각각 산출합니다.\n최종 점수는 이 중 2차 점수와 선생님 평가 점수에 두 배 가중치를 두어 산출합니다. 즉, 선생님의 피드백을 반영해 수정한 2차 글에 더 비중을 두어, 학생의 성장 잠재력에 중점을 둔 점수입니다.")
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
  assert.notEqual(next.records[1].report!.finalScore, 1)
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

test("보고서 산출 안내와 평가 주체별 점수는 화면·인쇄 공통 본문에 존재한다", () => {
  const source = readFileSync(new URL("../src/components/online-workbooks/review-report.tsx", import.meta.url), "utf8")
  assert.match(source, /reviewScoreExplanation\(record.round\)/)
  assert.match(source, /second && <section className=\{styles.subjectScores\}/)
  assert.match(source, /improvement && <p/)
  assert.match(source, /AI 평가 총점/)
  assert.match(source, /className=\{styles.achievement\}/)
  assert.match(source, /n\(area\[key\] \/ area.max \* 100\)/)
  assert.match(source, /className=\{styles.areaPoints\}/)
  assert.doesNotMatch(source, /styles.scoreTable/)
  assert.match(source, /<dt className=\{second \? undefined : styles.srOnly\}/)
  assert.match(source, /second && <div className=\{styles.legend\}/)
  assert.match(source, /reviewScoreExplanation\(record.round\)\}<\/p><\/section>\s*<\/div>\s*<section className=\{styles.areaSection\}/)
  assert.ok(source.indexOf("<section className={styles.scoreExplanation}") < source.indexOf("<section className={styles.areaSection}"))
  assert.ok(source.indexOf("<section className={styles.areaSection}") < source.indexOf("<section className={styles.commentSection}"))
  assert.match(source, /styles.assessmentTable/)
  const css = readFileSync(new URL("../src/components/online-workbooks/review-report.module.css", import.meta.url), "utf8")
  assert.doesNotMatch(css, /\.(?:subjectScores|scoreExplanation)\s*\{[^}]*display:\s*none/)
})
