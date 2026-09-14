import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node's type stripping uses explicit .ts paths.
import { REVIEW_ASSESSMENT_CONFIG, legacyAssessmentCriteria } from "../src/lib/review-assessment-config.ts"
// @ts-expect-error Node's type stripping uses explicit .ts paths.
import { applyReviewCommand, assessmentAreas, assessmentCriteria, createSeededReviewDatabase, expandLegacyReviewScores, upgradeUnscoredMockAssessments, sampleReviewAi, validAiScores, validScores, type ReviewActor, type ReviewSeed } from "../src/lib/review-domain.ts"
// @ts-expect-error Node's type stripping uses explicit .ts paths.
import { reportAreaScores } from "../src/lib/review-report-model.ts"

const seed: ReviewSeed = {
  common: { id: "version-test", sourceWorkbookId: "version-book", studentId: "student", studentName: "학생", institutionId: "institution", institution: "기관", classId: "class", bookTitle: "도서", level: 1, month: "2026-09", template: { id: "template", title: "독후감", reportEnabled: true, rewriteGuide: "", items: [{ id: "q", title: "질문", description: "" }] } },
  at: "2026-09-01T00:00:00Z", status: "전송완료", answers: ["책을 읽고 생각을 작성하였습니다."], secondState: "available",
}

test("입력 전 로컬 구평가는 공통 9개로 변경하고 작성글·피드백·사용횟수를 보존한다", () => {
  const db = createSeededReviewDatabase([seed]), record = db.records[0]
  delete record.assessment
  delete record.teacherScores
  delete record.report
  record.aiScores = Object.fromEntries(legacyAssessmentCriteria.filter(c => !["unity", "cohesion"].includes(c.id)).map(c => [c.id, 5]))
  record.feedback = "선생님이 직접 수정한 피드백입니다."
  record.reportFeedback = "직접 수정한 보고서 총평도 유지합니다."
  const legacy = expandLegacyReviewScores(db), before = structuredClone(legacy)
  const next = upgradeUnscoredMockAssessments(legacy)
  const updated = next.records[0]
  assert.equal(updated.assessment?.criteria.length, 9)
  assert.equal(assessmentAreas(1, updated).length, 5)
  assert.ok(validAiScores(1, updated.aiScores, updated))
  for (const key of ["answers", "feedback", "reportFeedback", "itemFeedback", "aiUsed", "history"] as const) assert.deepEqual(updated[key], record[key])
  assert.deepEqual(legacy, before)
  assert.deepEqual(upgradeUnscoredMockAssessments(next), next)
})

test("선생님 점수가 일부라도 입력된 활동은 로컬 전환으로 환산하지 않는다", () => {
  const db = createSeededReviewDatabase([seed]), record = db.records[0]
  delete record.assessment
  delete record.report
  record.aiScores = Object.fromEntries(legacyAssessmentCriteria.map(c => [c.id, c.max * .7]))
  record.teacherScores = { accuracy: 0 }
  const legacy = expandLegacyReviewScores(db)
  assert.deepEqual(upgradeUnscoredMockAssessments(legacy), legacy)
})

test("AI는 영역별 5개 점수, 선생님은 세부 9개 점수로 서로 다른 입력을 검증한다", () => {
  const db = createSeededReviewDatabase([seed]), record = db.records[0]
  assert.equal(Object.keys(record.aiScores!).length, 5)
  assert.equal(Object.keys(record.teacherScores!).length, 9)
  assert.ok(validAiScores(1, record.aiScores, record))
  assert.ok(validScores(1, record.teacherScores, record))
  assert.equal(validAiScores(1, record.teacherScores, record), false)
  assert.equal(validScores(1, record.aiScores, record), false)
  for (const bad of [{ ...record.aiScores, "내용 요약": 31 }, { ...record.aiScores, "내용 요약": NaN }, { ...record.aiScores, extra: 0 }]) assert.equal(validAiScores(1, bad, record), false)
})

test("배점 설정을 바꾸어도 기존 기준·보고서·2차 최초 생성 기준을 보존한다", () => {
  const db = createSeededReviewDatabase([seed]), first = db.records[0]
  const before = structuredClone(first), areas = reportAreaScores(db.reviews[0], first)
  const configured = REVIEW_ASSESSMENT_CONFIG.groups[0].criteria
  const oldMax = configured[0].max
  try {
    configured[0].max = 25
    assert.equal(assessmentCriteria(1)[0].max, 25)
    assert.equal(assessmentCriteria(1, first)[0].max, 20)
    assert.deepEqual(reportAreaScores(db.reviews[0], first), areas)
    const actor: ReviewActor = { role: "student", studentId: "student", name: "학생" }
    const next = applyReviewCommand(db, { type: "start-second", recordId: first.id }, actor, "new-second", "2026-09-14T00:00:00Z")
    assert.deepEqual(next.records[1].assessment, first.assessment)
    assert.deepEqual(first, before)
  } finally { configured[0].max = oldMax }
})

test("기존 11개 점수는 원본을 보존하고 AI 영역 합계만 변환한다", () => {
  const db = createSeededReviewDatabase([seed]), record = db.records[0]
  delete record.assessment
  record.aiScores = Object.fromEntries(legacyAssessmentCriteria.map(c => [c.id, c.max * .7]))
  record.teacherScores = Object.fromEntries(legacyAssessmentCriteria.map(c => [c.id, c.max * .8]))
  const before = structuredClone(db)
  const migrated = expandLegacyReviewScores(db), next = migrated.records[0]
  assert.equal(next.assessment?.criteria.length, 11)
  assert.deepEqual(next.teacherScores, record.teacherScores)
  assert.deepEqual(next.legacyAiScores, record.aiScores)
  assert.deepEqual(next.report, record.report)
  assert.deepEqual(next.feedback, record.feedback)
  assert.deepEqual(next.history, record.history)
  assert.ok(validAiScores(1, next.aiScores, next))
  assert.deepEqual(db, before)
  assert.deepEqual(expandLegacyReviewScores(migrated), migrated)
})

test("선생님 일부 점수만 입력된 이전 평가도 AI 기준을 기준으로 복원한다", () => {
  const db = createSeededReviewDatabase([seed]), record = db.records[0]
  delete record.assessment
  record.aiScores = Object.fromEntries(legacyAssessmentCriteria.map(c => [c.id, c.max * .7]))
  record.teacherScores = { accuracy: 5 }
  const next = expandLegacyReviewScores(db).records[0]
  assert.equal(next.assessment?.criteria.length, 11)
  assert.deepEqual(next.teacherScores, { accuracy: 5 })
  assert.equal(assessmentAreas(1, next).length, 5)
  assert.equal(Object.keys(sampleReviewAi(db.reviews[0], next).scores!).length, 5)
})
