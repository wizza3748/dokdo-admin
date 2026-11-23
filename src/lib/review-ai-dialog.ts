export type ReviewAiDialogCopy = {
  kind: "first" | "regenerate" | "limit"
  title: string
  lines: string[]
  confirmable: boolean
}

export function reviewAiDialogCopy(used: number, reportEnabled: boolean, includeItems: boolean): ReviewAiDialogCopy {
  if (used >= 2) return {
    kind: "limit",
    title: "AI 피드백 생성 안내",
    lines: ["AI 피드백 생성 기능은 차수별 최대 2회까지만 이용할 수 있습니다."],
    confirmable: false,
  }
  const again = used === 1
  return {
    kind: again ? "regenerate" : "first",
    title: "AI 피드백 생성",
    lines: [
      again ? "AI 피드백을 다시 생성하시겠습니까?" : "AI 피드백을 생성하시겠습니까?",
      includeItems
        ? (again ? "[학생용] 총평과, 학생에게 표시하도록 설정된 항목별 피드백이 새로 생성됩니다." : "[학생용] 총평과, 학생에게 표시하도록 설정된 항목별 피드백 초안이 생성됩니다.")
        : (again ? "[학생용] 총평이 새로 생성됩니다." : "[학생용] 총평 초안이 생성됩니다."),
      ...(reportEnabled ? [
        again ? "[보고서용] 총평도 함께 다시 생성됩니다." : "AI 평가 점수와 [보고서용] 총평도 함께 생성됩니다.",
        again ? "AI 평가 점수와 선생님 평가 점수는 그대로 유지됩니다." : "AI 평가 점수는 처음 1회만 생성되며, 선생님 평가 점수는 직접 입력해 주세요.",
      ] : []),
      "",
      again ? "사용 1/2회 (생성에 성공하면 1회 차감되며, 마지막 생성입니다)" : "사용 0/2회 (생성에 성공하면 1회 차감됩니다)",
      "",
      again ? "※ 이전 피드백은 직접 수정한 내용까지 모두 바뀌며 되돌릴 수 없습니다. 필요한 내용은 미리 복사해 두세요." : "※ 생성에 성공하면 이번 차수 제출물은 학생에게 반려할 수 없습니다.",
      "※ 생성 결과는 저장해야 피드백에 반영됩니다. 저장하지 않고 나가면 반영되지 않습니다.",
    ],
    confirmable: true,
  }
}
