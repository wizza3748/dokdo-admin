type WorkbookStatus = "작성전" | "작성완료" | "전송완료"

export interface AdminWorkbookRow {
  writingRound?: 1 | 2
  secondDecision?: "request" | "complete"
  reportStatus?: string
  reviewId?: string
  displayNumber?: string
  id: string
  institution: string
  student: string
  level: number
  book: string
  template: string
  submittedAt: string
  submittedAtTime?: string
  feedbackAt: string
  status: WorkbookStatus
  flowers: number
}

export const ADMIN_WORKBOOK_SEEDS: AdminWorkbookRow[] = [
  { id: "42784", institution: "개발테스트학원", student: "진독도", level: 1, book: "감은장아기", template: "68.[저] 통합형 독서록 – 독서 일기", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 15 },
  { id: "42765", institution: "인천교육청-채 경미", student: "이현민", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42741", institution: "전주용흥초등학교", student: "13번", level: 3, book: "기차 타고 부산에서 런던까지", template: "4.[중] 통합형 독서록 – 기본", submittedAt: "2026-08-24", feedbackAt: "", status: "작성전", flowers: 20 },
  { id: "42728", institution: "인천교육청-채 경미", student: "김소은", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42727", institution: "인천교육청-채 경미", student: "이다은", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42704", institution: "인천교육청-채 경미", student: "전유하", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42692", institution: "인천교육청-채 경미", student: "이아인", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42618", institution: "인천교육청-채 경미", student: "민지한", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42607", institution: "인천교육청-채 경미", student: "박서아", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42605", institution: "인천교육청-채 경미", student: "이루나", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42569", institution: "인천교육청-채 경미", student: "최하준", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42553", institution: "인천교육청-채 경미", student: "남연우", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42551", institution: "인천교육청-채 경미", student: "권현서", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42543", institution: "인천교육청-채 경미", student: "이소율", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42534", institution: "인천교육청-채 경미", student: "김예서", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42531", institution: "인천교육청-채 경미", student: "이지연", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42520", institution: "인천교육청-채 경미", student: "윤석진", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42511", institution: "인천교육청-채 경미", student: "박준우", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42458", institution: "인천교육청-채 경미", student: "박소윤", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42455", institution: "인천교육청-채 경미", student: "김이나", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
]
