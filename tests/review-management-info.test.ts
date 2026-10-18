import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewManagementSelectionHelp, reviewManagementStatusPresentation, reviewSelectionHelp, reviewSelectionLabel } from "../src/lib/review-list-presentation.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { resetTodayProDemo } from "../src/lib/pro-today-demo.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { proCaseStatus } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { migrateProRecords, proUsage } from "../src/lib/pro-domain.ts"

test("상세에서 실제 노출되는 모든 관리 상태에 명세와 같은 개별 도움말 제공", () => {
  const messages = {
    "1차 피드백 대기": "학생이 제출한 글의 피드백을 작성하고 학생에게 전송해야 합니다.",
    "1차 피드백 작성 중": "피드백 작업을 시작했으며, 아직 피드백을 저장하지 않은 상태입니다.",
    "1차 전송 대기": "피드백을 저장했지만 아직 학생에게 전송하지 않았습니다.",
    "2차 글 제출 대기": "1차 피드백에서 다시 쓰기를 요청했으며, 학생의 2차 글 제출을 기다리고 있습니다.",
    "2차 피드백 대기": "학생이 제출한 글의 피드백을 작성하고 학생에게 전송해야 합니다.",
    "2차 전송 대기": "피드백을 저장했지만 아직 학생에게 전송하지 않았습니다.",
    "1차 피드백 완료": "1차 피드백 전송이 완료된 상태입니다.",
    "2차 피드백 완료": "2차 피드백 전송이 완료된 상태입니다.",
    "2차 제출 기한 종료": "학생이 기한 안에 2차 글을 제출하지 않아 관리가 종료되었습니다.",
    "미선정": "아직 피드백 대상으로 선정되지 않은 글입니다.",
    "매칭 기관 배정 전": "담당 기관이 아직 배정되지 않은 상태입니다.",
  }
  for (const [label, message] of Object.entries(messages)) {
    assert.deepEqual(reviewManagementStatusPresentation(label).help, [`${label}: ${message}`])
  }
})

test("신규·기존 완료 기록 모두 실제 완료 차수로 표시하며 종료 사유·이용 권수·이력을 보존", () => {
  const db = resetTodayProDemo(emptyReviewDatabase(), "2026-10-16T03:00:00.000Z")
  const pro = db.pro!, c = pro.cases.find(item => item.reviewId === "review-pro-today-second")!
  const member = pro.members.find(item => item.id === c.studentId)!
  c.closedAt = pro.clock
  for (const [reason, expected] of [
    ["1차 완료 전송", "1차 피드백 완료"],
    ["기존 1차 완료", "1차 피드백 완료"],
    ["2차 완료 전송", "2차 피드백 완료"],
    ["기존 2차 완료", "2차 피드백 완료"],
    ["2차 미제출 기한 종료", "2차 제출 기한 종료"],
  ]) {
    c.closeReason = reason
    const before = structuredClone(db), usage = proUsage(pro, member, pro.clock)
    const display = reviewManagementStatusPresentation(proCaseStatus(db, c))
    assert.equal(display.label, expected)
    assert.equal(display.overdue, false)
    assert.deepEqual(db, before)
    assert.deepEqual(proUsage(pro, member, pro.clock), usage)
  }
})

test("실제 기존 기록 승계로 만든 2차 완료 건도 2차 완료로 표시", () => {
  const db = resetTodayProDemo(emptyReviewDatabase(), "2026-10-16T03:00:00.000Z")
  const reviewId = "review-pro-today-second", pro = db.pro!
  const second = db.records.find(item => item.reviewId === reviewId && item.round === 2)!
  second.sentAt = pro.clock
  second.feedbackStatus = "전송완료"
  pro.cases = pro.cases.filter(item => item.reviewId !== reviewId)
  migrateProRecords(db)
  const c = pro.cases.find(item => item.reviewId === reviewId)!
  assert.equal(c.closeReason, "기존 2차 완료")
  const before = structuredClone(db)
  assert.equal(proCaseStatus(db, c), "2차 피드백 완료")
  assert.deepEqual(db, before)
})

test("2차 미저장 피드백 상태와 실제 마감 시각 판정은 바꾸지 않음", () => {
  const db = resetTodayProDemo(emptyReviewDatabase(), "2026-10-16T03:00:00.000Z")
  const pro = db.pro!, c = pro.cases.find(item => item.reviewId === "review-pro-today-second")!
  const second = db.records.find(item => item.reviewId === c.reviewId && item.round === 2)!
  delete second.savedAt
  c.lockedAt = pro.clock
  for (const offset of [-1, 0, 1]) {
    pro.clock = new Date(Date.parse(c.secondDue!) + offset).toISOString()
    const before = structuredClone(db)
    const display = reviewManagementStatusPresentation(proCaseStatus(db, c))
    assert.equal(display.label, "2차 피드백 대기")
    assert.equal(display.overdue, offset > 0)
    assert.deepEqual(db, before)
  }
})

test("상태 문자열의 지연만 분리하고 현재 상태·지연 설명을 함께 제공", () => {
  for (const round of [1, 2]) {
    for (const state of ["전송 대기", "피드백 작성 중", "피드백 대기"]) {
      const label = `${round}차 ${state}`
      for (const overdue of [false, true]) {
        const status = `${label}${overdue ? " · 지연" : ""}`
        const display = reviewManagementStatusPresentation(status)
        assert.equal(display.label, label)
        assert.equal(display.overdue, overdue)
        assert.equal(`${display.label}${display.overdue ? " · 지연" : ""}`, status)
        assert.equal(display.help.length, overdue ? 2 : 1)
        assert.ok(display.help[0].startsWith(`${label}: `))
        assert.equal(display.help.some(line => line.startsWith("지연: ")), overdue)
      }
    }
  }
  assert.deepEqual(reviewManagementStatusPresentation("1차 전송 대기 · 지연").help, [
    "1차 전송 대기: 피드백을 저장했지만 아직 학생에게 전송하지 않았습니다.",
    "지연: 처리 기한이 지났지만 아직 학생에게 피드백을 전송하지 않았습니다.",
  ])
})

test("완료·제출 대기·기한 종료·미선정·배정 전 상태에 임의로 지연을 추가하지 않음", () => {
  for (const status of ["1차 피드백 완료", "2차 피드백 완료", "2차 글 제출 대기", "2차 제출 기한 종료", "미선정", "매칭 기관 배정 전"]) {
    const display = reviewManagementStatusPresentation(status)
    assert.equal(display.label, status)
    assert.equal(display.overdue, false)
    assert.equal(display.help.length, 1)
    assert.ok(display.help[0].startsWith(`${status}: `))
  }
})

test("선정 방식 도움말은 기존 목록 설명을 재사용하고 미확인 경로를 추정하지 않음", () => {
  for (const selection of ["student", "auto", "teacher", "migration", undefined] as const) {
    const label = reviewSelectionLabel(selection)
    assert.deepEqual(reviewManagementSelectionHelp(label), [reviewSelectionHelp.find(line => line.startsWith(`${label}: `))])
  }
  assert.deepEqual(reviewManagementSelectionHelp("미선정"), ["미선정: 아직 피드백 대상으로 선정되지 않은 글입니다."])
})

test("기존 판정 결과를 그대로 표시하며 실제 마감 경계·완료 상태·저장 데이터 보존", () => {
  const db = resetTodayProDemo(emptyReviewDatabase(), "2026-10-16T03:00:00.000Z")
  const pro = db.pro!, c = pro.cases.find(item => item.reviewId === "review-pro-today-overdue")!
  assert.ok(c)
  const record = db.records.find(item => item.reviewId === c.reviewId && item.round === 1)!
  assert.ok(record.savedAt)
  for (const offset of [-1, 0, 1]) {
    pro.clock = new Date(Date.parse(c.due) + offset).toISOString()
    const before = structuredClone(db), status = proCaseStatus(db, c)
    const display = reviewManagementStatusPresentation(status)
    assert.equal(display.label, "1차 전송 대기")
    assert.equal(display.overdue, offset > 0)
    assert.deepEqual(db, before)
  }
  c.closedAt = pro.clock
  c.closeReason = "1차 완료 전송"
  record.sentAt = pro.clock
  const before = structuredClone(db), display = reviewManagementStatusPresentation(proCaseStatus(db, c))
  assert.equal(display.label, "1차 피드백 완료")
  assert.equal(display.overdue, false)
  assert.deepEqual(db, before)
})

test("기관 상세만 공통 배지·클릭 도움말로 표시하고 기존 판정 함수를 유지", () => {
  const ui = readFileSync(new URL("../src/components/online-workbooks/review-teacher-detail.tsx", import.meta.url), "utf8")
  const agency = ui.split('aria-label="프로 관리 항목"')[1]?.split('</div>}')[0]
  assert.ok(agency)
  assert.match(ui, /proCaseStatus\(hook\.db, proCase\)/)
  assert.match(ui, /reviewManagementStatusPresentation\(managementStatus\)/)
  assert.match(agency, /<ProBadge tone="blue" className="bg-blue-700 text-white">프로 관리<\/ProBadge>/)
  assert.match(agency, /<ProBadge tone="blue" className="bg-blue-100">\{managementStatusDisplay\.label\}<\/ProBadge>/)
  assert.match(agency, /managementStatusDisplay\.overdue && <ProBadge tone="red">지연<\/ProBadge>/)
  assert.match(agency, /<ProHelp label="관리 상태 안내" lines=\{managementStatusDisplay\.help\}/)
  assert.match(agency, /<ProHelp label="선정 방식 안내" lines=\{reviewManagementSelectionHelp\(managementSelection\)\}/)
})
