/** Current HQ policy. Keep full precision until rendering a number. */
export const REVIEW_SCORE_POLICY_VERSION = "2026-09-15-ai1-teacher2"
export const weightedReviewScore = (first: number, second: number) => (first + second * 2) / 3
export const reviewScoreLabel = (score: number) => Number(score.toFixed(1)).toString()
export const reviewImprovementMessage = (change: number) => change > 0 ? `${reviewScoreLabel(change)}점 향상되었어요.` : null
export const reviewScoreExplanation = (round: 1 | 2) => round === 1
  ? "1차 독후감 점수는 AI 평가보다 선생님 평가에 두 배 가중치를 두어 산출한 점수입니다."
  : "독후감 평가 점수는 학생의 작성 회차(1차·2차)와 평가 주체(AI·선생님)에 따라 각각 산출합니다.\n최종 점수는 이 중 2차 점수와 선생님 평가 점수에 두 배 가중치를 두어 산출합니다. 즉, 선생님의 피드백을 반영해 수정한 2차 글에 더 비중을 두어, 학생의 성장 잠재력에 중점을 둔 점수입니다."

export function calculateReviewScores(ai: number, teacher: number, first?: { ai: number; teacher: number }) {
  const score = weightedReviewScore(ai, teacher)
  if (!first) return { calculationVersion: REVIEW_SCORE_POLICY_VERSION, score }
  const firstScore = weightedReviewScore(first.ai, first.teacher)
  const weightedAi = weightedReviewScore(first.ai, ai)
  const weightedTeacher = weightedReviewScore(first.teacher, teacher)
  return { calculationVersion: REVIEW_SCORE_POLICY_VERSION, score, firstScore, improvement: score - firstScore,
    weightedAi, weightedTeacher, finalScore: weightedReviewScore(weightedAi, weightedTeacher) }
}
