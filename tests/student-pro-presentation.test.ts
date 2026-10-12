import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node test runner loads TS sources directly.
import { proBookPresentation, proRequestFailure, proStudentDate, proStudentDeadline, proSummaryText } from "../src/lib/student-pro-presentation.ts"
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
  assert.equal(proStudentDate("2026-10-11T14:59:00.000Z", "2026-10-08T01:00:00.000Z"), "10.11(일)")
  assert.equal(proStudentDeadline("2026-10-10T15:00:00.000Z", "2026-10-08T01:00:00.000Z"), "10.10(토) 밤 12시")
  assert.equal(proStudentDeadline("2026-10-31T14:59:00.000Z", "2026-10-08T01:00:00.000Z"), "10.31(토) 오후 11시 59분")
  assert.equal(proStudentDate("2027-01-01T01:00:00.000Z", "2026-12-30T01:00:00.000Z"), "2027.1.1(금)")
})
test("요약 우선순위: 로딩, 오류, 배정 전, 월 소진, 마감, 신청 가능 권수", () => {
  const view = fixture()
  assert.equal(proSummaryText(view, false, "오류"), "피드백 이용 현황을 확인하고 있어요.")
  assert.equal(proSummaryText(view, true, "오류"), "이용 현황을 불러오지 못했어요. 다시 확인해 주세요.")
  view.assigned = false; view.usage.used = view.usage.limit
  assert.equal(proSummaryText(view), "담당 선생님 배정 중이에요.")
  view.assigned = true; view.now = view.cutoff
  assert.equal(proSummaryText(view), "이번 달 피드백을 모두 받았어요.")
  view.usage.used = 0
  assert.equal(proSummaryText(view), "이번 주 신청이 마감됐어요.")
  view.now = "2026-10-08T01:00:00.000Z"; view.usage.available = 0
  assert.equal(proSummaryText(view), "지금 신청할 수 있는 권수가 없어요.")
  view.usage.available = 2
  assert.equal(proSummaryText(view), "2권 더 신청할 수 있어요.")
})
test("선정 예정과 신청 가능은 별도 상태이며 서버의 신청 가능 값 유지", () => {
  const view = fixture(), c = book(view)
  c.autoExpected = true; c.canApply = true
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 선정 예정")
  assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, "피드백 선정 예정")
  c.autoExpected = false; c.canApply = false
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 신청 가능")
  assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, "피드백 신청 가능")
  assert.equal(proBookPresentation(view, c.reviewId)?.enabled, false)
})
test("신청 완료와 선생님 작성 중 구분, 학생 신청만 마감 전 취소 버튼", () => {
  const view = fixture(), c = book(view)
  c.selected = true; c.selection = "학생 신청"; c.canCancel = true
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 신청 완료")
  assert.equal(proBookPresentation(view, c.reviewId)?.listStatus, "피드백 신청 완료")
  assert.equal(proBookPresentation(view, c.reviewId)?.action, "cancel")
  c.locked = true
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 작성 중")
  assert.equal(proBookPresentation(view, c.reviewId)?.action, undefined)
  c.locked = false; c.selection = "선생님 지정"
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 대상 확정")
  assert.equal(proBookPresentation(view, c.reviewId)?.action, undefined)
  c.selection = "학생 신청"; view.now = c.cutoff
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "피드백 대상 확정")
})
test("권수 부족은 목록에 제출 완료만, 상세에서 신청 비활성 사유", () => {
  const view = fixture(), c = book(view)
  view.usage.available = 0; view.usage.selected = 1
  const state = proBookPresentation(view, c.reviewId)!
  assert.equal(state.listStatus, "제출 완료")
  assert.equal(state.enabled, false)
  assert.equal(state.guide, "다른 글로 바꾸려면 신청한 글을 먼저 취소해 주세요.")
  view.usage.used = view.usage.limit
  assert.equal(proBookPresentation(view, c.reviewId)?.guide, "이번 달 피드백을 모두 받았어요.")
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
  assert.equal(proBookPresentation(view, c.reviewId)?.status, "담당 선생님 배정 중이에요.")
  c.firstSent = true
  assert.equal(proBookPresentation(view, c.reviewId), null)
})
