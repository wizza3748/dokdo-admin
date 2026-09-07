import { getWorkbookTemplateCopy } from "@/lib/workbook-template-copy-data"
import { getWorkbookTemplateLiveDetail } from "@/lib/workbook-template-live-data"
import { WORKBOOK_TEMPLATE_LIST_ROWS } from "@/lib/workbook-template-list-data"

export type WorkbookQuestion = {
  id: number
  title: string
  description: string
  example?: string
}

export type WorkbookTemplateRecord = {
  id: number
  name: string
  studentTitle: string
  levels: number[]
  questions: WorkbookQuestion[]
  connections: number
  reviewed: boolean
  updatedAt: string
  description: string
  rewriteMode: "items" | "continuous"
  guides: {
    writing: string
    rewrite: string
    complete: string
  }
}

const templateSeeds = [
  ["[고] 통합형 독서록 – 기본", "독서록 쓰기", [4, 5, 6], 4, 36],
  ["[중][고] 통합형 독서록 – 인물 중심", "인물로 읽는 이야기", [3, 4, 5, 6], 5, 30],
  ["[중][고] 통합형 독서록 – 주제/이해 중심", "이야기 속 감상 정리하기", [3, 4, 5, 6], 4, 47],
  ["[중] 통합형 독서록 – 기본", "독서록 쓰기", [3], 4, 24],
  ["[중] 통합형 독서록 – 인물 중심", "인물로 읽는 이야기", [3, 4], 5, 6],
  ["[중][고] 인물 독서록 – 갈등과 해결", "문제를 해결해요", [3, 4, 5, 6], 4, 30],
  ["[중][고] 인물 독서록 – 성장 관찰", "변화를 살펴요", [3, 4, 5, 6], 4, 21],
  ["[중] 인물 독서록 – 인물 탐구", "이야기 속 인물을 소개해요", [3], 4, 4],
  ["[중] 인물 독서록 – 판단/상상하기", "인물이 한 선택을 생각해요", [3], 3, 6],
  ["[중] 인물 독서록 – 공감하기", "인물의 마음을 느껴봐요", [3], 3, 13],
  ["[고] 위인전 독서록 – 탐구형", "역사 속 인물의 생각과 삶을 돌아봐요", [4, 5, 6], 4, 5],
  ["[고] 위인전 독서록 – 정보형", "역사 속 인물을 알아봐요", [4, 5, 6], 4, 10],
  ["[중] 위인전 독서록 – 기본", "위인 이야기 따라가기", [3], 3, 4],
  ["[고] 역사·사회 탐구 독서록", "시대와 사회를 살펴봐요", [4, 5, 6], 3, 11],
  ["[중] 역사·사회 탐구 독서록", "옛날과 오늘 살펴보기", [3], 2, 5],
  ["[고] 과학 탐구 독서록", "과학으로 알아봐요", [4, 5, 6], 2, 16],
  ["[중] 과학 탐구 독서록", "과학으로 알아봐요", [3], 2, 6],
  ["[고] 수학 탐구 독서록", "책 속 수학 찾기", [4, 5, 6], 4, 2],
  ["[중] 수학 탐구 독서록", "책 속 수학 찾기", [3], 4, 1],
  ["[고] 예술 탐구 독서록", "예술로 느껴봐요", [4, 5, 6], 3, 5],
  ["[중] 예술 탐구 독서록", "예술로 느껴봐요", [3], 2, 4],
  ["[고] 역사 토의 독서록", "역사 속 생각 나누기", [5, 6], 4, 8],
  ["[고] 제목 탐구 독서록", "책의 얼굴을 다시 바라보기", [5, 6], 4, 7],
  ["[고] 사건 독서록 – 전환점 살펴보기", "이야기의 중요한 순간을 살펴봐요", [5, 6], 3, 9],
  ["[중] 사건 독서록 – 출발점과 전환점", "기억에 남는 사건을 떠올려요", [3, 4], 3, 12],
  ["[고] 토의·토론 독서록", "토의·토론 독서록", [5, 6], 4, 14],
  ["[중] 토의·토론 독서록", "토론·토의 독서록", [3, 4], 4, 18],
  ["[고] 비판적 사고 독서록 – 다른 시선", "다른 생각, 다른 시선", [4, 5, 6], 4, 10],
  ["[중][고] 창작 독서록 – 뒷이야기 상상", "이야기 뒷부분 상상하여 쓰기", [3, 4, 5, 6], 4, 22],
  ["[중][고] 창작 독서록 – 인물에게 편지", "편지로 마음 전하기", [3, 4, 5, 6], 4, 16],
  ["[고] 창작 독서록 – 인터뷰", "인터뷰 하기", [5, 6], 7, 11],
  ["[중] 창작 독서록 – 인터뷰", "인터뷰 하기", [3, 4], 7, 9],
  ["[중][고] 창작 독서록 – 퀴즈 만들기", "내가 내는 독서 퀴즈", [3, 4, 5, 6], 8, 34],
  ["[공통] 자유형 독서록", "자유롭게 감상 쓰기", [1, 2, 3, 4, 5, 6], 1, 42],
  ["[중][고] KWL 독서록", "KWL로 정리하기", [3, 4, 5, 6], 3, 25],
  ["[고] 요약 독서록 – 이야기 구조", "이야기 흐름 따라 정리하기", [5, 6], 4, 15],
  ["[중][고] 요약 독서록 – 인물/사건/배경", "핵심 키워드로 이야기 정리하기", [3, 4, 5, 6], 5, 17],
  ["[고] 논증 독서록 – 6단 논법", "6단 논법으로 주장 정리하기", [5, 6], 6, 3],
  ["[중][고] 논증 독서록 – OREO", "OREO로 정리하기", [3, 4, 5, 6], 4, 8],
  ["[고] 창작 독서록 – 홍보 포스터", "내가 만든 책 광고", [5, 6], 5, 12],
  ["[중] 창작 독서록 – 홍보 포스터", "내가 만든 책 광고", [3, 4], 5, 6],
  ["[저] 통합형 독서록 – 기본", "독서록 쓰기", [1, 2], 4, 20],
  ["[저] 통합형 독서록 – 인물 중심", "인물로 읽는 이야기", [1, 2], 5, 18],
  ["[저] 인물 독서록 – 성장 관찰", "변화를 살펴요", [1, 2], 4, 13],
  ["[저] 인물 독서록 – 인물 탐구", "이야기 속 인물을 소개해요", [1, 2], 3, 9],
  ["[저] 인물 독서록 – 공감하기", "인물의 마음을 느껴봐요", [1, 2], 3, 7],
  ["[저] 역사·사회 탐구 독서록", "옛날과 오늘 살펴보기", [1, 2], 2, 5],
  ["[저] 과학 탐구 독서록", "과학으로 알아봐요", [1, 2], 2, 6],
  ["[저] 수학 탐구 독서록", "책 속 수학 찾기", [1, 2], 2, 4],
  ["[저] 예술 탐구 독서록", "예술로 느껴봐요", [1, 2], 2, 3],
  ["[저] 창작 독서록 – 뒷이야기 상상", "이야기 뒷부분 상상하여 쓰기", [1, 2], 4, 11],
  ["[저] 창작 독서록 – 인물에게 편지", "편지로 마음 전하기", [1, 2], 4, 8],
  ["[저] 창작 독서록 – 인터뷰", "인터뷰 하기", [1, 2], 6, 4],
  ["[저] 창작 독서록 – 퀴즈 만들기", "내가 내는 독서 퀴즈", [1, 2], 7, 5],
  ["[저] 창작 독서록 – 장면 바꾸기", "이야기의 한 장면 바꿔 쓰기", [1, 2], 3, 7],
  ["[저] 창작 독서록 – 결말 바꾸기", "내가 만든 새로운 결말", [1, 2], 3, 9],
  ["[저] 통합형 독서록 – 독서 일기", "독서 일기", [1, 2], 5, 12],
  ["[저] 정보 독서록 – 지식 정리하기", "책에서 알게 된 것 정리해요", [1, 2], 3, 6],
  ["[중][고] 융합 독서록 – 이야기·정보 정리", "이야기와 지식 정리 노트", [3, 4, 5, 6], 4, 10],
  ["[중][고] 정보 독서록 – 지식 정리하기", "정보 정리 독서록", [3, 4, 5, 6], 4, 12],
] as const

const defaultQuestions: WorkbookQuestion[] = [
  { id: 1, title: "책을 선택한 이유", description: "이 책을 읽게 된 계기나 끌렸던 점을 떠올려 보세요. 친구의 추천, 표지나 제목의 인상, 작가에 대한 관심, 줄거리의 흥미로움 등 무엇이 마음을 움직였는지 자유롭게 적어요." },
  { id: 2, title: "중심 내용 요약", description: "[이야기 책] 이야기의 흐름을 중요한 사건 위주로 정리해 보세요. 이야기를 처음부터 끝까지 떠올려 보고, 핵심 사건들을 순서대로 적어 보면 책 내용을 쉽게 다시 기억할 수 있어요. [정보 책] 책 전체 또는 각 장의 주요 정보를 간략하게 정리해요. 주요 정보 사이의 관계가 잘 드러나도록 표현해요." },
  { id: 3, title: "느낀 점 / 감상", description: "책을 읽고 떠오른 생각이나 감정을 정리해 보세요. 책 속에서 공감된 부분이나 새롭게 의문이 생긴 부분을 솔직하게 적어도 좋아요." },
  { id: 4, title: "독후 관련 활동 계획", description: "이 책을 읽고 나서 하고 싶은 활동이 있다면 자유롭게 적어 보세요. 비슷한 주제의 다른 책을 찾아보거나, 관련된 체험 활동을 계획해 봐도 좋아요.", example: "· 이 책을 읽고 난 뒤, 주인공이 겪은 역사적 사건이 궁금해져서 관련 다큐멘터리를 찾아보려고 해요.\n· 책에서 다룬 주제와 비슷한 책을 한 권 더 읽고, 두 책의 공통점과 차이점을 비교해 보고 싶어요." },
]

const quizQuestions: WorkbookQuestion[] = [
  { id: 1, title: "퀴즈 제목 정하기", description: "퀴즈에 어울리는 제목을 지어 보세요. 책 제목을 살짝 바꾸거나, 유쾌하고 독특한 표현을 써도 좋아요.", example: "“제대로 읽었니? 정신 차렷! 퀴즈”, “○○를 아는 사람만 풀 수 있음!”, “달빛 속 비밀을 찾아라! 퀴즈”" },
  { id: 2, title: "퀴즈를 누구에게 풀게 하고 싶은가요?", description: "친구, 가족, 선생님 중에서 내 퀴즈를 풀었으면 하는 사람을 고르고, 그 사람에게 전하고 싶은 말을 짧게 적어 보세요.", example: "우리 반 친구들에게 풀게 하고 싶습니다. 책을 얼마나 자세히 읽었는지 함께 알아보면 재미있을 것 같아요." },
  { id: 3, title: "첫 번째 퀴즈 (OX)", description: "책의 내용을 떠올려 O 또는 X로 답할 수 있는 문제를 만들어 보세요.", example: "주인공은 처음부터 새로운 도전을 두려워하지 않았다. (O/X)" },
  { id: 4, title: "첫 번째 퀴즈 정답과 해설 쓰기", description: "첫 번째 퀴즈의 정답과 그 이유를 책의 내용을 근거로 설명해 보세요.", example: "정답은 X입니다. 처음에는 두려워했지만 친구의 도움으로 용기를 냈기 때문입니다." },
  { id: 5, title: "두 번째 퀴즈 (객관식)", description: "여러 보기 중 하나를 고르는 객관식 문제를 만들어 보세요.", example: "주인공이 문제를 해결하기 위해 가장 먼저 한 일은 무엇일까요?" },
  { id: 6, title: "두 번째 퀴즈 정답과 해설 쓰기", description: "두 번째 퀴즈의 정답과 다른 보기가 답이 아닌 이유를 간단히 적어 보세요.", example: "정답은 ②번입니다. 책의 세 번째 장면에서 주인공이 먼저 친구를 찾아갔습니다." },
  { id: 7, title: "세 번째 퀴즈 (주관식)", description: "책을 꼼꼼히 읽은 사람이 답할 수 있는 주관식 문제를 만들어 보세요.", example: "주인공이 마지막에 깨달은 것은 무엇인가요?" },
  { id: 8, title: "세 번째 퀴즈 정답과 해설 쓰기", description: "세 번째 퀴즈의 정답과 책에서 찾은 근거를 함께 적어 보세요.", example: "서로의 생각을 존중하는 마음입니다. 마지막 장면의 대화에서 확인할 수 있습니다." },
]

export const DEFAULT_GUIDES = {
  writing: "※ 안내에 따라 독서 감상문을 작성해 보세요.",
  rewrite: "※ 지금까지 쓴 내용을 한눈에 볼 수 있어요. 처음부터 끝까지 읽으며 고칠 부분이 있는지 살펴보세요. 문장을 자연스럽게 다듬고, 필요하다면 문단 순서도 바꿔 보세요. 이어주는 말을 넣거나 꼭 필요하지 않은 문장은 줄이면, 처음부터 끝까지 자연스럽게 이어지는 ‘하나의 글’로 완성할 수 있어요. 마지막으로, 전체 내용을 살펴보고 가장 잘 어울리는 제목도 함께 지어 보세요.",
  complete: "※ 워크북 활동을 마무리하고, 완성된 글을 확인해 보세요.",
}

export const WORKBOOK_TEMPLATES: WorkbookTemplateRecord[] = WORKBOOK_TEMPLATE_LIST_ROWS.map((row, index) => {
  const seed = templateSeeds[index % templateSeeds.length]
  const matchingSeed = templateSeeds.find(([name]) => name === row.name)
  const liveDetail = getWorkbookTemplateLiveDetail(row.id)
  const copy = getWorkbookTemplateCopy(row.id)
  const fallbackStudentTitle = matchingSeed?.[1] ?? seed?.[1] ?? row.name.replace(/^\[[^\]]+\]\s*/, "")
  const liveQuestions = liveDetail?.questions.map(([title, description], questionIndex) => ({
    id: questionIndex + 1,
    title,
    description,
  })).filter((question) => question.title.trim() || question.description.trim())
  return {
    id: row.id,
    name: row.name,
    studentTitle: copy?.studentTitle || liveDetail?.studentTitle || fallbackStudentTitle,
    levels: row.levels,
    questions: liveQuestions?.length
      ? liveQuestions
      : row.id === 37
        ? quizQuestions
        : Array.from({ length: row.questionCount }, (_, questionIndex) => defaultQuestions[questionIndex % defaultQuestions.length]).map((question, questionIndex) => ({ ...question, id: questionIndex + 1 })),
    connections: row.connections,
    reviewed: row.reviewed,
    updatedAt: row.updatedAt,
    description: copy?.description ?? (liveDetail ? (liveDetail.description ?? "") : (row.id === 37 ? "책 내용을 바탕으로 퀴즈를 만들어 보는 활동이에요. 재미있는 문제를 만들며 책 내용을 다시 떠올려 볼 수 있어요." : "책의 내용을 정리하고, 느낀 점을 담아 나만의 독서록을 만들어 보세요.")),
    rewriteMode: index % 3 === 0 ? "continuous" : "items",
    guides: {
      writing: copy?.guides?.writing || liveDetail?.guides?.writing || DEFAULT_GUIDES.writing,
      rewrite: copy?.guides?.rewrite || liveDetail?.guides?.rewrite || DEFAULT_GUIDES.rewrite,
      complete: copy?.guides?.complete || liveDetail?.guides?.complete || DEFAULT_GUIDES.complete,
    },
  }
})

export const CONNECTED_BOOKS = [
  [231, "대한이는 왜 소한이네 집에 갔을까?", 4, 3],
  [241, "생각이 자라는 나의 첫 서양 고전", 4, 3],
  [246, "생각이 자라는 나의 첫 동양 고전", 4, 3],
  [262, "옆집의 방화범", 6, 3],
  [343, "맙소사, 오해해서 미안해", 4, 2],
  [364, "바다로 간 화가", 4, 1],
  [508, "둥글둥글 지구촌 인권 이야기", 6, 3],
  [572, "역사로 통하는 맛의 항해", 5, 2],
  [615, "존중, 누구에게나 당연한 걸까?", 5, 3],
  [756, "세종 대왕, 바른 소리를 만들다", 4, 2],
  [780, "아이작 뉴턴, 운동의 법칙을 밝히다", 4, 2],
  [913, "녹두밭에 앉지 마라", 6, 2],
] as const
