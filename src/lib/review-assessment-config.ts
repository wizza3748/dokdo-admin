export type ReviewAssessmentCriterion = { id: string; area: string; name: string; max: number; description: string }

// Area strings are also persisted score keys. Rename labels without moving or losing marks.
export const reviewAreaLabel = (area: string) => area === "구성 및 조직력" ? "구성과 조직력" : area === "표현과 전달력" ? "표현력" : area
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
  {
    "id": "accuracy",
    "area": "내용 요약",
    "name": "요약의 정확성",
    "max": 10,
    "description": "요약한 내용이  책 내용과 일치하는가? 오류는 없는가?\n  • 인물, 사건, 배경(이야기책)이나 정보(정보 책)의 개념에 대한 서술의 정확성"
  },
  {
    "id": "sufficiency",
    "area": "내용 요약",
    "name": "요약의 충분성",
    "max": 20,
    "description": "책을 읽지 않은 사람도 이해할 만큼 충분히 요약했는가? 요약한 내용이 다음과 같은 흐름으로 자연스럽게 연결되는가?\n  • 이야기책: 시공간·인과 관계(전 레벨) / 이야기 구조(발단·전개·절정·결말)(4~6레벨) 등\n  • 정보 책: 중심 문장과 뒷받침 문장의 관계(전 레벨) / 정의-예시·원인-결과·비교·대조·문제 상황-해결 방안 등(4~6레벨)"
  },
  {
    "id": "specific",
    "area": "감상과 깨달음",
    "name": "감상의 구체성",
    "max": 20,
    "description": "‘재미있었다.’와 같은 형식적이고 막연한 반응에 그치지 않고 자신만의 생각이 드러나도록 서술했는가?\n감상을 자신의 경험이나 가치, 상상한 내용 등으로 확장하여 구체적으로 서술했는가?"
  },
  {
    "id": "original",
    "area": "발상과 독창성",
    "name": "감상의 창의성",
    "max": 20,
    "description": "책 내용에 대한 자신만의 창의적인 생각을 담아 서술했는가? 그 관점을 하나의 일관된 시각으로 끝까지 밀고 나가며 깊이 있게 전개했는가?\n  • 유형1: 책 내용과 관련하여 자신만의 참신한 해석을 제시하고 그렇게 생각한 이유를 서술했는가? \n  • 유형2: 책 내용을 책에 명시되지 않은 다른 관점(인물의 입장 등)이나 다른 조건(선택·상황이 달랐다면)으로 바꾸어 생각해보며, 그로부터 원작에는 없던 새로운 이해나 예측을  서술했는가?"
  },
  {
    "id": "unity",
    "area": "구성 및 조직력",
    "name": "논리성",
    "max": 10,
    "description": "자신의 생각을 적절한 이유와 근거를 들어 논리적으로 전개했는가?(글에 모순되거나 타당하지 않은 내용이 섞여 있지 않는가?)\n템플릿의 항목 간, 항목 안의 내용이 책과 관련된 하나의 주제나 내용으로 통합되도록 전개했는가?\n＊1~3레벨: 모든 항목이 같은 책·같은 화제를 벗어나지 않고 서로 모순되지 않으면 통일성이 충족된 것으로 본다."
  },
  {
    "id": "cohesion",
    "area": "구성 및 조직력",
    "name": "응집성",
    "max": 10,
    "description": "문장 사이, 문단 사이가 접속어·지시어 등의 언어적 연결 장치를 통해 자연스럽게 이어지는가?\n＊1~3레벨: 한 항목 내에서 문장 간 연결이 자연스러우면 응집성이 충족된 것으로 본다."
  },
  {
    "id": "expression",
    "area": "표현과 전달력",
    "name": "표현의 정확성",
    "max": 5,
    "description": "표현상의 오류 없이 정확하게 서술했는가? (오류 유형의 수에 따라 1점씩 차감함.)\n  • 오류 유형: ⓐ맞춤법 오류 / ⓑ띄어쓰기 오류 / ⓒ문장 부호의 부적절한 사용 / ⓓ구어체 사용(줄임말 등) / ⓔ어휘 선택의 오류(예: 선생님은 우리를 교육시킨다[교육한다].)"
  },
  {
    "id": "delivery",
    "area": "표현과 전달력",
    "name": "문장력",
    "max": 5,
    "description": "읽기 저해 요인 없이 명료하게 이해할 수 있도록 서술했는가?(저해 요인 유형의 수에 따라 1점씩 차감함.)\n  • 저해 요인: ⓕ짧은 문장만 이어지거나 한 문장이 너무 긺./ ⓖ같은 어구의 불필요한 반복으로 여러 문장이 단조로움. / ⓗ문장 성분의 일부 누락(예: 표지가 귀여워서.) / ⓘ문장 성분 간의 호응이 맞지 않음.(예: 왜냐하면 집에 갔다.) / ⓙ문장의 중의적 표현(예: 친구가 쓴 책[친구가 저술한 책/ 친구가 사용한 책])"
  }
]

/** Add level-specific groups here later. Persisted assessment snapshots are never rewritten. */
export const REVIEW_ASSESSMENT_CONFIG = {
  version: "2026-09-28-common-8",
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
