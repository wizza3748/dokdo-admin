import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources.
import { weeklyUsageHelp, weeklyColumnHelp, weeklyTaskHelp, weeklyRecordAppearance, weeklyRecordLegend } from "../src/lib/pro-weekly-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { taskLabels } from "../src/lib/pro-selectors.ts"

test("권수 안내는 대기 중인 글과 추가 신청 권수를 구분하고 계산값을 변경하지 않음", () => {
  const usage = Object.freeze({ pending: 1, available: 2 })
  assert.equal(weeklyUsageHelp(usage), "피드백을 받을 글로 정해진 1권을 제외하고, 2권을 더 신청할 수 있습니다.")
  assert.deepEqual(usage, { pending: 1, available: 2 })
})

test("대기 글이 없거나 신청 가능 권수가 없을 때 각각 맞는 설명 표시", () => {
  assert.equal(weeklyUsageHelp({ pending: 0, available: 3 }), "지금 3권을 추가로 신청할 수 있습니다.")
  for (const pending of [0, 2]) {
    assert.equal(weeklyUsageHelp({ pending, available: 0 }), "현재 추가로 신청할 수 있는 권수가 없습니다.")
  }
})

test("독려 차수 명칭과 권수 설명에 승인된 쉬운 용어 사용", () => {
  assert.equal(taskLabels[2], "1차 제출 독려")
  assert.equal(taskLabels[3], "2차 제출 독려")
  assert.ok(weeklyColumnHelp["피드백 이용 권수"].some((line: string) => line.includes("차감 취소한 건은 제외")))
  assert.ok(weeklyColumnHelp["피드백 이용 권수"].every((line: string) => !line.includes("자리")))
})

test("툴팁은 불필요한 용어 풀이 없이 판단 기준과 다음 행동을 안내", () => {
  assert.equal(weeklyTaskHelp.length,taskLabels.length)
  const reminders = weeklyColumnHelp["제출 독려 현황"].join(" ")
  assert.ok(!reminders.includes("차수"))
  assert.ok(!reminders.includes("독려 횟수"))
  assert.match(reminders,/목요일에 1회, 금요일에 2회/)
  assert.match(reminders,/카톡으로 직접/)
  assert.match(reminders,/보냈어요/)
  assert.match(weeklyColumnHelp["피드백 현황"].join(" "),/온라인 독후감/)
  for (const lines of [...weeklyTaskHelp,...Object.values(weeklyColumnHelp)]) {
    assert.ok(lines.length >= 2 && lines.length <= 5)
    assert.ok(lines.every((line: string) => !line.includes("자리")))
  }
})

test("범례 순서와 문구를 통일하고 현재 주는 처리 상태에서 분리", () => {
  assert.deepEqual(weeklyRecordLegend, ["미제출", "제출 완료", "피드백 전송"])
  const submitted = weeklyRecordAppearance("제출 완료")
  assert.equal(submitted.label, "제출 완료")
  for (const label of ["피드백 전송", "미제출", "-"]) {
    assert.notEqual(submitted.symbol, weeklyRecordAppearance(label).symbol)
    assert.notEqual(submitted.className, weeklyRecordAppearance(label).className)
  }
  assert.ok(weeklyColumnHelp["월 주차별 기록"].some((line: string) => line.startsWith("제출 완료:")))
  assert.ok(weeklyColumnHelp["월 주차별 기록"].every((line: string) => !line.includes("관리함")))
  const help = weeklyColumnHelp["월 주차별 기록"].join(" ")
  assert.match(help, /1차·2차 모두 포함/)
  assert.doesNotMatch(help, /1차 작성글|1차 피드백|제출 편수/)
})

test("주차별 기록은 참고 이미지의 빨강·노랑·초록을 사용하고 기존 아이콘과 빈 주차 표시를 유지", () => {
  assert.deepEqual(weeklyRecordAppearance("제출 완료"), {
    label: "제출 완료", symbol: "↑", className: "border-[#FFC800] bg-[#FFC800] text-white",
  })
  assert.deepEqual(weeklyRecordAppearance("피드백 전송"), {
    label: "피드백 전송", symbol: "✓", className: "border-[#00C040] bg-[#00C040] text-white",
  })
  assert.deepEqual(weeklyRecordAppearance("미제출"), {
    label: "미제출", symbol: "−", className: "border-[#FF3220] bg-[#FF3220] text-white",
  })
  assert.deepEqual(weeklyRecordAppearance("-"), {
    label: "-", symbol: "·", className: "border-slate-200 bg-slate-50 text-slate-500",
  })
})
