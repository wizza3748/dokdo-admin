import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import type { ProCase } from "../src/lib/pro-types"
// @ts-expect-error Node tests load TypeScript sources directly.
import { agencyReviewColumns, hiddenReviewColumnNames, legacyAgencyReviewColumns, matchesReviewAudience, matchesReviewSelection, reviewAudienceFromParams, reviewAudienceHelp, reviewFiltersOpen, reviewManagementWeekLabel, reviewProPresentation, reviewSelectionFilter, reviewSelectionFilterOptions, reviewSelectionLabel, reviewStatusForSelection, reviewStatusLocked } from "../src/lib/review-list-presentation.ts"

const now = "2026-10-14T03:00:00.000Z"
const selected: ProCase = {
  reviewId: "review", studentId: "student", institutionId: "agency", teacherId: "teacher",
  week: "2026-10-04T15:00:00.000Z", month: "2026-10", weekday: 7,
  cutoff: "2026-10-10T15:00:00.000Z", due: "2026-10-11T14:59:59.999Z",
  remind1: "2026-10-07T15:00:00.000Z", remind2: "2026-10-08T15:00:00.000Z",
  selectedAt: "2026-10-05T03:00:00.000Z", selection: "student",
  secondWeek: "2026-10-11T15:00:00.000Z", secondDue: "2026-10-18T14:59:59.999Z",
  parent: { status: "none", attempts: [] }, finalSnapshots: [], aiSnapshots: [],
}

test("조회 대상은 전체·외부 프로·외부 제외 기관 학생으로 구분", () => {
  const pro = { selected: true, period: "", selection: "", due: "", parentLabel: "" }
  const records = [{}, { external: false }, { external: true, pro }, { external: true }, { external: false, pro }]
  assert.equal(records.filter(r => matchesReviewAudience(r, "all")).length, 5)
  assert.deepEqual(records.filter(r => matchesReviewAudience(r, "pro")), [records[2]])
  assert.deepEqual(records.filter(r => matchesReviewAudience(r, "institution")), [records[0], records[1], records[4]])
  assert.deepEqual(reviewAudienceHelp, ["전체 학생: 조회 가능한 모든 학생입니다.", "프로 학생: 우리 기관에 매칭된 외부 프로 학생입니다.", "기관 학생: 외부 학생을 제외한 우리 기관 학생입니다."])
})

test("기본 조회는 전체이며 이전 프로 진입 링크도 유지", () => {
  for (const [query, audience] of [["", "all"], ["pro=0&selected=1", "all"], ["pro=1&selected=1&studentId=student", "pro"], ["audience=institution&pro=1", "institution"], ["audience=all&pro=1", "all"], ["audience=invalid", "all"]]) {
    assert.equal(reviewAudienceFromParams(new URLSearchParams(query)), audience)
  }
})

test("검색 영역은 마지막 접기 상태를 기억하고 기본값은 펼침", () => {
  assert.equal(reviewFiltersOpen(new URLSearchParams(), null), true)
  assert.equal(reviewFiltersOpen(new URLSearchParams(), "closed"), false)
  assert.equal(reviewFiltersOpen(new URLSearchParams(), "open"), true)
  assert.equal(reviewFiltersOpen(new URLSearchParams(), "invalid"), true)
})

test("피드백 대상 필터는 프로 학생에서만 유효하고 기본값은 전체", () => {
  assert.deepEqual(reviewSelectionFilterOptions.map(option => option.label), ["전체", "학생 신청", "자동 선정", "선생님 지정", "자동 선정 예정", "대상 아님", "선정 경로 미확인(-)"])
  for (const { value } of reviewSelectionFilterOptions) {
    assert.equal(reviewSelectionFilter(value, "pro"), value)
    assert.equal(reviewSelectionFilter(value, "all"), "all")
    assert.equal(reviewSelectionFilter(value, "institution"), "all")
  }
  assert.equal(reviewSelectionFilter(null, "pro"), "all")
  assert.equal(reviewSelectionFilter("invalid", "pro"), "all")
})

test("피드백 대상 필터는 차수와 무관하게 목록의 선정 경로와 일치", () => {
  for (const selection of ["student", "auto", "teacher", "migration"] as const) {
    for (const round of [1, 2] as const) {
      const record = { pro: { ...reviewProPresentation({ ...selected, selection }, round, undefined, false, now), selected: true, parentLabel: "" } }
      const before = structuredClone(record)
      for (const { value } of reviewSelectionFilterOptions) {
        assert.equal(matchesReviewSelection(record, value), value === "all" || value === (selection === "migration" ? "unknown" : selection))
      }
      assert.deepEqual(record, before)
    }
  }
})

test("자동 선정 예정·대상 아님·선정 경로 미확인은 서로 다른 글만 조회", () => {
  const records = [
    { pro: { selected: false, selection: "자동 선정 예정", period: "", parentLabel: "" } },
    { pro: { selected: false, selection: "대상 아님", period: "", parentLabel: "" } },
    { pro: { selected: true, selection: "-", period: "", parentLabel: "" } },
    {},
  ]
  assert.deepEqual(records.filter(record => matchesReviewSelection(record, "expected")), [records[0]])
  assert.deepEqual(records.filter(record => matchesReviewSelection(record, "not-selected")), [records[1]])
  assert.deepEqual(records.filter(record => matchesReviewSelection(record, "unknown")), [records[2]])
  assert.deepEqual(records.filter(record => matchesReviewSelection(record, "all")), records)
})

test("미선정 조건은 기존 피드백 상태를 전체로 바꾸고 나머지는 조합 유지", () => {
  for (const { value } of reviewSelectionFilterOptions) {
    const locked = value === "expected" || value === "not-selected"
    assert.equal(reviewStatusLocked(value), locked)
    for (const status of ["all", "작성전", "작성완료", "전송완료"]) {
      assert.equal(reviewStatusForSelection(status, value), locked ? "all" : status)
    }
  }
})

test("목록 복귀 URL도 조회 대상·피드백 대상·피드백 상태의 모순을 정리", () => {
  for (const [query, expectedSelection, expectedStatus] of [
    ["audience=pro&selection=teacher&status=작성전&filters=closed", "teacher", "작성전"],
    ["audience=pro&selection=expected&status=전송완료", "expected", "all"],
    ["audience=pro&selection=not-selected&status=작성완료", "not-selected", "all"],
    ["audience=institution&selection=student&status=작성전", "all", "작성전"],
    ["audience=all&selection=not-selected&status=작성완료", "all", "작성완료"],
    ["audience=pro&selection=invalid&status=작성전", "all", "작성전"],
    ["pro=1&selected=1", "all", "all"],
  ]) {
    const params = new URLSearchParams(query)
    const selection = reviewSelectionFilter(params.get("selection"), reviewAudienceFromParams(params))
    assert.equal(selection, expectedSelection)
    assert.equal(reviewStatusForSelection(params.get("status") ?? "all", selection), expectedStatus)
  }
})

test("목록 복귀 링크의 검색 영역 상태를 저장된 기본 설정보다 우선", () => {
  assert.equal(reviewFiltersOpen(new URLSearchParams("filters=open"), "closed"), true)
  assert.equal(reviewFiltersOpen(new URLSearchParams("filters=closed"), "open"), false)
  assert.equal(reviewFiltersOpen(new URLSearchParams("filters=invalid"), "closed"), false)
})

test("프로 전용 3개 열은 학생 제출일 다음에만 표시", () => {
  const columns = agencyReviewColumns(true)
  assert.equal(columns.length, 19)
  assert.deepEqual(columns.slice(5, 10), ["학생 제출일", "관리 주차", "피드백 대상", "처리 기한", "피드백 작성일"])
  assert.equal(agencyReviewColumns(false).length, 16)
  assert.ok(["관리 주차", "피드백 대상", "처리 기한"].every(name => !agencyReviewColumns(false).includes(name)))
  assert.deepEqual([...columns].sort(), [...legacyAgencyReviewColumns].sort())
})

test("저장된 열 숨김은 이동 전 열 번호를 이름으로 변환", () => {
  assert.deepEqual(hiddenReviewColumnNames([6, 9, 12, 9, -1, 100, null], legacyAgencyReviewColumns), ["피드백 작성일", "관리 주차", "피드백 상태"])
  assert.deepEqual(hiddenReviewColumnNames(["관리 주차", "피드백 상태"], legacyAgencyReviewColumns), ["관리 주차", "피드백 상태"])
  assert.deepEqual(hiddenReviewColumnNames({}, legacyAgencyReviewColumns), [])
})

test("차수와 무관하게 선정 경로만 표시하고 알 수 없는 경로는 대시", () => {
  for (const [selection, label] of [["student", "학생 신청"], ["auto", "자동 선정"], ["teacher", "선생님 지정"], ["migration", "-"]] as const) {
    assert.equal(reviewSelectionLabel(selection), label)
    for (const round of [1, 2] as const) assert.equal(reviewProPresentation({ ...selected, selection }, round, undefined, false, now).selection, label)
  }
  assert.equal(reviewSelectionLabel(), "-")
  assert.equal(reviewProPresentation({ ...selected, selection: undefined }, 1, undefined, false, now).selection, "-")
})

test("차수별 처리 주차와 월/일(요일) 기한을 표시하고 저장 데이터는 보존", () => {
  const c = structuredClone(selected), before = structuredClone(c)
  assert.deepEqual(reviewProPresentation(c, 1, undefined, false, now), { period: "10월 2주차", selection: "학생 신청", due: "10/11(일)", overdue: true })
  assert.deepEqual(reviewProPresentation(c, 2, undefined, false, now), { period: "10월 3주차", selection: "학생 신청", due: "10/18(일)", overdue: false })
  const nextMonth = { ...c, secondWeek: "2026-11-01T15:00:00.000Z", secondDue: "2026-11-08T14:59:59.999Z" }
  assert.equal(reviewProPresentation(nextMonth, 2, undefined, false, now).period, "11월 1주차")
  assert.deepEqual(c, before)
})

test("전송 완료와 자동 선정 예정은 기한이 지났어도 지연 표시하지 않음", () => {
  assert.equal(reviewProPresentation(selected, 1, now, false, now).overdue, false)
  assert.equal(reviewProPresentation(selected, 1, undefined, false, now, true).overdue, false)
  assert.equal(reviewProPresentation(selected, 1, undefined, false, selected.due).overdue, false)
  const candidate = { ...selected, selectedAt: undefined, selection: undefined }
  assert.deepEqual(reviewProPresentation(candidate, 1, undefined, true, now), { period: "10월 2주차", selection: "자동 선정 예정", due: "10/11(일)", overdue: false })
  assert.deepEqual(reviewProPresentation(candidate, 1, undefined, false, now), { period: "10월 2주차", selection: "대상 아님", due: "-", overdue: false })
  assert.deepEqual(reviewProPresentation(undefined, 1, undefined, false, now), { period: "-", selection: "대상 아님", due: "-", overdue: false })
})

test("기관 상세와 목록의 관리 주차는 같은 표시 함수를 사용", () => {
  assert.equal(reviewManagementWeekLabel(), "-")
  assert.equal(reviewManagementWeekLabel(selected.week), "10월 2주차")
  assert.equal(reviewManagementWeekLabel(selected.secondWeek), "10월 3주차")
  assert.equal(reviewManagementWeekLabel("2026-11-01T15:00:00.000Z"), "11월 1주차")
  assert.equal(reviewManagementWeekLabel("2026-12-31T15:00:00.000Z"), "12월 5주차")
  assert.equal(reviewManagementWeekLabel("2027-01-03T15:00:00.000Z"), "1월 1주차")
  for (const round of [1, 2] as const) {
    const week = round === 2 ? selected.secondWeek : selected.week
    assert.equal(reviewProPresentation(selected, round, undefined, false, now).period, reviewManagementWeekLabel(week))
  }
})

test("날짜만 표시해도 지연은 실제 마감 시각이 지난 뒤에만 판정", () => {
  for (const round of [1, 2] as const) {
    const due = round === 2 ? selected.secondDue! : selected.due
    const before = structuredClone(selected)
    for (const offset of [-1, 0, 1]) {
      const at = new Date(Date.parse(due) + offset).toISOString()
      const display = reviewProPresentation(selected, round, undefined, false, at)
      assert.equal(display.due, round === 2 ? "10/18(일)" : "10/11(일)")
      assert.equal(display.overdue, offset > 0)
    }
    assert.deepEqual(selected, before)
  }
})

test("기관 상세의 2차 제출 기한은 학생 화면 형식을 재사용하고 실제 제출 시간과 상태 판정은 유지", () => {
  const ui = readFileSync(new URL("../src/components/online-workbooks/review-teacher-detail.tsx", import.meta.url), "utf8")
  assert.match(ui, /managementWeekLabel = role === "admin" \? weekLabel : reviewManagementWeekLabel/)
  assert.match(ui, /managementDueLabel = role === "admin" \? dateLabel : weeklyDate/)
  assert.match(ui, /managementWeekLabel\(record\.round === 2 && proCase\.secondWeek \? proCase\.secondWeek : proCase\.week\)/)
  assert.match(ui, /managementDueLabel\(record\.round === 2 \? proCase\.secondDue : proCase\.due\)/)
  assert.match(ui, /proCaseStatus\(hook\.db, proCase\)/)
  assert.match(ui, /role === "admin" \? dateLabel\(proCase\.secondDeadline\) : proStudentDeadline\(proCase\.secondDeadline, hook\.db\.pro!\.clock\)/)
  assert.match(ui, /2차 제출 기한 \{secondSubmissionDeadline\}/)
  assert.match(ui, /실제 제출 \{record\.round === 2 \? dateLabel\(record\.submittedAt\) : "-"\}/)
})

test("기관 상세 기본 정보와 추가 정보는 같은 줄에서 항목 단위로 자연스럽게 줄바꿈", () => {
  const ui = readFileSync(new URL("../src/components/online-workbooks/review-teacher-detail.tsx", import.meta.url), "utf8")
  const basic = ui.split('aria-label="프로 관리 항목"')[1]?.split('</div>}')[0]
  assert.ok(basic)
  assert.match(basic, /flex flex-wrap items-center/)
  for (const field of ["managementPeriod", "managementStatusDisplay.label", "managementSelection", "managementDue"]) {
    assert.ok(basic.includes(`{${field}}`))
  }
  assert.match(basic, /학부모: \{caseParentLabel\(proCase\)\}/)
  assert.match(basic, /원래 1차 관리 주차:/)
  assert.match(basic, /2차 처리 주차:/)
  assert.match(basic, /2차 제출 기한 \{secondSubmissionDeadline\}/)
  assert.match(basic, /실제 제출 \{record\.round === 2 \? dateLabel\(record\.submittedAt\) : "-"\}/)
  assert.doesNotMatch(basic, /<p>|<br|w-full/)
})
