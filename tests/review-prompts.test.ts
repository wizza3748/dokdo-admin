import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewPrompt, fixedScoreHeader, type ReviewAiRequest } from "../src/lib/review-prompts/index.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { prepareReviewAiRequest, reviewAiResultCommand } from "../src/lib/review-ai-preview.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { mockReviewAi } from "../src/lib/review-ai-mock.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { parseReviewAiResponse, detailedScoreText } from "../src/lib/review-ai-response.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { applyReviewCommand, assessmentCriteria, createSeededReviewDatabase, hydrateLegacyReviewFeedback, type ReviewSeed, type ReviewRecord } from "../src/lib/review-domain.ts"

const hashes = ["3ab56872644d7233633cb1634f656c4bd693c591e47c47b25ceee96af78866e4", "4d65d8ffcc604026cd33fef60f8c7c186c81d2d0393aa0211a961ed5af19dbf3"]
const questions = [{ id: "q1", title: "내 생각", description: "생각을 적어요", example: "질문의 예시" }, { id: "q2", title: "다른 장면", description: "다른 장면을 적어요" }]
const materials = { synopsis: "도서 줄거리", quiz: [1, 2].map(round => ({ round, questions: [{ question: "확인한 장면은?", area: "사실", answer: "첫 장면", explanation: "처음에 나왔어요." }] })) }

function fixture(mode: "continuous" | "items", reportEnabled = true) {
  const seed: ReviewSeed = { common: { id: "p", sourceWorkbookId: "b", studentId: "s", studentName: "학생", institutionId: "i", institution: "기관", classId: "c",
    bookTitle: "도서", level: 3, month: "2026-11", template: { id: "t", title: "독후감", rewriteMode: mode, reportEnabled, rewriteGuide: "", items: questions } },
    at: "2026-11-23T00:00:00Z", status: "전송완료", answers: ["책에서 주인공의 마음을 읽었습니다.", "친구의 말을 떠올렸습니다."], secondAnswers: ["다시 읽으며 주인공의 말을 보았습니다.", "내 경험과 이어 보았습니다."] }
  return createSeededReviewDatabase([seed])
}
function ungraded(record: ReviewRecord): ReviewRecord {
  return { ...record, aiDetailScores: undefined, aiScores: undefined, aiUsed: 0, aiDraft: undefined, teacherScores: undefined, feedbackStatus: "작성전", report: undefined }
}
function fields(request: ReviewAiRequest) {
  return Object.fromEntries(request.messages[1].content.map(p => { const i = p.text.indexOf("\n"); return [p.text.slice(1, i - 1), p.text.slice(i + 1)] }))
}

for (const round of [1, 2] as const) for (const mode of ["items", "continuous"] as const) {
  test(round + "차 " + mode + " 실제 전달 메시지, 결과 구획, 최초 점수와 비표시 항목 보존", async () => {
    const db = fixture(mode), common = db.reviews[0], first = db.records[0], record = ungraded(db.records[round - 1])
    first.reportFeedback = "선생님 저장 내용 요약(21/30점)"
    first.aiDraft = { feedback: "미저장", reportFeedback: "미저장", items: [] }
    if (mode === "items") {
      first.itemFeedback[1] = { itemId: "q2", visible: false, text: "전송 제외 항목" }
      record.itemFeedback = [{ itemId: "q1", visible: true, text: "" }, { itemId: "q2", visible: false, text: "선생님 보관 내용" }]
    }
    const sent: ReviewAiRequest[] = []
    const simulate = async (request: ReviewAiRequest) => { sent.push(request); return mockReviewAi(request) }
    const out = await reviewAiResultCommand(common, record, first, materials, "run", simulate)
    assert.ok(out.result, out.error)
    const request = sent[0], input = fields(request)
    assert.equal(createHash("sha256").update(request.messages[0].content).digest("hex"), hashes[round - 1])
    assert.deepEqual(Object.keys(input).slice(0, 6), ["도서명", "레벨", "작성 형태", "줄거리 요약", "온라인 퀴즈", "템플릿 질문 항목"])
    assert.match(input["온라인 퀴즈"], /^1회차:\nQ1\. 확인한 장면은\? \(사실\)\n정답: 첫 장면\n해설: 처음에 나왔어요\.\n\n2회차:/)
    const expectedQuestions = "[내 생각]\n생각을 적어요\n예시: 질문의 예시" + (mode === "items" ? "" : "\n\n[다른 장면]\n다른 장면을 적어요")
    assert.equal(input["템플릿 질문 항목"], expectedQuestions)
    if (round === 2) {
      assert.deepEqual(Object.keys(input).slice(6), ["1차 작성 형태", "1차 학생 글", "1차 채점 결과", "1차 보고서용 총평", "1차 선생님용 피드백", "2차 학생 글"])
      assert.equal(input["1차 보고서용 총평"], first.reportFeedback)
      assert.doesNotMatch(input["1차 선생님용 피드백"], /미저장|전송 제외 항목/)
      assert.match(out.result.feedback, /수정 후 달라진 점/)
    }
    assert.equal(Object.keys(out.result.scores!).length, 5)
    assert.equal(out.result.reportFeedback?.split("\n").length, 6)
    assert.doesNotMatch(out.result.reportFeedback!, /내용 요약\(|\d+점|자리표시자/)
    if (mode === "items") assert.deepEqual(out.result.items[1], record.itemFeedback[1])
    else { assert.equal(out.result.items.length, 0); assert.match(out.result.feedback, /▷ 1문단: ‘/); assert.doesNotMatch(out.result.feedback, /미반영|일부 반영/) }
    const scored = { ...record, aiUsed: 1, aiScores: out.result.scores, aiDetailScores: out.result.detailScores }
    const retry = await reviewAiResultCommand(common, scored, first, { ...materials, quiz: [] }, "retry", simulate)
    assert.deepEqual(retry.result?.detailScores, out.result.detailScores)
    assert.equal(sent[1].messages[0].content, reviewPrompt(round) + fixedScoreHeader + detailedScoreText(scored.aiDetailScores!))
    assert.equal(fields(sent[1])["온라인 퀴즈"], "")
    assert.equal(fields(sent[1])["템플릿 질문 항목"], expectedQuestions)
  })
}

test("질문 안내와 예시의 원문을 보존하고 빈 예시 줄을 생략한다", () => {
  const db = fixture("items"), review = db.reviews[0], record = ungraded(db.records[0])
  review.template.items = [
    { id: "q1", title: "생각 [이유]", description: "[이야기 책]\n첫 장면을 골라요.\n\n[정보 책]\n새로 배운 점은?", example: "“첫 장면”\n두 번째 줄" },
    { id: "q2", title: "다른 장면", description: "장면을 적어요.", example: "   " },
  ]
  const request = prepareReviewAiRequest(review, record, undefined, materials)
  const text = fields(request)["템플릿 질문 항목"]
  assert.ok(text.includes("[생각 [이유]]\n[이야기 책]\n첫 장면을 골라요.\n\n[정보 책]\n새로 배운 점은?\n예시: “첫 장면”\n두 번째 줄"))
  assert.ok(text.endsWith("[다른 장면]\n장면을 적어요."))
  assert.deepEqual(parseReviewAiResponse(mockReviewAi(request), review, record).items.map(i => i.itemId), ["q1", "q2"])
})

test("신규 1차 AI 응답과 저장·전송 후의 2차 요청이 세부 점수 8개와 총점까지 일치한다", async () => {
  const { reviews: [common], records: [legacyFirst, second] } = fixture("items")
  const at = "2026-11-24T00:00:00Z"
  const db = createSeededReviewDatabase([{ common, at, status: "작성전", answers: ["주인공이 한 선택을 떠올렸습니다.", "기억에 남는 장면입니다."] }])
  const first = db.records[0], recordId = first.id
  const teacher = { role: "agency" as const, institutionId: common.institutionId, name: "선생님" }
  const started = applyReviewCommand(db, { type: "ai-start", recordId }, teacher, "generate", at)
  let scoreBlock = ""
  const result = await reviewAiResultCommand(common, first, undefined, materials, "generate", async request => {
    const raw = mockReviewAi(request)
    scoreBlock = raw.split("===SCORE===\n")[1].split("\n===FEEDBACK===")[0]
    return raw
  })
  assert.ok(result.result)
  const graded = applyReviewCommand(started, result, teacher, "graded", at)
  const saved = applyReviewCommand(graded, { type: "save-feedback", recordId, feedback: result.result.feedback, items: result.result.items, scores: legacyFirst.teacherScores, decision: "request" }, teacher, "save", at)
  const sent = applyReviewCommand(saved, { type: "send", recordId }, teacher, "send", at)
  const stored: ReviewRecord = JSON.parse(JSON.stringify(sent.records[0]))
  assert.deepEqual(stored.aiDetailScores, [8, 15, 15, 15, 7, 7, 4, 3])
  assert.equal(stored.report?.ai, 74)
  assert.equal(fields(prepareReviewAiRequest(common, ungraded(second), stored, materials))["1차 채점 결과"], scoreBlock)

  const historical = fields(prepareReviewAiRequest(common, ungraded(second), legacyFirst, materials))["1차 채점 결과"]
  assert.equal(historical, "저장된 영역 점수\n내용 요약: 21\n감상과 깨달음: 14\n발상과 독창성: 14\n구성과 조직력: 14\n표현력: 7\n총점: 70/100")
})

test("범위·항목·총점·질문명 오류와 채점 불가를 정상 생성과 구분한다", () => {
  const db = fixture("items"), common = db.reviews[0], record = ungraded(db.records[0])
  const req = prepareReviewAiRequest(common, record, undefined, materials), raw = mockReviewAi(req)
  for (const bad of [raw.replace("8/10", "11/10"), raw.replace("② 요약의 충분성", "① 요약의 정확성"), raw.replace(/총점: \d+/, "총점: 100"), raw.replace("[다른 장면]", "[다른 질문]"), raw.replace("===END===", "")]) assert.throws(() => parseReviewAiResponse(bad, common, record))
  const noGrade = mockReviewAi(prepareReviewAiRequest(common, { ...record, finalBody: "ㅋㅋㅋ123" }, undefined, materials))
  assert.match(parseReviewAiResponse(noGrade, common, record).unscorableReason!, /유형 A/)
  const example = mockReviewAi(prepareReviewAiRequest(common, { ...record, finalBody: "질문의 예시" }, undefined, materials))
  assert.match(parseReviewAiResponse(example, common, record).unscorableReason!, /유형 E/)
  const noReport = parseReviewAiResponse(raw, { ...common, reportEnabled: false }, record)
  assert.equal(noReport.reportFeedback, undefined)
  assert.equal(noReport.scores, undefined)
})

test("QA41 교사가 직접 입력한 점수·인용문과 재조회, 점수 단독 저장", () => {
  const db = fixture("items"), common = db.reviews[0], first = db.records[0]
  first.feedbackStatus = "작성완료"
  const actor = { role: "agency" as const, name: "선생님", institutionId: common.institutionId }
  const copy = "내용 요약(21/30점)\n‘3장’을 다시 읽고 (두 번) 정리한 문장입니다."
  const save = { type: "save-feedback" as const, recordId: first.id, feedback: first.feedback, decision: "request" as const, items: first.itemFeedback, scores: { ...first.teacherScores! }, reportFeedback: copy }
  const saved = applyReviewCommand(db, save, actor, "teacher-copy", "2026-11-24T00:00:00Z")
  const scoreId = assessmentCriteria(common.level, first)[0].id
  const again = applyReviewCommand(saved, { ...save, reportFeedback: undefined, scores: { ...save.scores, [scoreId]: 1 } }, actor, "only-score", "2026-11-24T01:00:00Z")
  const reopened = hydrateLegacyReviewFeedback(JSON.parse(JSON.stringify(again))).records[0]
  assert.equal(reopened.reportFeedback, copy)
  assert.equal(reopened.aiUsed, first.aiUsed)
  assert.deepEqual(reopened.aiHistory, first.aiHistory)
  assert.notEqual(reopened.report!.score, saved.records[0].report!.score)
})

test("옛 점수 제목은 시드 저장 이력과 생성 문장 전체가 일치할 때만 교체한다", () => {
  const db = fixture("items"), first = db.records[0], common = db.reviews[0]
  const generated = first.reportFeedback!
  const areas = [...new Set(first.assessment!.criteria.map(c => c.area))]
  const rows = generated.split("\n").slice(0, -1).map((line, i) => {
    const max = first.assessment!.criteria.filter(c => c.area === areas[i]).reduce((n, c) => n + c.max, 0)
    return line.replace(": ", "(" + first.aiScores![areas[i]] + "/" + max + "점): ")
  })
  first.reportFeedback = ["《" + common.bookTitle + "》을/를 읽고 1차 독후감을 작성하였습니다. 영역별 평가 내용은 다음과 같습니다.", ...rows].join("\n")
  assert.equal(hydrateLegacyReviewFeedback(db).records[0].reportFeedback, generated)
  first.history.push({ action: "save-feedback", requestId: "teacher-save", actor: "선생님", at: "2026-11-24T00:00:00Z" })
  assert.equal(hydrateLegacyReviewFeedback(db).records[0].reportFeedback, first.reportFeedback)
})
test("이어보기 문단은 온전한 구절을 인용하고 생략 표시가 응답과 편집용 결과에 남는다", () => {
  const db = fixture("continuous"), common = db.reviews[0], first = db.records[0]
  const intro = "두 친구가 서로를 이해하게 될지 궁금해 이 책을 골랐습니다."
  const source = "쥐와 다람쥐는 생김새와 생활 방식이 달라 처음에는 서로를 오해합니다. 하지만 함께 시간을 보내며 상대의 행동에는 저마다 이유가 있다는 것을 알게 되고, 다름을 인정하며 가까워집니다."
  const record = { ...ungraded(db.records[1]), finalBody: intro + "\n\n" + source }
  const raw = mockReviewAi(prepareReviewAiRequest(common, record, first, materials))
  const output = parseReviewAiResponse(raw, common, record).feedback!
  const expected = "▷ 2문단: ‘쥐와 다람쥐는 생김새와 생활 방식이 달라 처음에는 서로를 오해합니다. ... 다름을 인정하며 가까워집니다.’"
  assert.ok(raw.includes(expected) && output.includes(expected))
  const quoted = "선생님은 “다름을 인정하자”고 말씀하셨습니다. " + source
  const one = mockReviewAi(prepareReviewAiRequest(common, { ...record, finalBody: quoted }, first, materials))
  assert.ok(one.includes("▷ ‘" + quoted + "’"))
})
