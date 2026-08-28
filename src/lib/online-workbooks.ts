export type FeedbackStatus = "작성전" | "작성완료" | "전송완료"

export interface OnlineWorkbook {
  id: string
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

export const AGENCY_ONLINE_WORKBOOKS: OnlineWorkbook[] = [
  { id: "42784", institution: "독도학원", studentName: "진독도", level: 1, bookTitle: "감은장아기", templateName: "정보 정리 독서록", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", aiUsed: 1, flowers: 15, anomaly: false, parentSent: false },
  { id: "37335", institution: "독도학원", studentName: "란테스트", level: 4, bookTitle: "왜 이런 이름이 생겼을까? : 자연", templateName: "정보 정리 독서록", submittedAt: "2026-07-20", feedbackAt: null, status: "작성전", aiUsed: 0, flowers: 0, anomaly: false, parentSent: false },
  { id: "27409", institution: "독도학원", studentName: "진독도", level: 4, bookTitle: "1등 없는 1등", templateName: "감상 중심 독서록", submittedAt: "2026-06-09", feedbackAt: "2026-06-09", status: "전송완료", aiUsed: 1, flowers: 5, anomaly: false, parentSent: false },
  { id: "20119", institution: "독도학원", studentName: "윤섭", level: 4, bookTitle: "1등 없는 1등", templateName: "감상 중심 독서록", submittedAt: "2026-04-22", feedbackAt: "2026-04-22", status: "전송완료", aiUsed: 2, flowers: 0, anomaly: false, parentSent: false },
  { id: "16447", institution: "독도학원", studentName: "염철범", level: 5, bookTitle: "갈릴레이의 춤추는 생각", templateName: "생각 확장 독서록", submittedAt: "2026-03-11", feedbackAt: "2026-04-08", status: "전송완료", aiUsed: 1, flowers: 10, anomaly: false, parentSent: true },
  { id: "14894", institution: "독도학원", studentName: "진독도", level: 2, bookTitle: "가장 멋진 크리스마스", templateName: "정보 정리 독서록", submittedAt: "2026-02-06", feedbackAt: null, status: "작성전", aiUsed: 0, flowers: 0, anomaly: false, parentSent: false },
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

export function getAgencyWorkbook(id: string) {
  return AGENCY_ONLINE_WORKBOOKS.find((record) => record.id === id) ?? AGENCY_ONLINE_WORKBOOKS[0]
}
