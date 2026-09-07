import { STUDENT_MOCK_STORAGE_KEYS } from "@/lib/student-mock-state"
import { getWorkbookById, type WorkbookRuntimeState } from "@/lib/student-workbooks"
import { getWorkbookRoundSetting, type WorkbookRoundDisplayMode } from "@/lib/workbook-round-settings"

export type FeedbackStatus = "작성전" | "작성완료" | "전송완료"

export interface OnlineWorkbook {
  id: string
  sourceWorkbookId?: string
  institution: string
  studentName: string
  level: number
  bookTitle: string
  templateName: string
  submittedAt: string
  feedbackAt: string | null
  status: FeedbackStatus
  aiUsed: number
  flowers: number
  anomaly: boolean
  parentSent: boolean
  parentContactRegistered?: boolean
  feedbackText?: string
  rejected?: boolean
  displayMode?: WorkbookRoundDisplayMode
  questions?: Array<{ title: string; description?: string; answer: string }>
}

const students = [
  "김민준", "이서연", "박도윤", "최지우", "정현우", "윤지아",
  "강하준", "임서아", "송은우", "한예준", "문채원", "서지호",
]

const books = [
  "어느 날, 정글", "바다의 비밀", "하늘을 나는 꿈", "숲 속의 친구들",
  "도시의 소음", "별빛 탐험가", "시간 여행자", "마법의 정원",
]

const institutions = ["독도학원", "한빛학원", "미래학원", "별빛학원", "푸른샘학원", "해오름학원", "꿈나무학원"]
const statuses: FeedbackStatus[] = ["작성전", "작성완료", "전송완료"]

const agencyBookContent: Record<string, { answers: [string, string, string, string]; feedback: string }> = {
  "감은장아기": {
    answers: [
      "감은장아기는 부모에게 쫓겨난 뒤에도 스스로 길을 찾고 어려움을 이겨 냈습니다. 결국 자신의 힘으로 새로운 삶을 만들어 갑니다.",
      "감은장아기가 남의 평가에 흔들리지 않고 집을 떠나는 장면이 가장 기억에 남았습니다. 두려웠을 텐데도 자신을 믿는 모습이 용감해 보였습니다.",
      "다른 사람이 나를 알아주지 않더라도 내가 가진 장점을 믿는 마음이 중요하다고 생각했습니다.",
      "옛이야기에서 주인공이 집을 떠나 성장하는 이야기가 또 어떤 것이 있는지 찾아보고 싶습니다.",
    ],
    feedback: "줄거리의 중요한 흐름을 빠뜨리지 않고 정리했고, 감은장아기의 선택을 자신의 생각과 자연스럽게 연결했어요. 특히 ‘나를 믿는 마음’이라는 주제를 잘 찾아냈습니다. 다음에는 기억에 남는 장면에서 인물의 말이나 행동을 한 가지 더 들어 설명하면 감상이 더욱 생생해질 거예요.",
  },
  "왜 이런 이름이 생겼을까? : 자연": {
    answers: [
      "자연에서 볼 수 있는 동물과 식물, 지형의 이름이 생김새나 생활 모습, 지역의 특징에서 비롯되었다는 내용을 다룬 책입니다.",
      "사람들이 오랫동안 관찰한 특징을 짧은 이름에 담았다는 점이 흥미로웠습니다. 평소 아무 생각 없이 부르던 이름에도 이유가 있었습니다.",
      "이름은 단순한 표시가 아니라 사람들이 자연을 바라본 방식이 담긴 기록이라고 생각합니다.",
      "우리 동네의 산과 하천 이름은 언제, 어떤 이유로 만들어졌는지 조사해 보고 싶습니다.",
    ],
    feedback: "책에서 새롭게 알게 된 정보를 자신의 말로 정확하게 정리했어요. 자연물의 이름을 ‘사람들의 관찰이 담긴 기록’이라고 표현한 부분이 인상적입니다. 더 알아보고 싶은 내용을 실제 우리 동네와 연결한 점도 좋아요. 조사할 때에는 이름의 유래를 확인할 수 있는 자료도 함께 적어 보세요.",
  },
  "1등 없는 1등": {
    answers: [
      "주인공은 결과만으로 순위를 정하는 것이 공정한지 고민하면서 친구들과 진짜 잘한다는 말의 의미를 다시 생각하게 됩니다.",
      "친구들이 서로의 장점을 한 가지씩 말해 주는 장면이 기억에 남았습니다. 한 가지 기준만으로 사람을 비교할 수 없다는 생각이 들었습니다.",
      "경쟁에서 이기는 것도 기쁘지만 함께 노력한 과정과 서로를 응원하는 태도가 더 중요하다고 생각합니다.",
      "학교에서 순위를 정하지 않고도 노력과 성장을 공정하게 인정하는 방법을 친구들과 토론해 보고 싶습니다.",
    ],
    feedback: "이야기의 갈등을 ‘무엇이 공정한가’라는 질문으로 잘 정리했어요. 친구들의 장점을 바라보는 장면을 고른 이유도 분명합니다. 자신의 경험을 한 가지 덧붙여 경쟁할 때 어떤 마음이 들었는지 써 보면 생각이 더 깊이 드러날 거예요.",
  },
  "갈릴레이의 춤추는 생각": {
    answers: [
      "갈릴레이가 당연하다고 여겨지던 생각을 그대로 믿지 않고 관찰과 실험으로 확인해 가는 과정을 소개한 책입니다.",
      "서로 다른 물체의 움직임을 직접 비교하며 자신의 생각을 검증하는 장면이 가장 인상 깊었습니다.",
      "많은 사람이 믿는 생각이라도 근거를 확인하고 질문하는 태도가 과학에서 중요하다는 것을 알았습니다.",
      "갈릴레이가 사용했던 관찰 도구와 오늘날의 천체 관측 장비가 어떻게 다른지 알아보고 싶습니다.",
    ],
    feedback: "갈릴레이의 탐구 태도를 관찰·실험·검증이라는 말로 정확하게 정리했어요. 단순히 위인의 업적을 나열하지 않고 자신이 배운 태도까지 쓴 점이 좋습니다. 다음에는 책에 나온 실험 하나를 순서대로 설명하면 과학적 사고 과정이 더 잘 드러날 거예요.",
  },
  "가장 멋진 크리스마스": {
    answers: [
      "주인공은 기대했던 것과 다른 크리스마스를 보내게 되지만, 가족과 이웃을 도우며 함께하는 시간이 가장 큰 선물이라는 것을 알게 됩니다.",
      "준비한 것을 이웃과 나누고 모두가 함께 웃는 마지막 장면이 기억에 남았습니다. 화려한 선물보다 따뜻한 마음이 더 오래 남는다고 느꼈습니다.",
      "특별한 날을 멋지게 만드는 것은 비싼 물건이 아니라 곁에 있는 사람을 생각하는 마음이라고 생각합니다.",
      "우리 가족이 크리스마스에 실천할 수 있는 작은 나눔에는 무엇이 있는지 함께 이야기해 보고 싶습니다.",
    ],
    feedback: "이야기의 처음과 끝에서 주인공의 마음이 어떻게 달라졌는지 잘 파악했어요. ‘따뜻한 마음이 더 오래 남는다’는 표현에서 책의 주제를 자신의 말로 정리한 점이 돋보입니다. 나눔을 실천할 구체적인 방법을 한두 가지 더 적으면 더욱 완성도 높은 글이 되겠어요.",
  },
  "국어를 좋아해 명사": {
    answers: [
      "명사는 사람, 사물, 장소, 생각의 이름을 나타내는 말이며 문장에서 여러 역할을 할 수 있다는 내용을 배웠습니다.",
      "교실에서 볼 수 있는 물건의 이름을 찾아 명사로 분류하는 활동이 가장 재미있었습니다.",
      "평소 사용하는 문장 속에도 명사가 아주 많고, 정확한 이름을 사용하면 뜻을 더 분명하게 전달할 수 있다는 것을 알았습니다.",
      "같은 낱말이 문장에 따라 명사와 다른 품사로 쓰이는 경우도 있는지 더 알아보고 싶습니다.",
    ],
    feedback: "명사의 뜻을 정확하게 설명하고 생활 속 예와 연결했어요. 이름을 정확하게 쓰면 뜻이 분명해진다는 생각도 좋습니다. 다음에는 직접 만든 문장 두 개에서 명사를 찾아 표시해 보면 배운 내용을 더 확실하게 확인할 수 있을 거예요.",
  },
  "30번 곰": {
    answers: [
      "번호로만 불리던 곰이 여러 일을 겪으며 자신도 소중한 존재라는 사실을 깨닫고 진짜 이름과 삶을 찾아가는 이야기입니다.",
      "곰이 처음으로 누군가에게 다정하게 불리는 장면이 기억에 남았습니다. 그때 곰이 비로소 한 존재로 존중받는 느낌이 들었습니다.",
      "사람이나 동물을 편리하게 번호로만 구분하면 각자의 마음과 개성을 놓칠 수 있다고 생각했습니다.",
      "동물원과 보호소에서는 동물의 이름을 어떻게 정하고 돌보는지 알아보고 싶습니다.",
    ],
    feedback: "번호와 이름의 차이를 ‘존중’이라는 주제와 연결해 깊이 있게 읽었어요. 곰의 마음이 달라지는 장면을 고른 이유도 설득력 있습니다. 다음에는 곰에게 새 이름을 지어 주고 그 이름에 담은 뜻을 덧붙여 보세요.",
  },
  "동박새의 노래": {
    answers: [
      "작은 동박새가 계절의 변화를 겪으며 숲의 친구들과 살아가는 모습을 통해 자연이 서로 연결되어 있다는 것을 보여 주는 이야기입니다.",
      "추운 날 동박새가 친구들과 먹이를 나누는 장면이 기억에 남았습니다. 작은 도움도 누군가에게는 큰 힘이 될 수 있기 때문입니다.",
      "자연 속 생물은 혼자 살아가는 것처럼 보여도 서로 도움을 주고받는다는 것을 알았습니다.",
      "동박새가 우리나라에서 주로 무엇을 먹고 어디에 사는지 더 조사해 보고 싶습니다.",
    ],
    feedback: "동박새의 행동을 자연의 연결과 배려라는 주제로 잘 해석했어요. 기억에 남는 장면을 고른 이유도 구체적입니다. 실제 동박새의 생태를 조사할 때 책의 이야기와 사실 정보를 구분해서 정리하면 더 탄탄한 탐구가 될 거예요.",
  },
  "나는 누구예요?": {
    answers: [
      "주인공이 가족과 친구들의 말을 들으며 자신이 좋아하는 것과 잘하는 것을 찾아가고, 스스로를 한 가지 말로만 정할 수 없다는 것을 깨닫는 이야기입니다.",
      "주인공이 종이에 자신을 나타내는 여러 낱말을 적는 장면이 기억에 남았습니다. 사람에게는 다양한 모습이 있다는 뜻처럼 느껴졌습니다.",
      "나는 책 읽기와 그림 그리기를 좋아하고 친구의 이야기를 잘 들어 주는 사람이라고 생각합니다.",
      "시간이 지나면서 내가 좋아하는 것과 꿈이 어떻게 달라지는지 기록해 보고 싶습니다.",
    ],
    feedback: "주인공의 고민을 자신의 모습과 솔직하게 연결했어요. 자신을 한 가지 특징으로만 설명할 수 없다는 책의 중심 생각도 잘 찾았습니다. 다음에는 자신이 잘하는 일을 보여 주는 실제 경험을 한 가지 덧붙여 보세요.",
  },
  "사라진 우리말을 찾아라!": {
    answers: [
      "생활 모습이 달라지면서 잘 쓰지 않게 된 우리말을 찾아 그 뜻과 말이 생긴 배경을 알아보는 책입니다.",
      "옛날 생활 도구와 함께 사용되던 말이 도구가 사라지면서 잊힌다는 설명이 가장 기억에 남았습니다.",
      "말에는 그 말을 사용한 사람들의 생활과 문화가 담겨 있어서 기록하고 기억할 가치가 있다고 생각합니다.",
      "우리 할머니와 할아버지가 어릴 때 자주 썼지만 지금은 잘 쓰지 않는 말을 인터뷰해 보고 싶습니다.",
    ],
    feedback: "우리말과 생활 문화의 관계를 정확하게 이해했어요. 가족 인터뷰로 탐구를 이어 가려는 계획도 구체적이고 좋습니다. 인터뷰한 낱말은 뜻뿐 아니라 언제, 어떤 상황에서 썼는지도 함께 기록해 보세요.",
  },
  "미움을 파는 고슴도치": {
    answers: [
      "고슴도치는 속상한 마음을 미움으로 바꾸어 팔지만, 미움을 나눌수록 자신과 친구들이 더 외로워진다는 것을 깨닫습니다.",
      "고슴도치가 친구에게 먼저 미안하다고 말하는 장면이 기억에 남았습니다. 용기를 내어 관계를 회복하려는 모습이 좋았습니다.",
      "화가 날 때 바로 미운 말을 하기보다 왜 속상한지 차분하게 말하는 것이 필요하다고 생각합니다.",
      "친구와 다투었을 때 서로의 마음을 상하지 않게 표현하는 방법을 더 알아보고 싶습니다.",
    ],
    feedback: "고슴도치의 행동과 마음 변화를 순서대로 잘 정리했어요. 책의 내용을 친구 관계에서 실천할 방법으로 연결한 점도 훌륭합니다. 다음에는 자신이 갈등을 풀었던 경험을 한 가지 떠올려 비교해 보면 감상이 더 풍부해질 거예요.",
  },
  "세상 끝에 있는 너에게": {
    answers: [
      "멀리 떨어진 친구에게 마음을 전하려는 주인공이 여러 어려움을 지나며 기다림과 약속의 의미를 알아가는 이야기입니다.",
      "답장이 오지 않아도 친구를 믿고 편지를 계속 쓰는 장면이 기억에 남았습니다. 진심은 시간이 걸려도 전해질 수 있다고 느꼈습니다.",
      "자주 만나지 못하더라도 상대를 생각하고 마음을 표현하면 관계를 이어 갈 수 있다고 생각합니다.",
      "편지와 메시지는 마음을 전하는 방식에서 어떤 차이가 있는지 친구들의 의견을 들어 보고 싶습니다.",
    ],
    feedback: "주인공의 기다림을 믿음과 약속의 의미로 해석한 점이 좋아요. 편지와 메시지를 비교해 보고 싶다는 질문도 책의 주제와 잘 연결됩니다. 기억에 남는 문장을 한 구절 골라 자신의 생각과 함께 설명하면 더 깊이 있는 글이 되겠어요.",
  },
  "행복한 청소부": {
    answers: [
      "거리의 표지판을 닦는 청소부가 표지판에 적힌 음악가와 작가를 공부하면서 자신의 일을 더 사랑하게 되는 이야기입니다.",
      "청소부가 사람들 앞에서 자신이 공부한 내용을 즐겁게 들려주는 장면이 가장 기억에 남았습니다.",
      "남들이 알아주지 않더라도 좋아하는 일을 꾸준히 배우면 일상에서 행복을 찾을 수 있다고 생각했습니다.",
      "우리 주변에서 자신의 일을 즐겁고 성실하게 하는 사람을 찾아 인터뷰해 보고 싶습니다.",
    ],
    feedback: "청소부가 공부를 통해 일의 의미를 새롭게 발견하는 과정을 잘 정리했어요. 행복을 남의 평가보다 배움과 꾸준함에서 찾은 점도 인상적입니다. 주변 인물 인터뷰를 할 때 그 사람이 일을 좋아하게 된 계기를 꼭 질문해 보세요.",
  },
}

function enrichAgencyWorkbook(record: OnlineWorkbook): OnlineWorkbook {
  const content = agencyBookContent[record.bookTitle]
  if (!content) return { ...record, parentContactRegistered: record.parentContactRegistered ?? true }

  const questionTitles = ["1. 책 내용 요약", "2. 기억에 남는 장면", "3. 나의 생각", "4. 더 알아보고 싶은 점"]
  const descriptions = [
    "책에서 일어난 중요한 일을 순서대로 정리해 보세요.",
    "가장 기억에 남는 장면과 그 이유를 적어 보세요.",
    "책을 읽고 든 생각을 자신의 경험과 연결해 적어 보세요.",
    "책의 내용과 관련해 더 알아보고 싶은 점을 적어 보세요.",
  ]

  return {
    ...record,
    parentContactRegistered: record.parentContactRegistered ?? true,
    feedbackText: record.status === "작성전" ? "" : (record.feedbackText ?? content.feedback),
    questions: questionTitles.map((title, index) => ({ title, description: descriptions[index], answer: content.answers[index] })),
  }
}

export const ONLINE_WORKBOOKS: OnlineWorkbook[] = Array.from({ length: 36 }, (_, index) => {
  const status = statuses[index % statuses.length]
  const day = 8 - (index % 8)

  return {
    id: String(20240250 - index),
    institution: institutions[index % institutions.length],
    studentName: students[index % students.length],
    level: (index % 6) + 1,
    bookTitle: books[index % books.length],
    templateName: index % 2 === 0 ? "책 읽기 기본형" : "생각 확장형",
    submittedAt: `2025-12-${String(day).padStart(2, "0")}`,
    feedbackAt: status === "작성전" ? null : `2025-12-${String(Math.min(10, day + 2)).padStart(2, "0")}`,
    status,
    aiUsed: index % 3,
    flowers: index % 4 === 2 ? (index % 5 + 1) * 5 : 0,
    anomaly: index === 0 || index === 7,
    parentSent: status === "전송완료" && index % 2 === 0,
  }
})

export const ONLINE_WORKBOOK_INSTITUTIONS = institutions

const AGENCY_ONLINE_WORKBOOK_SEED: OnlineWorkbook[] = [
  { id: "42784", institution: "독도학원", studentName: "진독도", level: 1, bookTitle: "감은장아기", templateName: "정보 정리 독서록", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", aiUsed: 1, flowers: 15, anomaly: false, parentSent: false, parentContactRegistered: false },
  { id: "37335", institution: "독도학원", studentName: "란테스트", level: 4, bookTitle: "왜 이런 이름이 생겼을까? : 자연", templateName: "정보 정리 독서록", submittedAt: "2026-07-20", feedbackAt: null, status: "작성전", aiUsed: 0, flowers: 0, anomaly: false, parentSent: false },
  { id: "27409", institution: "독도학원", studentName: "진독도", level: 4, bookTitle: "1등 없는 1등", templateName: "감상 중심 독서록", submittedAt: "2026-06-09", feedbackAt: "2026-06-09", status: "전송완료", aiUsed: 1, flowers: 5, anomaly: false, parentSent: false },
  { id: "20119", institution: "독도학원", studentName: "윤섭", level: 4, bookTitle: "1등 없는 1등", templateName: "감상 중심 독서록", submittedAt: "2026-04-22", feedbackAt: "2026-04-22", status: "전송완료", aiUsed: 2, flowers: 0, anomaly: false, parentSent: false },
  { id: "16447", institution: "독도학원", studentName: "염철범", level: 5, bookTitle: "갈릴레이의 춤추는 생각", templateName: "생각 확장 독서록", submittedAt: "2026-03-11", feedbackAt: "2026-04-08", status: "전송완료", aiUsed: 1, flowers: 10, anomaly: false, parentSent: true },
  { id: "14894", institution: "독도학원", studentName: "진독도", level: 2, bookTitle: "가장 멋진 크리스마스", templateName: "정보 정리 독서록", submittedAt: "2026-02-06", feedbackAt: "2026-02-06", status: "작성완료", aiUsed: 1, flowers: 0, anomaly: false, parentSent: false },
  { id: "14868", institution: "독도학원", studentName: "진독도", level: 5, bookTitle: "갈릴레이의 춤추는 생각", templateName: "생각 확장 독서록", submittedAt: "2026-02-06", feedbackAt: null, status: "작성전", aiUsed: 0, flowers: 0, anomaly: false, parentSent: false },
  { id: "12433", institution: "독도학원", studentName: "염철범", level: 1, bookTitle: "감은장아기", templateName: "정보 정리 독서록", submittedAt: "2026-01-02", feedbackAt: null, status: "작성전", aiUsed: 0, flowers: 0, anomaly: false, parentSent: false },
  { id: "9031", institution: "독도학원", studentName: "진독도", level: 1, bookTitle: "국어를 좋아해 명사", templateName: "핵심 용어 독서록", submittedAt: "2025-12-09", feedbackAt: null, status: "작성전", aiUsed: 2, flowers: 5, anomaly: false, parentSent: false },
  { id: "2693", institution: "독도학원", studentName: "테혁", level: 1, bookTitle: "30번 곰", templateName: "감상 중심 독서록", submittedAt: "2025-10-24", feedbackAt: null, status: "작성전", aiUsed: 1, flowers: 5, anomaly: false, parentSent: false },
  { id: "2620", institution: "독도학원", studentName: "테혁", level: 1, bookTitle: "동박새의 노래", templateName: "감상 중심 독서록", submittedAt: "2025-10-24", feedbackAt: null, status: "작성전", aiUsed: 0, flowers: 0, anomaly: false, parentSent: false },
  { id: "2496", institution: "독도학원", studentName: "염철범", level: 2, bookTitle: "나는 누구예요?", templateName: "정보 정리 독서록", submittedAt: "2025-11-05", feedbackAt: null, status: "작성전", aiUsed: 1, flowers: 0, anomaly: false, parentSent: false },
  { id: "2198", institution: "독도학원", studentName: "진독도", level: 3, bookTitle: "사라진 우리말을 찾아라!", templateName: "생각 확장 독서록", submittedAt: "2025-10-21", feedbackAt: null, status: "작성전", aiUsed: 0, flowers: 10, anomaly: false, parentSent: false },
  { id: "14", institution: "독도학원", studentName: "진독도", level: 3, bookTitle: "미움을 파는 고슴도치", templateName: "감상 중심 독서록", submittedAt: "2025-09-29", feedbackAt: "2025-09-29", status: "전송완료", aiUsed: 2, flowers: 0, anomaly: false, parentSent: true },
  { id: "10", institution: "독도학원", studentName: "염철범", level: 2, bookTitle: "세상 끝에 있는 너에게", templateName: "감상 중심 독서록", submittedAt: "2025-09-29", feedbackAt: "2025-09-29", status: "전송완료", aiUsed: 2, flowers: 5, anomaly: false, parentSent: true },
  { id: "8", institution: "독도학원", studentName: "진독도", level: 3, bookTitle: "행복한 청소부", templateName: "생각 확장 독서록", submittedAt: "2025-09-24", feedbackAt: "2025-09-24", status: "전송완료", aiUsed: 2, flowers: 0, anomaly: false, parentSent: true },
]

export const AGENCY_ONLINE_WORKBOOKS: OnlineWorkbook[] = AGENCY_ONLINE_WORKBOOK_SEED.map(enrichAgencyWorkbook)

const AGENCY_WORKBOOK_CHANGE_EVENT = "dokdo-agency-workbook-change"
const SHARED_SUBMISSIONS_API = "/api/mock/student-workbook-submissions"

export function getStudentAgencyWorkbookRecordId(workbookId: string) {
  const readingMatch = /^reading-(\d+)-round-(\d+)$/.exec(workbookId)
  if (readingMatch) return String(50000 + Number(readingMatch[1]) * 10 + Number(readingMatch[2]))

  let hash = 0
  for (const character of workbookId) hash = (hash * 31 + character.charCodeAt(0)) % 30000
  return String(60000 + hash)
}

function normalizeStudentSubmittedRecord(record: OnlineWorkbook): OnlineWorkbook {
  const sourceWorkbookId = record.sourceWorkbookId ?? (record.id.startsWith("student-") ? record.id.slice("student-".length) : undefined)
  return sourceWorkbookId
    ? { ...record, id: getStudentAgencyWorkbookRecordId(sourceWorkbookId), sourceWorkbookId }
    : record
}

function readStoredStudentSubmittedAgencyWorkbooks() {
  if (typeof window === "undefined") return [] as OnlineWorkbook[]

  try {
    const stored = window.localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.agencyWorkbookSubmissions)
    if (!stored) return [] as OnlineWorkbook[]
    const parsed = JSON.parse(stored) as unknown
    return Array.isArray(parsed) ? (parsed as OnlineWorkbook[]).map(normalizeStudentSubmittedRecord) : []
  } catch {
    window.localStorage.removeItem(STUDENT_MOCK_STORAGE_KEYS.agencyWorkbookSubmissions)
    return [] as OnlineWorkbook[]
  }
}

function getRuntimeStudentSubmittedAgencyWorkbooks(existingIds: Set<string>): OnlineWorkbook[] {
  if (typeof window === "undefined") return [] as OnlineWorkbook[]

  try {
    const stored = window.localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.workbookRuntime)
    if (!stored) return [] as OnlineWorkbook[]
    const runtimeStates = JSON.parse(stored) as Record<string, Partial<WorkbookRuntimeState>>
    const submittedAt = new Date()
    const submittedDate = `${submittedAt.getFullYear()}-${String(submittedAt.getMonth() + 1).padStart(2, "0")}-${String(submittedAt.getDate()).padStart(2, "0")}`

    return Object.entries(runtimeStates).flatMap(([workbookId, runtime]) => {
      if (runtime.status !== "completed" && runtime.status !== "feedback") return []
      const recordId = getStudentAgencyWorkbookRecordId(workbookId)
      if (existingIds.has(recordId)) return []
      const workbook = getWorkbookById(workbookId)
      if (!workbook) return []
      const template = workbook.templates.find((item) => item.id === runtime.selectedTemplateId) ?? workbook.templates[0]
      if (!template) return []
      const readingMatch = /^reading-(\d+)-round-(\d+)$/.exec(workbookId)
      const displayMode = readingMatch
        ? getWorkbookRoundSetting(Number(readingMatch[1])).templates.find((item) => item.templateId === Number(template.id))?.displayMode
        : undefined

      return [{
        id: recordId,
        sourceWorkbookId: workbookId,
        institution: "독도학원",
        studentName: "진독도",
        level: workbook.level,
        bookTitle: workbook.bookTitle,
        templateName: template.title,
        submittedAt: submittedDate,
        feedbackAt: runtime.status === "feedback" ? submittedDate : null,
        status: runtime.status === "feedback" ? "전송완료" as const : "작성전" as const,
        aiUsed: 0,
        flowers: 0,
        anomaly: false,
        parentSent: false,
        parentContactRegistered: true,
        feedbackText: "",
        displayMode: displayMode ?? "items",
        questions: template.questions.map((question, index) => ({
          title: question.title,
          description: question.description,
          answer: runtime.answers?.[index] ?? "",
        })),
      }]
    })
  } catch {
    return [] as OnlineWorkbook[]
  }
}

export function getStudentSubmittedAgencyWorkbooks() {
  const storedRecords = readStoredStudentSubmittedAgencyWorkbooks()
  const runtimeRecords = getRuntimeStudentSubmittedAgencyWorkbooks(new Set(storedRecords.map((record) => record.id)))
  return [...storedRecords, ...runtimeRecords]
}

export async function getSharedStudentSubmittedAgencyWorkbooks() {
  if (typeof window === "undefined") return [] as OnlineWorkbook[]

  try {
    const response = await fetch(SHARED_SUBMISSIONS_API, { cache: "no-store" })
    if (!response.ok) return [] as OnlineWorkbook[]
    const parsed = await response.json() as unknown
    return Array.isArray(parsed) ? (parsed as OnlineWorkbook[]).map(normalizeStudentSubmittedRecord) : []
  } catch {
    return [] as OnlineWorkbook[]
  }
}

export async function getMergedStudentSubmittedAgencyWorkbooks() {
  const records = [...getStudentSubmittedAgencyWorkbooks(), ...await getSharedStudentSubmittedAgencyWorkbooks()]
  return [...new Map(records.map((record) => [record.id, record])).values()]
}

export async function getAgencyWorkbookListAsync() {
  const overrides = await getMergedStudentSubmittedAgencyWorkbooks()
  const overrideById = new Map(overrides.map((record) => [record.id, record]))
  const seedIds = new Set(AGENCY_ONLINE_WORKBOOKS.map((record) => record.id))
  const submittedRecords = overrides.filter((record) => !seedIds.has(record.id))
  const seededRecords = AGENCY_ONLINE_WORKBOOKS.map((record) => overrideById.get(record.id) ?? record)

  return [...submittedRecords, ...seededRecords].filter((record) => !record.rejected)
}

export async function syncStudentSubmittedAgencyWorkbooks() {
  const records = getStudentSubmittedAgencyWorkbooks()
  await Promise.all(records.map(async (record) => {
    try {
      await fetch(SHARED_SUBMISSIONS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      })
    } catch {
      // The local browser state remains available when the shared mock API is temporarily unavailable.
    }
  }))
}

export async function upsertStudentSubmittedAgencyWorkbook(record: OnlineWorkbook) {
  if (typeof window === "undefined") return

  const normalizedRecord = normalizeStudentSubmittedRecord(record)
  const records = readStoredStudentSubmittedAgencyWorkbooks()
  const existingIndex = records.findIndex((item) => item.id === normalizedRecord.id)
  const nextRecords = existingIndex === -1
    ? [normalizedRecord, ...records]
    : records.map((item, index) => index === existingIndex ? normalizedRecord : item)

  window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.agencyWorkbookSubmissions, JSON.stringify(nextRecords))
  window.dispatchEvent(new CustomEvent(AGENCY_WORKBOOK_CHANGE_EVENT))
  try {
    await fetch(SHARED_SUBMISSIONS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizedRecord),
    })
  } catch {
    // The submission is still preserved in this origin's local mock state.
  }
}

export async function rejectAgencyWorkbook(record: OnlineWorkbook) {
  await upsertStudentSubmittedAgencyWorkbook({ ...record, rejected: true })
  if (!record.sourceWorkbookId || typeof window === "undefined") return

  try {
    const stored = window.localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.workbookRuntime)
    const runtimeStates = stored ? JSON.parse(stored) as Record<string, Partial<WorkbookRuntimeState>> : {}
    const current = runtimeStates[record.sourceWorkbookId] ?? {}
    runtimeStates[record.sourceWorkbookId] = {
      ...current,
      status: "writing",
      answers: [],
      feedbackSeen: false,
    }
    window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.workbookRuntime, JSON.stringify(runtimeStates))
    window.dispatchEvent(new CustomEvent("dokdo-workbook-change"))
  } catch {
    // The rejected agency record is still hidden even if the student runtime cannot be updated.
  }
}

export function subscribeStudentSubmittedAgencyWorkbooks(listener: () => void) {
  if (typeof window === "undefined") return () => undefined

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STUDENT_MOCK_STORAGE_KEYS.agencyWorkbookSubmissions || event.key === STUDENT_MOCK_STORAGE_KEYS.workbookRuntime) listener()
  }
  window.addEventListener(AGENCY_WORKBOOK_CHANGE_EVENT, listener)
  window.addEventListener("dokdo-workbook-change", listener)
  window.addEventListener("storage", handleStorage)
  return () => {
    window.removeEventListener(AGENCY_WORKBOOK_CHANGE_EVENT, listener)
    window.removeEventListener("dokdo-workbook-change", listener)
    window.removeEventListener("storage", handleStorage)
  }
}

export function getAgencyWorkbook(id: string) {
  return getStudentSubmittedAgencyWorkbooks().find((record) => record.id === id)
    ?? AGENCY_ONLINE_WORKBOOKS.find((record) => record.id === id)
    ?? AGENCY_ONLINE_WORKBOOKS[0]
}

export async function getAgencyWorkbookAsync(id: string) {
  return (await getMergedStudentSubmittedAgencyWorkbooks()).find((record) => record.id === id)
    ?? AGENCY_ONLINE_WORKBOOKS.find((record) => record.id === id)
    ?? AGENCY_ONLINE_WORKBOOKS[0]
}
