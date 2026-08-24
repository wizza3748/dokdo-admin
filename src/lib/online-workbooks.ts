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
