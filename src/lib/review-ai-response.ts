// @ts-expect-error Node tests load TypeScript sources directly.
import { familyCriteria } from "./review-family-criteria.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { assessmentAreas, plainReviewText, reviewIncludesItemFeedback, type ReviewCommon, type ReviewRecord, type ReviewScores } from "./review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { reviewAreaLabel } from "./review-assessment-config.ts"

export function detailedScoreText(scores: number[]) {
  return [...familyCriteria.map((c, i) => `${c.number} ${c.name}: ${scores[i]}/${c.max}`),
    `총점: ${scores.reduce((sum, n) => sum + n, 0)}/100`].join("\n")
}

export function storedScoreText(record: Pick<ReviewRecord, "aiScores" | "aiDetailScores" | "legacyAiScores" | "assessment">) {
  if (record.aiDetailScores) return detailedScoreText(record.aiDetailScores)
  if (!record.aiScores) return ""
  // Historical results have only area totals. Re-generation can echo those totals verbatim.
  const legacy = record.legacyAiScores
  const details = (record.assessment?.criteria ?? []).filter(c => legacy && Number.isFinite(legacy[c.id]))
  const original = legacy && details.length ? ["저장된 세부 점수", ...details.map(c => c.name + ": " + legacy[c.id] + "/" + c.max)] : []
  return [...original, "저장된 영역 점수", ...Object.entries(record.aiScores).map(([area, n]) => `${reviewAreaLabel(area)}: ${n}`),
    `총점: ${Object.values(record.aiScores).reduce((a, b) => a + b, 0)}/100`].join("\n")
}

function parseScores(text: string) {
  const lines = text.split("\n")
  if (lines.length !== 9) throw new Error("8개 세부 점수와 총점을 확인해 주세요.")
  const scores = familyCriteria.map((c, index) => {
    const match = /^(\S) (.+):\s*(\d+)\/(\d+)$/.exec(lines[index].trim())
    if (!match || match[1] !== c.number || match[2] !== c.name || +match[4] !== c.max || +match[3] > c.max) throw new Error("세부 점수의 항목과 배점을 확인해 주세요.")
    return Number(match[3])
  })
  if (lines[8].trim() !== `총점: ${scores.reduce((a, b) => a + b, 0)}/100`) throw new Error("세부 점수와 총점이 일치하지 않습니다.")
  return scores
}

export function parseReviewAiResponse(raw: string, review: Pick<ReviewCommon, "level" | "template" | "reportEnabled">, record: Pick<ReviewRecord, "aiScores" | "aiDetailScores" | "legacyAiScores" | "assessment" | "aiDraft" | "itemFeedback">) {
  const source = raw.replace(/\r\n/g, "\n").trim()
  const rejected = /^===UNSCORABLE===\n(채점 불가\s*—\s*유형 [A-E])\n근거:\s*([^]+?)\n===END===$/.exec(source)
  if (rejected) return { feedback: "", items: [], unscorableReason: rejected[1] + " · " + rejected[2] }
  const frame = /^===SCORE===\n([^]+?)\n===FEEDBACK===\n([^]+?)\n===END===$/.exec(source)
  if (!frame) throw new Error("피드백 응답 형식을 확인해 주세요.")
  let detailScores: number[] | undefined
  let scores: ReviewScores | undefined
  if (review.reportEnabled) {
    const fixed = storedScoreText(record)
    if (fixed && fixed !== frame[1]) throw new Error("최초 확정 AI 점수와 일치하지 않습니다.")
    if (record.aiScores && !record.aiDetailScores) scores = record.aiScores
    else {
      detailScores = parseScores(frame[1])
      const marks = detailScores
      scores = Object.fromEntries(assessmentAreas(review.level, record).map(area => {
        const indices = familyCriteria.flatMap((c, i) => c.area === reviewAreaLabel(area.id) ? [i] : [])
        if (!indices.length) throw new Error("저장된 평가 기준을 확인해 주세요.")
        return [area.id, indices.reduce((sum, i) => sum + marks[i], 0)]
      }))
    }
  }
  const blocks = /^\[보고서용 총평\]\n([^]*?)\n+\[학생용 총평\]\n([^]+)$/.exec(frame[2])
  if (!blocks) throw new Error("총평 구획을 확인해 주세요.")
  const reportFeedback = blocks[1].trim()
  if (review.reportEnabled) {
    const labels = [...new Set(familyCriteria.map(c => c.area)), "종합"]
    const lines = reportFeedback.split("\n")
    if (lines.length !== labels.length || labels.some((label, i) => !lines[i].startsWith(label + ": ") || !lines[i].slice(label.length + 2).trim()))
      throw new Error("영역별 평가와 종합 문장을 확인해 주세요.")
  }
  const [feedback, itemText, ...extra] = blocks[2].split(/\n+\[항목별 피드백\](?:\n|$)/)
  if (extra.length || plainReviewText(feedback).length < 10) throw new Error("학생용 총평을 확인해 주세요.")
  const currentItems = reviewIncludesItemFeedback(review.template) ? record.aiDraft?.items ?? record.itemFeedback : []
  const active = review.template.items.filter(q => currentItems.some(i => i.itemId === q.id && i.visible))
  const itemBlocks = (itemText ?? "").trim().split(/^(?=\[[^\n]+\]\n)/m).filter(Boolean).map(block => {
    const headingEnd = block.indexOf("\n")
    if (!block.startsWith("[") || headingEnd < 2 || block[headingEnd - 1] !== "]") throw new Error("항목별 피드백의 제목을 확인해 주세요.")
    return [block, block.slice(1, headingEnd - 1), block.slice(headingEnd + 1)]
  })
  if (itemBlocks.length !== active.length || itemBlocks.some((block, i) => block[1] !== active[i].title || plainReviewText(block[2]).length < 10))
    throw new Error("학생 표시 항목의 이름과 피드백을 확인해 주세요.")
  const byId = new Map(active.map((q, i) => [q.id, itemBlocks[i][2].trim()]))
  const items = currentItems.map(item => item.visible ? { ...item, text: byId.get(item.itemId)! } : { ...item })
  return { feedback: feedback.trim(), reportFeedback: review.reportEnabled ? reportFeedback : undefined, items, scores, detailScores }
}
