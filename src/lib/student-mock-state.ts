export const STUDENT_MOCK_STORAGE_KEYS = {
  readingFavorites: "dokdo-student-reading-favorites",
  readingCompletedRounds: "dokdo-student-reading-completed-rounds",
  readingRoundResults: "dokdo-student-reading-round-results",
  readingQuizOverrides: "dokdo-reading-quiz-overrides",
  explorationRecords: "dokdo-transient-reading-records",
  workbookRuntime: "dokdo-student-workbook-runtime",
  agencyWorkbookSubmissions: "dokdo-student-agency-workbook-submissions",
} as const

const READING_ROUND_CHANGE_EVENT = "dokdo-reading-round-change"

export type ReadingRoundResult = {
  completedAt: string
  correctCount: number
  totalQuestions: number
}

function getLocalDateValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function readCompletedReadingRounds() {
  if (typeof window === "undefined") return new Set<string>()

  try {
    const stored = window.localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.readingCompletedRounds)
    if (!stored) return new Set<string>()
    const parsed = JSON.parse(stored) as unknown
    return Array.isArray(parsed)
      ? new Set(parsed.filter((value): value is string => typeof value === "string"))
      : new Set<string>()
  } catch {
    window.localStorage.removeItem(STUDENT_MOCK_STORAGE_KEYS.readingCompletedRounds)
    return new Set<string>()
  }
}

export function getCompletedReadingRoundCount() {
  return readCompletedReadingRounds().size
}

export function getCompletedReadingRoundsByBook() {
  const completedByBook: Record<number, number> = {}

  readCompletedReadingRounds().forEach((completedRound) => {
    const [bookIdValue, roundValue] = completedRound.split(":")
    const bookId = Number(bookIdValue)
    const round = Number(roundValue)
    if (!Number.isInteger(bookId) || !Number.isInteger(round) || round < 1) return
    completedByBook[bookId] = Math.max(completedByBook[bookId] ?? 0, round)
  })

  return completedByBook
}

export function getReadingRoundResultsByBook() {
  if (typeof window === "undefined") return {} as Record<number, Record<number, ReadingRoundResult>>

  try {
    const stored = window.localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.readingRoundResults)
    if (!stored) return {} as Record<number, Record<number, ReadingRoundResult>>
    return JSON.parse(stored) as Record<number, Record<number, ReadingRoundResult>>
  } catch {
    window.localStorage.removeItem(STUDENT_MOCK_STORAGE_KEYS.readingRoundResults)
    return {} as Record<number, Record<number, ReadingRoundResult>>
  }
}

export function markReadingRoundCompleted(bookId: number, round: number, result?: Pick<ReadingRoundResult, "correctCount" | "totalQuestions">) {
  if (typeof window === "undefined") return 0

  const completedRounds = readCompletedReadingRounds()
  completedRounds.add(`${bookId}:${round}`)
  window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.readingCompletedRounds, JSON.stringify([...completedRounds]))
  const roundResults = getReadingRoundResultsByBook()
  roundResults[bookId] = {
    ...(roundResults[bookId] ?? {}),
    [round]: roundResults[bookId]?.[round] ?? {
      completedAt: getLocalDateValue(),
      correctCount: result?.correctCount ?? 0,
      totalQuestions: result?.totalQuestions ?? 6,
    },
  }
  window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.readingRoundResults, JSON.stringify(roundResults))
  window.dispatchEvent(new CustomEvent(READING_ROUND_CHANGE_EVENT, { detail: completedRounds.size }))
  return completedRounds.size
}

export function subscribeCompletedReadingRoundCount(listener: () => void) {
  if (typeof window === "undefined") return () => undefined

  window.addEventListener(READING_ROUND_CHANGE_EVENT, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(READING_ROUND_CHANGE_EVENT, listener)
    window.removeEventListener("storage", listener)
  }
}

export async function resetStudentMockState() {
  if (typeof window === "undefined") return
  Object.values(STUDENT_MOCK_STORAGE_KEYS).forEach((key) => {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  })
  try {
    await fetch("/api/mock/student-workbook-submissions", { method: "DELETE" })
  } catch {
    // Local mock data has still been cleared even if the shared mock API is unavailable.
  }
}
