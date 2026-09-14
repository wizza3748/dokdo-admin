type DailyReadingRecord = {
  id?: string
  workbookId: string
  year: number
  month: number
  day: number
  occurredAt?: string
}

type ExplorationTimelineItem = {
  activityAt: number
  sourceOrder: number
  reviewId?: string
  round?: 1 | 2
}

/** Storage is newest-first. Keep the latest attempt per book/round/day for display. */
export function latestDailyReadingRecords<T extends DailyReadingRecord>(records: T[]): T[] {
  const seen = new Set<string>()
  return records.filter(record => {
    const key = JSON.stringify([record.year, record.month, record.day, record.workbookId])
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** New records have an explicit timestamp; old local records recover it from their generated id. */
export function readingRecordActivityTimestamp(record: DailyReadingRecord) {
  const explicitTimestamp = Date.parse(record.occurredAt ?? "")
  if (Number.isFinite(explicitTimestamp)) return explicitTimestamp

  const generatedTimestamp = /-(\d{13})-\d+$/.exec(record.id ?? "")
  if (generatedTimestamp) return Number(generatedTimestamp[1])

  return new Date(record.year, record.month - 1, record.day).getTime()
}

/** Sort every activity newest-first while keeping the rounds of one review together. */
export function sortExplorationTimelineItems<T extends ExplorationTimelineItem>(items: T[]) {
  return [...items].sort((a, b) => {
    const activityOrder = b.activityAt - a.activityAt
    if (activityOrder) return activityOrder
    if (a.reviewId && a.reviewId === b.reviewId) return (b.round ?? 0) - (a.round ?? 0)
    return a.sourceOrder - b.sourceOrder
  })
}
