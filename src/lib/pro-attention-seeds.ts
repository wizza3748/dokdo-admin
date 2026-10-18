// Synthetic, additive examples. Their earlier management periods belong only
// to these new members; never backdate existing students or the shared clock.
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { addDays, kstDate, managementMonth, weekStart } from "./pro-calendar.ts"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { applyReviewCommand, type ReviewDatabase } from "./review-domain.ts"
// @ts-expect-error Node tests use explicit TypeScript extensions.
import { proDemoStudentName, refreshProDemoLabels } from "./pro-demo-labels.ts"
import type { ProMember } from "./pro-types"

export const PRO_ATTENTION_EXAMPLES = [
  { id: "pro-demo-attention", name: proDemoStudentName("pro-demo-attention")!, weeks: 2, bookTitle: "다시 시작하는 독서" },
  { id: "pro-demo-hq-check", name: proDemoStudentName("pro-demo-hq-check")!, weeks: 3, bookTitle: "함께 읽는 즐거움" },
] as const

export function ensureProAttentionExamples(input: ReviewDatabase, serverNow: string): ReviewDatabase {
  if (!input.pro || PRO_ATTENTION_EXAMPLES.every(example => input.pro!.members.some(m => m.id === example.id))) return refreshProDemoLabels(input)
  let db = structuredClone(input)
  for (const example of PRO_ATTENTION_EXAMPLES) {
    if (db.pro!.members.some(m => m.id === example.id)) continue
    // Anchor once to the real creation date, not a stored/test clock. No moving
    // dates on subsequent reads: submitting or editing an example stays saved.
    const effectiveAt = addDays(weekStart(serverNow), -7 * example.weeks)
    const member: ProMember = {
      id: example.id, name: example.name, account: example.id.replaceAll("-", "_"),
      level: 4, age: 11, product: "pro", status: "active", external: true,
      institutionId: "dokdo", teacherId: "teacher-1", assignedAt: effectiveAt,
      effectiveAt, effectiveMonth: managementMonth(effectiveAt), serviceEnd: addDays(serverNow, 730),
      parentContact: false, limits: {}, overrides: {}, consultation: { nth: 2, weekday: 4, time: "15:00" },
    }
    db.pro!.members.push(member)
    const id = `review-${example.id}`, actor = { role: "student" as const, studentId: member.id, name: member.name }
    db = applyReviewCommand(db, { type: "create", common: {
      id, sourceWorkbookId: id, studentId: member.id, studentName: member.name,
      institutionId: "dokdo", institution: "독도학원", classId: "external", bookTitle: example.bookTitle,
      month: kstDate(serverNow).slice(0, 7), level: 4, template: {
        id: "pro-attention-template", title: "독서록 쓰기", reportEnabled: false,
        rewriteMode: "continuous", rewriteGuide: "하나의 글로 고쳐 써 보세요.",
        items: [{ id: "reason", title: "책을 읽고 생각한 점", description: "기억에 남는 장면과 내 생각을 써 주세요." }],
      },
    } }, actor, `${id}:create`, serverNow)
    const body = "책 속 주인공은 혼자 해결하기 어려운 일을 친구들과 함께 풀어 갔다. 처음에는 다른 사람에게 도움을 부탁하는 것이 부끄러웠지만, 친구의 이야기를 듣고 용기를 낼 수 있었다. 나도 어려운 일이 생기면 혼자 걱정하기보다 친구와 선생님께 내 생각을 말해 보고 싶다. 함께 읽은 책에 대해 서로 다른 생각을 나누면 내가 놓친 장면도 다시 이해할 수 있을 것 같다."
    db = applyReviewCommand(db, { type: "save-writing", recordId: `${id}-r1`, stage: "items", itemIndex: 0, answers: { reason: body }, body: "" }, actor, `${id}:write`, serverNow)
    db = applyReviewCommand(db, { type: "enter-rewrite", recordId: `${id}-r1` }, actor, `${id}:rewrite`, serverNow)
  }
  return refreshProDemoLabels(db)
}
