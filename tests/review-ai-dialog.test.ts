import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node's type stripping uses explicit .ts paths.
import { reviewAiDialogCopy } from "../src/lib/review-ai-dialog.ts"

test("최초 생성 확인 모달은 실행 전에 열리고 보고서 대상에게 점수 안내를 더한다", () => {
  const first = reviewAiDialogCopy(0, true)
  assert.equal(first.kind, "first")
  assert.equal(first.confirmable, true)
  assert.deepEqual(first.lines, [
    "AI가 피드백 초안을 생성합니다. (남은 횟수: 2회)",
    "AI 생성에 성공하면 사용 횟수가 차감됩니다.",
    "생성 결과는 저장하지 않고 화면을 나가면 피드백에 반영되지 않습니다.",
    "※ 확인을 누르면 해당 차수 학생 반려는 불가합니다.",
    "AI가 학생 작성글에 대한 평가 점수를 생성합니다.",
    "AI 평가 점수는 최초 1회만 생성하며, 선생님 평가 점수는 직접 입력해야 합니다.",
  ])
  assert.equal(reviewAiDialogCopy(0, false).lines.length, 4)
})

test("재생성 확인 모달은 이전 내용 교체와 1회 잔여를 안내한다", () => {
  const second = reviewAiDialogCopy(1, true)
  assert.equal(second.kind, "regenerate")
  assert.equal(second.confirmable, true)
  assert.deepEqual(second.lines, [
    "기존 작성 내용을 새로 생성한 내용으로 변경하시겠습니까? (남은 횟수: 1회)",
    "※ 확인 후 생성된 이전 내용은 되돌릴 수 없습니다. 필요한 내용은 별도로 저장해 주세요.",
    "AI 생성에 성공하면 사용 횟수가 차감됩니다.",
    "생성 결과는 저장하지 않고 화면을 나가면 피드백에 반영되지 않습니다.",
  ])
})

test("2회 사용 후에는 실행 버튼 대신 횟수 초과 안내만 보여준다", () => {
  const limit = reviewAiDialogCopy(2, true)
  assert.equal(limit.kind, "limit")
  assert.equal(limit.confirmable, false)
  assert.deepEqual(limit.lines, ["AI 피드백 생성 기능은 차수별 최대 2회까지만 이용할 수 있습니다."])
})
