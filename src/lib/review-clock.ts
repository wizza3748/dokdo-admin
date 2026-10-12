import type { ReviewDatabase } from "./review-domain"

/** Stored legacy clocks are inert until an explicit test-mode command is made. */
export function reviewNow(db: ReviewDatabase, serverNow: string) {
  return db.pro?.clockMode === "test" && Number.isFinite(Date.parse(db.pro.clock)) ? db.pro.clock : serverNow
}

export function atReviewTime(db: ReviewDatabase, serverNow: string): ReviewDatabase {
  const now = reviewNow(db, serverNow)
  return { ...db, ...(db.pro ? { pro: { ...db.pro, clockMode: db.pro.clockMode === "test" ? "test" : "real", clock: now } } : {}) }
}

/** Live time is response/command context, not a reason to rewrite Redis every poll. */
export function persistReviewTime(previous: ReviewDatabase, next: ReviewDatabase): ReviewDatabase {
  const saved = next.pro?.clockMode !== "test" && previous.pro
    ? { ...next, pro: { ...next.pro!, clock: previous.pro.clock ?? next.pro!.clock } } : next
  return JSON.stringify(saved) === JSON.stringify(previous) ? previous : saved
}

export function beginProClockTest(db: ReviewDatabase) {
  if (!db.pro || db.pro.clockMode === "test") return
  const ids = new Set(db.pro.members.filter(m => m.product === "pro").map(m => m.id))
  const reviews = db.reviews.filter(r => ids.has(r.studentId) || db.pro!.cases.some(c => c.reviewId === r.id))
  db.proTestBaseline = structuredClone({ pro: db.pro, reviews, records: db.records.filter(r => reviews.some(c => c.id === r.reviewId)) })
}

/** Undo only this test session's Pro mutations; never rewind ordinary students. */
export function endProClockTest(db: ReviewDatabase, serverNow: string): ReviewDatabase {
  const baseline = db.proTestBaseline
  if (baseline) {
    const ids = new Set(baseline.pro.members.filter(m => m.product === "pro").map(m => m.id))
    const testIds = new Set(db.reviews.filter(r => ids.has(r.studentId) || db.pro!.cases.some(c => c.reviewId === r.id)).map(r => r.id))
    const baselineIds = new Set(baseline.reviews.map(r => r.id))
    db.reviews = db.reviews.flatMap(r => {
      const original = baseline.reviews.find(b => b.id === r.id)
      return original ? [original] : testIds.has(r.id) ? [] : [r]
    })
    db.reviews.push(...baseline.reviews.filter(r => !db.reviews.some(c => c.id === r.id)))
    db.records = db.records.flatMap(r => {
      const original = baseline.records.find(b => b.id === r.id)
      return original ? [original] : testIds.has(r.reviewId) || baselineIds.has(r.reviewId) ? [] : [r]
    })
    db.records.push(...baseline.records.filter(r => !db.records.some(c => c.id === r.id)))
    db.pro = baseline.pro
  }
  delete db.proTestBaseline
  if (db.pro) { db.pro.clockMode = "real"; db.pro.clock = serverNow }
  return db
}
