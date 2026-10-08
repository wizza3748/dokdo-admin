"use client"
import { demoIdentityQuery, notifyReviewChange, type ReviewRole } from "./review-client"
import type { ProCommand } from "./pro-types"
import type { ReviewDatabase } from "./review-domain"
export async function commandPro(command: ProCommand, role: ReviewRole = "agency", requestId = crypto.randomUUID()): Promise<ReviewDatabase> {
  const response = await fetch(`/api/mock/pro-management?role=${role}${demoIdentityQuery(role)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command, requestId }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message)
  notifyReviewChange(); return result
}
