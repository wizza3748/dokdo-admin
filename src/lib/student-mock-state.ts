export const STUDENT_MOCK_STORAGE_KEYS = {
  readingFavorites: "dokdo-student-reading-favorites",
  readingCompletedRounds: "dokdo-student-reading-completed-rounds",
  readingCompletionHistory: "dokdo-student-reading-completion-history",
  readingRoundResults: "dokdo-student-reading-round-results",
  readingQuizOverrides: "dokdo-reading-quiz-overrides",
  explorationRecords: "dokdo-transient-reading-records",
  workbookRuntime: "dokdo-student-workbook-runtime",
  workbookRoundSettings: "dokdo-workbook-round-settings",
  agencyWorkbookSubmissions: "dokdo-student-agency-workbook-submissions",
} as const

const READING_ROUND_CHANGE_EVENT = "dokdo-reading-round-change"
const KOREA_TIME_OFFSET_MS = 9 * 60 * 60 * 1000

export type ReadingRoundResult = {
  completedAt: string
  correctCount: number
  totalQuestions: number
  questionAreas?: Array<"사실" | "추론" | "비판">
  questionResults?: boolean[]
}

type ReadingRoundCompletion = {
  bookId: number
  round: number
  completedAt: string
}

function getKoreanDateValue(date = new Date()) {
  const koreanDate = new Date(date.getTime() + KOREA_TIME_OFFSET_MS)
  const year = koreanDate.getUTCFullYear()
  const month = String(koreanDate.getUTCMonth() + 1).padStart(2, "0")
  const day = String(koreanDate.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getMillisecondsUntilNextKoreanDay(date = new Date()) {
  const koreanDate = new Date(date.getTime() + KOREA_TIME_OFFSET_MS)
  const nextMidnight = Date.UTC(koreanDate.getUTCFullYear(), koreanDate.getUTCMonth(), koreanDate.getUTCDate() + 1) - KOREA_TIME_OFFSET_MS
  return Math.max(0, nextMidnight - date.getTime())
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

function readReadingCompletionHistory() {
  if (typeof window === "undefined") return [] as ReadingRoundCompletion[]

  try {
    const stored = window.localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.readingCompletionHistory)
    if (!stored) return [] as ReadingRoundCompletion[]
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return [] as ReadingRoundCompletion[]
    return parsed.filter((value): value is ReadingRoundCompletion => {
      if (!value || typeof value !== "object") return false
      const completion = value as Partial<ReadingRoundCompletion>
      return Number.isInteger(completion.bookId)
        && Number.isInteger(completion.round)
        && typeof completion.completedAt === "string"
        && Number.isFinite(new Date(completion.completedAt).getTime())
    })
  } catch {
    window.localStorage.removeItem(STUDENT_MOCK_STORAGE_KEYS.readingCompletionHistory)
    return [] as ReadingRoundCompletion[]
  }
}

export function getCompletedReadingRoundCount() {
  const today = getKoreanDateValue()
  return readReadingCompletionHistory().filter((completion) => (
    getKoreanDateValue(new Date(completion.completedAt)) === today
  )).length
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

export function markReadingRoundCompleted(bookId: number, round: number, result?: Omit<ReadingRoundResult, "completedAt">) {
  if (typeof window === "undefined") return 0

  const completedAt = new Date()
  const completedRounds = readCompletedReadingRounds()
  completedRounds.add(`${bookId}:${round}`)
  window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.readingCompletedRounds, JSON.stringify([...completedRounds]))
  const roundResults = getReadingRoundResultsByBook()
  roundResults[bookId] = {
    ...(roundResults[bookId] ?? {}),
    [round]: roundResults[bookId]?.[round] ?? {
      completedAt: getKoreanDateValue(completedAt),
      correctCount: result?.correctCount ?? 0,
      totalQuestions: result?.totalQuestions ?? 6,
      questionAreas: result?.questionAreas,
      questionResults: result?.questionResults,
    },
  }
  window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.readingRoundResults, JSON.stringify(roundResults))
  const completionHistory = readReadingCompletionHistory()
  completionHistory.push({ bookId, round, completedAt: completedAt.toISOString() })
  window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.readingCompletionHistory, JSON.stringify(completionHistory))
  const dailyCompletedCount = getCompletedReadingRoundCount()
  window.dispatchEvent(new CustomEvent(READING_ROUND_CHANGE_EVENT, { detail: dailyCompletedCount }))
  return dailyCompletedCount
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
    await fetch("/api/mock/online-reviews", { method: "DELETE" })
    await fetch("/api/mock/student-workbook-submissions", { method: "DELETE" })
  } catch {
    // Local mock data has still been cleared even if the shared mock API is unavailable.
  }
}
