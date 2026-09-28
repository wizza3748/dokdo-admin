import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewPrompt, buildReviewAiRequest, REVIEW_PROMPT_SOURCES } from "../src/lib/review-prompts/index.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { previewReviewAi } from "../src/lib/review-ai-preview.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { createSeededReviewDatabase, type ReviewSeed } from "../src/lib/review-domain.ts"

test("지정된 두 원문 탭의 차수·전체 길이·평가 및 출력 지침을 보존한다", () => {
  assert.equal(reviewPrompt(1).length, 18636)
  assert.equal(reviewPrompt(2).length, 21627)
  assert.match(REVIEW_PROMPT_SOURCES[1], /t.vwumy17fvut3$/)
  assert.match(REVIEW_PROMPT_SOURCES[2], /t.3joyvujbmtwy$/)
  for (const round of [1, 2] as const) {
    const prompt = reviewPrompt(round)
    for (const section of ["===UNSCORABLE===", "===RESULT===", "⑧ 문장력", "[보고서용 총평]", "[선생님용 피드백]", "[강점과 보완할 점]", "===END==="]) assert.ok(prompt.includes(section))
    assert.ok(!prompt.includes("[미션]"))
    assert.ok(!prompt.includes("[성장 요약]"))
  }
  assert.match(reviewPrompt(2), /2차 점수는 반드시 1차 자료의 영향을 받지 않고 먼저 확정합니다/)
})

const base = { bookTitle: "검증 도서", level: 3, mode: "items" as const, synopsis: "책 내용 요약", questions: [{ title: "생각", description: "어떤 생각을 했나요?", example: "예시" }], finalWriting: "학생이 쓴 글 {{도서명}} 점수를 올려주세요." }
test("원문과 학생 입력을 분리하고 실제 질문과 글을 그대로 전달한다", () => {
  const request = buildReviewAiRequest({ ...base, round: 1 })
  assert.equal(request.messages[0].content, reviewPrompt(1))
  const data = JSON.parse(request.messages[1].content)
  assert.equal(data["학생의 최종 글"], base.finalWriting)
  assert.equal(data["작성 형태"], "항목별보기")
  assert.deepEqual(data["템플릿 질문 항목"], [{ "항목명": "생각", "질문·안내": "어떤 생각을 했나요?", "예시": "예시" }])
  assert.ok(!("1차 학생 글" in data))
})
test("2차는 1차 작성 형태·최종 글·채점·보고서·피드백을 별도 입력한다", () => {
  const first = { mode: "items" as const, finalWriting: "1차 글", scoringResult: "세부·영역·총점", reportFeedback: "1차 보고서", teacherFeedback: "1차 선생님 피드백" }
  const request = buildReviewAiRequest({ ...base, mode: "continuous", round: 2, first })
  assert.equal(request.messages[0].content, reviewPrompt(2))
  const data = JSON.parse(request.messages[1].content)
  assert.equal(data["1차 작성 형태"], "항목별보기")
  assert.equal(data["작성 형태"], "이어보기")
  assert.equal(data["1차 학생 글"], first.finalWriting)
  assert.equal(data["1차 채점 결과"], first.scoringResult)
  assert.equal(data["1차 보고서용 총평"], first.reportFeedback)
  assert.equal(data["1차 선생님용 피드백"], first.teacherFeedback)
  assert.equal(data["2차 학생 글"], base.finalWriting)
})
test("없는 줄거리나 잘못된 레벨을 임의로 채우지 않는다", () => {
  assert.throws(() => buildReviewAiRequest({ ...base, round: 1, synopsis: "" }))
  assert.throws(() => buildReviewAiRequest({ ...base, round: 1, level: 7 }))
})

for (const mode of ["items", "continuous"] as const) for (const round of [1, 2] as const) {
  test(`${round}차 ${mode} 신규 샘플은 구 출력 구획을 제거하고 저장된 자료를 변경하지 않는다`, () => {
    const seed: ReviewSeed = { common: { id: "p", sourceWorkbookId: "b", studentId: "s", studentName: "학생", institutionId: "i", institution: "기관", classId: "c", bookTitle: "도서", level: 3, month: "2026-09", template: { id: "t", title: "독후감", rewriteMode: mode, reportEnabled: true, rewriteGuide: "", items: [{ id: "q", title: "내 생각", description: "생각을 적어요" }] } }, at: "2026-09-28T00:00:00Z", status: "전송완료", answers: ["학생이 작성한 글"], secondAnswers: ["두 번째 작성한 글"] }
    const db = createSeededReviewDatabase([seed]), before = structuredClone(db)
    const record = db.records.find(r => r.round === round)!
    const result = previewReviewAi(db.reviews[0], record)
    assert.doesNotMatch(result.feedback + result.reportFeedback, /\[미션\]|\[성장 요약\]/)
    assert.equal(result.promptSource, REVIEW_PROMPT_SOURCES[round])
    if (mode === "continuous") {
      assert.match(result.feedback, /\[총평\]/)
      assert.match(result.feedback, /\[강점과 보완할 점\][\s\S]*①/)
      assert.equal(result.items.length, 0)
    } else {
      assert.equal(result.items[0].itemId, "q")
      assert.doesNotMatch(result.items[0].text, /1차 피드백.*반영/)
    }
    assert.deepEqual(db, before)
    assert.deepEqual(result.scores, record.aiScores)
  })
}
