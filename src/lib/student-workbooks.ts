export type WorkbookStatus = "before" | "writing" | "completed" | "feedback"

export interface WorkbookQuestion {
  title: string
  description: string
  example?: string
}

export interface WorkbookTemplate {
  id: string
  title: string
  description: string
  recommended?: boolean
  questions: WorkbookQuestion[]
}

export interface StudentWorkbook {
  id: string
  year: number
  month: number
  day: number
  weekday: string
  level: number
  bookTitle: string
  author: string
  coverSrc: string
  status: WorkbookStatus
  templates: WorkbookTemplate[]
  selectedTemplateId?: string
  answers: string[]
  feedback?: { content: string; date: string; reward: number; seen: boolean }
}

export interface WorkbookRuntimeState {
  status: WorkbookStatus
  selectedTemplateId?: string
  answers: string[]
  feedbackSeen: boolean
}

const kwlTemplate: WorkbookTemplate = {
  id: "kwl",
  title: "KWL로 정리하기",
  description: "책을 읽기 전과 후에 내가 아는 것, 알고 싶은 것, 새로 알게 된 것을 정리해 보는 활동이에요.",
  recommended: true,
  questions: [
    {
      title: "알고 있는 것(Know)",
      description: "책과 관련해 내가 이미 알고 있던 사실이나 정보를 써 보세요. 어디서 본 것인지, 들은 것인지도 함께 적어도 좋아요.",
      example: "옛날 집 마당에는 장독대가 있었고, 된장이나 간장을 담아 두었다는 걸 알고 있어요. 이 장면을 다큐멘터리에서 본 적이 있고, 우리 할머니 댁에서도 장을 담그고 보관하기 위해 장독대를 사용하셨어요.",
    },
    {
      title: "알고 싶은 것(Want)",
      description: "책을 읽으며 더 알고 싶거나 궁금해진 점을 질문으로 써 보세요.",
      example: "나라마다 주로 먹는 곡물이 다른 이유는 무엇인지, 같은 재료가 어떻게 서로 다른 음식으로 발전했는지 궁금해요.",
    },
    {
      title: "새로 알게 된 것(Learned)",
      description: "책을 다 읽고 새롭게 알게 된 사실과 생각이 달라진 점을 정리해 보세요.",
      example: "기후와 땅의 모습에 따라 잘 자라는 곡물이 다르고, 사람들은 그 곡물을 이용해 다양한 음식을 만들어 왔다는 것을 알게 되었어요.",
    },
  ],
}

const quizTemplate: WorkbookTemplate = {
  id: "quiz",
  title: "내가 내는 독서 퀴즈",
  description: "책 내용을 바탕으로 퀴즈를 만들어 보는 활동이에요. 재미있는 문제를 만들며 책 내용을 다시 떠올려 볼 수 있어요.",
  questions: [
    {
      title: "퀴즈 제목 정하기",
      description: "퀴즈에 어울리는 제목을 지어 보세요. 책 제목을 살짝 바꾸거나, 유쾌하고 독특한 표현을 써도 좋아요.",
      example: "“제대로 읽었니? 정신 차렷! 퀴즈”, “○○를 아는 사람만 풀 수 있음!”, “달빛 속 비밀을 찾아라! 퀴즈”",
    },
    { title: "퀴즈를 누구에게 풀게 하고 싶은가요?", description: "내가 만든 퀴즈를 풀어 보았으면 하는 사람과 그 이유를 써 보세요." },
    { title: "첫 번째 퀴즈 (OX)", description: "책의 내용으로 맞거나 틀린 것을 고르는 OX 문제를 만들어 보세요." },
    { title: "첫 번째 퀴즈 정답과 해설 쓰기", description: "첫 번째 퀴즈의 정답과 책 속 근거를 알기 쉽게 설명해 보세요." },
    { title: "두 번째 퀴즈 (객관식)", description: "여러 보기 가운데 정답을 고르는 객관식 문제를 만들어 보세요." },
    { title: "두 번째 퀴즈 정답과 해설 쓰기", description: "두 번째 퀴즈의 정답과 다른 보기가 답이 아닌 이유를 설명해 보세요." },
    { title: "세 번째 퀴즈 (주관식)", description: "책을 잘 읽은 사람이라면 답할 수 있는 주관식 문제를 만들어 보세요." },
    { title: "세 번째 퀴즈 정답과 해설 쓰기", description: "세 번째 퀴즈의 정답과 관련된 책 내용을 자세히 써 보세요." },
  ],
}

const advertisementTemplate: WorkbookTemplate = {
  id: "advertisement",
  title: "내가 만든 책 광고",
  description: "책의 매력을 잘 보여 줄 수 있는 광고 문구와 소개 내용을 만들어 보는 활동이에요.",
  questions: [
    { title: "광고 제목 만들기", description: "책을 읽고 싶어지게 만드는 짧고 인상적인 광고 제목을 써 보세요." },
    { title: "책의 가장 큰 매력", description: "친구에게 가장 소개하고 싶은 책의 장점이나 재미를 써 보세요." },
    { title: "추천하고 싶은 사람", description: "이 책을 누구에게 추천하고 싶은지와 그 이유를 써 보세요." },
    { title: "마무리 광고 문구", description: "책을 펼쳐 보고 싶게 만드는 한 문장으로 광고를 마무리해 보세요." },
  ],
}

const freeReviewTemplate: WorkbookTemplate = {
  id: "free-review",
  title: "자유롭게 감상 쓰기",
  description: "정해진 형식 없이 책을 읽고 느낀 점과 떠오른 생각을 자유롭게 써 보는 활동이에요.",
  questions: [{ title: "자유롭게 감상 쓰기", description: "기억에 남는 장면, 인물의 마음, 새롭게 알게 된 점 등 책을 읽고 떠오른 생각을 자유롭게 써 보세요." }],
}

const discussionTemplate: WorkbookTemplate = {
  id: "discussion",
  title: "토론·토의 독서록",
  description: "책에서 함께 이야기해 보고 싶은 주제를 정하고 내 생각과 근거를 정리하는 활동이에요.",
  questions: [
    { title: "토론 주제 정하기", description: "책을 읽고 친구들과 함께 이야기해 보고 싶은 질문을 정해 보세요." },
    { title: "나의 생각", description: "정한 주제에 대한 나의 생각을 분명하게 써 보세요." },
    { title: "책 속 근거", description: "나의 생각을 뒷받침하는 장면이나 내용을 책에서 찾아 써 보세요." },
    { title: "다른 생각 살펴보기", description: "나와 다른 의견에는 어떤 것이 있을지 생각해 보고 써 보세요." },
  ],
}

const sequelTemplate: WorkbookTemplate = {
  id: "sequel",
  title: "이야기 뒷부분 상상하여 쓰기",
  description: "책의 줄거리와 인물을 떠올리며 이야기의 뒷부분을 상상해 써 보는 활동이에요.",
  questions: [
    { title: "줄거리와 끝부분 이야기", description: "책의 줄거리와 마지막 장면을 간단히 정리해 보세요." },
    { title: "계획하기(이야기 씨앗 모으기)", description: "뒷이야기에 등장할 인물과 사건, 배경을 생각해 보세요." },
    { title: "내가 만든 뒷이야기", description: "책의 내용과 자연스럽게 이어지는 뒷이야기를 써 보세요." },
    { title: "내가 지은 제목", description: "내가 만든 뒷이야기에 어울리는 제목을 지어 보세요." },
  ],
}

const diaryTemplate: WorkbookTemplate = {
  id: "reading-diary",
  title: "독서 일기",
  description: "책을 읽은 날의 느낌과 책 내용을 일기 형식으로 정리하는 활동이에요.",
  questions: [
    { title: "날짜", description: "책을 읽은 날짜를 써 보세요." },
    { title: "날씨", description: "오늘의 날씨를 책의 분위기나 인물의 모습과 연결해 표현해 보세요." },
    { title: "책 내용 요약", description: "누가, 어떤 일을 겪었는지 중심으로 줄거리를 정리해 보세요." },
    { title: "기억에 남는 내용", description: "가장 기억에 남는 장면과 그 이유를 써 보세요." },
    { title: "마무리", description: "책을 읽고 든 생각이나 추천하고 싶은 사람을 써 보세요." },
  ],
}

const asiaTemplates = [kwlTemplate, quizTemplate, advertisementTemplate, freeReviewTemplate]
const democracyTemplates = [kwlTemplate, quizTemplate, discussionTemplate, freeReviewTemplate]

export const studentWorkbooks: StudentWorkbook[] = [
  {
    id: "democracy-0825", year: 2026, month: 8, day: 25, weekday: "화요일", level: 4,
    bookTitle: "민주주의를 어떻게 이룰까요?", author: "플란텔 팀 글, 마르타 피나 그림", coverSrc: "/student-assets/books/democracy.jpg",
    status: "before", templates: democracyTemplates, answers: ["", "", ""],
  },
  {
    id: "room901-0825", year: 2026, month: 8, day: 25, weekday: "화요일", level: 2,
    bookTitle: "901호 띵똥 아저씨", author: "이욱재 글", coverSrc: "/student-assets/books/room-901.jpg",
    status: "completed", templates: [sequelTemplate], selectedTemplateId: "sequel",
    answers: [
      "띵똥 아저씨가 이웃집 초인종을 누르며 한 사람씩 이야기를 들어 주자, 처음에는 귀찮아하던 이웃들도 조금씩 마음을 열었습니다.",
      "다음 날 아저씨가 보이지 않자 이웃들이 아저씨를 찾아 나서는 장면을 떠올렸습니다. 장소는 아파트 놀이터이고, 여러 이웃이 함께 등장합니다.",
      "이웃들은 아저씨가 아픈 것을 알고 따뜻한 죽과 손편지를 준비해 찾아갔습니다. 아저씨는 자신이 건넨 작은 관심이 다시 돌아온 것을 보고 환하게 웃었습니다.",
      "띵똥, 이번에는 우리가 왔어요!",
    ],
  },
  {
    id: "asia-table-0824", year: 2026, month: 8, day: 24, weekday: "월요일", level: 4,
    bookTitle: "밥.빵.국수 - 아시아의 식탁", author: "이은미 글, 박태희 그림", coverSrc: "/student-assets/books/asia-table.jpg",
    status: "writing", templates: asiaTemplates, selectedTemplateId: "quiz",
    answers: [
      "밥·빵·국수, 아시아의 식탁 퀴즈",
      "우리 반 친구들에게 풀게 하고 싶습니다. 평소 먹는 음식이 어느 나라에서 시작되었는지 함께 알아보면 재미있을 것 같기 때문입니다.",
      "쌀은 아시아 모든 나라에서 똑같은 방법으로 요리한다. (O/X)",
      "정답은 X입니다. 같은 쌀도 지역의 기후와 생활 방식에 따라 밥, 떡, 국수처럼 여러 음식으로 만들어 먹습니다.",
      "밀로 만든 음식이 아닌 것은 무엇일까요? ① 빵 ② 국수 ③ 떡 ④ 만두피",
      "정답은 ③ 떡입니다. 떡은 주로 쌀로 만들고, 빵과 국수와 만두피는 밀가루로 만듭니다.",
      "아시아 사람들이 지역에 맞는 곡물로 다양한 음식을 만들어 온 까닭은 무엇인가요?",
      "지역마다 날씨와 땅의 모습이 달라 잘 자라는 곡물이 달랐고, 구하기 쉬운 재료를 맛있게 먹을 방법을 찾았기 때문입니다.",
    ],
  },
  {
    id: "gamunjang-0824", year: 2026, month: 8, day: 24, weekday: "월요일", level: 1,
    bookTitle: "감은장아기", author: "서정오 글, 한태희 그림", coverSrc: "/student-assets/books/gamunjang.jpg",
    status: "feedback", templates: [diaryTemplate], selectedTemplateId: "reading-diary",
    answers: [
      "2026년 8월 24일",
      "감은장아기가 자신의 힘으로 길을 찾아가는 모습처럼 맑고 힘찬 날씨였습니다.",
      "《감은장아기》는 부모에게 쫓겨난 감은장아기가 어려움을 이겨 내고 자신의 삶을 당당하게 만들어 가는 이야기입니다.",
      "감은장아기가 자신을 믿고 새로운 삶을 시작한 장면이 가장 기억에 남았습니다. 어려운 상황에서도 용기를 잃지 않았기 때문입니다.",
      "이 책을 읽고 나니 다른 사람의 평가보다 스스로를 믿는 마음이 중요하다는 생각이 들었습니다. 용기가 필요한 친구에게 추천하고 싶습니다.",
    ],
    feedback: {
      reward: 15,
      content: "감은장아기의 줄거리와 주제를 또렷하게 정리했어요. 날씨를 주인공의 모습과 연결한 표현이 특히 인상적이에요. 기억에 남는 장면을 고른 이유와 책에서 얻은 생각도 자연스럽게 이어졌어요. 다음에는 줄거리 요약에 중요한 사건을 한두 가지 더 넣으면 책의 내용이 더욱 선명하게 전달될 거예요.",
      date: "2026-08-24 13:17:43",
      seen: false,
    },
  },
  {
    id: "not-a-dog-0728", year: 2026, month: 7, day: 28, weekday: "화요일", level: 4,
    bookTitle: "민주주의를 어떻게 이룰까요?", author: "플란텔 팀 글, 마르타 피나 그림", coverSrc: "/student-assets/books/democracy.jpg",
    status: "before", templates: democracyTemplates, answers: ["", "", ""],
  },
  {
    id: "no-first-0721", year: 2026, month: 7, day: 21, weekday: "화요일", level: 4,
    bookTitle: "밥.빵.국수 - 아시아의 식탁", author: "이은미 글, 박태희 그림", coverSrc: "/student-assets/books/asia-table.jpg",
    status: "writing", templates: asiaTemplates, selectedTemplateId: "kwl",
    answers: [
      "아시아에서는 쌀과 밀을 이용해 밥, 빵, 국수 같은 여러 음식을 만들어 먹는다는 것을 알고 있었습니다.",
      "같은 곡물인데도 나라마다 음식의 모양과 조리 방법이 다른 까닭이 궁금합니다.",
      "",
    ],
  },
  {
    id: "galileo-0715", year: 2026, month: 7, day: 15, weekday: "수요일", level: 2,
    bookTitle: "901호 띵똥 아저씨", author: "이욱재 글", coverSrc: "/student-assets/books/room-901.jpg",
    status: "completed", templates: [sequelTemplate], selectedTemplateId: "sequel",
    answers: [
      "띵똥 아저씨는 외로운 이웃의 집을 찾아가 이야기를 들어 주었고, 이웃들은 조금씩 서로를 알게 되었습니다.",
      "아저씨의 생일날 이웃들이 몰래 축하 파티를 준비하는 뒷이야기를 만들고 싶습니다.",
      "아파트 사람들이 한 가지씩 음식을 가져와 놀이터에 긴 식탁을 만들었습니다. 아저씨가 나타나자 모두 초인종 소리를 흉내 내며 축하 노래를 불렀습니다.",
      "우리 아파트의 가장 따뜻한 초인종",
    ],
  },
  {
    id: "korean-noun-0708", year: 2026, month: 7, day: 8, weekday: "수요일", level: 1,
    bookTitle: "감은장아기", author: "서정오 글, 한태희 그림", coverSrc: "/student-assets/books/gamunjang.jpg",
    status: "feedback", templates: [diaryTemplate], selectedTemplateId: "reading-diary",
    answers: [
      "2026년 7월 8일",
      "구름 사이로 햇빛이 비치는 날씨가 감은장아기의 앞날처럼 느껴졌습니다.",
      "감은장아기가 집을 떠난 뒤 어려움을 이겨 내고 자신의 힘으로 행복을 찾아가는 이야기입니다.",
      "감은장아기가 포기하지 않고 새로운 길을 떠나는 장면이 가장 기억에 남았습니다.",
      "어려운 일이 생겨도 내 힘을 믿고 천천히 해결해 보고 싶습니다.",
    ],
    feedback: {
      reward: 10,
      content: "책의 흐름을 차례대로 정리했고 감은장아기의 용기를 자신의 생각과 잘 연결했어요. 기억에 남는 장면을 조금 더 자세히 설명하면 더욱 생생한 독서 일기가 될 것 같아요.",
      date: "2026-07-09 10:24:12",
      seen: true,
    },
  },
]

const STORAGE_KEY = "dokdo-student-workbooks-v2"

function readStoredStates(): Record<string, Partial<WorkbookRuntimeState>> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, Partial<WorkbookRuntimeState>>
  } catch {
    return {}
  }
}

export function getWorkbookRuntime(workbook: StudentWorkbook): WorkbookRuntimeState {
  const stored = readStoredStates()[workbook.id]
  const selectedTemplateId = stored?.selectedTemplateId ?? workbook.selectedTemplateId
  const template = workbook.templates.find((item) => item.id === selectedTemplateId) ?? workbook.templates[0]
  const sourceAnswers = stored?.answers ?? workbook.answers
  return {
    status: stored?.status ?? workbook.status,
    selectedTemplateId: template.id,
    answers: template.questions.map((_, index) => sourceAnswers[index] ?? ""),
    feedbackSeen: stored?.feedbackSeen ?? workbook.feedback?.seen ?? true,
  }
}

export function saveWorkbookRuntime(id: string, next: Partial<WorkbookRuntimeState>) {
  if (typeof window === "undefined") return
  const states = readStoredStates()
  states[id] = { ...states[id], ...next }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(states))
  window.dispatchEvent(new CustomEvent("dokdo-workbook-change", { detail: { id } }))
}

export function getWorkbookById(id: string) {
  return studentWorkbooks.find((workbook) => workbook.id === id)
}

export function formatWorkbookDate(workbook: StudentWorkbook) {
  return `${String(workbook.month).padStart(2, "0")}월 ${String(workbook.day).padStart(2, "0")}일 ${workbook.weekday}`
}
