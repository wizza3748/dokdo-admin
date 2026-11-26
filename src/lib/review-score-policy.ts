/** Keep full precision until a score, achievement rate or change is displayed. */
export const REVIEW_SCORE_POLICY_VERSION = "2026-11-23-round-score"
export const weightedReviewScore = (ai: number, teacher: number) => (ai + teacher * 2) / 3
export const reviewScoreLabel = (score: number) => Number(score.toFixed(1)).toString()
export const weightNote = "선생님 평가를 AI 평가보다 두 배 중요하게 반영해요."
export const roundingNote = "점수는 반올림해 표시해 합계와 0.1점 차이가 날 수 있어요."

export function calculateReviewScores(ai: number, teacher: number, first?: { ai: number; teacher: number }) {
  const score = weightedReviewScore(ai, teacher)
  if (!first) return { calculationVersion: REVIEW_SCORE_POLICY_VERSION, score }
  const firstScore = weightedReviewScore(first.ai, first.teacher)
  return { calculationVersion: REVIEW_SCORE_POLICY_VERSION, score, firstScore, improvement: score - firstScore }
}
