import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node test runner loads TS sources directly.
import { proBookPresentation, proRemainingText, proRequestFailure, proRolloverText, proSecondDeadlineText, proStudentDate, proStudentDeadline, proSummaryText, studentProCopy } from "../src/lib/student-pro-presentation.ts"
import { readFileSync } from "node:fs"
// @ts-expect-error Node test runner loads TS sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node test runner loads TS sources directly.
import { studentProView } from "../src/lib/pro-selectors.ts"

const fixture = () => studentProView(initializePro(emptyReviewDatabase()), "pro-demo-1")!
const book = (view: ReturnType<typeof fixture>) => view.cases.find(c => c.reviewId === "review-pro-apply-b")!
test("확인창 이후 잠금·마감이 바뀌면 최신 상태에 따른 취소 실패 안내", () => {
  const view = fixture(), c = book(view)
  c.locked = true
  assert.equal(proRequestFailure(view, c.reviewId, "cancel", "서버 오류"), "선생님이 피드백 작성을 시작했어요. 신청을 취소할 수 없어요.")
  c.locked = false; view.now = c.cutoff
  assert.equal(proRequestFailure(view, c.reviewId, "cancel", "서버 오류"), "신청 마감이 지나 취소할 수 없어요.")
  assert.equal(proRequestFailure(undefined, c.reviewId, "apply", "서버 오류"), "서버 오류")
})
test("학생 날짜는 KST, 자정은 전날 밤 12시, 다른 해는 연도 포함", () => {
  assert.equal(proStudentDate("2026-10-11T14:59:00.000Z", "2026-10-08T01:00:00.000Z"), "10/11(일)")
  assert.equal(proStudentDeadline("2026-10-10T15:00:00.000Z", "2026-10-08T01:00:00.000Z"), "10/10(토) 밤 12시")
  assert.equal(proStudentDeadline("2026-10-31T14:59:00.000Z", "2026-10-08T01:00:00.000Z"), "10/31(토) 오후 11시 59분")
  assert.equal(proStudentDate("2027-01-01T01:00:00.000Z", "2026-12-30T01:00:00.000Z"), "2027/1/1(금)")
})
test("2차 제출 기한은 네 화면에서 같은 완성 문장과 날짜 형식 사용", () => {
  const reference = "2026-10-15T01:00:00.000Z"
  assert.equal(proSecondDeadlineText("2026-10-31T14:59:00.000Z", reference), "2차 글은 10/31(토) 오후 11시 59분까지 제출해 주세요.")
  assert.equal(proSecondDeadlineText("2026-11-07T15:00:00.000Z", reference), "2차 글은 11/7(토) 밤 12시까지 제출해 주세요.")
  assert.equal(proSecondDeadlineText("2027-01-31T14:59:00.000Z", reference), "2차 글은 2027/1/31(일) 오후 11시 59분까지 제출해 주세요.")
})
test("목록·진입 모달·1차 피드백 확인·2차 작성은 공통 제출 기한 문구 연결", () => {
  for (const file of ["second-review-start-modal.tsx", "student-review-records.tsx", "pro-feedback-status.tsx"]) {
    const source = readFileSync(new URL(`../src/components/student/${file}`, import.meta.url), "utf8")
    assert.match(source, /proSecondDeadlineText\(/, file)
    assert.doesNotMatch(source, /제출 기한:|2차 글은 (?:\{|\$\{)/, file)
  }
  const flow = readFileSync(new URL("../src/components/student/student-review-flow.tsx", import.meta.url), "utf8")
  assert.equal((flow.match(/<ProSecondDeadline\b/g) ?? []).length, 2)
})
test("요약 우선순위: 로딩, 오류, 배정 전, 월 소진, 마감, 신청 가능 권수", () => {
  const view = fixture()
  assert.equal(proSummaryText(view, false, "오류"), "피드백 신청 가능 권수를 확인하고 있어요.")
  assert.equal(proSummaryText(view, true, "오류"), "피드백 정보를 불러오지 못했어요. 다시 확인해 주세요.")
  view.assigned = false; view.usage.used = view.usage.limit
  assert.equal(proSummaryText(view), "아직 피드백을 신청할 수 없어요. 선생님에게 물어보세요.")
  view.assigned = true; view.now = view.cutoff
  assert.equal(proSummaryText(view), "이번 달 피드백 이용 권수를 모두 썼어요.")
  view.usage.used = 0
  assert.equal(proSummaryText(view), "이번 주 피드백 신청이 끝났어요.")
  view.now = "2026-10-08T01:00:00.000Z"; view.usage.available = 0
  assert.equal(proSummaryText(view), "지금은 피드백을 신청할 수 있는 권수가 없어요.")
  view.usage.available = 2
  assert.equal(proSummaryText(view), "피드백을 신청할 독후감을 골라 주세요.")
  view.usage.available = 1
  assert.equal(proSummaryText(view), "피드백을 신청할 독후감을 골라 주세요.")
})
test("자동 선정 후보도 학생에게는 신청 가능으로 표시하며 서버 판정 유지", () => {
  const view = fixture(), c = book(view)
  c.autoExpected = true; c.canApply = true
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 신청 가능")
  assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, "피드백 신청 가능")
  c.autoExpected = false; c.canApply = false
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 신청 가능")
  assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, "피드백 신청 가능")
  assert.equal(proBookPresentation(view, c.reviewId)?.enabled, false)
})
test("신청 완료와 선생님 작성 중 구분, 학생 신청만 마감 전 취소 버튼", () => {
  const view = fixture(), c = book(view)
  c.selected = true; c.selection = "학생 신청"; c.canCancel = true
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 대기")
  assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, "피드백 대기")
  assert.equal(proBookPresentation(view, c.reviewId)?.action, "cancel")
  c.locked = true
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 작성 중")
  assert.equal(proBookPresentation(view, c.reviewId)?.action, undefined)
  c.locked = false; c.selection = "선생님 지정"
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 대기")
  assert.equal(proBookPresentation(view, c.reviewId)?.action, undefined)
  c.selection = "학생 신청"; view.now = c.cutoff
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 대기")
})
test("권수 부족은 목록 상태를 추가하지 않고 상세에서 신청 비활성 사유 유지", () => {
  const view = fixture(), c = book(view)
  view.usage.available = 0; view.usage.selected = 1
  view.cases.find(item => item.reviewId !== c.reviewId)!.canCancel = true
  const state = proBookPresentation(view, c.reviewId)!
  assert.equal(state.status, "지금은 피드백을 신청할 수 있는 권수가 없어요.")
  assert.equal(state.listStatus, null)
  assert.equal(state.action, "apply")
  assert.equal(state.enabled, false)
  assert.equal(state.guide, "다음 주에 신청 가능한 권수를 다시 확인해 주세요.")
  c.changeCandidates = ["review-pro-apply-a"]
  assert.equal(proBookPresentation(view, c.reviewId)?.action, "change")
  assert.equal(proBookPresentation(view, c.reviewId)?.guide, "신청한 독후감 대신 이 글로 바꿀 수 있어요.")
  view.usage.used = view.usage.limit
  assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, null)
  assert.equal(proBookPresentation(view, c.reviewId)?.guide, "이번 달 피드백 이용 권수를 모두 썼어요.")
})
test("미선정 마감, 다음 주, 배정 전, 전송 완료의 표시와 버튼", () => {
  const view = fixture(), c = book(view)
  view.now = c.cutoff
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "신청 마감")
  assert.equal(proBookPresentation(view, c.reviewId)?.action, undefined)
  view.now = "2026-10-08T01:00:00.000Z"; c.week = "2026-10-11T15:00:00.000Z"
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "다음 주 신청")
  assert.equal(proBookPresentation(view, c.reviewId)?.enabled, false)
  view.assigned = false
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "아직 피드백을 신청할 수 없어요. 선생님에게 물어보세요.")
  c.firstSent = true
  assert.equal(proBookPresentation(view, c.reviewId), null)
})

test("권수 부족 안내는 실제 전송 전 선정 글이 있을 때만 피드백 대기를 안내", () => {
  const view = fixture(), c = book(view)
  view.usage.available = 0; view.usage.used = 1
  for (const item of view.cases) item.canCancel = false
  const pending = { ...c, reviewId: "quota-pending", selected: true, firstSent: false, closed: false }
  view.cases = [c, pending]
  const presentation = () => proBookPresentation(view, c.reviewId)!
  assert.equal(presentation().guide, "신청한 글의 피드백을 기다려 주세요.")
  pending.firstSent = true
  assert.equal(presentation().guide, "다음 주에 신청 가능한 권수를 다시 확인해 주세요.")
  pending.firstSent = false; pending.closed = true
  assert.equal(presentation().guide, "다음 주에 신청 가능한 권수를 다시 확인해 주세요.")
  pending.closed = false; pending.selected = false
  assert.equal(presentation().guide, "다음 주에 신청 가능한 권수를 다시 확인해 주세요.")
  assert.equal(presentation().enabled, false)
  assert.equal(presentation().listStatus, null)
  view.usage.used = view.usage.limit
  assert.equal(presentation().guide, studentProCopy.monthUsed)
})

test("신청 가능 상태는 행동 안내, 권수는 목록·상세·제출 안내의 별도 문구로 표시", () => {
  assert.equal(proRemainingText(1), "이번 주 남은 신청 권수 1권")
  assert.equal(proRemainingText(3), "이번 주 남은 신청 권수 3권")
  const source = readFileSync(new URL("../src/components/student/pro-feedback-status.tsx", import.meta.url), "utf8")
  assert.doesNotMatch(source, /proAvailableText/)
  assert.match(source, /proRemainingText\(view\.usage\.available\)/)
  assert.equal(studentProCopy.summaryTitle, "이번 주 선생님 피드백")
})

test("이월 안내는 현재 남은 신청 권수에 포함된 이월분만 괄호로 표시", () => {
  assert.equal(proRolloverText({ available: 2, rolloverAvailable: 1 }), "(지난주에서 넘어온 1권 포함)")
  assert.equal(proRolloverText({ available: 3, rolloverAvailable: 2 }), "(지난주에서 넘어온 2권 포함)")
  assert.equal(proRolloverText({ available: 1, rolloverAvailable: 0 }), "")
  assert.equal(proRolloverText({ available: 0, rolloverAvailable: 0 }), "")
  assert.equal(proRolloverText({ available: 0, rolloverAvailable: 1 }), "")
})

test("상세와 공통 신청 모달도 같은 잔여 이월 문구를 권수 옆 한 줄에 표시", () => {
  const source = readFileSync(new URL("../src/components/student/pro-feedback-status.tsx", import.meta.url), "utf8")
  const modal = readFileSync(new URL("../src/components/student/pro-feedback-modal.tsx", import.meta.url), "utf8")
  const detail = source.slice(source.indexOf("export function ProFeedbackAction"))
  for (const section of [modal, detail]) {
    assert.match(section, /const rollover = proRolloverText\(view\.usage\)/)
    assert.match(section, /className=\{ui.remaining\}>\{proRemainingText\(view\.usage\.available\)\}\{rollover && <span[^>]*>\{rollover\}<\/span>\}/)
  }
  assert.match(modal, /action === "apply" && <p/)
  const css = readFileSync(new URL("../src/components/student/pro-feedback.module.css", import.meta.url), "utf8")
  assert.match(css, /\.remaining\{[^}]*white-space:nowrap/)
})

test("월 이용은 안내 모달에서 사용 권수·한도를 표시하며 아코디언은 제거", () => {
  const source = readFileSync(new URL("../src/components/student/pro-feedback-status.tsx", import.meta.url), "utf8")
  const modal = readFileSync(new URL("../src/components/student/pro-feedback-modal.tsx", import.meta.url), "utf8")
  const usage = modal.slice(modal.indexOf("export function ProFeedbackHelpModal"), modal.indexOf("export function ProFeedbackModal"))
  assert.doesNotMatch(usage, /u\.pending|첫 피드백|대기 권수/)
  assert.match(usage, /월 피드백 이용/)
  assert.match(usage, /\{u\.used\}/)
  assert.match(usage, /\{u\.limit\}/)
  assert.match(usage, /\/ \{u\.limit\}권 사용<\/p>/)
  assert.match(source, /aria-haspopup="dialog"/)
  assert.match(source, /helpOpen && <ProFeedbackHelpModal/)
  assert.doesNotMatch(source, /aria-expanded|setExpanded/)
  assert.match(usage, /<button type="button" onClick=\{onClose\}>확인<\/button>/)
  for (const icon of ["send", "calendarCheck", "rotate", "edit"]) assert.ok(usage.includes(`icon: "${icon}"`))
  assert.match(usage, /<ReviewIcon name=\{icon\} size=\{18\}/)
  const view = fixture(), before = structuredClone(view)
  view.usage.pending = 2
  proSummaryText(view)
  assert.equal(view.usage.pending, 2)
  assert.equal(view.usage.available, before.usage.available)
})

test("이용 안내는 완독·제출, 자동 선정, 신청 변경 제한, 2차 이용을 구분", () => {
  assert.match(studentProCopy.request, /온라인 독후감이 있는 책.*끝까지 읽고.*제출.*목록.*\[피드백 신청\]/)
  assert.match(studentProCopy.selection, /이번 주 신청 가능한 독후감.*최근 제출한 것.*남은 신청 권수/)
  assert.match(studentProCopy.change, /직접 신청한 독후감.*마감 전.*선생님이 피드백 작성을 시작하기 전.*취소하고 바꿀/)
  assert.match(studentProCopy.usage, /선생님이 요청한 2차 독후감.*따로 신청하지 않아도.*추가로 쓰지/)
})
