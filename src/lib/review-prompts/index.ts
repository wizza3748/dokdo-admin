// @ts-expect-error Node tests load TypeScript sources directly.
import { REVIEW_ROUND_1_PROMPT } from "./round-1.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { REVIEW_ROUND_2_PROMPT } from "./round-2.ts"

export const REVIEW_PROMPT_VERSION = "2026-11-23-v6"
const doc = "https://docs.google.com/document/d/1x6Qv1AaMlmW7oAr0J50AKq98rrv-QcszUAcm9tjDTp8/edit?tab="
export const REVIEW_PROMPT_SOURCES = { 1: doc + "t.alu0k76oef15", 2: doc + "t.ox6piatn6vyf" } as const
export const reviewPrompt = (round: 1 | 2) => round === 1 ? REVIEW_ROUND_1_PROMPT : REVIEW_ROUND_2_PROMPT
export const fixedScoreHeader = "\n[확정된 평가 점수]\n"

export type QuizRound = { round: number; questions: { question: string; area: string; answer: string; explanation: string }[] }
export type WritingMode = "items" | "continuous"
export type PromptInput = {
  bookTitle: string; level: number; mode: WritingMode; synopsis: string; quiz?: QuizRound[];
  questions: { title: string; description: string; example?: string }[]; finalWriting: string; fixedScores?: string;
} & ({ round: 1 } | { round: 2; first: { mode: WritingMode; finalWriting: string; scoringResult: string; reportFeedback: string; teacherFeedback: string } })

function formatTemplateQuestions(questions: PromptInput["questions"]) {
  const blocks = questions.map(({ title, description, example }) => {
    const lines = [`[${title}]`, description]
    if (example?.trim()) lines.push(`예시: ${example}`)
    return lines.join("\n")
  })
  // Guides can have bracketed subheadings after a blank line. An extra blank
  // line before the first question and between questions keeps that text intact.
  let padding = ""
  while (blocks.some(block => block.includes(padding + "\n\n["))) padding += "\n"
  return padding + blocks.join(padding + "\n\n")
}

export function readTemplateQuestions(text: string) {
  if (!text) return []
  const start = text.indexOf("[")
  const padding = text.slice(0, start)
  return text.slice(start + 1).split(padding + "\n\n[").map(block => {
    const headingEnd = block.indexOf("]\n")
    if (headingEnd < 1) throw new Error("템플릿 질문 항목의 제목을 확인해 주세요.")
    const example = /\n예시: ([\s\S]*)$/.exec(block.slice(headingEnd + 2))?.[1]
    return { title: block.slice(0, headingEnd), example }
  })
}

export function buildReviewAiRequest(input: PromptInput) {
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > 6 || !input.bookTitle.trim()) throw new Error("도서명과 레벨을 확인해 주세요.")
  const mode = (value: WritingMode) => value === "items" ? "항목별보기" : "이어보기"
  const quiz = (input.quiz ?? []).filter(r => r.questions.length).map(r => [
    r.round + "회차:", ...r.questions.map((q, i) => `Q${i + 1}. ${q.question} (${q.area})\n정답: ${q.answer}\n해설: ${q.explanation}`),
  ].join("\n")).join("\n\n")
  const sections: [string, string][] = [
    ["도서명", input.bookTitle], ["레벨", String(input.level)], ["작성 형태", mode(input.mode)],
    ["줄거리 요약", input.synopsis], ["온라인 퀴즈", quiz],
    ["템플릿 질문 항목", formatTemplateQuestions(input.questions)],
  ]
  if (input.round === 1) sections.push(["학생의 최종 글", input.finalWriting])
  else sections.push(["1차 작성 형태", mode(input.first.mode)], ["1차 학생 글", input.first.finalWriting], ["1차 채점 결과", input.first.scoringResult],
    ["1차 보고서용 총평", input.first.reportFeedback], ["1차 선생님용 피드백", input.first.teacherFeedback], ["2차 학생 글", input.finalWriting])
  return { round: input.round, version: REVIEW_PROMPT_VERSION, source: REVIEW_PROMPT_SOURCES[input.round],
    messages: [{ role: "system" as const, content: reviewPrompt(input.round) + (input.fixedScores ? fixedScoreHeader + input.fixedScores : "") },
      { role: "user" as const, content: sections.map(([title, value]) => ({ type: "text" as const, text: `[${title}]\n${value}` })) }] as const }
}
export type ReviewAiRequest = ReturnType<typeof buildReviewAiRequest>
