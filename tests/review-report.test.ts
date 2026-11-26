import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources directly.
import { assessmentAreas, assessmentCriteria, createSeededReviewDatabase, type ReviewCommon, type ReviewRecord } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reportAreaScores, reportDate } from "../src/lib/review-report-model.ts"

function fixture(level: number) {
  const common: ReviewCommon = {
    id: "report-test", sourceWorkbookId: "report-test", studentId: "s1", studentName: "학생",
    institutionId: "i1", institution: "기관", classId: "c1", bookTitle: "도서", level,
    month: "2026-09", createdAt: "2026-09-01T00:00:00Z", progress: "complete", reportEnabled: true,
    template: { id: "t", title: "독서록", reportEnabled: true, rewriteGuide: "", items: [{ id: "q1", title: "감상", description: "" }] },
  }
  const db = createSeededReviewDatabase([{ common, at: common.createdAt, status: "전송완료", answers: ["책을 읽고 내 생각을 적었어요."] }])
  const scores = (ratio: number) => Object.fromEntries(assessmentCriteria(level).map(c => [c.id, c.max * ratio]))
  const aiScores = (ratio: number) => Object.fromEntries(assessmentAreas(level).map(a => [a.id, a.max * ratio]))
  const first: ReviewRecord = { ...db.records[0], aiScores: aiScores(.6), teacherScores: scores(.8) }
  const second: ReviewRecord = { ...first, id: "report-test-r2", round: 2, linkedRecordId: first.id, aiScores: aiScores(.8), teacherScores: scores(1) }
  return { common, first, second }
}

test("모든 레벨의 보고서가 기관관리자와 동일한 5개 영역·8개 기준과 배점을 사용한다", () => {
  for (let level = 1; level <= 6; level++) {
    const { common, first } = fixture(level)
    const areas = reportAreaScores(common, first)!
    assert.equal(areas.length, 5)
    assert.equal(areas.flatMap(a => a.details).length, 8)
    assert.deepEqual(areas.map(a => a.max), [30, 20, 20, 20, 10])
    assert.ok(Math.abs(areas.reduce((sum, a) => sum + a.current, 0) - 220 / 3) < 1e-10)
    for (const area of areas) assert.ok(Math.abs(area.current / area.max - 2.2 / 3) < 1e-10)
  }
})

test("차수별 영역 합계는 각 차수 원점수와 같고 원본은 변경하지 않는다", () => {
  const f = fixture(5), before = structuredClone(f)
  const areas = reportAreaScores(f.common, f.second, f.first)!
  assert.ok(Math.abs(areas.reduce((sum, a) => sum + a.first, 0) - 220 / 3) < 1e-10)
  assert.ok(Math.abs(areas.reduce((sum, a) => sum + a.current, 0) - 280 / 3) < 1e-10)
  assert.deepEqual(f, before)
})

test("누락·잘못 연결된 1차 점수를 0점으로 대체하지 않는다", () => {
  const { common, first, second } = fixture(2)
  assert.equal(reportAreaScores(common, second), null)
  assert.equal(reportAreaScores(common, second, { ...first, id: "other" }), null)
  assert.equal(reportAreaScores(common, second, { ...first, reviewId: "other" }), null)
  assert.equal(reportAreaScores(common, second, { ...first, teacherScores: {} }), null)
  assert.equal(reportAreaScores(common, { ...second, aiScores: undefined }, first), null)
})

test("점수 감소·실제 0점도 그대로 계산한다", () => {
  const { common, first, second } = fixture(3)
  const zero = Object.fromEntries(assessmentCriteria(common.level).map(c => [c.id, 0]))
  const aiZero = Object.fromEntries(assessmentAreas(common.level).map(a => [a.id, 0]))
  const areas = reportAreaScores(common, { ...second, aiScores: aiZero, teacherScores: zero }, first)!
  assert.ok(Math.abs(areas.reduce((sum, a) => sum + a.current - a.first, 0) + 220 / 3) < 1e-10)
  assert.equal(areas.reduce((sum, a) => sum + a.current, 0), 0)
})

test("표지와 제출일은 한국 시간 기준이며 잘못된 날짜를 만들지 않는다", () => {
  assert.match(reportDate("2026-08-31T16:00:00Z", true), /2026년 9월/)
  assert.equal(reportDate("2026-08-31T16:00:00Z"), "2026. 09. 01.")
  assert.equal(reportDate(), "—")
  assert.equal(reportDate("invalid"), "—")
})

test("부록 A 검증점수의 반올림은 회차 합계·영역·변화에 각각 마지막에 적용한다", () => {
  const { common, first, second } = fixture(4)
  function setScores(record: ReviewRecord, ai: number[], teacher: number[]) {
    const criteria = assessmentCriteria(4, record)
    record.teacherScores = Object.fromEntries(criteria.map((c, i) => [c.id, teacher[i]]))
    record.aiScores = Object.fromEntries(assessmentAreas(4, record).map(a => [a.id, criteria.reduce((sum, c, i) => sum + (c.area === a.id ? ai[i] : 0), 0)]))
  }
  setScores(first, [8,15,15,15,7,7,4,3], [8,17,17,17,8,8,4,3])
  setScores(second, [8,17,14,15,8,7,4,3], [9,17,16,17,9,8,4,3])
  const areas = reportAreaScores(common, second, first)!
  const a = areas.reduce((n, v) => n + v.first, 0), b = areas.reduce((n, v) => n + v.current, 0)
  assert.deepEqual([a,b,b-a,areas.reduce((n,v) => n + Number(v.first.toFixed(1)),0)].map(n=>n.toFixed(1)), ["79.3","80.7","1.3","79.2"])
  assert.deepEqual(new Set(areas.map(v=>Math.sign(v.current-v.first))),new Set([1,-1,0]))
})
