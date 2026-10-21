"use client"
import { demoIdentityQuery, notifyReviewChange, type ReviewRole } from "./review-client"
import type { ProCommand } from "./pro-types"
import type { ReviewDatabase } from "./review-domain"
import { studentTestApi } from "./student-test-context"
export async function commandPro(command: ProCommand, role: ReviewRole = "agency", requestId = crypto.randomUUID()): Promise<ReviewDatabase> {
  const response = await fetch(`${studentTestApi("pro", "/api/mock/pro-management", role)}?role=${role}${demoIdentityQuery(role)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command, requestId }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message)
  notifyReviewChange(); return result
}

/** Called only after the prototype reset confirmation, never during a read. */
export async function resetProDemo(role: ReviewRole) {
  const response = await fetch(`/api/mock/pro-demo?role=${role}${demoIdentityQuery(role)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: crypto.randomUUID(), confirmed: true }),
  })
  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.message || "예시 데이터를 초기화하지 못했습니다.")
  }
  notifyReviewChange()
}
