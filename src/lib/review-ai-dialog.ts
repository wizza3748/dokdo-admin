export type ReviewAiDialogCopy = {
  kind: "first" | "regenerate" | "limit"
  title: string
  lines: string[]
  confirmable: boolean
}

export function reviewAiDialogCopy(used: number, reportEnabled: boolean): ReviewAiDialogCopy {
  if (used >= 2) return {
    kind: "limit",
    title: "AI 피드백 생성 안내",
    lines: ["AI 피드백 생성 기능은 차수별 최대 2회까지만 이용할 수 있습니다."],
    confirmable: false,
  }
  if (used === 1) return {
    kind: "regenerate",
    title: "AI 피드백 생성",
    lines: [
      "기존 작성 내용을 새로 생성한 내용으로 변경하시겠습니까? (남은 횟수: 1회)",
      "※ 확인 후 생성된 이전 내용은 되돌릴 수 없습니다. 필요한 내용은 별도로 저장해 주세요.",
      "AI 생성에 성공하면 사용 횟수가 차감됩니다.",
      "생성 결과는 저장하지 않고 화면을 나가면 피드백에 반영되지 않습니다.",
    ],
    confirmable: true,
  }
  return {
    kind: "first",
    title: "AI 피드백 생성",
    lines: [
      "AI가 피드백 초안을 생성합니다. (남은 횟수: 2회)",
      "AI 생성에 성공하면 사용 횟수가 차감됩니다.",
      "생성 결과는 저장하지 않고 화면을 나가면 피드백에 반영되지 않습니다.",
      "※ 확인을 누르면 해당 차수 학생 반려는 불가합니다.",
      ...(reportEnabled ? [
        "AI가 학생 작성글에 대한 평가 점수를 생성합니다.",
        "AI 평가 점수는 최초 1회만 생성하며, 선생님 평가 점수는 직접 입력해야 합니다.",
      ] : []),
    ],
    confirmable: true,
  }
}
