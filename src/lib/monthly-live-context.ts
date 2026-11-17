import type { ReviewDatabase } from "./review-domain"

/** Leaving a private example must not rewind the shared clock-test baseline. */
export function monthlyLiveState(db: ReviewDatabase, request: Request): ReviewDatabase {
  const params = new URL(request.url).searchParams
  return params.get("monthlyLive") === "1" && !params.has("monthlyTest") && !params.has("studentTest") && ["agency", "admin"].includes(params.get("role") ?? "") && db.pro
    ? { ...db, pro: { ...db.pro, clockMode: "real" } } : db
}
export function preserveSharedClock(previous: ReviewDatabase, next: ReviewDatabase, request: Request): ReviewDatabase {
  return monthlyLiveState(previous, request) !== previous && previous.pro && next.pro
    ? { ...next, pro: { ...next.pro, clock: previous.pro.clock, clockMode: previous.pro.clockMode } } : next
}
