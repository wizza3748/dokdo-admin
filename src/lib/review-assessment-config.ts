export type ReviewAssessmentCriterion = { id: string; area: string; name: string; max: number; description: string }

// Area strings are also persisted score keys. Rename labels without moving or losing marks.
export const reviewAreaLabel = (area: string) => area === "구성 및 조직력" ? "구성과 조직력" : area
export const reviewCriterionLabel = (criterion: ReviewAssessmentCriterion) => criterion.area === "감상과 깨달음" && criterion.name === "구체성" ? "감상의 구체성" : criterion.name

export const legacyAssessmentCriteria: ReviewAssessmentCriterion[] = [
    { id: "accuracy", area: "내용 요약", name: "정확성", max: 10, description: "책의 주요 내용을 빠뜨리지 않고 오류 없이 정확하게 서술했는가?" },
    { id: "logic", area: "내용 요약", name: "논리적 서술", max: 10, description: "이야기책은 사건의 원인과 결과·시간적 순서·논리적 흐름에 맞게 서술하고, 정보책은 핵심 개념·용어와 정보 사이의 관계를 올바르게 서술했는가?" },
    { id: "concise", area: "내용 요약", name: "간결성", max: 10, description: "중요한 내용을 선별하여 군더더기 없이 간결하게 요약했는가?" },
    { id: "specific", area: "감상과 깨달음", name: "감상의 구체성", max: 10, description: "인상 깊은 장면이나 사건과 이에 대한 생각·이유를 구체적으로 서술했는가?" },
    { id: "honest", area: "감상과 깨달음", name: "감상의 진솔함", max: 10, description: "형식적인 감상에 그치지 않고 자신의 생각이나 경험을 자신의 말로 진솔하게 서술했는가?" },
    { id: "original", area: "발상과 독창성", name: "독창성", max: 10, description: "책의 내용에 대한 새로운 관점이나 참신한 생각을 자신만의 표현으로 나타냈는가?" },
    { id: "flexible", area: "발상과 독창성", name: "융통성·정교성", max: 10, description: "책의 내용을 자신의 경험·지식·다른 상황과 연결하거나 질문·가정을 통해 생각을 확장했는가?" },
    { id: "unity", area: "구성 및 조직력", name: "완결성과 통일성", max: 10, description: "한 편의 글에 필요한 내용을 갖추고 중심 내용이 분명하게 드러나는가?" },
    { id: "cohesion", area: "구성 및 조직력", name: "결속성", max: 10, description: "문장과 문단이 자연스럽게 연결되는가?" },
    { id: "expression", area: "표현과 전달력", name: "정확한 표현", max: 5, description: "뜻과 상황에 맞는 낱말·문법·맞춤법·띄어쓰기·문장부호를 사용했는가?" },
    { id: "delivery", area: "표현과 전달력", name: "전달력", max: 5, description: "문장이 간결하고 지시 대상이 분명하여 글의 뜻을 쉽게 이해할 수 있는가?" },
  ]

export type ReviewAssessmentSnapshot = {
  version: string; id: string; label: string; minLevel: number; maxLevel: number;
  criteria: ReviewAssessmentCriterion[];
}

const commonCriteria: ReviewAssessmentCriterion[] = [
  { id: "accuracy", area: "내용 요약", name: "내용의 정확성", max: 20, description: "책의 내용을 정확하게 이해하고 해당 독후감 템플릿에서 요약·설명에 필요한 내용을 충분히 담아 적절하게 정리했는가?" },
  { id: "logic", area: "내용 요약", name: "논리성", max: 10, description: "요약한 내용(사건·정보) 사이의 관계가 자연스럽게 드러나는가?\n이야기책\n저학년: 사건 간 시공간·인과 관계에 따른 흐름 등\n고학년: 시공간과 인과 관계에 따른 흐름, 이야기 구조(발단·전개·절정·결말)에 따른 전개 등\n정보 책: 개념 간 관계\n저학년: 개념 소개- 구체적인 설명(중심 문장-뒷받침 문장)\n고학년: 정의-예시, 원인-결과, 비교·대조, 문제 상황-해결 방안 등" },
  { id: "specific", area: "감상과 깨달음", name: "구체성", max: 20, description: "책의 구체적인 장면·사건·정보를 바탕으로 자신의 생각이나 느낌을 제시하고 그 이유와 개인적인 반응을 구체적으로 드러냈는가?" },
  { id: "original", area: "발상과 독창성", name: "독창성", max: 10, description: "책의 인물·사건·정보를 그대로 되풀이하는 것을 넘어 자신의 판단이나 해석을 제시하고 그 이유를 설명했는가?" },
  { id: "flexible", area: "발상과 독창성", name: "융통성", max: 10, description: "책의 인물·사건·정보·상황을 다른 관점이나 조건으로 바꾸어 생각하고 그에 따라 무엇이 달라질지를 확장하여 평가했는가?" },
  { id: "unity", area: "구성 및 조직력", name: "완결성과 통일성", max: 10, description: "완결성: 독후감 템플릿이 요구하는 각 항목을 빠짐 없이 작성되었는가?\n통일성: 각 부분이 책과 관련된 하나의 주제나 내용으로 통합되는가?" },
  { id: "cohesion", area: "구성 및 조직력", name: "결속성", max: 10, description: "작성한 글의 문장·문단 사이의 표현상 연결이 자연스러운가?" },
  { id: "expression", area: "표현과 전달력", name: "표현의 정확성", max: 5, description: "평가 오류 유형(맞춤법 / 띄어쓰기 / 문장 호응·문법 / 낱말 선택 / 문장부호) 종류의 개수에 따라 차감합니다." },
  { id: "delivery", area: "표현과 전달력", name: "전달력", max: 5, description: "자신의 생각을 읽는 사람이 이해하기 쉽게 전달했는가?\n(맞춤법·띄어쓰기·문법 오류를 바로잡았다고 가정해도 남는 문장 구조상의 이해 저해 요인 여부)" },
]

/** Add level-specific groups here later. Persisted assessment snapshots are never rewritten. */
export const REVIEW_ASSESSMENT_CONFIG = {
  version: "2026-09-14-common-9",
  groups: [
    { id: "common", label: "전 레벨 공통", minLevel: 1, maxLevel: 6, criteria: commonCriteria },
  ],
}

export function snapshotReviewAssessment(level: number): ReviewAssessmentSnapshot {
  return structuredClone({ version: REVIEW_ASSESSMENT_CONFIG.version, ...reviewAssessmentGroup(level) })
}

export function reviewAssessmentGroup(level: number) {
  const group = REVIEW_ASSESSMENT_CONFIG.groups.find(group => level >= group.minLevel && level <= group.maxLevel)
  if (!group) throw new Error("평가 기준이 없는 레벨입니다.")
  return group
}
