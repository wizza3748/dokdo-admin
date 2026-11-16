export const monthlyMessages = {
  leaveTitle: "저장하지 않고 이동",
  leaveConfirm: "변경 내용을 저장하지 않고 이동하시겠습니까?",
  regenerateConfirm: "수정한 내용을 참고해 다시 만드시겠습니까? 현재 본문은 새로 생성한 내용으로 바뀝니다.",
  loadConfirm: "현재 수정 내용은 저장되지 않습니다. 선택한 초안을 불러오시겠습니까?",
  resetStyleConfirm: "저장된 말투 항목을 모두 삭제하시겠습니까?",
  exhausted: "다시 만들기 2회를 모두 사용했습니다. 본문은 직접 수정할 수 있습니다.",
  cannotShorten: "최소 분량에 가까워 [더 간결하게]를 사용할 수 없습니다.",
  requestHelp: "직접 수정한 내용과 입력한 요청을 참고해 다시 만듭니다.",
  beforeTransfer: "학원 변경 전에 생성된 AI초안입니다. 이전 학원의 지도 내용이 현재 학원의 지도 내용처럼 표현되지 않았는지 확인해 주세요.",
  improvementReview: "학생이 보완할 점을 직접 언급한 문장입니다. 발송 전에 표현을 확인해 주세요.",
  notGenerated: "조회한 달의 월간 피드백 AI초안이 아직 생성되지 않았습니다.",
  noTargets: "조회한 달에는 월간 피드백 대상 학생이 없습니다.",
} as const

export const monthlyActionFailures = {
  "monthly-save": "변경 내용을 저장하지 못했습니다. 다시 시도해 주세요.",
  "monthly-copy": "문구를 복사하지 못했습니다. 다시 시도해 주세요.",
  "monthly-send": "발송 기록을 저장하지 못했습니다. 다시 시도해 주세요.",
} as const

export function monthlyActionFailure(type: string): string | undefined {
  return type in monthlyActionFailures ? monthlyActionFailures[type as keyof typeof monthlyActionFailures] : undefined
}
