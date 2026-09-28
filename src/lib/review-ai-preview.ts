// @ts-expect-error Node tests load TypeScript sources directly.
import { plainReviewText, reviewIncludesItemFeedback, sampleReviewAi, type ReviewCommon, type ReviewRecord } from "./review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { REVIEW_PROMPT_VERSION, REVIEW_PROMPT_SOURCES } from "./review-prompts/index.ts"

/** Layout preview only: does not execute the prompt, grade writing, or infer revision quality.
 * Legacy sampleReviewAi remains unchanged for seed reconstruction and historical migrations.
 */
export function previewReviewAi(review: ReviewCommon, record: ReviewRecord) {
  const legacy = sampleReviewAi(review, record)
  const itemMode = reviewIncludesItemFeedback(review.template)
  const summary = "책을 읽고 떠오른 생각을 글로 적었어요. 내가 전하고 싶은 생각과 그 이유가 잘 드러나는지 살펴보세요."
  return {
    ...legacy,
    promptVersion: REVIEW_PROMPT_VERSION,
    promptSource: REVIEW_PROMPT_SOURCES[record.round],
    feedback: itemMode ? summary : `[총평]\n${summary}\n\n[강점과 보완할 점]\n\n① 책의 내용과 내 생각을 함께 적었어요. 내 생각이 나온 까닭을 책의 내용과 연결해 설명해 보세요.\n② 문장과 문장이 자연스럽게 이어지는지 읽어 보고, 뜻이 잘 전해지지 않는 부분을 다듬어 보세요.`,
    reportFeedback: legacy.reportFeedback?.split("\n\n[성장 요약]")[0].replace(/^표현과 전달력\(/gm, "표현력("),
    items: itemMode ? legacy.items.map(item => {
      if (!item.visible) return item
      const question = review.template.items.find(q => q.id === item.itemId)!
      const present = Boolean(plainReviewText(record.answers[item.itemId] ?? ""))
      // No canned '반영/부분 반영' labels: those require actual first/second writing analysis.
      return { ...item, text: present
        ? "질문에 대한 생각을 적었어요. 질문에서 요구한 내용과 그 이유가 잘 드러나는지 다시 읽어 보세요."
        : `이 부분은 아직 쓰지 않았어요. ‘${question.title}’ 질문을 읽고 떠오른 내용을 적어 보세요.` }
    }) : [],
  }
}
