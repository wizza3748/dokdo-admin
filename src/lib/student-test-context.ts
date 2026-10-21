"use client"

const contextKey = "dokdo-student-test-session"
const screenKey = "dokdo-student-test-screen"
export const studentTestScreenEvent = "dokdo-student-test-screen-change"
export type StudentTestScreen = "normal" | "loading" | "error"
/** Test-list launch option only; ordinary student links are never modified. */
export function studentTestScreenHref(href: string, screen: StudentTestScreen) {
  const url = new URL(href, "http://localhost")
  if (!url.searchParams.get("studentTest")) return href
  url.searchParams.set("studentTestScreen", screen)
  return `${url.pathname}${url.search}${url.hash}`
}
/** Explicit ordinary-student entry clears test scope. Internal navigation retains only this tab's scope. */
export function studentTestToken() {
  if (typeof window === "undefined") return ""
  const params = new URLSearchParams(window.location.search), token = params.get("studentTest")
  if (token !== null) {
    if (sessionStorage.getItem(contextKey) !== token) sessionStorage.removeItem(screenKey)
    sessionStorage.setItem(contextKey, token)
    const screen = params.get("studentTestScreen")
    if (screen === "normal" || screen === "loading" || screen === "error") sessionStorage.setItem(screenKey, screen)
  } else if (params.has("demoStudent")) { sessionStorage.removeItem(contextKey); sessionStorage.removeItem(screenKey) }
  return sessionStorage.getItem(contextKey) || ""
}
export function studentTestApi(kind: "reviews" | "pro", normal: string, role: string) {
  return role === "student" && studentTestToken() ? `/api/mock/student-front-tests/${kind}` : normal
}
export function studentTestScreen(): StudentTestScreen {
  if (!studentTestToken()) return "normal"
  const value = sessionStorage.getItem(screenKey)
  return value === "loading" || value === "error" ? value : "normal"
}
export function setStudentTestScreen(screen: StudentTestScreen) {
  sessionStorage.setItem(screenKey, screen); window.dispatchEvent(new Event(studentTestScreenEvent))
}
