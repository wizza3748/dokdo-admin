import {
  COMMON_READING_QUIZ,
  READING_QUESTION_AREAS,
  type ReadingQuizQuestion,
} from "@/lib/reading-exploration"

export const READING_QUIZ_OVERRIDE_STORAGE_KEY = "dokdo-reading-quiz-overrides"

type QuizOverrides = Record<string, ReadingQuizQuestion[]>

function getKey(bookId: number, round: number) {
  return `${bookId}:${round}`
}

function cloneQuestions(questions: ReadingQuizQuestion[]) {
  return questions.map((question, index) => {
    const fallback = COMMON_READING_QUIZ[index % COMMON_READING_QUIZ.length]
    const area = READING_QUESTION_AREAS.includes(question.area) ? question.area : fallback.area

    return {
      ...fallback,
      ...question,
      area,
      options: [...question.options] as ReadingQuizQuestion["options"],
      explanations: [...(question.explanations ?? fallback.explanations)] as ReadingQuizQuestion["explanations"],
      pageReferences: (question.pageReferences ?? fallback.pageReferences).map((reference) => ({
        paper: reference?.paper ?? "-",
        ebook: reference?.ebook ?? "-",
      })) as ReadingQuizQuestion["pageReferences"],
      wrongAnswerHint: question.wrongAnswerHint ?? "",
    }
  })
}

function readOverrides(): QuizOverrides {
  if (typeof window === "undefined") return {}
  try {
    const value = window.localStorage.getItem(READING_QUIZ_OVERRIDE_STORAGE_KEY)
    return value ? JSON.parse(value) as QuizOverrides : {}
  } catch {
    window.localStorage.removeItem(READING_QUIZ_OVERRIDE_STORAGE_KEY)
    return {}
  }
}

export function getReadingRoundQuiz(bookId: number, round: number) {
  const override = readOverrides()[getKey(bookId, round)]
  return cloneQuestions(override?.length ? override : COMMON_READING_QUIZ)
}

export function saveReadingRoundQuiz(bookId: number, round: number, questions: ReadingQuizQuestion[]) {
  if (typeof window === "undefined") return
  const overrides = readOverrides()
  overrides[getKey(bookId, round)] = cloneQuestions(questions)
  window.localStorage.setItem(READING_QUIZ_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides))
}

export function resetReadingRoundQuiz(bookId: number, round: number) {
  if (typeof window === "undefined") return cloneQuestions(COMMON_READING_QUIZ)
  const overrides = readOverrides()
  delete overrides[getKey(bookId, round)]
  window.localStorage.setItem(READING_QUIZ_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides))
  return cloneQuestions(COMMON_READING_QUIZ)
}
