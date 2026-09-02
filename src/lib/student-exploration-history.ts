import { STUDENT_MOCK_STORAGE_KEYS } from "@/lib/student-mock-state"

export interface TransientReadingExplorationRecord {
  id: string
  workbookId: string
  year: number
  month: number
  day: number
  weekday: string
  type: "책 읽기 탐험"
  level: number
  title: string
  attempt: "첫 탐험" | "재탐험"
  progress: string
  questions: string
}

const transientReadingRecords: TransientReadingExplorationRecord[] = []
let recordSequence = 0

const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]

export function addTransientReadingExplorationRecord(input: {
  bookId: number
  level: number
  title: string
  attempt: TransientReadingExplorationRecord["attempt"]
  currentRound: number
  totalRounds: number
  correctCount: number
  totalQuestions: number
}) {
  const now = new Date()
  recordSequence += 1
  const record: TransientReadingExplorationRecord = {
    id: `live-reading-${input.bookId}-${now.getTime()}-${recordSequence}`,
    workbookId: `reading-${input.bookId}-round-${input.currentRound}`,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    weekday: weekdays[now.getDay()],
    type: "책 읽기 탐험",
    level: input.level,
    title: input.title,
    attempt: input.attempt,
    progress: `${input.currentRound}/${input.totalRounds}`,
    questions: `${input.correctCount}/${input.totalQuestions}`,
  }

  if (typeof window === "undefined") {
    transientReadingRecords.unshift(record)
    return record
  }

  const records = [record, ...getTransientReadingExplorationRecords()]
  window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.explorationRecords, JSON.stringify(records))
  window.sessionStorage.removeItem(STUDENT_MOCK_STORAGE_KEYS.explorationRecords)
  window.dispatchEvent(new CustomEvent("dokdo-exploration-record-change"))
  return record
}

export function getTransientReadingExplorationRecords() {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.explorationRecords)
        ?? window.sessionStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.explorationRecords)
        ?? "[]"
      const records = JSON.parse(stored) as TransientReadingExplorationRecord[]
      if (!window.localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.explorationRecords) && records.length > 0) {
        window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.explorationRecords, JSON.stringify(records))
        window.sessionStorage.removeItem(STUDENT_MOCK_STORAGE_KEYS.explorationRecords)
      }
      return records.filter((record) => typeof record.workbookId === "string")
    } catch {
      return []
    }
  }
  return [...transientReadingRecords]
}
