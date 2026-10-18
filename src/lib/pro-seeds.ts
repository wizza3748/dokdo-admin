// Synthetic examples only. Existing ordinary student records are not changed.
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { applyReviewCommand, type ReviewDatabase } from "./review-domain.ts"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { migrateProRecords } from "./pro-domain.ts"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { proDemoStudentName, refreshProDemoLabels } from "./pro-demo-labels.ts"
import type { ProMember, ProState } from "./pro-types"
export const PRO_FIXTURE_CLOCK = "2026-10-08T01:00:00.000Z"
export function initializePro(input: ReviewDatabase): ReviewDatabase {
  if (input.pro) return refreshProDemoLabels(input)
  let db = structuredClone(input)
  const effectiveAt = "2026-09-27T15:00:00.000Z"
  const names = Array.from({ length: 10 }, (_, i) => proDemoStudentName(`pro-demo-${i + 1}`) ?? "일반 외부예시")
  const members: ProMember[] = names.map<ProMember>((name, i) => ({ id: `pro-demo-${i + 1}`, name, account: `pro_example_${i + 1}`, level: 4, age: 11, product: i === 8 ? "normal" : "pro", status: i === 7 ? "ended" : "active", external: true, institutionId: i === 6 ? undefined : i === 9 ? "other-agency" : "dokdo", teacherId: "teacher-1", assignedAt: i === 6 ? undefined : effectiveAt, effectiveAt, effectiveMonth: "2026-10", endedAt: i === 7 ? "2026-10-05T00:00:00.000Z" : undefined, serviceEnd: "2027-12-31T14:59:00.000Z", parentContact: true, limits: Object.fromEntries(i === 2 ? [["2026-10", 1]] : []), overrides: {}, consultation: { nth: 2, weekday: 4, time: "15:00" } }))
  const pro: ProState = { version: 1, clock: PRO_FIXTURE_CLOCK, effectiveAt, effectiveMonth: "2026-10", members, cases: [], schedules: [{ institutionId: "dokdo", teacherId: "teacher-1", weekday: 7, from: effectiveAt }, { institutionId: "other-agency", teacherId: "teacher-1", weekday: 7, from: effectiveAt }], audit: [], reminders: [], consultations: [], processed: [], reminderSnapshots: [] }
  db.pro = pro
  const template = { id: "pro-demo-template", title: "독서록 쓰기", reportEnabled: false, rewriteMode: "continuous" as const, rewriteGuide: "하나의 글로 고쳐 써 보세요.", items: [{ id: "reason", title: "책을 선택한 이유", description: "책을 읽고 생각한 내용을 써 주세요." }] }
  function add(memberIndex: number, slug: string, title: string, submitted: string, state: "draft" | "submitted" | "saved" | "sent" = "submitted", decision: "complete" | "request" = "complete", parentSent = false) {
    const member = members[memberIndex], id = `review-pro-${slug}`
    const student = { role: "student" as const, studentId: member.id, name: member.name }
    const teacher = { role: "agency" as const, institutionId: member.institutionId, name: "예시 선생님" }
    db = applyReviewCommand(db, { type: "create", common: { id, sourceWorkbookId: id, studentId: member.id, studentName: member.name, institutionId: member.institutionId ?? "unassigned", institution: member.institutionId === "other-agency" ? "다른 예시기관" : "독도학원", classId: "external", bookTitle: title, month: submitted.slice(0, 7), level: 4, template } }, student, `${id}:create`, submitted)
    const body = "책 속 주인공이 친구들과 다른 생각을 나누며 문제를 해결하는 모습이 기억에 남았다. 처음에는 자기 생각만 말했지만 친구의 이유를 듣고 서로에게 좋은 방법을 찾아갔다. 나도 친구와 놀이를 정할 때 먼저 이유를 물어보고 이야기를 끝까지 들어야겠다고 생각했다. 다음에는 서로 하고 싶은 놀이를 번갈아 하는 방법을 제안해 보고 싶다."
    db = applyReviewCommand(db, { type: "save-writing", recordId: `${id}-r1`, stage: "items", itemIndex: 0, answers: { reason: body }, body: "" }, student, `${id}:write`, submitted)
    db = applyReviewCommand(db, { type: "enter-rewrite", recordId: `${id}-r1` }, student, `${id}:rewrite`, submitted)
    if (state !== "draft") db = applyReviewCommand(db, { type: "submit", recordId: `${id}-r1` }, student, `${id}:submit`, submitted)
    if (["saved", "sent"].includes(state)) db = applyReviewCommand(db, { type: "save-feedback", recordId: `${id}-r1`, feedback: "책의 핵심과 자신의 경험을 연결하여 잘 썼어요. 다음에는 친구의 생각을 들었던 구체적인 장면을 더 적어 보세요.", items: [], decision }, teacher, `${id}:save`, submitted)
    if (state === "sent") db = applyReviewCommand(db, { type: "send", recordId: `${id}-r1` }, teacher, `${id}:send`, submitted)
    if (parentSent) db = applyReviewCommand(db, { type: "parent", recordId: `${id}-r1` }, teacher, `${id}:parent`, submitted)
  }
  add(0, "apply-a", "마음이 자라는 나무", "2026-10-07T01:00:00.000Z")
  add(0, "apply-b", "함께 걷는 길", "2026-10-07T02:00:00.000Z")
  add(0, "writing", "나의 새로운 도전", "2026-10-08T00:00:00.000Z", "draft")
  add(1, "rollover", "서로 다른 생각", "2026-10-07T00:00:00.000Z")
  add(2, "used", "내 친구의 이야기", "2026-10-03T02:00:00.000Z", "sent", "complete", true)
  add(3, "overdue", "함께 만드는 약속", "2026-10-02T02:00:00.000Z", "saved")
  add(4, "second", "용기 있는 한 걸음", "2026-10-03T01:00:00.000Z", "sent", "request")
  add(5, "migrated-sent", "승계된 완성 기록", "2026-10-02T00:00:00.000Z", "sent", "complete", true)
  add(5, "migrated-pending", "승계된 작성 기록", "2026-10-03T00:00:00.000Z", "saved")
  add(6, "unassigned", "기다리는 동안 읽은 책", "2026-10-07T00:00:00.000Z")
  add(7, "ended", "이전 달의 약속", "2026-10-02T00:00:00.000Z", "saved")
  add(8, "normal", "일반 외부 학생의 책", "2026-10-07T00:00:00.000Z")
  add(9, "other", "다른 기관의 책", "2026-10-07T00:00:00.000Z")
  return refreshProDemoLabels(migrateProRecords(db))
}
