"use client"
import * as React from "react"
import { reviewReads, subscribeReviewRefresh } from "@/lib/review-refresh"
import { STUDENT_MOCK_STORAGE_KEYS } from "@/lib/student-mock-state"
import { emptyReviewDatabase, type ReviewActor, type ReviewCommand, type ReviewDatabase } from "@/lib/review-domain"
import { agencyStudentTestToken, studentTestApi, studentTestScreen, studentTestScreenEvent, studentTestToken } from "./student-test-context"
export type ReviewRole = ReviewActor["role"]
const eventName = "dokdo-review-change"
export function demoIdentityQuery(role: ReviewRole) {
  if (typeof window === "undefined") return ""
  const params = new URLSearchParams(window.location.search)
  if (role === "student") {
    const id = params.get("demoStudent")
    if (id !== null) sessionStorage.setItem("dokdo-demo-student", id === "normal" ? "" : id)
    const current = sessionStorage.getItem("dokdo-demo-student")
    const token = studentTestToken()
    return (current ? `&demoStudent=${encodeURIComponent(current)}` : "") + (token ? `&studentTest=${encodeURIComponent(token)}` : "")
  }
  const testToken = role === "agency" ? agencyStudentTestToken() : ""
  return (params.get("demoAgency") === "other-agency" ? "&demoAgency=other-agency" : "") + (testToken ? `&studentTest=${encodeURIComponent(testToken)}` : "")
}
export async function reviewSharePath(recordId: string, role: ReviewRole = "student") {
  if (role === "student" && studentTestToken()) throw new Error("전용 테스트 데이터는 외부 공유하지 않습니다.")
  const response = await fetch(`/api/mock/review-share?role=${role}${demoIdentityQuery(role)}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recordId})})
  const value = await response.json()
  if (!response.ok) throw new Error(value.message || "공유 링크를 만들지 못했어요.")
  return value.path as string
}
export function notifyReviewChange() { reviewReads.invalidate(); window.dispatchEvent(new Event(eventName)); window.dispatchEvent(new Event("dokdo-workbook-change")) }
function preserveLegacyProgress(db: ReviewDatabase): ReviewDatabase {
  if (typeof window === "undefined") return db
  try {
    const runtime = JSON.parse(localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.workbookRuntime) ?? "{}")
    const submissions = JSON.parse(localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.agencyWorkbookSubmissions) ?? "[]") as { id: string; sourceWorkbookId?: string }[]
    const reviews = db.reviews.filter(c => !c.seeded || (!runtime[c.sourceWorkbookId] && !submissions.some(r => r.id === c.legacyRecordId || r.sourceWorkbookId === c.sourceWorkbookId)))
    return { ...db, reviews, records: db.records.filter(r => reviews.some(c => c.id === r.reviewId)) }
  } catch { return db }
}
export async function readReviews(role: ReviewRole = "student", recordId?: string, options: { fresh?: boolean } = {}): Promise<ReviewDatabase> {
  const sharedToken = role === "external" ? new URLSearchParams(window.location.search).get("share") || recordId : undefined
  const url = role === "external" ? `/api/mock/review-share?token=${encodeURIComponent(sharedToken ?? "")}` : `${studentTestApi("reviews", "/api/mock/online-reviews", role)}?role=${role}${demoIdentityQuery(role)}${recordId ? `&recordId=${encodeURIComponent(recordId)}` : ""}`
  const db = await reviewReads.read<ReviewDatabase>(url, async () => {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.message || "온라인 독후감을 불러오지 못했습니다.") }
    return response.json()
  }, options)
  return preserveLegacyProgress(db)
}
export async function commandReview(command: ReviewCommand, role: ReviewRole = "student", requestId = crypto.randomUUID()): Promise<ReviewDatabase> {
  const response = await fetch(`${studentTestApi("reviews", "/api/mock/online-reviews", role)}?role=${role}${demoIdentityQuery(role)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command, requestId }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || "처리에 실패했습니다.")
  notifyReviewChange()
  return preserveLegacyProgress(result)
}
export function useReviews(role: ReviewRole = "student", recordId?: string) {
  const [db, setDb] = React.useState(emptyReviewDatabase)
  const [loaded, setLoaded] = React.useState(false)
  const [error, setError] = React.useState("")
  const [screen, setScreen] = React.useState<ReturnType<typeof studentTestScreen>>("normal")
  const requestSequence = React.useRef(0)
  const refresh = React.useCallback(async () => {
    const sequence = ++requestSequence.current
    try {
      const next = await readReviews(role, recordId)
      if (sequence === requestSequence.current) { setDb(next); setError("") }
    } catch (e) { if (sequence === requestSequence.current) setError(String(e)) }
    finally { if (sequence === requestSequence.current) setLoaded(true) }
  }, [role, recordId])
  React.useEffect(() => {
    return subscribeReviewRefresh(refresh)
  }, [refresh])
  React.useEffect(() => {
    const sync = () => setScreen(role === "student" ? studentTestScreen() : "normal")
    sync(); window.addEventListener(studentTestScreenEvent, sync)
    return () => window.removeEventListener(studentTestScreenEvent, sync)
  }, [role])
  const run = async (command: ReviewCommand, requestId?: string) => {
    try { const next = await commandReview(command, role, requestId); ++requestSequence.current; setDb(next); setError(""); return next }
    catch (e) { setError(e instanceof Error ? e.message : "처리에 실패했습니다."); return null }
  }
  // Display faults are separate from student fixtures. No saved data or policy is changed.
  return { db: screen === "normal" ? db : { ...db, reviews: [], records: [] }, loaded: screen === "loading" ? false : loaded, error: screen === "error" ? "피드백 정보를 불러오지 못했어요. 다시 확인해 주세요." : error, run, refresh }
}
