import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TypeScript sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { studentProView } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { applyProCommand, applyManagedReviewCommand } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { canRequestProFeedback, consumeProSubmissionPrompt, proRequestFailure } from "../src/lib/student-pro-presentation.ts"

const fixture = () => {
  const db = initializePro(emptyReviewDatabase())
  db.pro!.clockMode = "test"
  return db
}
const submission = () => {
  const db = fixture(), view = studentProView(db, "pro-demo-1")!
  const record = db.records.find(r => r.reviewId === "review-pro-apply-b" && r.round === 1)!
  const values = new Map([[`pro-submit-prompt:${record.reviewId}`, "1"]])
  const storage = { getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => { values.delete(key) } }
  return { db, view, record, storage }
}

test("제출 직후는 목록과 동일한 신청 조건을 사용하고 토스트·자동 모달은 한 번만", () => {
  const { view, record, storage } = submission()
  const before = structuredClone(view)
  assert.equal(canRequestProFeedback(view, record), true)
  assert.deepEqual(consumeProSubmissionPrompt(storage, view, record), { message: "독후감을 제출했어요.", openApplication: true })
  assert.equal(consumeProSubmissionPrompt(storage, view, record), null)
  assert.deepEqual(view, before, "모달을 여는 것만으로 신청하지 않음")
})

test("신청할 수 없는 제출은 제출 토스트만 표시하고 재진입 시 모달을 열지 않음", () => {
  for (const reason of ["no-slots", "unassigned", "closed", "next-week", "ended", "selected"] as const) {
    const { view, record, storage } = submission()
    const c = view.cases.find(item => item.reviewId === record.reviewId)!
    if (reason === "no-slots") view.usage.available = 0
    if (reason === "unassigned") view.assigned = false
    if (reason === "closed") view.now = c.cutoff
    if (reason === "next-week") c.week = "2099-01-01T15:00:00.000Z"
    if (reason === "ended") view.active = false
    if (reason === "selected") { c.selected = true; c.canApply = false }
    assert.deepEqual(consumeProSubmissionPrompt(storage, view, record), { message: "독후감을 제출했어요.", openApplication: false }, reason)
    assert.equal(consumeProSubmissionPrompt(storage, view, record), null, reason)
  }
})

test("조회 전·미제출·2차 작성은 제출 직후 신규 신청 진입으로 처리하지 않음", () => {
  const { view, record, storage } = submission()
  assert.equal(consumeProSubmissionPrompt(storage, undefined, record), null)
  assert.equal(consumeProSubmissionPrompt(storage, view, { ...record, writingStatus: "writing" }), null)
  assert.equal(consumeProSubmissionPrompt(storage, view, { ...record, round: 2 }), null)
  assert.equal(consumeProSubmissionPrompt(storage, view, undefined), null)
  assert.equal(consumeProSubmissionPrompt(storage, view, record)?.openApplication, true)
})

test("실제 1차 제출 결과는 작성글을 보존하고 신청 가능할 때만 공통 모달로 연결", () => {
  const actor = { role: "student" as const, studentId: "pro-demo-1", name: "학생" }
  for (const hasSlots of [true, false]) {
    let db = fixture()
    if (!hasSlots) db = applyProCommand(db, { type: "apply", reviewId: "review-pro-apply-a" }, actor, "use-a")
    if (!hasSlots) db = applyProCommand(db, { type: "apply", reviewId: "review-pro-apply-b" }, actor, "use-b")
    db = applyManagedReviewCommand(db, { type: "submit", recordId: "review-pro-writing-r1" }, actor, "submit", db.pro!.clock)
    const record = db.records.find(r => r.id === "review-pro-writing-r1")!
    const view = studentProView(db, actor.studentId)!
    const key = `pro-submit-prompt:${record.reviewId}`
    const values = new Map([[key, "1"]])
    const storage = { getItem: (id: string) => values.get(id) ?? null, removeItem: (id: string) => { values.delete(id) } }
    const before = structuredClone(db)
    assert.equal(record.writingStatus, "submitted")
    assert.deepEqual(consumeProSubmissionPrompt(storage, view, record), { message: "독후감을 제출했어요.", openApplication: hasSlots })
    assert.deepEqual(db, before)
  }
})

test("세 진입점은 하나의 신청·취소 모달과 처리 함수를 사용", () => {
  const actions = readFileSync(new URL("../src/components/student/pro-feedback-status.tsx", import.meta.url), "utf8")
  const flow = readFileSync(new URL("../src/components/student/student-review-flow.tsx", import.meta.url), "utf8")
  assert.equal(actions.match(/<ConfirmModal\b/g)?.length, 1)
  assert.equal(actions.match(/<ProFeedbackModal\b/g)?.length, 1)
  assert.equal(actions.match(/await commandPro\(/g)?.length, 1)
  assert.match(actions, /variant !== "detail" \|\| !submitted/)
  assert.match(actions, /consumeProSubmissionPrompt\(sessionStorage, view, record\)/)
  assert.match(actions, /if \(prompt.openApplication\) setConfirm\("apply"\)/)
  assert.doesNotMatch(actions + flow, /\bProSubmissionPrompt\s*\(|<ProSubmissionPrompt|다른 글 고르기|이 글로 신청|title="독후감을 제출했어요"/)
  assert.match(actions, /cancelLabel=\{action === "apply" \? "돌아가기" : "유지하기"\}/)
  assert.match(actions, /confirmLabel=\{action === "apply" \? "신청하기" : "신청 취소"\}/)
  assert.match(actions, /studentProCopy.cancelNotice/)
  assert.match(actions, /if \(!confirm \|\| pending.current\) return/)
  assert.match(flow, /if \(!submitted\) sessionStorage.removeItem/)
})

test("신청·취소 확정은 권수와 상태를 갱신하되 작성글·제출 이력은 유지", () => {
  const actor = { role: "student" as const, studentId: "pro-demo-1", name: "학생" }
  let db = fixture()
  const original = structuredClone(db.records)
  const before = studentProView(db, actor.studentId)!.usage.available
  db = applyProCommand(db, { type: "apply", reviewId: "review-pro-apply-b" }, actor, "modal-apply")
  assert.equal(studentProView(db, actor.studentId)!.usage.available, before - 1)
  db = applyProCommand(db, { type: "cancel", reviewId: "review-pro-apply-b" }, actor, "modal-cancel")
  assert.equal(studentProView(db, actor.studentId)!.usage.available, before)
  assert.deepEqual(db.records, original)
})

test("취소 모달을 연 뒤 선생님 작성 시작·마감 시 서버가 거절하고 정확한 사유 안내", () => {
  const actor = { role: "student" as const, studentId: "pro-demo-1", name: "학생" }
  const teacher = { role: "agency" as const, institutionId: "dokdo", name: "선생님" }
  for (const reason of ["locked", "closed"] as const) {
    let db = applyProCommand(fixture(), { type: "apply", reviewId: "review-pro-apply-b" }, actor, "modal-apply")
    if (reason === "locked") db = applyManagedReviewCommand(db, { type: "save-feedback", recordId: "review-pro-apply-b-r1", feedback: "생각을 잘 표현했어요.", items: [], decision: "complete" }, teacher, "modal-lock", db.pro!.clock)
    else db.pro!.clock = studentProView(db, actor.studentId)!.cutoff
    const before = structuredClone(db)
    assert.throws(() => applyProCommand(db, { type: "cancel", reviewId: "review-pro-apply-b" }, actor, "modal-cancel"))
    assert.deepEqual(db, before)
    assert.equal(proRequestFailure(studentProView(db, actor.studentId), "review-pro-apply-b", "cancel", "오류"), reason === "locked" ? "선생님이 피드백 작성을 시작했어요. 신청을 취소할 수 없어요." : "신청 마감이 지나 취소할 수 없어요.")
  }
})
