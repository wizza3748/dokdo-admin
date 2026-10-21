import { READING_BOOKS } from "./reading-books"
import { READING_BOOK_COVERS } from "./reading-book-covers"
import type { ReviewDatabase } from "./review-domain"

// Case roles are not book titles. Resolve them through the existing book catalog.
const roleBookIds: Readonly<Record<string, number>> = {
  "이어 쓰는 이야기": 297,
  "신청할 글": 297,
  "신청할 글 1": 297,
  "신청할 글 2": 726,
  "신청할 글 3": 725,
  "기존 신청 1": 297,
  "기존 신청 2": 726,
  "바꿀 글": 725,
  "추가로 신청할 글": 729,
  "도착한 글": 297,
  "이번 주 신청한 글": 726,
  "두 번째 생각": 297,
  "다시 다듬는 글": 297,
  "미선정 글": 297,
  "자동 선정 글": 726,
  "다음 주 글": 725,
  "지난 관리 월 글": 297,
  "새 관리 월 글": 726,
}

export function studentTestBook(role: string) {
  const book = READING_BOOKS.find(book => book.id === roleBookIds[role])
  const cover = book && READING_BOOK_COVERS[book.id]
  if (!book || !cover) throw new Error(`전용 예시에 연결할 도서·표지가 없습니다: ${role}`)
  return { sourceBookId: book.id, bookTitle: book.title, bookCoverSrc: cover, level: book.level }
}

export function studentTestBookPath(path: string) {
  return path.replace(/‘([^’]+)’/g, (original, role: string) => roleBookIds[role] ? `‘${studentTestBook(role).bookTitle}’` : original)
}

/** Existing dedicated sessions receive metadata only; no reset, record or audit changes. */
export function connectStudentTestBooks(db: ReviewDatabase, caseId: string) {
  let changed = false
  const reviews = db.reviews.map(review => {
    if (!review.id.startsWith(`test-${caseId}-`) || !roleBookIds[review.bookTitle]) return review
    changed = true
    return { ...review, ...studentTestBook(review.bookTitle) }
  })
  return changed ? { ...db, reviews } : db
}
