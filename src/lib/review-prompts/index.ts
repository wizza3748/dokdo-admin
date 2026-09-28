// @ts-expect-error Node tests load TypeScript sources directly.
import { REVIEW_ROUND_1_PROMPT } from "./round-1.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { REVIEW_ROUND_2_PROMPT } from "./round-2.ts"

export const REVIEW_PROMPT_VERSION = "2026-09-22"
export const REVIEW_PROMPT_SOURCES = {
  1: "https://docs.google.com/document/d/1ns348RaMi07occa1WxrUt84WyRdKCgHR2x6EIJH7BfY/edit?tab=t.vwumy17fvut3",
  2: "https://docs.google.com/document/d/1ns348RaMi07occa1WxrUt84WyRdKCgHR2x6EIJH7BfY/edit?tab=t.3joyvujbmtwy",
} as const

export function reviewPrompt(round: 1 | 2) {
  return round === 1 ? REVIEW_ROUND_1_PROMPT : REVIEW_ROUND_2_PROMPT
}

type WritingMode = "items" | "continuous"
type PromptInput = {
  bookTitle: string
  level: number
  mode: WritingMode
  synopsis: string
  questions: { title: string; description: string; example?: string }[]
  finalWriting: string
} & ({ round: 1 } | {
  round: 2
  first: { mode: WritingMode; finalWriting: string; scoringResult: string; reportFeedback: string; teacherFeedback: string }
})

/** Prepare, but never send, an AI request. Keep source instructions and untrusted student data separate. */
export function buildReviewAiRequest(input: PromptInput) {
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > 6) throw new Error("레벨은 1~6이어야 합니다.")
  if (!input.bookTitle.trim() || !input.synopsis.trim() || !input.finalWriting.trim() || !input.questions.length) throw new Error("도서명·줄거리 요약·질문 항목·최종 글이 필요합니다.")
  const mode = (value: WritingMode) => value === "items" ? "항목별보기" : "이어보기"
  const data = {
    "도서명": input.bookTitle,
    "레벨": input.level,
    "작성 형태": mode(input.mode),
    "줄거리 요약": input.synopsis,
    "템플릿 질문 항목": input.questions.map(q => ({ "항목명": q.title, "질문·안내": q.description, ...(q.example ? { "예시": q.example } : {}) })),
    ...(input.round === 1 ? { "학생의 최종 글": input.finalWriting } : {
      "1차 작성 형태": mode(input.first.mode),
      "1차 학생 글": input.first.finalWriting,
      "1차 채점 결과": input.first.scoringResult,
      "1차 보고서용 총평": input.first.reportFeedback,
      "1차 선생님용 피드백": input.first.teacherFeedback,
      "2차 학생 글": input.finalWriting,
    }),
  }
  return {
    version: REVIEW_PROMPT_VERSION,
    source: REVIEW_PROMPT_SOURCES[input.round],
    messages: [{ role: "system" as const, content: reviewPrompt(input.round) }, { role: "user" as const, content: JSON.stringify(data, null, 2) }],
  }
}
