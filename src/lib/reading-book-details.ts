import type { ReadingBookRecord } from "@/lib/reading-books"

export type ReadingBookRoundDetail = {
  round: number
  startPage: number
  endPage: number
  pdfStartPage: number
  pdfEndPage: number
  questionCount: number
}

export type ReadingBookCurriculumLink = {
  kind: "교과 주제 밀착" | "수업 보조 자료"
  school: string
  subject: string
  grade: string
  semester: string
  unit: string
}

export type ReadingBookDetailData = {
  isbn: string
  author: string
  publishedAt: string
  introduction: string
  tags: string[]
  recommendedAge: string
  classification: string
  tableOfContents: string
  summary: string
  curriculumLinks: ReadingBookCurriculumLink[]
  rounds: ReadingBookRoundDetail[]
}

const LIVE_DETAIL_OVERRIDES: Record<number, Partial<ReadingBookDetailData>> = {
  730: {
    isbn: "9791161729688",
    author: "김영숙 (지은이), 장경혜 (그림)",
    publishedAt: "2024-10-25",
    introduction: "1919년 3월 1일, 조선의 백성들은 독립을 염원하며 만세 시위를 벌였어요. 이 사건이 바로 잘 알려진 3.1 운동이지요. 이 책은 3.1 운동을 가까이에서 지켜본 푸른 눈의 수의사 스코필드의 행적을 일기 형식으로 재현한 책이에요. 일제의 만행을 세계에 알린 스코필드의 삶, 그리고 독립을 향한 우리 선조들의 열망이 담긴 기록을 살펴볼까요? *이 책은 「푸른 눈의 독립운동가 스코필드 박사의 3.1 운동 일기」를 새롭게 개정하여 펴낸 책입니다.",
    tags: ["노력", "정의", "책임감", "감동"],
    recommendedAge: "12~13세",
    curriculumLinks: [
      { kind: "교과 주제 밀착", school: "초등", subject: "사회", grade: "5학년", semester: "2학기", unit: "3. 식민 통치와 저항, 전쟁이 바꾼 사회와 생활" },
      { kind: "수업 보조 자료", school: "초등", subject: "국어", grade: "6학년", semester: "1학기", unit: "1. 자신의 삶과 관련지어 읽어요" },
    ],
    rounds: [
      { round: 1, startPage: 9, endPage: 41, pdfStartPage: 13, pdfEndPage: 45, questionCount: 6 },
      { round: 2, startPage: 42, endPage: 76, pdfStartPage: 46, pdfEndPage: 80, questionCount: 6 },
      { round: 3, startPage: 77, endPage: 111, pdfStartPage: 81, pdfEndPage: 115, questionCount: 6 },
    ],
  },
  729: { author: "이예숙 (지은이)" },
  291: { author: "김유경 글" },
}

function getRecommendedAge(level: number) {
  if (level <= 2) return "8~9세"
  if (level <= 4) return "10~11세"
  return "12~13세"
}

function buildRounds(book: ReadingBookRecord): ReadingBookRoundDetail[] {
  const totalPages = 72 + (book.id % 8) * 12
  const pagesPerRound = Math.ceil(totalPages / book.rounds)
  return Array.from({ length: book.rounds }, (_, index) => {
    const startPage = index * pagesPerRound + 1
    const endPage = Math.min(totalPages, (index + 1) * pagesPerRound)
    return {
      round: index + 1,
      startPage,
      endPage,
      pdfStartPage: startPage + 4,
      pdfEndPage: endPage + 4,
      questionCount: 6,
    }
  })
}

function buildCurriculumLinks(book: ReadingBookRecord): ReadingBookCurriculumLink[] {
  const subject = book.category === "과학/수학" ? "과학" : book.category === "사회" ? "사회" : "국어"
  const grade = `${Math.min(6, Math.max(1, book.level))}학년`
  return [
    { kind: "교과 주제 밀착", school: "초등", subject, grade, semester: "1학기", unit: `${book.category} 분야의 핵심 내용을 이해해요` },
    { kind: "수업 보조 자료", school: "초등", subject: "국어", grade, semester: "2학기", unit: "자신의 생각을 책의 내용과 관련지어 표현해요" },
  ]
}

export function getReadingBookDetailData(book: ReadingBookRecord): ReadingBookDetailData {
  const override = LIVE_DETAIL_OVERRIDES[book.id]
  const fallback: ReadingBookDetailData = {
    isbn: "",
    author: "",
    publishedAt: "",
    introduction: `《${book.title}》의 주요 내용을 읽고 생각을 넓히는 독서 탐험 도서입니다.`,
    tags: [...new Set([book.category, book.type, book.tendency])],
    recommendedAge: getRecommendedAge(book.level),
    classification: "-",
    tableOfContents: "",
    summary: `《${book.title}》을 읽으며 중요한 내용과 기억에 남는 장면을 차근차근 살펴보세요.`,
    curriculumLinks: buildCurriculumLinks(book),
    rounds: buildRounds(book),
  }
  return { ...fallback, ...override }
}
