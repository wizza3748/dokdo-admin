// @ts-expect-error Node tests load TypeScript sources directly.
import { composeReviewBody, plainReviewText, reviewWritingMode, type ReviewCommon, type ReviewRecord, type ReviewCommand } from "./review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { buildReviewAiRequest, type QuizRound, type ReviewAiRequest } from "./review-prompts/index.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { parseReviewAiResponse, storedScoreText } from "./review-ai-response.ts"

type Materials = { synopsis: string; quiz: QuizRound[] }
function submittedWriting(review: ReviewCommon, record: ReviewRecord) {
  const text = plainReviewText(record.finalBody)
  if (reviewWritingMode(review.template) === "items" && text === plainReviewText(composeReviewBody(review.template, record.answers))) {
    return review.template.items.map(q => q.title + "\n" + plainReviewText(record.answers[q.id])).join("\n\n")
  }
  return text
}

export function prepareReviewAiRequest(review: ReviewCommon, record: ReviewRecord, first: ReviewRecord | undefined, materials: Materials) {
  const mode = reviewWritingMode(review.template)
  const items = record.aiDraft?.items ?? record.itemFeedback
  const questions = review.template.items.filter(q => mode === "continuous" || items.some(i => i.itemId === q.id && i.visible))
  const inputs = { mode, bookTitle: review.bookTitle, level: review.level, ...materials, questions, finalWriting: submittedWriting(review, record),
    fixedScores: record.aiUsed > 0 ? storedScoreText(record) || "보고서 미제공" : undefined }
  if (record.round === 1) return buildReviewAiRequest({ ...inputs, round: 1 })
  if (!first || first.round !== 1 || first.reviewId !== record.reviewId || first.id !== record.linkedRecordId || first.feedbackStatus !== "전송완료") {
    throw new Error("연결된 1차 전송 기록을 확인해 주세요.")
  }
  const sentItems = mode === "items" ? first.itemFeedback.filter(i => i.visible && i.text).map(i => {
    const title = review.template.items.find(q => q.id === i.itemId)?.title
    return [title, plainReviewText(i.text)].filter(Boolean).join("\n")
  }) : []
  return buildReviewAiRequest({ ...inputs, round: 2, first: { mode, finalWriting: submittedWriting(review, first),
    scoringResult: storedScoreText(first), reportFeedback: plainReviewText(first.reportFeedback), teacherFeedback: [plainReviewText(first.feedback), ...sentItems].join("\n\n") } })
}

export async function requestLocalFeedback(request: ReviewAiRequest): Promise<string> {
  const response = await fetch("/api/mock/review-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) })
  if (!response.ok) throw new Error("AI 피드백을 생성하지 못했습니다.")
  const result = await response.json()
  if (typeof result.output !== "string") throw new Error("피드백 응답을 확인해 주세요.")
  return result.output
}

export async function reviewAiResultCommand(review: ReviewCommon, record: ReviewRecord, first: ReviewRecord | undefined, materials: Materials, runId: string, request = requestLocalFeedback): Promise<Extract<ReviewCommand, { type: "ai-result" }>> {
  const run = { type: "ai-result" as const, recordId: record.id, runId }
  try {
    const raw = await request(prepareReviewAiRequest(review, record, first, materials))
    return { ...run, result: parseReviewAiResponse(raw, review, record) }
  } catch {
    return { ...run, error: "AI 피드백을 생성하지 못했습니다. 다시 시도해 주세요." }
  }
}
