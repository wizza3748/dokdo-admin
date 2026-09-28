import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node domain tests load TypeScript sources directly.
import { applyReviewCommand, createSeededReviewDatabase, reviewWritingLength, reviewSubmissionLength, REVIEW_SHORT_SUBMISSION_MESSAGE, type ReviewSeed, type ReviewActor } from "../src/lib/review-domain.ts"

const student: ReviewActor = { role: "student", studentId: "s", name: "학생" }

test("제출 분량은 서식·이미지·줄바꿈을 제외하고 공백을 포함한 글자 수를 합산한다", () => {
  assert.equal(reviewWritingLength(["<p>가 나</p><p><b>다</b><br>라</p><img src='image'>"]), 5)
  assert.equal(reviewWritingLength(["가".repeat(49), "나".repeat(50)]), 99)
  assert.equal(reviewWritingLength(["<p>&nbsp;</p><img src='image'>"]), 0)
  assert.equal(reviewWritingLength(["🙂".repeat(100)]), 100)
})

for (const level of [1, 2, 3, 4, 5, 6]) for (const mode of ["items", "continuous"] as const) for (const round of [1, 2] as const) {
  test(`${level}레벨 ${mode} ${round}차: 0·99자는 차단하고 합계 100자는 제출한다`, () => {
    const seed: ReviewSeed = {
      common: { id: "length", sourceWorkbookId: "length-book", studentId: "s", studentName: "학생", institutionId: "i", institution: "기관", classId: "c", bookTitle: "검증 도서", level, month: "2026-09", template: { id: "t", title: "독서록", rewriteMode: mode, reportEnabled: false, rewriteGuide: "안내", items: [{ id: "a", title: "긴 질문 제목은 분량에 포함하지 않습니다", description: "안내도 포함하지 않습니다" }, { id: "b", title: "생각", description: "" }] } },
      at: "2026-09-28T00:00:00Z", status: round === 1 ? "writing" : "전송완료", answers: ["가".repeat(50), "나".repeat(50)], seen: true, ...(round === 2 ? { secondState: "writing" as const } : {}),
    }
    let db = createSeededReviewDatabase([seed])
    let n = 0
    const recordId = `length-r${round}`
    const run = (command: Parameters<typeof applyReviewCommand>[1]) => { db = applyReviewCommand(db, command, student, `length-${++n}`, "2026-09-28T01:00:00Z") }
    run({ type: "enter-rewrite", recordId })
    const firstBefore = round === 2 ? structuredClone(db.records[0]) : null
    for (const length of [0, 99, 100]) {
      const a = "가".repeat(Math.min(49, length))
      const b = "나".repeat(Math.max(0, length - a.length))
      run({ type: "save-writing", recordId, stage: "rewrite", itemIndex: 0, answers: { a: `<p>${a}</p>`, b: `<b>${b}</b>` }, body: `<p>${a}</p><p>${b}</p>`, rewriteChecklist: [0] })
      const record = db.records.find(r => r.id === recordId)!
      assert.equal(reviewSubmissionLength(db.reviews[0].template, record.answers, record.body), length)
      assert.equal(reviewSubmissionLength(db.reviews[0].template, { ...record.answers, unused: "제외".repeat(100) }, record.body), length)
      if (length < 100) {
        const before = structuredClone(db)
        assert.throws(() => run({ type: "submit", recordId }), { message: REVIEW_SHORT_SUBMISSION_MESSAGE })
        assert.deepEqual(db, before, "차단 시 본문·체크 상태·제출일·이력·피드백 상태를 변경하지 않는다")
      } else {
        run({ type: "submit", recordId })
        assert.equal(db.records.find(r => r.id === recordId)!.writingStatus, "submitted")
      }
    }
    if (firstBefore) assert.deepEqual(db.records[0], firstBefore)
  })
}

test("과거 100자 미만 제출 샘플은 원문 그대로 복원하며 재제출에는 새 기준을 적용한다", () => {
  const seed: ReviewSeed = { common: { id: "old", sourceWorkbookId: "old-book", studentId: "s", studentName: "학생", institutionId: "i", institution: "기관", classId: "c", bookTitle: "이전 글", level: 1, month: "2026-09", template: { id: "t", title: "글", reportEnabled: false, rewriteMode: "continuous", rewriteGuide: "", items: [{ id: "a", title: "내용", description: "" }] } }, at: "2026-09-01T00:00:00Z", status: "작성전", answers: ["이전에 제출한 짧은 글"] }
  const db = createSeededReviewDatabase([seed])
  assert.equal(db.records[0].finalBody, seed.answers[0])
  const rejected = applyReviewCommand(db, { type: "reject", recordId: "old-r1" }, { role: "class", institutionId: "i", classId: "c", name: "선생님" }, "reject", "2026-09-28T00:00:00Z")
  assert.throws(() => applyReviewCommand(rejected, { type: "submit", recordId: "old-r1" }, student, "resubmit", "2026-09-28T00:01:00Z"), { message: REVIEW_SHORT_SUBMISSION_MESSAGE })
})
