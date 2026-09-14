"use client"
import * as React from "react"
import { STUDENT_MOCK_STORAGE_KEYS } from "@/lib/student-mock-state"
import { emptyReviewDatabase, type ReviewActor, type ReviewCommand, type ReviewDatabase } from "@/lib/review-domain"
export type ReviewRole = ReviewActor["role"]
const eventName = "dokdo-review-change"
function preserveLegacyProgress(db: ReviewDatabase): ReviewDatabase {
  if (typeof window === "undefined") return db
  try {
    const runtime = JSON.parse(localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.workbookRuntime) ?? "{}")
    const submissions = JSON.parse(localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.agencyWorkbookSubmissions) ?? "[]") as { id: string; sourceWorkbookId?: string }[]
    const reviews = db.reviews.filter(c => !c.seeded || (!runtime[c.sourceWorkbookId] && !submissions.some(r => r.id === c.legacyRecordId || r.sourceWorkbookId === c.sourceWorkbookId)))
    return { ...db, reviews, records: db.records.filter(r => reviews.some(c => c.id === r.reviewId)) }
  } catch { return db }
}
export async function readReviews(role: ReviewRole = "student", recordId?: string): Promise<ReviewDatabase> {
  const response = await fetch(`/api/mock/online-reviews?role=${role}${recordId ? `&recordId=${encodeURIComponent(recordId)}` : ""}`, { cache: "no-store" })
  if (!response.ok) throw new Error("온라인 독후감을 불러오지 못했습니다.")
  return preserveLegacyProgress(await response.json())
}
export async function commandReview(command: ReviewCommand, role: ReviewRole = "student", requestId = crypto.randomUUID()): Promise<ReviewDatabase> {
  const response = await fetch(`/api/mock/online-reviews?role=${role}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command, requestId }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || "처리에 실패했습니다.")
  window.dispatchEvent(new Event(eventName))
  window.dispatchEvent(new Event("dokdo-workbook-change"))
  return preserveLegacyProgress(result)
}
export function useReviews(role: ReviewRole = "student", recordId?: string) {
  const [db, setDb] = React.useState(emptyReviewDatabase)
  const [loaded, setLoaded] = React.useState(false)
  const [error, setError] = React.useState("")
  const refresh = React.useCallback(async () => { try { setDb(await readReviews(role, recordId)); setError("") } catch (e) { setError(String(e)) } finally { setLoaded(true) } }, [role, recordId])
  React.useEffect(() => {
    void refresh()
    const listener = () => { void refresh() }
    window.addEventListener(eventName, listener); window.addEventListener("focus", listener)
    const interval = window.setInterval(listener, 4000)
    return () => { window.removeEventListener(eventName, listener); window.removeEventListener("focus", listener); window.clearInterval(interval) }
  }, [refresh])
  const run = async (command: ReviewCommand, requestId?: string) => {
    try { const next = await commandReview(command, role, requestId); setDb(next); setError(""); return next }
    catch (e) { setError(e instanceof Error ? e.message : "처리에 실패했습니다."); return null }
  }
  return { db, loaded, error, run, refresh }
}
