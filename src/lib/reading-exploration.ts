import type { ReadingBookRecord } from "@/lib/reading-books"

export const READING_QUESTION_AREAS = ["사실", "추론", "비판"] as const

export type ReadingQuestionArea = (typeof READING_QUESTION_AREAS)[number]

export type ReadingQuizPageReference = {
  paper: string
  ebook: string
}

export type ReadingQuizQuestion = {
  question: string
  options: [string, string, string, string]
  correctOption: 1 | 2 | 3 | 4
  area: ReadingQuestionArea
  explanations: [string, string, string, string]
  pageReferences: [ReadingQuizPageReference, ReadingQuizPageReference, ReadingQuizPageReference, ReadingQuizPageReference]
  wrongAnswerHint: string
}

function createCommonQuestion(
  question: string,
  options: ReadingQuizQuestion["options"],
  correctOption: ReadingQuizQuestion["correctOption"],
  area: ReadingQuestionArea,
): ReadingQuizQuestion {
  return {
    question,
    options,
    correctOption,
    area,
    explanations: options.map((option, index) => index === correctOption - 1
      ? `정답은 “${option}”입니다.`
      : "책의 내용과 맞지 않는 선택지입니다.") as ReadingQuizQuestion["explanations"],
    pageReferences: options.map(() => ({ paper: "-", ebook: "-" })) as ReadingQuizQuestion["pageReferences"],
    wrongAnswerHint: "",
  }
}

// 모든 도서·모든 회차에서 함께 사용하는 독서 확인용 공통 문항입니다.
export const COMMON_READING_QUIZ: ReadingQuizQuestion[] = [
  createCommonQuestion("이 책의 중심 내용을 가장 잘 확인하는 방법은 무엇일까요?", ["표지만 다시 본다.", "책의 두께만 살펴본다.", "중요한 사건과 정보를 다시 살펴본다.", "마지막 문장만 외운다."], 3, "사실"),
  createCommonQuestion("책 속 인물의 마음을 이해하려면 어떻게 해야 할까요?", ["내 생각대로 짐작한다.", "인물의 이름만 기억한다.", "말과 행동이 나온 장면을 근거로 생각한다.", "등장인물 수를 센다."], 3, "추론"),
  createCommonQuestion("책의 사건 순서를 알기 쉽게 정리하는 방법은 무엇일까요?", ["기억나는 단어만 쓴다.", "끝 장면부터 거꾸로 적는다.", "처음·가운데·끝의 핵심 사건을 차례로 정리한다.", "그림이 있는 장면만 고른다."], 3, "사실"),
  createCommonQuestion("책에서 새롭게 알게 된 내용을 잘 설명하는 방법은 무엇일까요?", ["제목만 반복한다.", "친구의 말을 그대로 쓴다.", "책 속 근거와 함께 내 말로 설명한다.", "모르는 내용은 모두 뺀다."], 3, "사실"),
  createCommonQuestion("책에 대한 내 생각을 잘 표현하는 방법은 무엇일까요?", ["좋다 또는 싫다고만 쓴다.", "줄거리를 모두 베껴 쓴다.", "내 생각과 이유를 책의 내용과 연결한다.", "책의 쪽수만 적는다."], 3, "비판"),
  createCommonQuestion("이 책을 다른 사람에게 소개할 때 알맞은 방법은 무엇일까요?", ["표지 색만 이야기한다.", "결말만 먼저 알려 준다.", "줄거리와 기억에 남는 점, 추천 이유를 함께 말한다.", "책 제목은 말하지 않는다."], 3, "비판"),
]

export function sortStudentReadingBooks(books: ReadingBookRecord[]) {
  return [...books].sort((a, b) =>
    a.level - b.level
    || Number(a.rounds !== 1) - Number(b.rounds !== 1)
    || a.rounds - b.rounds
    || a.title.localeCompare(b.title, "ko")
    || b.id - a.id)
}

export function getBookSummary(book: ReadingBookRecord) {
  return `《${book.title}》을 읽으며 중요한 내용과 기억에 남는 장면을 차근차근 살펴보세요. ${book.category} 분야의 이야기를 따라가며 새롭게 알게 된 점과 나만의 생각을 발견할 수 있어요.`
}

export function getRoundPages(book: ReadingBookRecord, round: number) {
  const totalPages = 72 + (book.id % 8) * 12
  const perRound = Math.ceil(totalPages / book.rounds)
  const start = (round - 1) * perRound + 1
  return { start, end: Math.min(totalPages, round * perRound), totalPages }
}
