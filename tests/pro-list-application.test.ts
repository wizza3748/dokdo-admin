import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TS sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TS sources directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TS sources directly.
import { studentProView } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TS sources directly.
import { applyProCommand } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TS sources directly.
import { canRequestProFeedback, proBookPresentation, proListGuidance, proRemainingText, studentProCopy } from "../src/lib/student-pro-presentation.ts"

const fixture = () => {
  const db = initializePro(emptyReviewDatabase())
  db.pro!.clockMode = "test"
  db.studentPro = studentProView(db, "pro-demo-1")!
  return db
}
const withoutEligible = () => {
  const db = fixture()
  db.studentPro!.cases.forEach(c => { c.canApply = false })
  return db
}

test("목록 신청은 제출한 본인의 신청 가능 1차 글만 제공", () => {
  const db = fixture(), view = db.studentPro!
  const record = db.records.find(r => r.reviewId === "review-pro-apply-b" && r.round === 1)!
  assert.equal(canRequestProFeedback(view, record), true)
  assert.equal(canRequestProFeedback(view, { ...record, round: 2 }), false)
  assert.equal(canRequestProFeedback(view, { ...record, writingStatus: "writing" }), false)
  assert.equal(canRequestProFeedback(view, { ...record, reviewId: "not-my-review" }), false)
  view.cases.find(c => c.reviewId === record.reviewId)!.canApply = false
  assert.equal(canRequestProFeedback(view, record), false)
})

test("마감·권수 없음·배정 전·종료에서는 목록 신청과 새 글 안내 차단", () => {
  for (const state of ["closed", "no-slots", "month-used", "unassigned", "ended"] as const) {
    const db = fixture(), view = db.studentPro!
    if (state === "closed") view.now = view.cutoff
    if (state === "no-slots") view.usage.available = 0
    if (state === "month-used") { view.usage.used = view.usage.limit; view.usage.available = 0 }
    if (state === "unassigned") view.assigned = false
    if (state === "ended") view.active = false
    const record = db.records.find(r => r.reviewId === "review-pro-apply-b" && r.round === 1)!
    assert.equal(canRequestProFeedback(view, record), false, state)
    assert.equal(proListGuidance(db), null, state)
  }
})

test("신청 가능한 글이 있으면 독후감 선택 안내 사용, 원본 데이터 보존", () => {
  const db = fixture(), before = structuredClone(db)
  assert.equal(proListGuidance(db), null)
  assert.deepEqual(db, before)
})

test("상단 현황에는 조회 월과 월 변경 동작을 전달하지 않음", () => {
  const page = readFileSync(new URL("../src/components/student/exploration-record.tsx", import.meta.url), "utf8")
  const actions = readFileSync(new URL("../src/components/student/pro-feedback-status.tsx", import.meta.url), "utf8")
  const usage = actions.slice(actions.indexOf("export function ProFeedbackUsage"), actions.indexOf("export function ProFeedbackStatus"))
  const usageProps = page.match(/<ProFeedbackUsage\b[^>]+\/>/)?.[0]
  assert.ok(usageProps)
  assert.doesNotMatch(usageProps, /\bmonth=|onShowMonth/)
  assert.match(usage, /proListGuidance\(db\)/)
  assert.doesNotMatch(usage, /onShowMonth|other-month|guidance\.month/)
  assert.match(usage, /guidance\.description/)
})

test("남은 신청 권수는 0권도 버튼과 독립 표시, 조회 중·실패·배정 전에는 숨김", () => {
  const actions = readFileSync(new URL("../src/components/student/pro-feedback-status.tsx", import.meta.url), "utf8")
  const usage = actions.slice(actions.indexOf("export function ProFeedbackUsage"), actions.indexOf("export function ProFeedbackStatus"))
  assert.match(usage, /ready = loaded && !error && view\.assigned/)
  assert.match(usage, /\{ready && <div[^>]*>\s*<p[^>]*>\{proRemainingText\(u\.available\)\}/)
  assert.match(usage, /const rollover = proRolloverText\(u\)/)
  assert.match(usage, /<p className="whitespace-nowrap font-semibold">[^\n]+\{rollover && <span[^>]*>\{rollover\}<\/span>\}<\/p>/)
  assert.match(usage, /\{guidance && <Link/)
  assert.equal(proRemainingText(0), "이번 주 남은 신청 권수 0권")
  assert.equal(proRemainingText(2), "이번 주 남은 신청 권수 2권")
})

test("이전 달에 만든 글도 이번 주 신청 가능하면 없음 안내로 바뀌지 않음", () => {
  const db = fixture()
  db.studentPro!.cases.forEach(c => { c.canApply = c.reviewId === "review-pro-apply-b" })
  db.reviews.find(r => r.id === "review-pro-apply-b")!.createdAt = "2026-09-30T10:00:00.000Z"
  assert.equal(proListGuidance(db), null)
})

test("신청할 글이 없고 초안이 있으면 최근 저장한 1차 이어쓰기", () => {
  const db = withoutEligible()
  const draft = db.records.find(r => r.reviewId === "review-pro-writing" && r.round === 1)!
  draft.savedAt = "2026-10-08T01:00:00.000Z"
  const review = db.reviews.find(r => r.id === draft.reviewId)!
  const result = proListGuidance(db)!
  assert.equal(result.message, studentProCopy.noReviews)
  assert.equal(result.description, studentProCopy.noReviewsGuide)
  assert.equal(result.label, "독후감 이어쓰기")
  assert.equal(result.href, `/student/online-workbook/${review.sourceWorkbookId}?round=1`)
})

test("신청할 글과 1차 초안이 없으면 책 읽기로 안내, 2차 초안은 제외", () => {
  const db = withoutEligible()
  db.records = db.records.filter(r => r.round !== 1 || r.writingStatus !== "writing")
  const result = proListGuidance(db)!
  assert.equal(result.message, studentProCopy.noReviews)
  assert.equal(result.description, studentProCopy.noReviewsGuide)
  assert.equal(result.label, "책 읽으러 가기")
  assert.equal(result.href, "/reading/index")
})

test("작성 중인 글 유무는 안내 문구를 바꾸지 않고 이동 버튼만 변경", () => {
  const db = withoutEligible()
  const withDraft = proListGuidance(db)!
  db.records = db.records.filter(r => r.round !== 1 || r.writingStatus !== "writing")
  const withoutDraft = proListGuidance(db)!
  assert.equal(withDraft.message, "피드백을 신청할 독후감이 없어요.")
  assert.equal(withDraft.message, withoutDraft.message)
  assert.equal(withDraft.description, "책을 끝까지 읽고 독후감을 제출해 주세요. 작성 중인 독후감이 있다면 이어서 완성해 주세요.")
  assert.equal(withDraft.description, withoutDraft.description)
  assert.notEqual(withDraft.label, withoutDraft.label)
  assert.notEqual(withDraft.href, withoutDraft.href)
})

test("작성 중인 글도 생성월과 무관하게 찾고 가장 최근 저장 글로 연결", () => {
  const db = withoutEligible()
  const draft = db.records.find(r => r.reviewId === "review-pro-writing" && r.round === 1)!
  const review = db.reviews.find(r => r.id === draft.reviewId)!
  db.reviews.push({ ...review, id: "older-month-draft", sourceWorkbookId: "older-month-draft", createdAt: "2026-09-30T10:00:00.000Z" })
  db.records.push({ ...draft, id: "older-month-draft-r1", reviewId: "older-month-draft", savedAt: "2026-10-08T02:00:00.000Z" })
  draft.savedAt = "2026-10-08T01:00:00.000Z"
  assert.equal(proListGuidance(db)!.href, "/student/online-workbook/older-month-draft?round=1")
})

test("월 사용 완료는 남은 권수 값과 무관하게 독후감 없음 안내보다 우선", () => {
  const db = withoutEligible()
  db.studentPro!.usage.used = db.studentPro!.usage.limit
  db.studentPro!.usage.available = 1
  assert.equal(proListGuidance(db), null)
})

test("신청·선정으로 기다리는 상태는 통일하되 취소 권한은 유지", () => {
  const db = fixture(), view = db.studentPro!, c = view.cases.find(c => c.reviewId === "review-pro-apply-b")!
  c.selected = true; c.selection = "학생 신청"; c.canCancel = true
  assert.equal(proBookPresentation(view, c.reviewId)?.status, studentProCopy.waiting)
  assert.equal(proBookPresentation(view, c.reviewId)?.action, "cancel")
  c.selection = "자동 선정"; c.canCancel = false
  assert.equal(proBookPresentation(view, c.reviewId)?.status, studentProCopy.waiting)
  assert.equal(proBookPresentation(view, c.reviewId)?.action, undefined)
  c.locked = true
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 작성 중")
})

test("남은 권수가 0이어도 신청·선정된 글의 피드백 대기와 작성 중 상태 유지", () => {
  const db = fixture(), view = db.studentPro!, c = view.cases.find(c => c.reviewId === "review-pro-apply-b")!
  view.usage.available = 0
  c.selected = true
  for (const selection of ["학생 신청", "자동 선정", "선생님 지정"]) {
    c.selection = selection
    c.locked = false
    assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, "피드백 기다리는 중", selection)
    c.locked = true
    assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, "피드백 작성 중", selection)
  }
  c.firstSent = true
  assert.equal(proBookPresentation(view, c.reviewId), null, "전송 후에는 기존 피드백 확인 표시 사용")
})

test("권수 부족 미선정 글은 목록 배지와 신청 버튼 없이 상세 안내 유지", () => {
  const db = fixture(), view = db.studentPro!
  view.usage.available = 0
  const record = db.records.find(r => r.reviewId === "review-pro-apply-b" && r.round === 1)!
  const state = proBookPresentation(view, record.reviewId)!
  assert.equal(canRequestProFeedback(view, record), false)
  assert.equal(state.listStatus, null)
  assert.equal(state.status, studentProCopy.noSlots)
  assert.equal(state.action, "apply")
  assert.equal(state.enabled, false)
  assert.ok(state.guide)
  const source = readFileSync(new URL("../src/components/student/pro-feedback-status.tsx", import.meta.url), "utf8")
  const badge = source.slice(source.indexOf("export function ProFeedbackStatus"), source.indexOf("export function ProSecondDeadline"))
  assert.match(badge, /if \(!state\?\.listStatus\) return null/)
})

test("목록 신청도 공통 명령으로 권수와 상태를 갱신하고 중복 사용 방지", () => {
  let db = fixture()
  const actor = { role: "student" as const, studentId: "pro-demo-1", name: "학생" }
  const before = db.studentPro!.usage.available
  const command = { type: "apply" as const, reviewId: "review-pro-apply-b" }
  db = applyProCommand(db, command, actor, "list-request")
  const view = studentProView(db, actor.studentId)!
  assert.equal(view.usage.available, before - 1)
  assert.equal(proBookPresentation(view, command.reviewId)?.status, studentProCopy.waiting)
  const repeat = applyProCommand(db, command, actor, "list-request")
  assert.equal(studentProView(repeat, actor.studentId)!.usage.available, before - 1)
})

test("목록과 상세는 같은 확인창과 처리 로직, 성공은 페이지 공통 토스트", () => {
  const actions = readFileSync(new URL("../src/components/student/pro-feedback-status.tsx", import.meta.url), "utf8")
  const list = readFileSync(new URL("../src/components/student/student-review-records.tsx", import.meta.url), "utf8")
  const toast = readFileSync(new URL("../src/components/student/student-toast.tsx", import.meta.url), "utf8")
  assert.match(list, /ProFeedbackAction[^\n]+variant="list"/)
  assert.match(actions, /showToast\(confirm === "apply"/)
  assert.doesNotMatch(actions, /setSuccess|\{success &&/)
  assert.match(actions, /readReviews\("student", undefined, \{ fresh: true \}\)/)
  assert.match(toast, /createPortal/)
  assert.match(toast, /fixed bottom-24 left-1\/2/)
  assert.match(toast, /2000/)
  assert.match(toast, /clearTimeout\(timer.current\)/)
  assert.equal(proRemainingText(2), "이번 주 남은 신청 권수 2권")
})
