import type { ReviewDatabase } from "./review-domain"

// Canonical name followed by exact former fixture labels. Custom names are not aliases.
const demoNames: Record<string, readonly [string, ...string[]]> = {
  "pro-demo-1": ["박프로", "프로 신청예시", "박프로(신청예시)", "박프로(작성필요)"],
  "pro-demo-2": ["최프로", "프로 이월예시", "최프로(이월예시)", "최프로(선정대기)"],
  "pro-demo-3": ["정프로", "프로 권수소진", "정프로(권수소진)", "정프로(한도사용)"],
  "pro-demo-4": ["이프로", "프로 처리지연", "이프로(처리지연)"],
  "pro-demo-5": ["한프로", "프로 수정대기", "한프로(수정대기)", "한프로(2차대기)"],
  "pro-demo-6": ["김프로", "프로 기록승계", "김프로(기록승계)", "김프로(전송대기)"],
  "pro-demo-7": ["윤프로", "프로 배정대기", "윤프로(배정대기)"],
  "pro-demo-8": ["장프로", "프로 종료예시", "장프로(종료예시)"],
  "pro-demo-10": ["강프로", "타기관 프로예시", "강프로(타기관)"],
  "pro-demo-attention": ["오프로", "프로 집중관리 예시", "오프로(집중관리)"],
  "pro-demo-hq-check": ["임프로", "프로 본사확인 예시", "임프로(본사확인)"],
  "pro-demo-complete": ["서프로", "서프로(관리완료)"],
  "pro-demo-second": ["강프로", "강프로(2차피드백)"],
}

export function proDemoStudentName(id: string) {
  return demoNames[id]?.[0]
}
const demoBooks: Record<string, readonly [string, string]> = {
  "review-pro-migrated-pending": ["승계된 작성 기록", "별을 찾는 아이"],
  "review-pro-migrated-sent": ["승계된 완성 기록", "바다를 건너온 편지"],
}

/** Rename only the original synthetic labels. Never reset user edits or learning history. */
function refreshCurrentLabels(db: ReviewDatabase): ReviewDatabase {
  if (!db.pro) return db
  const names = new Map(db.pro.members.flatMap(member => {
    const label = demoNames[member.id]
    return label?.includes(member.name) ? [[member.id, label] as const] : []
  }))
  let changed = false
  const members = db.pro.members.map(member => {
    const label = names.get(member.id)
    if (!label || member.name === label[0]) return member
    changed = true
    return { ...member, name: label[0] }
  })
  const reviews = db.reviews.map(review => {
    const name = names.get(review.studentId)
    const book = review.studentId === "pro-demo-6" ? demoBooks[review.id] : undefined
    const studentName = name?.includes(review.studentName) ? name[0] : review.studentName
    const bookTitle = book && review.bookTitle === book[0] ? book[1] : review.bookTitle
    if (studentName === review.studentName && bookTitle === review.bookTitle) return review
    changed = true
    return { ...review, studentName, bookTitle }
  })
  return changed ? { ...db, reviews, pro: { ...db.pro, members } } : db
}

export function refreshProDemoLabels(db: ReviewDatabase): ReviewDatabase {
  const current = refreshCurrentLabels(db)
  const baseline = db.proTestBaseline
  if (!baseline) return current
  // Returning from date-test mode must not restore the former fixture names.
  const refreshed = refreshCurrentLabels({ version: 1, ...baseline })
  if (refreshed.pro === baseline.pro && refreshed.reviews === baseline.reviews) return current
  return { ...current, proTestBaseline: { ...baseline, pro: refreshed.pro!, reviews: refreshed.reviews } }
}
