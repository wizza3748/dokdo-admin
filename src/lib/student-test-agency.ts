import { applyManagedReviewCommand, applyProCommand } from "./pro-domain"
import type { ProCommand } from "./pro-types"
import type { ReviewCommand } from "./review-domain"
import { testStudent, testTeacher } from "./student-test-scenarios"
import { currentStudentTest, type StudentTestSession } from "./student-test-store"

export function studentTestRequestActor(session: StudentTestSession, role: string | null) {
  if (role === null || role === "student") return testStudent(session.db)
  const ownsAssignedStudent = session.db.pro?.members[0]?.institutionId === testTeacher.institutionId
  const ownsSelectedCase = session.db.pro?.cases.some(c => (c.selectedAt || c.firstSentAt) && c.institutionId === testTeacher.institutionId)
  if (role !== "agency" || !session.caseId.startsWith("schedule-") || !ownsAssignedStudent && !ownsSelectedCase) {
    throw new Error("이 전용 예시에서는 해당 관리 권한을 사용할 수 없습니다.")
  }
  return testTeacher
}

/** Ownership is checked by the API first; teacher commands remain within this one fixture. */
export function runAgencyStudentTest(session: StudentTestSession, kind: "review" | "pro", command: ReviewCommand | ProCommand, requestId: string, now: string): StudentTestSession {
  const actor = studentTestRequestActor(session, "agency")
  const current = currentStudentTest(session, now)
  if (kind === "pro") {
    if (command.type !== "retry-parent") throw new Error("이 전용 예시에서는 해당 관리 작업을 사용할 수 없습니다.")
    return { ...session, db: applyProCommand(current, command as ProCommand, actor, requestId, now), changedAt: now }
  }
  if (!["save-feedback", "send", "schedule-feedback", "cancel-feedback-schedule", "ai-start", "ai-result", "flower", "reject", "parent"].includes(command.type)) {
    throw new Error("이 전용 예시에서는 해당 관리 작업을 사용할 수 없습니다.")
  }
  return { ...session, db: applyManagedReviewCommand(current, command as ReviewCommand, actor, requestId, now), changedAt: now }
}
