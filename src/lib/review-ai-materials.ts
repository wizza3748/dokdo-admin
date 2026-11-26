import { READING_BOOKS } from "@/lib/reading-books"
import { getReadingBookDetailData } from "@/lib/reading-book-details"
import { getReadingRoundQuiz } from "@/lib/reading-quiz-settings"
import type { ReviewCommon } from "@/lib/review-domain"
import type { QuizRound } from "@/lib/review-prompts"

export function reviewBookMaterials(review: Pick<ReviewCommon, "bookTitle" | "sourceBookId">) {
  const book = READING_BOOKS.find(b => review.sourceBookId ? b.id === review.sourceBookId : b.title === review.bookTitle)
  if (!book) return { synopsis: "", quiz: [] }
  const detail = getReadingBookDetailData(book)
  const quiz: QuizRound[] = detail.rounds.flatMap(({ round, questionCount }) => {
    if (!questionCount) return []
    const questions = getReadingRoundQuiz(book.id, round).map(q => ({
      question: q.question, area: q.area, answer: q.options[q.correctOption - 1], explanation: q.explanations[q.correctOption - 1],
    }))
    return questions.length ? [{ round, questions }] : []
  })
  return { synopsis: detail.summary, quiz }
}
