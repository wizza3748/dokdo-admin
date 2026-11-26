import type { OnlineWorkbook } from "./online-workbooks"
import { plainReviewText, type ReviewTemplate } from "./review-domain"
import { buildReviewAiRequest } from "./review-prompts"
import { reviewBookMaterials } from "./review-ai-materials"
import { requestLocalFeedback } from "./review-ai-preview"
import { parseReviewAiResponse } from "./review-ai-response"

const fallbackQuestions: NonNullable<OnlineWorkbook["questions"]> = [
  {
    title: "1. 핵심 용어 정리",
    description: "책에서 중요하다고 생각한 낱말이나 핵심 용어를 정리해 보세요.",
    example: "예) 생태계: 생물과 환경이 서로 영향을 주고받는 관계",
    answer: "ㄴㄻㄴㄹㄴㅇㄹ",
  },
  {
    title: "2. 정보 정리",
    description: "책에서 알게 된 정보를 순서대로 정리해 보세요.",
    example: "예) 주인공은 숲에서 여러 동물의 생활 방식을 관찰했습니다.",
    answer: "",
  },
  {
    title: "3. 새롭게 알게 된 점",
    description: "책을 읽고 새롭게 알게 된 내용을 적어 보세요.",
    example: "예) 이름에는 지역의 환경과 사람들의 생활 모습이 담기기도 합니다.",
    answer: "",
  },
  {
    title: "4. 더 탐구하고 싶은 점",
    description: "책의 내용과 관련해 더 알아보고 싶은 점을 적어 보세요.",
    example: "예) 다른 지역에서는 같은 대상을 어떤 이름으로 부를까요?",
    answer: "",
  },
]
export function legacyWorkbookQuestions(record: OnlineWorkbook): NonNullable<OnlineWorkbook["questions"]> {
  return record.questions?.length ? record.questions : fallbackQuestions
}
export function legacyWorkbookMode(record: OnlineWorkbook) {
  return record.displayMode ?? (record.templateName.includes("통합형") || record.templateName.includes("인물 독서록") ? "continuous" : "items")
}

/** Old local submissions kept answers to the first round and one student feedback field. */
export async function generateLegacyWorkbookDraft(record: OnlineWorkbook) {
  if (record.writingRound === 2) throw new Error("연결된 1차 제출 기록을 확인해 주세요.")
  if (record.status === "전송완료" || record.aiUsed >= 2) throw new Error("현재 AI 피드백을 생성할 수 없습니다.")
  const mode = legacyWorkbookMode(record)
  const questions = legacyWorkbookQuestions(record)
  const template: ReviewTemplate = {
    id: record.templateName, title: record.templateName, reportEnabled: false, rewriteGuide: "", rewriteMode: mode,
    items: questions.map((q, i) => ({ id: String(i), title: q.title, description: q.description ?? "", example: q.example })),
  }
  const request = buildReviewAiRequest({
    round: 1, bookTitle: record.bookTitle, level: record.level, mode, ...reviewBookMaterials(record), questions: template.items,
    finalWriting: questions.map(q => (mode === "items" ? q.title + "\n" : "") + plainReviewText(q.answer)).join("\n\n"),
    fixedScores: record.aiUsed ? "보고서 미제공" : undefined,
  })
  const parsed = parseReviewAiResponse(await requestLocalFeedback(request), { level: record.level, template, reportEnabled: false },
    { itemFeedback: mode === "items" ? template.items.map(i => ({ itemId: i.id, text: "", visible: true })) : [] })
  if (parsed.unscorableReason) throw new Error("채점 불가: " + parsed.unscorableReason)
  const blocks = parsed.items.map(i => "[" + template.items[Number(i.itemId)].title + "]\n" + i.text)
  return { ...record, aiFeedbackDraft: [parsed.feedback, ...blocks].join("\n\n"), aiUsed: record.aiUsed + 1 }
}
