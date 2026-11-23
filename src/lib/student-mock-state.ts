import { selectedDemoStudent, studentTestToken } from "./student-test-context"

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

type ReadingResults = Record<number, Record<number, ReadingRoundResult>>
type ReadingProgress = { results: ReadingResults; history: ReadingRoundCompletion[] }
const progressKey = "dokdo-student-reading-progress"

export function currentReadingOwner() {
  return { studentId: selectedDemoStudent() || "26142", studentTest: studentTestToken() }
}
type ReadingOwner = ReturnType<typeof currentReadingOwner>

export function studentReadingStorageKey(base: string, owner: ReadingOwner) {
  return `${base}:${encodeURIComponent(owner.studentId)}:${encodeURIComponent(owner.studentTest)}`
}

export function hasReadingOwner(entry: { studentId?: string; studentTest?: string }, owner: ReadingOwner) {
  return entry.studentId === owner.studentId && (entry.studentTest ?? "") === owner.studentTest
}

function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null") ?? fallback
  } catch {
    return fallback
  }
}

function ownProgress(owner: ReadingOwner): ReadingProgress {
  return readStored(studentReadingStorageKey(progressKey, owner), { results: {}, history: [] })
}

function readingProgress(): ReadingProgress {
  if (typeof window === "undefined") return { results: {}, history: [] }
  const owner = currentReadingOwner()
  const { results, history } = ownProgress(owner)
  // Older shared keys had no student by default. Only an explicitly attributed entry can be used.
  const sharedResults = readStored<Record<string, Record<string, ReadingRoundResult & Partial<ReadingOwner>>>>(
    STUDENT_MOCK_STORAGE_KEYS.readingRoundResults, {})
  for (const [bookId, rounds] of Object.entries(sharedResults)) {
    for (const [round, result] of Object.entries(rounds ?? {})) {
      if (result?.completedAt && hasReadingOwner(result, owner)) {
        const byRound = results[Number(bookId)] ??= {}
        byRound[Number(round)] ??= result
      }
    }
  }
  const sharedHistory = readStored<Array<ReadingRoundCompletion & Partial<ReadingOwner>>>(STUDENT_MOCK_STORAGE_KEYS.readingCompletionHistory, [])
  if (Array.isArray(sharedHistory)) {
    history.push(...sharedHistory.filter(entry => entry && hasReadingOwner(entry, owner) && Number.isInteger(entry.bookId) && Number.isInteger(entry.round) && Number.isFinite(Date.parse(entry.completedAt))))
  }
  return { results, history }
}

export function getCompletedReadingRoundCount() {
  const today = getKoreanDateValue()
  return readingProgress().history.filter(entry => getKoreanDateValue(new Date(entry.completedAt)) === today).length
}

function completedByBook() {
  const { results, history } = readingProgress()
  const books = new Map<number, Set<number>>()
  const add = (book: number, round: number) => {
    if (!Number.isInteger(book) || !Number.isInteger(round) || round < 1) return
    const rounds = books.get(book) ?? new Set<number>()
    rounds.add(round)
    books.set(book, rounds)
  }
  for (const [book, rounds] of Object.entries(results)) {
    for (const [round, result] of Object.entries(rounds)) if (result?.completedAt) add(Number(book), Number(round))
  }
  for (const entry of history) add(entry.bookId, entry.round)
  return books
}

export function getCompletedReadingRoundsByBook(): Record<number, number> {
  return Object.fromEntries([...completedByBook()].map(([book, rounds]) => [book, consecutiveQuizRounds(rounds, rounds.size)]))
}

export function completedQuizRounds(bookId: number) {
  return completedByBook().get(bookId) ?? new Set<number>()
}

export function consecutiveQuizRounds(completed: ReadonlySet<number>, total: number) {
  let round = 0
  while (round < total && completed.has(round + 1)) round++
  return round
}

export function getReadingRoundResultsByBook() {
  return readingProgress().results
}

export function markReadingRoundCompleted(bookId: number, round: number, result?: Omit<ReadingRoundResult, "completedAt">) {
  if (typeof window === "undefined") return 0
  const owner = currentReadingOwner(), completedAt = new Date()
  const progress = ownProgress(owner)
  const byRound = progress.results[bookId] ??= {}
  byRound[round] ??= getReadingRoundResultsByBook()[bookId]?.[round] ?? {
    correctCount: 0, totalQuestions: 6, ...result, completedAt: getKoreanDateValue(completedAt),
  }
  progress.history.push({ bookId, round, completedAt: completedAt.toISOString() })
  window.localStorage.setItem(studentReadingStorageKey(progressKey, owner), JSON.stringify(progress))
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
  const owner = currentReadingOwner()
  window.localStorage.removeItem(studentReadingStorageKey(progressKey, owner))
  window.localStorage.removeItem(studentReadingStorageKey(STUDENT_MOCK_STORAGE_KEYS.explorationRecords, owner))
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
