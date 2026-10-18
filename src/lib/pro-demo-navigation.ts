// @ts-expect-error Node tests load TypeScript sources.
import { kstDate } from "./pro-calendar.ts"
import type { ProState } from "./pro-types"

export const STUDENT_FRONT_TEST_PATH = "/agency/pro-management/student-front-test"

const purposes: Record<string, string> = {
  "pro-demo-1": "학생 제출 완료 · 선생님 피드백 작성 전",
  "pro-demo-2": "학생 피드백 신청·취소 · 마감 시 자동 선정",
  "pro-demo-3": "학생 이용 권수 소진 · 추가 신청 불가 안내",
  "pro-demo-4": "선생님 피드백 처리 지연 · 학생 대기 안내",
  "pro-demo-5": "학생 1차 피드백 확인 · 2차 작성·제출",
  "pro-demo-6": "선생님 피드백 작성 완료 · 학생에게 전송 전",
  "pro-demo-attention": "학생 2주 미제출 · 독후감 목록·신청 안내",
  "pro-demo-hq-check": "학생 3주 미제출 · 독후감 목록·신청 안내",
  "pro-demo-complete": "선생님 피드백 전송 완료 · 학생 피드백 확인",
  "pro-demo-second": "학생 2차 제출 완료 · 선생님 피드백 작성 전",
  "pro-demo-7": "기관 배정 전 신청 안내",
  "pro-demo-8": "프로 이용 종료 · 신청 영역 숨김·기존 기록 확인",
  "pro-demo-9": "일반 외부 학생의 독후감 작성·피드백 확인",
}

export function studentFrontTestRows(pro: Pick<ProState, "members" | "clock">) {
  const rows = pro.members.map(member => ({
    id: member.id, name: member.name,
    purpose: purposes[member.id] ?? "온라인 독후감 목록·피드백 확인",
    href: `/student/exploration-record?tab=workbook&month=${kstDate(pro.clock).slice(0, 7)}&demoStudent=${encodeURIComponent(member.id)}`,
  }))
  const normal = { id: "normal", name: "일반 학생 확인", purpose: "일반 기관 학생의 독후감 작성·피드백 확인", href: "/student/exploration-record?tab=workbook&demoStudent=normal" }
  return [
    ...rows.filter(row => row.id !== "pro-demo-8" && row.id !== "pro-demo-9"),
    ...rows.filter(row => row.id === "pro-demo-8"),
    normal,
    ...rows.filter(row => row.id === "pro-demo-9"),
  ]
}
