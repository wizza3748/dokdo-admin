import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node's type stripping uses explicit .ts paths.
import { reviewAiDialogCopy } from "../src/lib/review-ai-dialog.ts"

test("최초 생성 확인 모달은 실행 전에 열리고 보고서 대상에게 점수 안내를 더한다", () => {
  const first = reviewAiDialogCopy(0, true, true)
  assert.equal(first.kind, "first")
  assert.equal(first.confirmable, true)
  assert.deepEqual(first.lines, [
    "AI 피드백을 생성하시겠습니까?",
    "[학생용] 총평과, 학생에게 표시하도록 설정된 항목별 피드백 초안이 생성됩니다.",
    "AI 평가 점수와 [보고서용] 총평도 함께 생성됩니다.",
    "AI 평가 점수는 처음 1회만 생성되며, 선생님 평가 점수는 직접 입력해 주세요.",
    "",
    "사용 0/2회 (생성에 성공하면 1회 차감됩니다)",
    "",
    "※ 생성에 성공하면 이번 차수 제출물은 학생에게 반려할 수 없습니다.",
    "※ 생성 결과는 저장해야 피드백에 반영됩니다. 저장하지 않고 나가면 반영되지 않습니다."
  ])
  assert.deepEqual(reviewAiDialogCopy(0, false, false).lines, [first.lines[0], "[학생용] 총평 초안이 생성됩니다.", ...first.lines.slice(4)])
})

test("재생성 확인 모달은 이전 내용 교체와 1회 잔여를 안내한다", () => {
  const second = reviewAiDialogCopy(1, true, true)
  assert.equal(second.kind, "regenerate")
  assert.equal(second.confirmable, true)
  assert.deepEqual(second.lines, [
    "AI 피드백을 다시 생성하시겠습니까?",
    "[학생용] 총평과, 학생에게 표시하도록 설정된 항목별 피드백이 새로 생성됩니다.",
    "[보고서용] 총평도 함께 다시 생성됩니다.",
    "AI 평가 점수와 선생님 평가 점수는 그대로 유지됩니다.",
    "",
    "사용 1/2회 (생성에 성공하면 1회 차감되며, 마지막 생성입니다)",
    "",
    "※ 이전 피드백은 직접 수정한 내용까지 모두 바뀌며 되돌릴 수 없습니다. 필요한 내용은 미리 복사해 두세요.",
    "※ 생성 결과는 저장해야 피드백에 반영됩니다. 저장하지 않고 나가면 반영되지 않습니다."
  ])
})

test("2회 사용 후에는 실행 버튼 대신 횟수 초과 안내만 보여준다", () => {
  const limit = reviewAiDialogCopy(2, true, false)
  assert.equal(limit.kind, "limit")
  assert.equal(limit.confirmable, false)
  assert.deepEqual(limit.lines, ["AI 피드백 생성 기능은 차수별 최대 2회까지만 이용할 수 있습니다."])
})

test("이어보기 생성·재생성 안내는 항목별 피드백을 안내하지 않는다", () => {
  for (const used of [0, 1]) for (const report of [false, true]) {
    const text = reviewAiDialogCopy(used, report, false).lines.join("\n")
    assert.ok(text.includes("[학생용] 총평"))
    assert.ok(!text.includes("항목별"))
    assert.equal(text.includes("[보고서용] 총평"), report)
    assert.ok(!text.includes("범위를 선택"))
  }
})
