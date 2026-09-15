import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node's type stripping uses explicit .ts paths.
import { normalizeReviewFeedbackScope, reviewFeedbackItems, reviewIncludesItemFeedback } from "../src/lib/review-domain.ts"
// Node 24 runs these pure domain tests without a browser, mock server or state-file changes.
// @ts-expect-error Node's type stripping uses explicit .ts paths.
import { applyReviewCommand, assessmentCriteria, canAccessReview, canAwardReview, canRejectReview, canSendReview, createSeededReviewDatabase, expandLegacyReviewScores, hydrateLegacyReviewFeedback, mergeReviewSeeds, emptyReviewDatabase, plainReviewText, reviewProgressLabels, reviewRecordStatus, sampleReviewAi, scoreLabel, sortStudentReviewRecords, studentReviewListAction, studentReviewNotices, studentReviewProgressLabel, studentReviewRecordStatus, validAiScores, validScores, type ReviewActor, type ReviewCommand, type ReviewDatabase, type ReviewSeed } from "../src/lib/review-domain.ts"

test("학생 목록은 같은 독후감의 2차 레코드를 1차보다 먼저 표시한다", () => {
  const rows = [
    { id: "first-a", reviewId: "review-a", round: 1 as const },
    { id: "other", reviewId: "review-b", round: 1 as const },
    { id: "second-a", reviewId: "review-a", round: 2 as const },
  ]
  assert.deepEqual(sortStudentReviewRecords(rows).map(row => row.id), ["second-a", "first-a", "other"])
})

test("전체 상태 정의와 차수별 목록 상태: 2차 처리로 1차 이력이 바뀌지 않는다", () => {
  const f = fixture()
  const progress = () => reviewProgressLabels[f.db.reviews[0].progress]
  const status = (i = 0) => reviewRecordStatus(f.db.reviews[0], f.db.records[i])
  assert.equal(status(), "1차 작성중")
  assert.equal(studentReviewListAction(f.db.reviews[0], f.db.records[0]), "이어서 쓰기")
  f.write(); assert.equal(progress(), "1차 작성완료"); assert.equal(status(), "1차 작성완료")
  assert.equal(studentReviewListAction(f.db.reviews[0], f.db.records[0]), "선생님 확인 중")
  f.save(); assert.equal(progress(), "1차 피드백 작성완료"); assert.equal(status(), "1차 피드백 작성완료")
  assert.equal(studentReviewProgressLabel(f.db.reviews[0].progress), "1차 작성완료")
  assert.equal(studentReviewRecordStatus(f.db.reviews[0], f.db.records[0]), "1차 작성완료")
  f.run({ type: "send", recordId: "qa-r1" }, teacher)
  assert.equal(progress(), "1차 피드백 도착"); assert.equal(status(), "1차 피드백 도착")
  assert.equal(studentReviewListAction(f.db.reviews[0], f.db.records[0]), "피드백 확인하기")
  assert.deepEqual(studentReviewNotices(f.db).map(notice => notice.kind), ["feedback"])
  f.run({ type: "seen", recordId: "qa-r1" }); assert.equal(progress(), "2차 작성가능")
  assert.equal(studentReviewRecordStatus(f.db.reviews[0], f.db.records[0]), "2차 작성가능")
  assert.equal(studentReviewListAction(f.db.reviews[0], f.db.records[0]), "2차 글 시작하기")
  assert.deepEqual(studentReviewNotices(f.db).map(notice => notice.kind), ["writing-request"])
  const beforeSecond = structuredClone(f.db.records[0])
  f.run({ type: "start-second", recordId: "qa-r1" }); assert.equal(progress(), "2차 작성중"); assert.equal(status(1), "2차 작성중")
  assert.equal(studentReviewListAction(f.db.reviews[0], f.db.records[0]), "활동 완료")
  assert.equal(studentReviewListAction(f.db.reviews[0], f.db.records[1]), "이어서 쓰기")
  assert.deepEqual(studentReviewNotices(f.db), [])
  assert.deepEqual(f.db.records[0].history.slice(0, -1), beforeSecond.history)
  const first = structuredClone(f.db.records[0])
  f.write("qa-r2"); assert.equal(progress(), "2차 작성완료"); assert.equal(status(1), "2차 작성완료")
  assert.equal(studentReviewListAction(f.db.reviews[0], f.db.records[1]), "선생님 확인 중")
  f.run({ type: "reject", recordId: "qa-r2" }, teacher)
  assert.equal(progress(), "2차 작성중"); assert.equal(f.db.records[1].id, "qa-r2"); assert.deepEqual(f.db.records[0], first)
  f.write("qa-r2"); f.save("qa-r2"); assert.equal(progress(), "2차 피드백 작성완료"); assert.equal(status(1), "2차 피드백 작성완료")
  f.run({ type: "send", recordId: "qa-r2" }, teacher)
  assert.equal(progress(), "2차 피드백 도착"); assert.equal(status(1), "2차 피드백 도착")
  assert.equal(studentReviewListAction(f.db.reviews[0], f.db.records[1]), "피드백 확인하기")
  f.run({ type: "seen", recordId: "qa-r2" }); assert.equal(progress(), "최종 완료"); assert.equal(status(1), "최종 완료")
  assert.equal(studentReviewListAction(f.db.reviews[0], f.db.records[1]), "활동 완료")
  assert.equal(status(0), "1차 피드백 도착"); assert.deepEqual(f.db.records[0], first)
  const completed = fixture(); completed.write(); completed.save("qa-r1", "complete")
  completed.run({ type: "send", recordId: "qa-r1" }, teacher)
  assert.equal(reviewRecordStatus(completed.db.reviews[0], completed.db.records[0]), "1차 피드백 도착")
  completed.run({ type: "seen", recordId: "qa-r1" })
  assert.equal(reviewRecordStatus(completed.db.reviews[0], completed.db.records[0]), "최종 완료")
})

test("기본 목 데이터는 1차 별도 레코드이며 보고서 가능·불가와 생성 시점을 구분한다", () => {
  const base = fixture(true).db
  const common = { ...base.reviews[0], id: "seed-report", sourceWorkbookId: "seed-report" }
  const input: ReviewSeed = { common, at: "2026-09-01T00:00:00Z", status: "작성완료", answers: ["기억에 남은 장면을 내 경험과 비교했어요.", "다른 사람의 마음을 이해하려고 노력할 거예요."] }
  const seeded = createSeededReviewDatabase([input, { ...input, common: { ...common, id: "seed-before", sourceWorkbookId: "seed-before" }, status: "작성전" }, { ...input, common: { ...common, id: "seed-no-report", sourceWorkbookId: "seed-no-report", template: { ...common.template, reportEnabled: false } } }])
  assert.equal(seeded.records.length, 3)
  assert.ok(seeded.records.every(r => r.round === 1))
  assert.ok(seeded.records[0].report)
  assert.equal(seeded.records[0].report!.score, (seeded.records[0].report!.ai + seeded.records[0].report!.teacher * 2) / 3)
  assert.equal(seeded.records[1].report, undefined)
  assert.equal(seeded.records[2].report, undefined)
  assert.equal(seeded.records[0].aiUsed, 1)
})

test("2차 완료 목 데이터는 1차 보고서와 차수별 처리 이력을 독립 유지한다", () => {
  const common = { ...fixture(true).db.reviews[0], id: "seed-two", sourceWorkbookId: "seed-two" }
  const db = createSeededReviewDatabase([{ common, at: "2026-09-01T00:00:00Z", status: "전송완료", answers: ["처음 생각을 썼어요.", "이유를 더 생각해 보고 싶어요."], secondAnswers: ["첫 글에 경험을 덧붙였어요.", "내가 실천할 방법도 구체적으로 적었어요."], flowers: 15, parentSent: true, seen: true }])
  const [first, second] = db.records
  assert.equal(second.linkedRecordId, first.id)
  assert.notDeepEqual(second.answers, first.answers)
  assert.equal(first.report!.finalScore, undefined)
  assert.ok(Math.abs(second.report!.finalScore! - (first.report!.score + 2 * second.report!.score) / 3) < 1e-10)
  assert.equal(first.flowers, 15)
  assert.equal(second.flowers, 20)
  assert.ok(first.parentSentAt && second.parentSentAt)
  assert.notEqual(first.parentSentAt, second.parentSentAt)
  assert.equal(db.reviews[0].progress, "complete")
  assert.equal(first.aiUsed, 1)
  assert.equal(second.aiUsed, 1)
  for (const record of [first, second]) {
    const generated = sampleReviewAi(db.reviews[0], record)
    assert.equal(record.feedback, generated.feedback)
    assert.match(record.feedback, /\[미션\]/)
    assert.deepEqual(record.itemFeedback, generated.items)
    assert.equal(record.reportFeedback, generated.reportFeedback)
  }
  assert.ok(second.itemFeedback.every(item => item.text.includes("1차 피드백")))
  assert.ok(!first.reportFeedback!.includes("\n\n"))
  assert.equal(second.reportFeedback!.split("\n\n").length, 2)
  assert.match(second.reportFeedback!, /\n\n\[성장 요약\]/)
})

test("기존 보고서 샘플의 빈 줄만 줄이고 선생님 수정 문구는 그대로 보존한다", () => {
  const f = fixture(true); f.write(); f.generate()
  const current = sampleReviewAi(f.db.reviews[0], f.db.records[0]).reportFeedback!
  const oldSample = current.replace(/\n/g, "\n\n")
  const db = structuredClone(f.db)
  db.records[0].reportFeedback = oldSample
  db.records[0].aiDraft!.reportFeedback = oldSample
  const compact = hydrateLegacyReviewFeedback(db)
  assert.equal(compact.records[0].reportFeedback, current)
  assert.equal(compact.records[0].aiDraft!.reportFeedback, current)
  assert.deepEqual(compact.records[0].aiScores, db.records[0].aiScores)
  assert.equal(compact.records[0].aiUsed, db.records[0].aiUsed)
  db.records[0].reportFeedback = "선생님이 직접 수정한 보고서 총평입니다.\n\n이 문단은 그대로 유지합니다."
  db.records[0].aiDraft!.reportFeedback = "선생님이 작성 중인 총평입니다.\n\n편집 내용을 보존합니다."
  assert.deepEqual(hydrateLegacyReviewFeedback(db), db)
})

test("2차 제출 목 데이터는 1차 활동 완료와 2차 선생님 확인 중을 함께 표시한다", () => {
  const common = { ...fixture().db.reviews[0], id: "seed-second-submitted", sourceWorkbookId: "seed-second-submitted" }
  const db = createSeededReviewDatabase([{
    common,
    at: "2026-09-03T00:00:00Z",
    status: "전송완료",
    seen: true,
    secondState: "submitted",
    answers: ["1차 질문", "1차 대답"],
    secondDraftAnswers: ["2차 질문", "2차 대답"],
  }])
  const [first, second] = db.records
  assert.equal(db.reviews[0].progress, "second-submitted")
  assert.equal(studentReviewListAction(db.reviews[0], second), "선생님 확인 중")
  assert.equal(studentReviewListAction(db.reviews[0], first), "활동 완료")
  assert.equal(second.writingStatus, "submitted")
  assert.equal(second.feedbackStatus, "작성전")
  assert.deepEqual(Object.values(second.answers), ["2차 질문", "2차 대답"])
})

test("목 데이터 병합은 기존 진행 건을 덮어쓰지 않고 초기화 데이터는 항상 동일하다", () => {
  const existing = fixture(true).db
  const before = structuredClone(existing)
  const seed: ReviewSeed = { common: { ...existing.reviews[0], id: "seed-new", sourceWorkbookId: "new-source" }, at: "2026-09-01T00:00:00Z", status: "작성완료", answers: ["내 생각을 자세히 적었어요.", "책에서 찾은 근거도 덧붙였어요."] }
  const seeds = createSeededReviewDatabase([seed])
  const merged = mergeReviewSeeds(existing, seeds)
  assert.deepEqual(existing, before)
  assert.deepEqual(merged.records[0], before.records[0])
  assert.equal(merged.reviews.length, 2)
  assert.deepEqual(mergeReviewSeeds(merged, seeds), merged)
  assert.deepEqual(createSeededReviewDatabase([seed]), seeds)
})

test("수정된 기본 샘플은 읽음 이력을 유지하며 교체하고 사용자 편집은 보존한다", () => {
  const common = { ...fixture(true).db.reviews[0], id: "repair-seed", sourceWorkbookId: "repair-source" }
  const seed: ReviewSeed = { common, at: "2026-09-01T00:00:00Z", status: "전송완료", answers: ["기존 샘플의 첫 항목 내용입니다.", "기존 샘플의 두 번째 항목 내용입니다."] }
  const original = createSeededReviewDatabase([seed])
  const viewed = applyReviewCommand(original, { type: "seen", recordId: "repair-seed-r1" }, student, "user-seen", "2026-09-02T00:00:00Z")
  const corrected = { ...createSeededReviewDatabase([{ ...seed, common: { ...common, bookTitle: "수정된 책", template: { ...common.template, id: "actual-template" } }, answers: ["수정된 책에 맞는 첫 항목 내용입니다.", "수정된 책에 맞는 두 번째 항목 내용입니다."] }]), seedVersion: 4 }
  const merged = mergeReviewSeeds(viewed, corrected)
  assert.equal(merged.reviews[0].template.id, "actual-template")
  assert.equal(merged.records[0].seenAt, viewed.records[0].seenAt)
  assert.ok(merged.records[0].history.some(h => h.requestId === "user-seen"))
  const edited = createSeededReviewDatabase([{ ...seed, status: "writing" }])
  const changed = applyReviewCommand(edited, { type: "save-writing", recordId: "repair-seed-r1", stage: "items", itemIndex: 0, answers: { "item-a": "학생이 직접 수정한 내용은 유지합니다." }, body: "" }, student, "user-edit", "2026-09-02T00:00:00Z")
  const preserved = mergeReviewSeeds(changed, corrected)
  assert.deepEqual(preserved.records, changed.records)
  assert.deepEqual(preserved.reviews, changed.reviews)
})

const student: ReviewActor = { role: "student", studentId: "s1", name: "학생" }
const teacher: ReviewActor = { role: "class", institutionId: "i1", classId: "c1", name: "선생님" }
function fixture(reportEnabled = false, rewriteMode: "items" | "continuous" = "continuous") {
  let db: ReviewDatabase = emptyReviewDatabase()
  let sequence = 0
  const run = (command: ReviewCommand, actor = student, key?: string, at?: string) => {
    db = applyReviewCommand(db, command, actor, key ?? `op-${++sequence}`, at ?? "2026-09-07T00:00:00Z")
    return db
  }
  run({ type: "create", common: { id: "qa", sourceWorkbookId: "qa-book", studentId: "s1", studentName: "학생", institutionId: "i1", institution: "기관", classId: "c1", bookTitle: "30번 곰", level: 4, month: "2026-09", template: { id: "t1", title: "인터뷰", reportEnabled, rewriteMode, rewriteGuide: "안내", items: [{ id: "item-a", title: "질문", description: "질문을 써요" }, { id: "item-b", title: "대답", description: "대답을 상상해요" }] } } })
  const write = (id = "qa-r1", edited = false) => {
    const record = db.records.find(r => r.id === id)!
    if (record.stage === "items") {
      run({ type: "save-writing", recordId: id, answers: { "item-a": "이름 대신 번호로 불려서 어떤 마음이 들었나요?", "item-b": "나만의 이름으로 불리고 싶었어요." }, body: "", stage: "items", itemIndex: 1 })
      run({ type: "enter-rewrite", recordId: id })
    }
    if (edited) run({ type: "save-writing", recordId: id, answers: {}, body: db.records.find(r => r.id === id)!.body + "<b>이름을 존중해 주어야 해요.</b>", stage: "rewrite", itemIndex: 1 })
    run({ type: "submit", recordId: id })
  }
  const generate = (id = "qa-r1", mode = "success") => {
    const key = `ai-${++sequence}`
    run({ type: "ai-start", recordId: id }, teacher, key)
    const result = sampleReviewAi(db.reviews[0], db.records.find(r => r.id === id)!)
    if (mode === "missing") result.items.pop()
    run({ type: "ai-result", recordId: id, runId: key, result, error: mode === "failure" ? "실패" : undefined }, teacher)
  }
  const save = (id = "qa-r1", decision: "request" | "complete" = "request") => {
    const record = db.records.find(r => r.id === id)!
    run({ type: "save-feedback", recordId: id, feedback: "인물의 마음을 근거와 함께 잘 표현했어요.", items: record.itemFeedback.map(item => ({ ...item, text: item.text || "학생이 쓴 내용에 이유를 더해 보세요." })), scores: Object.fromEntries(assessmentCriteria(4).map(c => [c.id, c.max])), decision }, teacher)
  }
  return { get db() { return db }, run, write, generate, save }
}

for (const mode of ["items", "continuous"] as const) for (const report of [false, true]) {
  test(`${mode}·보고서 ${report}: 1차·2차 생성/저장/전송은 템플릿의 피드백 범위를 적용한다`, () => {
    const f = fixture(report, mode)
    for (const round of [1, 2]) {
      const id = `qa-r${round}`
      f.write(id)
      f.generate(id)
      const draft = f.db.records.find(r => r.id === id)!.aiDraft!
      assert.equal(draft.items.length, mode === "items" ? 2 : 0)
      assert.equal(Boolean(draft.reportFeedback), report)
      f.save(id)
      const saved = f.db.records.find(r => r.id === id)!
      assert.equal(saved.itemFeedback.length, mode === "items" ? 2 : 0)
      assert.equal(Boolean(saved.report), report)
      assert.ok(canSendReview(f.db.reviews[0], saved))
      f.run({ type: "send", recordId: id }, teacher)
      f.run({ type: "seen", recordId: id })
      if (round === 1) f.run({ type: "start-second", recordId: id })
    }
  })
}

test("이어보기의 오래된 입력은 AI 응답과 저장 요청에서도 제거하고 점수·총평은 유지한다", () => {
  const f = fixture(true); f.write()
  const staleItems = [{ itemId: "item-a", visible: true, text: "짧음" }]
  f.run({ type: "ai-start", recordId: "qa-r1" }, teacher, "scope-ai")
  const result = { ...sampleReviewAi(f.db.reviews[0], f.db.records[0]), items: staleItems }
  f.run({ type: "ai-result", recordId: "qa-r1", runId: "scope-ai", result }, teacher)
  assert.deepEqual(f.db.records[0].aiDraft?.items, [])
  f.run({ type: "save-feedback", recordId: "qa-r1", feedback: result.feedback, reportFeedback: result.reportFeedback, items: staleItems, scores: Object.fromEntries(assessmentCriteria(4).map(c => [c.id, c.max])), decision: "complete" }, teacher)
  assert.deepEqual(f.db.records[0].itemFeedback, [])
  assert.equal(f.db.records[0].feedback, result.feedback)
  assert.equal(f.db.records[0].reportFeedback, result.reportFeedback)
})

test("기존 이어보기의 저장·전송 피드백과 AI 초안은 항목별 내용만 정리한다", () => {
  const f = fixture(true); f.write(); f.generate(); f.save()
  f.run({ type: "send", recordId: "qa-r1" }, teacher)
  const before = structuredClone(f.db)
  const items = [{ itemId: "item-a", visible: true, text: "기존에 전달한 항목별 피드백입니다." }]
  before.records[0].itemFeedback = items
  before.records[0].aiDraft = { feedback: "유지할 총평 초안", reportFeedback: "유지할 보고서 초안", items }
  const expected = structuredClone(before)
  expected.records[0].itemFeedback = []
  expected.records[0].aiDraft!.items = []
  const after = normalizeReviewFeedbackScope(before)
  assert.deepEqual(after, expected)
  assert.deepEqual(before.records[0].itemFeedback, items)
  assert.equal(normalizeReviewFeedbackScope(after), after)
  before.reviews[0].template.rewriteMode = "items"
  assert.equal(normalizeReviewFeedbackScope(before), before)
})

test("피드백 범위는 고쳐쓰기 편집 여부가 아닌 템플릿 기준이며 개별 OFF는 보존한다", () => {
  const f = fixture(false, "items"); f.write()
  const record = f.db.records[0]
  record.rewriteEdited = true
  record.itemFeedback[0] = { itemId: "item-a", visible: false, text: "유지할 비공개 피드백" }
  const result = sampleReviewAi(f.db.reviews[0], record)
  assert.deepEqual(result.items[0], record.itemFeedback[0])
  assert.ok(result.items[1].visible && result.items[1].text.length >= 10)
  const template = { ...f.db.reviews[0].template, rewriteMode: undefined, rewriteGuide: "하나의 글로 완성해요" }
  assert.equal(reviewIncludesItemFeedback(template), false)
  assert.deepEqual(reviewFeedbackItems(template, result.items), [])
})

test("학생 표시 항목은 각각 10자 이상이어야 하며 실패하면 저장 상태를 바꾸지 않는다", () => {
  const f = fixture(false, "items"); f.write()
  const before = structuredClone(f.db)
  for (const text of ["", "123456789", "<b>123456789</b>", "<p>   </p>"]) {
    const items = f.db.records[0].itemFeedback.map((item, index) => ({ ...item, visible: true, text: index === 0 ? text : "충분한 길이의 항목별 피드백입니다." }))
    assert.throws(() => f.run({ type: "save-feedback", recordId: "qa-r1", feedback: "충분한 길이의 총평입니다.", items, decision: "complete" }, teacher), /항목별 피드백을 각각 10자/)
    assert.deepEqual(f.db, before)
  }
  const items = f.db.records[0].itemFeedback.map(item => ({ ...item, visible: true, text: "<b>1234567890</b>" }))
  f.run({ type: "save-feedback", recordId: "qa-r1", feedback: "충분한 길이의 총평입니다.", items, decision: "complete" }, teacher)
  assert.equal(f.db.records[0].feedbackStatus, "작성완료")
})

test("항목별보기의 학생 표시 OFF 항목은 10자 검사에서 제외한다", () => {
  for (const summaryOnly of [false, true]) {
    const f = fixture(false, "items"); f.write()
    const items = f.db.records[0].itemFeedback.map((item, index) => ({ ...item, visible: !summaryOnly && index === 0, text: !summaryOnly && index === 0 ? "1234567890" : "" }))
    f.run({ type: "save-feedback", recordId: "qa-r1", feedback: "충분한 길이의 총평입니다.", items, decision: "complete" }, teacher)
    assert.equal(f.db.records[0].feedbackStatus, "작성완료")
    assert.deepEqual(f.db.records[0].itemFeedback, items)
  }
})

test("피드백 확인과 2차 시작의 반복 요청은 최초 확인일과 기존 작성글을 유지한다", () => {
  const f = fixture(); f.write(); f.save()
  f.run({ type: "send", recordId: "qa-r1" }, teacher)
  f.run({ type: "seen", recordId: "qa-r1" })
  const seenAt = f.db.records[0].seenAt
  f.run({ type: "seen", recordId: "qa-r1" }, student, "seen-again", "2026-09-14T00:00:00Z")
  assert.equal(f.db.records[0].seenAt, seenAt)
  f.run({ type: "start-second", recordId: "qa-r1" })
  const records = structuredClone(f.db.records)
  f.run({ type: "start-second", recordId: "qa-r1" })
  assert.deepEqual(f.db.records, records)
})

test("워크북 교체는 1차 고쳐쓰기 전만 허용하고 재선택 상태와 보고서 정책을 저장한다", () => {
  const f = fixture()
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "items", itemIndex: 0, answers: { "item-a": "작성한 글" }, body: "" })
  assert.throws(() => f.run({ type: "switch-template", recordId: "qa-r1" }, teacher))
  f.run({ type: "switch-template", recordId: "qa-r1" })
  assert.equal(f.db.records[0].templateSelectionPending, true)
  assert.deepEqual(f.db.records[0].answers, {})
  assert.throws(() => f.run({ type: "enter-rewrite", recordId: "qa-r1" }))
  const template = { ...f.db.reviews[0].template, id: "replacement", reportEnabled: true }
  f.run({ type: "switch-template", recordId: "qa-r1", template })
  assert.equal(f.db.reviews[0].template.id, "replacement")
  assert.equal(f.db.reviews[0].reportEnabled, true)
  assert.equal(f.db.records.length, 1)
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "items", itemIndex: 0, answers: { "item-a": "새 글" }, body: "" })
  f.run({ type: "enter-rewrite", recordId: "qa-r1" })
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "items", itemIndex: 0, answers: { "item-a": "새 글" }, body: "" })
  assert.throws(() => f.run({ type: "switch-template", recordId: "qa-r1" }))
})

test("첫 제출 이후 작성 잠금, 반려 시 같은 레코드와 본문 보존", () => {
  const f = fixture(); f.write()
  assert.equal(canRejectReview(f.db.records[0]), true)
  const body = f.db.records[0].body
  assert.throws(() => f.run({ type: "save-writing", recordId: "qa-r1", stage: "rewrite", answers: {}, body: "변경", itemIndex: 0 }))
  f.run({ type: "reject", recordId: "qa-r1" }, teacher)
  assert.equal(f.db.records.length, 1); assert.equal(f.db.records[0].body, body)
  assert.equal(f.db.records[0].writingStatus, "writing")
})

test("고쳐쓰기 변경 저장만 편집 플래그를 설정하고 되돌려도 유지", () => {
  const f = fixture()
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "items", answers: { "item-a": "학생 원문" }, body: "", itemIndex: 0 })
  f.run({ type: "enter-rewrite", recordId: "qa-r1" })
  const body = f.db.records[0].body
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "rewrite", answers: {}, body, itemIndex: 0 })
  assert.equal(f.db.records[0].rewriteEdited, false)
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "rewrite", answers: {}, body: `<b>${body}</b>`, itemIndex: 0 })
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "rewrite", answers: {}, body, itemIndex: 0 })
  assert.equal(f.db.records[0].rewriteEdited, true)
  assert.throws(() => f.run({ type: "save-writing", recordId: "qa-r1", stage: "items", answers: {}, body, itemIndex: 0 }))
})

test("고쳐쓰기 체크리스트는 작성글과 함께 차수별로 저장한다", () => {
  const f = fixture()
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "items", answers: { "item-a": "학생 원문" }, body: "", itemIndex: 0 })
  f.run({ type: "enter-rewrite", recordId: "qa-r1" })
  const body = f.db.records[0].body
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "rewrite", answers: {}, body, itemIndex: 0, rewriteChecklist: [0, 2] })
  assert.deepEqual(f.db.records[0].rewriteChecklist, [0, 2])
  assert.equal(f.db.records[0].rewriteEdited, false)
  assert.throws(() => f.run({ type: "save-writing", recordId: "qa-r1", stage: "rewrite", answers: {}, body, itemIndex: 0, rewriteChecklist: [1, 1] }))
})

test("항목별 고쳐쓰기는 선택한 답변만 수정하고 최종 본문을 다시 구성한다", () => {
  const f = fixture(false, "items")
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "items", answers: { "item-a": "첫 질문", "item-b": "첫 대답" }, body: "", itemIndex: 1 })
  f.run({ type: "enter-rewrite", recordId: "qa-r1" })
  f.run({ type: "save-writing", recordId: "qa-r1", stage: "rewrite", answers: { "item-a": "고친 질문", "item-b": "첫 대답" }, body: "무시할 전체 본문", itemIndex: 1 })
  const record = f.db.records[0]
  assert.deepEqual(record.answers, { "item-a": "고친 질문", "item-b": "첫 대답" })
  assert.equal(record.body, "고친 질문\n\n첫 대답")
  assert.equal(record.rewriteEdited, true)
  f.run({ type: "submit", recordId: "qa-r1" })
  assert.equal(f.db.records[0].finalBody, "고친 질문\n\n첫 대답")
})

for (const edited of [false, true]) test(`2차 최초 진입 분기: 1차 편집 ${edited}`, () => {
  const f = fixture(); f.write("qa-r1", edited); f.save()
  assert.equal(canAwardReview(f.db.records[0]), true)
  f.run({ type: "send", recordId: "qa-r1" }, teacher)
  assert.throws(() => f.run({ type: "start-second", recordId: "qa-r1" }))
  f.run({ type: "seen", recordId: "qa-r1" })
  f.run({ type: "start-second", recordId: "qa-r1" })
  const second = f.db.records[1]
  assert.equal(second.initialStage, edited ? "rewrite" : "items")
  assert.equal(second.body, edited ? f.db.records[0].finalBody : "")
  assert.deepEqual(second.answers, edited ? {} : f.db.records[0].answers)
  assert.equal(second.aiUsed, 0); assert.equal(second.flowers, 0); assert.equal(second.parentSentAt, undefined)
  f.run({ type: "start-second", recordId: "qa-r1" })
  assert.equal(f.db.records.length, 2)
})

test("AI 실패·누락은 차감/입력 변경 없이 반려만 잠금", () => {
  const f = fixture(true, "items"); f.write()
  f.generate("qa-r1", "failure"); f.generate("qa-r1", "missing")
  assert.equal(f.db.records[0].aiUsed, 0); assert.equal(f.db.records[0].aiDraft, undefined)
  assert.equal(canRejectReview(f.db.records[0]), false)
  assert.equal(f.db.records[0].aiHistory.length, 2)
  assert.throws(() => f.save())
})

test("채점 불가는 AI 실패로 기록하고 횟수·점수·피드백 처리 상태를 유지한다", () => {
  const f = fixture(true); f.write()
  f.run({ type: "ai-start", recordId: "qa-r1" }, teacher, "ai-unscorable")
  f.run({ type: "ai-result", recordId: "qa-r1", runId: "ai-unscorable", result: { feedback: "", items: [], unscorableReason: "독후 내용이 없어 채점할 수 없습니다." } }, teacher)
  const record = f.db.records[0]
  assert.equal(record.aiHistory[0].status, "failure")
  assert.match(record.aiHistory[0].reason ?? "", /^채점 불가:/)
  assert.equal(record.aiUsed, 0)
  assert.equal(record.aiScores, undefined)
  assert.equal(record.report, undefined)
  assert.equal(canRejectReview(record), false)
  assert.throws(() => f.save("qa-r1", "complete"))
  assert.equal(canSendReview(f.db.reviews[0], f.db.records[0]), false)
  f.generate()
  f.save("qa-r1", "complete")
  assert.equal(f.db.records[0].aiUsed, 1)
  assert.ok(f.db.records[0].report)
  f.run({ type: "send", recordId: "qa-r1" }, teacher)
  assert.equal(f.db.records[0].feedbackStatus, "전송완료")
})

test("이어보기는 항목별 피드백 없이 총평과 AI 점수 생성·저장이 가능하다", () => {
  const f = fixture(true); f.write()
  f.run({ type: "ai-start", recordId: "qa-r1" }, teacher, "ai-total-only")
  const result = sampleReviewAi(f.db.reviews[0], f.db.records[0])
  assert.deepEqual(result.items, [])
  f.run({ type: "ai-result", recordId: "qa-r1", runId: "ai-total-only", result }, teacher)
  const generated = f.db.records[0]
  assert.equal(generated.aiUsed, 1)
  assert.ok(generated.aiScores)
  assert.ok(generated.aiDraft?.items.every(item => !item.visible && item.text === ""))
  const teacherScores = Object.fromEntries(assessmentCriteria(4).map(c => [c.id, c.max]))
  f.run({ type: "save-feedback", recordId: "qa-r1", feedback: generated.aiDraft!.feedback, items: generated.aiDraft!.items, scores: teacherScores, decision: "request" }, teacher)
  assert.equal(f.db.records[0].feedbackStatus, "작성완료")
  assert.ok(f.db.records[0].itemFeedback.every(item => !item.visible))
  assert.ok(f.db.records[0].report)
})

test("최초 AI 점수 고정, 2회 제한, 미저장 AI 초안 전송 차단", () => {
  const f = fixture(true); f.write(); f.generate(); f.save()
  const scores = structuredClone(f.db.records[0].aiScores)
  assert.equal(canSendReview(f.db.reviews[0], f.db.records[0]), true)
  f.generate()
  assert.deepEqual(f.db.records[0].aiScores, scores)
  assert.equal(canSendReview(f.db.reviews[0], f.db.records[0]), false)
  assert.throws(() => f.generate())
  f.save(); f.run({ type: "send", recordId: "qa-r1" }, teacher)
  assert.throws(() => f.save())
})

test("보고서 생성 가능 스냅샷과 1차 보고서 불변·2차 가중 점수", () => {
  const f = fixture(true); f.write(); f.generate(); f.save()
  const firstReport = structuredClone(f.db.records[0].report)
  f.run({ type: "flower", recordId: "qa-r1", amount: 15 }, teacher)
  f.run({ type: "send", recordId: "qa-r1" }, teacher)
  f.run({ type: "parent", recordId: "qa-r1" }, teacher)
  f.run({ type: "seen", recordId: "qa-r1" }); f.run({ type: "start-second", recordId: "qa-r1" })
  f.write("qa-r2"); f.generate("qa-r2"); f.save("qa-r2")
  assert.deepEqual(f.db.records[0].report, firstReport)
  const second = f.db.records[1]
  assert.equal(second.report!.weightedAi, (firstReport!.ai + second.report!.ai * 2) / 3)
  assert.equal(second.report!.finalScore, (second.report!.weightedAi! + second.report!.weightedTeacher! * 2) / 3)
  assert.equal(f.db.records[0].flowers, 15); assert.equal(second.flowers, 0)
  assert.equal(second.parentSentAt, undefined)
  f.run({ type: "send", recordId: second.id }, teacher); f.run({ type: "seen", recordId: second.id })
  assert.equal(f.db.reviews[0].progress, "complete")
})

test("평가 불가 수동 저장, 1차 종료 결정, 차수별 1회 발송/지급", () => {
  const f = fixture(); f.write()
  assert.equal(canAwardReview(f.db.records[0]), false)
  assert.throws(() => f.run({ type: "flower", recordId: "qa-r1", amount: 5 }, teacher))
  f.save("qa-r1", "complete")
  assert.equal(f.db.records[0].report, undefined)
  f.run({ type: "flower", recordId: "qa-r1", amount: 5 }, teacher, "one-award")
  f.run({ type: "flower", recordId: "qa-r1", amount: 5 }, teacher, "one-award")
  assert.equal(f.db.records[0].history.filter(h => h.action === "flower").length, 1)
  assert.throws(() => f.run({ type: "flower", recordId: "qa-r1", amount: 10 }, teacher))
  assert.throws(() => f.run({ type: "parent", recordId: "qa-r1" }, teacher))
  f.run({ type: "send", recordId: "qa-r1" }, teacher); f.run({ type: "parent", recordId: "qa-r1" }, teacher)
  assert.throws(() => f.run({ type: "parent", recordId: "qa-r1" }, teacher))
  f.run({ type: "seen", recordId: "qa-r1" })
  assert.equal(f.db.reviews[0].progress, "complete")
  assert.throws(() => f.run({ type: "start-second", recordId: "qa-r1" }))
})

test("권한·잘못된 요청·평가 범위·추가 점수 방어", () => {
  const f = fixture(); f.write()
  assert.equal(canAccessReview(f.db.reviews[0], { ...teacher, classId: "other" }), false)
  assert.equal(canAccessReview(f.db.reviews[0], { role: "admin", name: "본사" }), true)
  assert.throws(() => f.run({ type: "reject", recordId: "qa-r1" }, { ...teacher, institutionId: "other" }))
  assert.throws(() => f.run({ type: "reject", recordId: "qa-r1" }, { role: "admin", name: "본사" }))
  const scores = Object.fromEntries(assessmentCriteria(1).map(c => [c.id, c.max]))
  assert.equal(validScores(1, scores), true)
  assert.equal(validScores(1, { ...scores, extra: 100 }), false)
  assert.equal(validScores(1, { ...scores, accuracy: -1 }), false)
  assert.equal(scoreLabel(10), "10"); assert.equal(scoreLabel(10.555), "10.6")
  assert.equal(plainReviewText("<p>첫 문장</p><p>두 번째 &amp; 생각</p>"), "첫 문장\n두 번째 & 생각")
})

test("하위·상위 모두 5개 영역과 9개 기준을 사용하고 이전 목 데이터 총점을 보존한다", () => {
  const criteria = assessmentCriteria(1)
  assert.equal(criteria.length, 9)
  assert.equal(new Set(criteria.map(criterion => criterion.area)).size, 5)
  assert.equal(criteria.reduce((total, criterion) => total + criterion.max, 0), 100)
  assert.ok(criteria.every(criterion => criterion.description.length > 0))
  for (const level of [1, 2, 3, 4, 5, 6]) {
    assert.equal(assessmentCriteria(level).length, 9)
    assert.equal(assessmentCriteria(level).reduce((total, criterion) => total + criterion.max, 0), 100)
  }
  const db = structuredClone(fixture().db)
  db.reviews[0].level = 1
  delete db.records[0].assessment
  db.records[0].aiScores = { summary: 21, reflection: 24, originality: 14, expression: 16 }
  db.records[0].teacherScores = { summary: 30, reflection: 27, originality: 18, expression: 19 }
  const expanded = expandLegacyReviewScores(db)
  const record = expanded.records[0]
  assert.equal(record.assessment?.version, "legacy-4")
  assert.equal(validAiScores(1, record.aiScores, record), true)
  assert.equal(validScores(1, record.teacherScores, record), true)
  assert.deepEqual(record.teacherScores, db.records[0].teacherScores)
  assert.deepEqual(record.legacyAiScores, db.records[0].aiScores)
  assert.ok(Math.abs(Object.values(record.aiScores!).reduce((sum, value) => sum + value, 0) - 75) < .00001)
  assert.ok(Math.abs(Object.values(record.teacherScores!).reduce((sum, value) => sum + value, 0) - 94) < .00001)
  assert.deepEqual(expandLegacyReviewScores(expanded), expanded)
})

test("보고서용 총평은 차수별로 생성하고 선생님 저장값을 유지한다", () => {
  const f = fixture(true); f.write()
  const record = f.db.records[0]
  const generated = sampleReviewAi(f.db.reviews[0], record)
  assert.ok(generated.reportFeedback?.includes("1차 독후감"))
  assert.notEqual(generated.reportFeedback, generated.feedback)
  f.run({ type: "ai-start", recordId: record.id }, teacher, "report-copy")
  f.run({ type: "ai-result", recordId: record.id, runId: "report-copy", result: generated }, teacher)
  const reportFeedback = "선생님이 확인하여 수정한 평가보고서 전용 총평입니다."
  f.run({ type: "save-feedback", recordId: record.id, feedback: generated.feedback, reportFeedback, items: generated.items, scores: Object.fromEntries(assessmentCriteria(4).map(c => [c.id, c.max])), decision: "complete" }, teacher)
  assert.equal(f.db.records[0].reportFeedback, reportFeedback)
  assert.equal(f.db.records[0].feedback, generated.feedback)
  assert.ok(f.db.records[0].report)
  const second = sampleReviewAi(f.db.reviews[0], { ...record, round: 2 })
  assert.ok(second.reportFeedback?.includes("2차 독후감"))
  assert.ok(second.reportFeedback?.includes("[성장 요약]"))
  assert.ok(second.items.every(item => item.text.includes("1차 피드백")))
  const noReport = sampleReviewAi({ ...f.db.reviews[0], reportEnabled: false }, record)
  assert.equal(noReport.reportFeedback, undefined)
})

test("중단된 AI 실행은 시간 초과 후 재실행 가능하고 중복 결과는 거절", () => {
  const f = fixture(); f.write()
  f.run({ type: "ai-start", recordId: "qa-r1" }, teacher, "stale", "2026-09-07T00:00:00Z")
  f.run({ type: "ai-start", recordId: "qa-r1" }, teacher, "retry", "2026-09-07T00:03:00Z")
  assert.equal(f.db.records[0].aiHistory[0].status, "failure")
  assert.throws(() => f.run({ type: "ai-result", recordId: "qa-r1", runId: "stale" }, teacher))
})
