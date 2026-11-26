// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewPrompt, REVIEW_PROMPT_VERSION, fixedScoreHeader, readTemplateQuestions, type ReviewAiRequest } from "./review-prompts/index.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { detailedScoreText } from "./review-ai-response.ts"

function paragraphQuote(paragraph: string) {
  const text = paragraph.trim()
  if (text.length <= 60 || /[()[\]{}‘’“”「」『』《》"']/.test(text)) return text
  const firstSentence = text.match(/^[\s\S]+?[.!?。！？](?=\s)/u)?.[0]
  if (!firstSentence) return text
  const rest = text.slice(firstSentence.length).trim()
  const ending = rest.split(/[,.!?。！？]\s+/u).at(-1)?.trim()
  if (!ending || ending === rest || ending.length < 8) return text
  return firstSentence + " ... " + ending
}

/** Simulates the model response at the request boundary. No review state is read or written here. */
export function mockReviewAi(request: ReviewAiRequest) {
  if ((request.round !== 1 && request.round !== 2) || request.version !== REVIEW_PROMPT_VERSION) throw new Error("프롬프트 버전 오류")
  const [system, user] = request.messages
  const prompt = reviewPrompt(request.round)
  if (system.role !== "system" || user.role !== "user" || (system.content !== prompt && !system.content.startsWith(prompt + fixedScoreHeader))) throw new Error("프롬프트 원문 오류")
  const fields = new Map(user.content.map(part => {
    const split = part.text.indexOf("\n")
    return [part.text.slice(1, split - 1), part.text.slice(split + 1)]
  }))
  const second = request.round === 2
  const itemMode = fields.get("작성 형태") === "항목별보기"
  const questions = readTemplateQuestions(fields.get("템플릿 질문 항목") ?? "")
  const writing = fields.get(second ? "2차 학생 글" : "학생의 최종 글") ?? ""
  const titles = new Set(questions.map(q => q.title))
  const lines = writing.split(/\n+/).map(s => s.trim()).filter(s => s && !(itemMode && titles.has(s)))
  const body = lines.join("\n")
  if (!body || lines.every(s => /^(모르겠어요|없어요|모르겠습니다)[.! ]*$/.test(s) || questions.some(q => q.example && s === q.example))) {
    return "===UNSCORABLE===\n채점 불가 — 유형 E\n근거: 평가할 독후 내용이 없습니다.\n===END==="
  }
  if (!/[가-힣A-Za-z]/.test(body)) return "===UNSCORABLE===\n채점 불가 — 유형 A\n근거: 의미 있는 문장을 확인할 수 없습니다.\n===END==="
  if (lines.length >= 3 && new Set(lines).size === 1) return "===UNSCORABLE===\n채점 불가 — 유형 C\n근거: 같은 내용이 세 번 이상 반복되었습니다.\n===END==="
  const fixed = system.content.slice(prompt.length + fixedScoreHeader.length)
  const scores = fixed && fixed !== "보고서 미제공" ? fixed : detailedScoreText(second ? [8, 17, 14, 15, 8, 7, 4, 3] : [8, 15, 15, 15, 7, 7, 4, 3])
  const changed = second && writing !== fields.get("1차 학생 글")
  const evaluation = [
    "내용 요약: 책을 읽고 기억한 내용을 글에 담았습니다. 중요한 사건을 순서대로 정리하면 흐름이 더 분명해집니다.",
    "감상과 깨달음: 읽으며 떠오른 생각을 표현했습니다. 인상 깊은 장면과 연결해 이유를 설명해 보세요.",
    "발상과 독창성: 자신의 관점에서 책을 돌아보았습니다. 다른 선택이 가능했을지 생각해 볼 수 있습니다.",
    "구성과 조직력: 생각을 문장으로 이어 썼습니다. 앞 문장과 뒤 문장이 어떻게 연결되는지 살펴보세요.",
    "표현력: 전하고 싶은 뜻을 글로 표현했습니다. 소리 내어 읽으며 어색한 낱말을 다듬어 보세요.",
    "종합: " + (second ? (changed ? "1차 글을 다시 살펴보고 표현을 다듬었습니다. 고쳐 쓴 부분이 생각을 어떻게 드러내는지 살펴보세요." : "1차에 쓴 내용을 유지했습니다. 다음 글에서는 자신의 생각이 달라진 지점을 한 문장 덧붙여 보세요.") : "책을 읽은 경험을 자신의 말로 풀어냈습니다. 떠올린 생각을 책의 한 장면과 연결해 보면 좋겠습니다."),
  ].join("\n")
  const summary = second ? "■ 수정 후 달라진 점\n" + (changed ? "처음 쓴 글을 다시 살펴보고 표현을 바꾸었어요." : "첫 글에서 전하려던 생각을 이번 글에도 담았어요.") : "■ 글의 특징\n책을 읽고 떠오른 생각을 자신의 말로 적었어요."
  const mission = second ? "■ 더 생각해 볼 거리" : "■ 2차 글 작성 미션"
  const paragraphs = writing.trim().split(/\n\s*\n/).length > 1 ? writing.trim().split(/\n\s*\n/) : lines
  if (paragraphs.length > 1 && /^(제목:|.{1,15}$)/.test(paragraphs[0]) && !/[.!?。]$/.test(paragraphs[0])) paragraphs.shift()
  const quoted = paragraphs.slice(0, 2).map((p, i) => "▷ " + (paragraphs.length > 1 ? (i + 1) + "문단: " : "") + "‘" + paragraphQuote(p) + "’에서 글쓴이가 전하려는 생각을 찾아볼 수 있어요.")
  const feedback = itemMode ? summary : [summary, "■ 문단별 잘한 점\n" + quoted.join("\n"), mission + "\n① 기억에 남는 장면 옆에 그 장면을 고른 이유를 덧붙여 보세요."].join("\n\n")
  const prior = fields.get("1차 선생님용 피드백") ?? ""
  const items = itemMode ? questions.map(q => {
    const status = second && prior.split("\n").includes(q.title) ? (changed ? " (일부 반영)" : " (미반영)") : ""
    return "[" + q.title + "]\n■ 잘 쓴 점\n질문을 떠올리며 책에서 기억한 내용을 글로 정리해 보았어요.\n\n" + mission + "\n① 이 질문에 대한 생각을 보여 주는 문장을 찾아 이유를 덧붙여 보세요." + status
  }) : []
  return ["===SCORE===", scores, "===FEEDBACK===", "[보고서용 총평]", evaluation, "", "[학생용 총평]", feedback,
    ...(items.length ? ["", "[항목별 피드백]", ...items] : []), "===END==="].join("\n")
}
