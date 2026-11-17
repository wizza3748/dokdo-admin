// @ts-expect-error Node tests load TypeScript sources directly.
import { weekStart } from "./pro-calendar.ts"

export const monthlyValidationCases = {
  november: { label: "11월 전환·작성·발송 선택", at: "2026-11-25T03:00:00.000Z", month: "2026-11", tone: "저장된 말투 적용 가능" },
  overdue: { label: "11월 기한 경과", at: "2026-11-30T00:00:00.000Z", month: "2026-11", tone: "발송본 부족으로 적용 대기" },
  december: { label: "12월 정기 생성·이전 달 지연", at: "2026-12-21T01:00:00.000Z", month: "2026-12", tone: "저장된 말투 사용 안 함" },
} as const
export type MonthlyValidationCase = keyof typeof monthlyValidationCases
export const MONTHLY_FIXTURE_VERSION = 3
export const monthlyDetailCases = {
  base: {group:"기본",label:"작성·발송 기본 흐름",check:"학생 상세에서 저장 → 문구 복사 → 보냈어요. 본사 발송 현황에 같은 기록이 반영됩니다."},
  learning: {group:"자료·생성",label:"여러 글·고쳐 쓴 글·전월 항목",check:"첫 학생의 생성 근거에서 처음 쓴 글과 고쳐 쓴 글을 비교합니다. 12월에는 발송 확정한 항목과 미발송 저장 항목을 구분합니다."},
  consultations: {group:"대상·집계",label:"상담 완료·정정·전환 이후",check:"앞의 다섯 학생은 유선 완료, 카톡 대체, 미진행, 완료 후 정정, 전환 뒤 완료 순입니다. 앞의 두 학생만 11월 발송 선택입니다."},
  timing: {group:"대상·집계",label:"생성 시각·신규 매칭·종료",check:"생성 시각 직전부터 시작합니다. 아래 버튼으로 정기 생성 시각까지 진행하고, 신규·종료 학생의 대상 여부를 확인합니다."},
  transfer: {group:"대상·집계",label:"학원 이동·발송 귀속",check:"첫 학생은 미발송 상태로 다른 예시기관에 이동했습니다. 이미 발송한 학생의 기록은 이전 담당 학원에 남습니다."},
  paging: {group:"대상·집계",label:"복수 학원·21명·페이지 이동",check:"본사에서 20·50·100건, 다음 페이지와 학생명 검색을 확인합니다. 다른 예시기관은 발송 선택만 있어 필수 대상이 0명입니다."},
  "tone-zero": {group:"학원 말투",label:"발송본 0편·빈 말투",check:"저장된 말투와 변경 이력이 없습니다. 첫 학생을 저장·복사·발송한 뒤 누적 수를 확인합니다."},
  "tone-one": {group:"학원 말투",label:"발송본 1편·관찰",check:"표현 수정 1회가 관찰 상태로 표시됩니다. 아직 생성에는 학원 말투가 적용되지 않습니다."},
  "tone-two": {group:"학원 말투",label:"발송본 2편·확정·적용 대기",check:"같은 표현 수정 2회는 확정됩니다. 발송본이 3편 미만이므로 생성에는 적용되지 않습니다."},
  "tone-ready": {group:"학원 말투",label:"발송본 3편·적용",check:"저장된 말투와 최대 2편의 발송본 예시를 새 생성에 사용합니다. 항목 수정·삭제·초기화도 확인합니다."},
  "tone-off": {group:"학원 말투",label:"발송본 3편·사용 안 함",check:"항목과 이력은 남지만 새 생성에 말투와 발송본 예시를 사용하지 않습니다."},
  failures: {group:"처리·검토",label:"요청 실패·기존 기록 보존",check:"아래에서 실패할 처리를 지정한 뒤 해당 학생 상세에서 실행합니다. 입력과 기존 기록이 유지되며, 다시 실행하면 정상 처리됩니다."},
  review: {group:"처리·검토",label:"검토 표시 세 사유",check:"첫 학생의 도움 확인·보완점·제출 언급 문장을 눌러 안내를 확인합니다. 문장을 수정하면 해당 표시가 사라집니다."},
} as const
export type MonthlyDetailCase = keyof typeof monthlyDetailCases
export function monthlyDetailCase(value: string | null): MonthlyDetailCase { return value && Object.hasOwn(monthlyDetailCases,value) ? value as MonthlyDetailCase : "base" }
export function monthlyTestCase(value: string | null): MonthlyValidationCase | null {
  return value && Object.hasOwn(monthlyValidationCases, value) ? value as MonthlyValidationCase : null
}
export function monthlyContextPath(path: string) {
  return path === "/admin/b2c/monthly-feedback" || /^\/agency\/pro-management(?:\/(?:academy-style|feedback-day|students\/[^/]+))?$/.test(path) || /^\/agency\/online-workbooks(?:\/[^/]+)?$/.test(path) || path.startsWith("/online-review/report/")
}

/** A validation case belongs to the URL, never to a global browser's data selection. */
export function monthlyContextHref(href: string, currentHref: string, options?: { select: MonthlyValidationCase | null; detail?: MonthlyDetailCase }): string {
  const base = new URL(currentHref, "https://prototype.invalid")
  const target = new URL(href, base)
  if (target.origin !== base.origin || !monthlyContextPath(target.pathname)) return href
  const current = options ? options.select : monthlyTestCase(base.searchParams.get("monthlyTest"))
  const previous = monthlyTestCase(target.searchParams.get("monthlyTest"))
  if (current) {
    target.searchParams.set("monthlyTest", current)
    const detail=options ? options.detail??"base" : monthlyDetailCase(base.searchParams.get("monthlyCase"))
    if(detail!=="base")target.searchParams.set("monthlyCase",detail);else target.searchParams.delete("monthlyCase")
    for (const key of ["studentTest", "studentTestScreen", "monthlyLive"]) target.searchParams.delete(key)
    if (base.searchParams.get("demoAgency") === "other-agency" && !target.searchParams.has("demoAgency")) target.searchParams.set("demoAgency", "other-agency")
  } else {
    target.searchParams.delete("monthlyTest")
    target.searchParams.delete("monthlyCase")
    if (options || base.searchParams.get("monthlyLive") === "1") target.searchParams.set("monthlyLive", "1")
  }
  if (options || previous !== current) {
    for (const key of ["week", "month", "status", "task", "ended", "books", "returnTo"]) target.searchParams.delete(key)
    if (current) {
      const scenario = monthlyValidationCases[current]
      if (target.pathname === "/agency/pro-management") target.searchParams.set("week", weekStart(scenario.at))
      if (target.pathname === "/admin/b2c/monthly-feedback" || target.pathname.startsWith("/agency/pro-management/students/")) target.searchParams.set("month", scenario.month)
    }
  }
  return `${target.pathname}${target.search}${target.hash}`
}
