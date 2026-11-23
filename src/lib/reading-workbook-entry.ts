import type { ReviewDatabase } from "./review-domain"
import type { ReadingBookRecord } from "./reading-books"
import { getLinkedWorkbookRoundSetting } from "./workbook-round-settings"
import type { WorkbookTemplateRecord } from "./workbook-templates"

export function canEnterReadingWorkbook(book: Pick<ReadingBookRecord, "id" | "rounds" | "activeOnlineCount">, completedThrough: number, templates: Pick<WorkbookTemplateRecord, "id" | "reviewed">[]) {
  if (book.activeOnlineCount <= 0 || completedThrough !== book.rounds) return false
  const setting = getLinkedWorkbookRoundSetting(book.id, book.rounds)
  if (!setting || setting.reviewed === false) return false
  return setting.templates.some(link => templates.some(template => template.id === link.templateId && template.reviewed))
}

export function readingWorkbookEntry(db: Pick<ReviewDatabase, "reviews" | "records">, bookId: number, lastRound: number) {
  const source = `reading-${bookId}-round-${lastRound}`
  // db is scoped to the student. Prefer a real saved round, including older workbook aliases.
  const reviews = db.reviews.filter(review => review.sourceWorkbookId === source || review.sourceReadingWorkbookId === source ||
    (review.sourceBookId === bookId && review.sourceReadingRound === lastRound))
  const latest = reviews.flatMap(review => {
    const record = db.records.filter(item => item.reviewId === review.id).sort((a, b) => b.round - a.round)[0]
    if (!record) return []
    const updatedAt = [review.createdAt, record.savedAt ?? "", record.submittedAt ?? "", record.rejectedAt ?? ""].sort().at(-1)!
    return [{ review, record, updatedAt }]
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.review.id.localeCompare(a.review.id))[0]
  const workbookId = latest?.review.sourceWorkbookId ?? source
  return `/student/online-workbook/${encodeURIComponent(workbookId)}?round=${latest?.record?.round ?? 1}`
}
