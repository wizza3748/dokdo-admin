// @ts-expect-error Node domain tests load TypeScript sources directly.
import { legacyAssessmentCriteria, snapshotReviewAssessment, type ReviewAssessmentSnapshot } from "./review-assessment-config.ts"
// @ts-expect-error Node domain tests load TypeScript sources directly.
import { REVIEW_FEEDBACK_SAMPLES } from "./review-feedback-samples.ts"

export type ReviewActor = { role: "student" | "agency" | "class" | "admin" | "external"; studentId?: string; institutionId?: string; classId?: string; name: string }
export type ReviewItem = { id: string; title: string; description: string; example?: string }
export type ItemFeedback = { itemId: string; text: string; visible: boolean }
export type ReviewScores = Record<string, number>
export type ReviewHistory = { requestId: string; action: string; actor: string; at: string }
export type ReviewTemplate = { id: string; title: string; items: ReviewItem[]; reportEnabled: boolean; rewriteGuide: string; rewriteMode?: "items" | "continuous" }
/** Missing mode on older snapshots is recovered without changing their writing or history. */
export function reviewWritingMode(template: ReviewTemplate, fallback: "items" | "continuous" = "items") {
  if (template.rewriteMode) return template.rewriteMode
  if (template.rewriteGuide.includes("항목별")) return "items"
  if (template.rewriteGuide.includes("하나의 글")) return "continuous"
  return fallback
}
export function composeReviewBody(template: ReviewTemplate, answers: Record<string, string>) {
  return template.items.map(item => answers[item.id] ?? "").join("\n\n")
}
export type ReviewCommon = {
  seeded?: boolean; legacyRecordId?: string; bookAuthor?: string; bookCoverSrc?: string;
  sourceBookId?: number; sourceReadingRecordId?: string; sourceReadingWorkbookId?: string; sourceReadingRound?: number;
  id: string; sourceWorkbookId: string; studentId: string; studentName: string; institutionId: string; institution: string; classId: string;
  bookTitle: string; level: number; isbn?: string; dokseoroBookId?: string; educationRegion?: string;
  month: string; template: ReviewTemplate; reportEnabled: boolean; createdAt: string;
  secondDecision?: "request" | "complete"; decidedBy?: string; decidedAt?: string;
  progress: "first-writing" | "first-submitted" | "first-saved" | "first-sent" | "second-available" | "second-writing" | "second-submitted" | "second-saved" | "second-sent" | "complete";
}

export function reviewActivityDate(review: Pick<ReviewCommon, "createdAt" | "month">) {
  const createdAt = new Date(review.createdAt)
  if (!Number.isNaN(createdAt.getTime())) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(createdAt)
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value)
    const year = part("year")
    const month = part("month")
    const day = part("day")
    if (year && month && day) return { year, month, day, monthKey: `${year}-${String(month).padStart(2, "0")}` }
  }
  const [year, month] = review.month.split("-").map(Number)
  return { year, month, day: 1, monthKey: review.month }
}
export type ReviewReport = { version: 1; generatedAt: string; ai: number; teacher: number; score: number; firstScore?: number; improvement?: number; weightedAi?: number; weightedTeacher?: number; finalScore?: number }
export type ReviewRecord = {
  assessment?: ReviewAssessmentSnapshot;
  legacyAiScores?: ReviewScores;
  templateSelectionPending?: boolean;
  legacyScoreDetailsAllocated?: boolean;
  id: string; reviewId: string; round: 1 | 2; linkedRecordId?: string; writingStatus: "writing" | "submitted";
  feedbackStatus: "작성전" | "작성완료" | "전송완료"; answers: Record<string, string>; initialBody: string; body: string; finalBody: string;
  rewriteEdited: boolean; initialStage: "items" | "rewrite"; stage: "items" | "rewrite"; itemIndex: number;
  rewriteChecklist?: number[];
  submittedAt?: string; savedAt?: string; sentAt?: string; seenAt?: string;
  feedback: string; reportFeedback?: string; itemFeedback: ItemFeedback[]; aiDraft?: { feedback: string; reportFeedback?: string; items: ItemFeedback[] };
  aiHistory: { requestId: string; at: string; status: "running" | "success" | "failure"; reason?: string; actor: string }[];
  aiUsed: number; aiScores?: ReviewScores; teacherScores?: ReviewScores; report?: ReviewReport;
  parentContact: boolean; parentSentAt?: string; flowers: number; flowersAt?: string; rejectedAt?: string; history: ReviewHistory[];
}
export type ReviewDatabase = { version: 1; seedVersion?: number; reviews: ReviewCommon[]; records: ReviewRecord[] }
export const reviewProgressLabels: Record<ReviewCommon["progress"], string> = {
  "first-writing": "1차 작성중", "first-submitted": "1차 작성완료", "first-saved": "1차 피드백 작성완료", "first-sent": "1차 피드백 도착",
  "second-available": "2차 작성가능", "second-writing": "2차 작성중", "second-submitted": "2차 작성완료", "second-saved": "2차 피드백 작성완료", "second-sent": "2차 피드백 도착", complete: "최종 완료",
}

export function studentReviewProgressLabel(progress: ReviewCommon["progress"]) {
  if (progress === "first-saved") return "1차 작성완료"
  if (progress === "second-saved") return "2차 작성완료"
  return reviewProgressLabels[progress]
}
/** A later round never replaces the status of the earlier record. */
export function reviewRecordStatus(review: ReviewCommon, record: ReviewRecord) {
  if (record.writingStatus === "writing") return `${record.round}차 작성중`
  if (record.feedbackStatus === "작성전") return `${record.round}차 작성완료`
  if (record.feedbackStatus === "작성완료") return `${record.round}차 피드백 작성완료`
  if (record.seenAt && (record.round === 2 || review.secondDecision === "complete")) return "최종 완료"
  return `${record.round}차 피드백 도착`
}

/** Student-facing status hides unsent teacher work and prioritizes the next available action. */
export function studentReviewRecordStatus(review: ReviewCommon, record: ReviewRecord) {
  if (record.round === 1 && review.progress === "second-available") return "2차 작성가능"
  if (record.writingStatus === "writing") return `${record.round}차 작성중`
  if (record.feedbackStatus !== "전송완료") return `${record.round}차 작성완료`
  if (record.seenAt && (record.round === 2 || review.secondDecision === "complete")) return "최종 완료"
  return `${record.round}차 피드백 도착`
}

export type StudentReviewListAction = "이어서 쓰기" | "선생님 확인 중" | "피드백 확인하기" | "2차 글 시작하기" | "활동 완료"

/** Student cards expose one useful next action instead of the internal workflow status. */
export function studentReviewListAction(review: ReviewCommon, record: ReviewRecord): StudentReviewListAction {
  if (record.writingStatus === "writing") return "이어서 쓰기"
  if (record.round === 1 && review.progress === "second-available") return "2차 글 시작하기"
  if (record.feedbackStatus !== "전송완료") return "선생님 확인 중"
  if (!record.seenAt) return "피드백 확인하기"
  return "활동 완료"
}

export type StudentReviewNotice = {
  kind: "feedback" | "writing-request"
  review: ReviewCommon
  record: ReviewRecord
  at: string
}

/** Keep unread feedback and the next writing action separate without double-counting one review. */
export function studentReviewNotices(db: ReviewDatabase): StudentReviewNotice[] {
  const reviewById = new Map(db.reviews.map(review => [review.id, review]))
  const unreadFeedback = db.records.flatMap(record => {
    const review = reviewById.get(record.reviewId)
    return review && record.feedbackStatus === "전송완료" && !record.seenAt
      ? [{ kind: "feedback" as const, review, record, at: record.sentAt ?? review.createdAt }]
      : []
  })
  const unreadReviewIds = new Set(unreadFeedback.map(notice => notice.review.id))
  const writingRequests = db.reviews.flatMap(review => {
    if (review.progress !== "second-available" || review.secondDecision !== "request" || unreadReviewIds.has(review.id)) return []
    if (db.records.some(record => record.reviewId === review.id && record.round === 2)) return []
    const first = db.records.find(record => record.reviewId === review.id && record.round === 1)
    return first ? [{ kind: "writing-request" as const, review, record: first, at: first.seenAt ?? first.sentAt ?? review.createdAt }] : []
  })
  return [...unreadFeedback, ...writingRequests].sort((a, b) => a.at.localeCompare(b.at))
}

/** Within one activity date, keep a review's newest round directly above its earlier round. */
export function sortStudentReviewRecords<T extends Pick<ReviewRecord, "reviewId" | "round">>(records: T[]) {
  const reviewOrder = new Map<string, number>()
  records.forEach(record => {
    if (!reviewOrder.has(record.reviewId)) reviewOrder.set(record.reviewId, reviewOrder.size)
  })
  return [...records].sort((a, b) => (reviewOrder.get(a.reviewId)! - reviewOrder.get(b.reviewId)!) || b.round - a.round)
}
export const emptyReviewDatabase = (): ReviewDatabase => ({ version: 1, reviews: [], records: [] })

export type ReviewSeed = {
  common: Omit<ReviewCommon, "createdAt" | "progress" | "reportEnabled">;
  at: string; status: "writing" | "작성전" | "작성완료" | "전송완료"; answers: string[];
  feedback?: string; seen?: boolean; flowers?: number; parentContact?: boolean; parentSent?: boolean;
  secondAnswers?: string[]; secondFeedback?: string; secondSeen?: boolean;
  secondState?: "available" | "writing" | "submitted"; secondDraftAnswers?: string[];
}

/** Build fixtures through the same commands as real prototype use: reports are not display-only stubs. */
export function createSeededReviewDatabase(seeds: ReviewSeed[]): ReviewDatabase {
  let db = emptyReviewDatabase()
  for (const seed of seeds) {
    let sequence = 0
    const student: ReviewActor = { role: "student", studentId: seed.common.studentId, name: seed.common.studentName }
    const teacher: ReviewActor = { role: "class", institutionId: seed.common.institutionId, classId: seed.common.classId, name: "담당 선생님" }
    const run = (command: ReviewCommand, actor = student) => {
      const requestId = `seed:${seed.common.id}:${++sequence}`
      const at = new Date(Date.parse(seed.at) + sequence * 60_000).toISOString()
      db = applyReviewCommand(db, command, actor, requestId, at)
      return requestId
    }
    run({ type: "create", common: { ...seed.common, seeded: true } })
    const fill = (round: 1 | 2, answers: string[]) => {
      const recordId = `${seed.common.id}-r${round}`
      run({ type: "save-writing", recordId, stage: "items", itemIndex: Math.max(0, seed.common.template.items.length - 1), body: "", answers: Object.fromEntries(seed.common.template.items.map((item, i) => [item.id, answers[i] ?? ""])) })
      if (seed.status !== "writing" || round === 2) {
        run({ type: "enter-rewrite", recordId })
        run({ type: "submit", recordId })
      }
      return recordId
    }
    const finish = (recordId: string, feedback: string, second: boolean) => {
      const common = db.reviews.find(c => c.id === seed.common.id)!
      const record = db.records.find(r => r.id === recordId)!
      const generated = sampleReviewAi(common, record)
      let scores: ReviewScores | undefined
      if (common.reportEnabled) {
        const runId = run({ type: "ai-start", recordId }, teacher)
        run({ type: "ai-result", recordId, runId, result: generated }, teacher)
        scores = Object.fromEntries(assessmentCriteria(common.level).map(c => [c.id, Math.round(c.max * (second ? .9 : .8))]))
      }
      run({ type: "save-feedback", recordId, feedback: common.reportEnabled ? generated.feedback : feedback, items: generated.items, scores, decision: seed.secondAnswers || seed.secondState ? "request" : "complete" }, teacher)
      const saved = db.records.find(r => r.id === recordId)!
      saved.parentContact = seed.parentContact ?? true
      if (seed.flowers) run({ type: "flower", recordId, amount: second ? 20 : seed.flowers }, teacher)
      if (seed.status === "전송완료" || second) {
        run({ type: "send", recordId }, teacher)
        if (seed.parentSent && saved.parentContact) run({ type: "parent", recordId }, teacher)
        const seen = second ? (seed.secondSeen ?? Boolean(seed.seen || seed.secondAnswers)) : Boolean(seed.seen || seed.secondAnswers)
        if (seen) run({ type: "seen", recordId })
      }
    }
    const firstId = fill(1, seed.answers)
    db.records.find(r => r.id === firstId)!.parentContact = seed.parentContact ?? true
    if (seed.status === "작성완료" || seed.status === "전송완료") finish(firstId, seed.feedback ?? `『${seed.common.bookTitle}』의 중요한 내용을 자신의 말로 정리했어요. 인상 깊은 장면과 그 이유가 잘 연결되어 있습니다. 자신의 경험을 한 가지 더 덧붙이면 생각이 더욱 구체적으로 드러나겠어요.`, false)
    if (seed.secondState) {
      if (!db.records.find(r => r.id === firstId)!.seenAt) run({ type: "seen", recordId: firstId })
      if (seed.secondState !== "available") {
        run({ type: "start-second", recordId: firstId })
        const secondAnswers = seed.secondDraftAnswers ?? seed.answers
        if (seed.secondState === "writing") {
          const secondId = `${seed.common.id}-r2`
          run({ type: "save-writing", recordId: secondId, stage: "items", itemIndex: Math.min(1, Math.max(0, seed.common.template.items.length - 1)), body: "", answers: Object.fromEntries(seed.common.template.items.map((item, i) => [item.id, secondAnswers[i] ?? ""])) })
        } else {
          fill(2, secondAnswers)
        }
      }
    } else if (seed.secondAnswers) {
      run({ type: "start-second", recordId: firstId })
      const secondId = fill(2, seed.secondAnswers)
      finish(secondId, seed.secondFeedback ?? "첫 번째 글에서 더 나아가 자신의 경험과 실천 방법을 구체적으로 썼어요. 선생님의 질문을 참고하여 생각을 발전시킨 점이 돋보입니다.", true)
    }
  }
  db.seedVersion = 1
  return db
}

/** One-time fixture installation. Existing user records and their independent histories always win. */
export function mergeReviewSeeds(existing: ReviewDatabase, seeds: ReviewDatabase): ReviewDatabase {
  if ((existing.seedVersion ?? 0) >= (seeds.seedVersion ?? 1)) return existing
  // Acknowledge older student fixtures without replacing any edited content.
  if ((existing.seedVersion ?? 0) < 6 && (seeds.seedVersion ?? 1) >= 6) {
    for (const record of existing.records) {
      const common = existing.reviews.find(c => c.id === record.reviewId)
      if (common?.seeded && common.studentId === "26142" && record.feedbackStatus === "전송완료" && !record.seenAt && record.sentAt && record.sentAt < "2026-09-01") {
        existing = applyReviewCommand(existing, { type: "seen", recordId: record.id }, { role: "student", studentId: common.studentId, name: common.studentName }, `mock-read-default-v6:${record.id}`, record.sentAt)
      }
    }
  }
  // Refresh fixture content/mapping only when no user writing or teacher processing exists.
  // Version 10 refreshes the dedicated second-writing demo so its first and second drafts
  // remain intentionally different in existing local fixture stores.
  const forcedFixtureRepairs = (existing.seedVersion ?? 0) < 10 && (seeds.seedVersion ?? 1) >= 10
    ? new Set(["review-seed-second-writing"])
    : new Set<string>()
  // Read acknowledgements are preserved below; other edited fixtures are never replaced.
  const repairs = seeds.reviews.filter(seed => {
    const old = existing.reviews.find(c => c.id === seed.id && c.seeded)
    const records = existing.records.filter(r => r.reviewId === old?.id)
    return old && records.length > 0 && (forcedFixtureRepairs.has(seed.id) || records.every(r => r.history.every(h => h.requestId.startsWith(`seed:${seed.id}:`) || h.action === "seen")))
  })
  const additions = seeds.reviews.filter(seed => !existing.reviews.some(c => c.id === seed.id || (c.studentId === seed.studentId && c.sourceWorkbookId === seed.sourceWorkbookId)))
  // Version 6 intentionally resets fixture acknowledgements to the requested demo defaults.
  // Only untouched fixtures qualify; user writing and teacher processing remain intact.
  const resetSeenDefaults = (existing.seedVersion ?? 0) < 6 && (seeds.seedVersion ?? 1) >= 6
  return { ...existing, seedVersion: seeds.seedVersion, reviews: [...existing.reviews.map(c => { const repair = repairs.find(seed => seed.id === c.id); return repair ? { ...repair, progress: resetSeenDefaults ? repair.progress : c.progress } : c }), ...additions], records: [...existing.records.filter(r => !repairs.some(c => c.id === r.reviewId)), ...seeds.records.filter(r => [...additions, ...repairs].some(c => c.id === r.reviewId)).map(r => { const old = existing.records.find(o => o.id === r.id); return old ? { ...r, seenAt: resetSeenDefaults ? r.seenAt : old.seenAt, history: [...r.history, ...old.history.filter(h => !h.requestId.startsWith(`seed:${r.reviewId}:`) && !(resetSeenDefaults && h.action === "seen"))] } : r })] }
}
export const plainReviewText = (html: string) => html.replace(/<br\s*\/?\s*>|<\/(p|div)>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim()
export const scoreLabel = (score: number) => Number(score.toFixed(1)).toString()

export function assessmentCriteria(level: number, record?: Pick<ReviewRecord, "assessment">) {
  return (record?.assessment ?? snapshotReviewAssessment(level)).criteria
}
export function assessmentAreas(level: number, record?: Pick<ReviewRecord, "assessment">) {
  const criteria = assessmentCriteria(level, record)
  return [...new Set(criteria.map(c => c.area))].map(area => ({
    id: area, max: criteria.filter(c => c.area === area).reduce((sum, c) => sum + c.max, 0),
  }))
}
export function validScores(level: number, scores?: ReviewScores, record?: Pick<ReviewRecord, "assessment">): scores is ReviewScores {
  const criteria = assessmentCriteria(level, record)
  return !!scores && Object.keys(scores).length === criteria.length && criteria.every(c => Number.isFinite(scores[c.id]) && scores[c.id] >= 0 && scores[c.id] <= c.max)
}
export function validAiScores(level: number, scores?: ReviewScores, record?: Pick<ReviewRecord, "assessment">): scores is ReviewScores {
  const areas = assessmentAreas(level, record)
  return !!scores && Object.keys(scores).length === areas.length && areas.every(a => Number.isFinite(scores[a.id]) && scores[a.id] >= 0 && scores[a.id] <= a.max)
}
/** Preserve historical criteria and teacher inputs; aggregate old AI details, never invent them. */
export function expandLegacyReviewScores(db: ReviewDatabase): ReviewDatabase {
  const levels = new Map(db.reviews.map(review => [review.id, review.level]))
  const migrate = (record: ReviewRecord, inherited?: ReviewAssessmentSnapshot): ReviewRecord => {
    const level = levels.get(record.reviewId) ?? 6
    let assessment = record.assessment
    if (!assessment) {
      const scores = { ...record.aiScores, ...record.teacherScores }
      if (Object.keys(scores).length > 0) {
        let criteria = structuredClone(legacyAssessmentCriteria)
        if ("summary" in scores) {
          criteria = [
            { id: "summary", area: "내용 요약", name: "내용 요약", max: 30, description: "이전 평가 당시 영역별 기준" },
            { id: "reflection", area: "감상과 깨달음", name: "감상과 깨달음", max: 30, description: "이전 평가 당시 영역별 기준" },
            { id: "originality", area: "발상과 독창성", name: "발상과 독창성", max: 20, description: "이전 평가 당시 영역별 기준" },
            { id: "expression", area: "표현과 전달력", name: "표현과 전달력", max: 20, description: "이전 평가 당시 영역별 기준" },
          ]
        } else if (!("unity" in scores)) {
          criteria = criteria.filter(c => c.id !== "unity" && c.id !== "cohesion").map(c => ({
            ...c, max: ["specific", "honest"].includes(c.id) ? 15 : ["expression", "delivery"].includes(c.id) ? 10 : c.max,
          }))
        }
        assessment = { version: "legacy-" + criteria.length, id: "legacy", label: "평가 당시 기준", minLevel: level, maxLevel: level, criteria }
      } else assessment = structuredClone(inherited ?? snapshotReviewAssessment(level))
    }
    const next = { ...record, assessment }
    if (record.aiScores && !validAiScores(level, record.aiScores, next) && validScores(level, record.aiScores, next)) {
      next.legacyAiScores = record.legacyAiScores ?? structuredClone(record.aiScores)
      next.aiScores = Object.fromEntries(assessmentAreas(level, next).map(area => [
        area.id, assessment!.criteria.filter(c => c.area === area.id).reduce((sum, c) => sum + record.aiScores![c.id], 0),
      ]))
    }
    return next
  }
  const firsts = new Map(db.records.filter(r => r.round === 1).map(r => [r.reviewId, migrate(r)]))
  return { ...db, records: db.records.map(r => r.round === 1 ? firsts.get(r.reviewId)! : migrate(r, firsts.get(r.reviewId)?.assessment)) }
}
export const scoreTotal = (scores: ReviewScores) => Object.values(scores).reduce((sum, value) => sum + value, 0)
/** Local prototype only: refresh old, unevaluated activities without converting teacher scores. */
export function upgradeUnscoredMockAssessments(db: ReviewDatabase): ReviewDatabase {
  const protectedReviews = new Set(db.records.filter(r => r.report || Object.keys(r.teacherScores ?? {}).length > 0).map(r => r.reviewId))
  return { ...db, records: db.records.map(record => {
    if (!record.assessment?.version.startsWith("legacy-") || protectedReviews.has(record.reviewId)) return record
    const review = db.reviews.find(r => r.id === record.reviewId)
    if (!review) return record
    const oldSample = sampleReviewAi(review, record).reportFeedback
    const next: ReviewRecord = { ...record, assessment: snapshotReviewAssessment(review.level), aiScores: undefined }
    const sample = sampleReviewAi(review, next)
    if (record.aiScores) next.aiScores = sample.scores
    if (record.reportFeedback && record.reportFeedback === oldSample) next.reportFeedback = sample.reportFeedback
    if (record.aiDraft?.reportFeedback && record.aiDraft.reportFeedback === oldSample) {
      next.aiDraft = { ...record.aiDraft, reportFeedback: sample.reportFeedback }
    }
    return next
  }) }
}
/** Fill missing report copy and compact exact old samples only. Never replace teacher edits. */
export function hydrateLegacyReviewFeedback(db: ReviewDatabase): ReviewDatabase {
  return { ...db, records: db.records.map(record => {
    const review = db.reviews.find(review => review.id === record.reviewId)
    if (!review?.reportEnabled) return record
    const missingSaved = !!record.report && record.reportFeedback === undefined
    const missingDraft = !!record.aiDraft && record.aiDraft.reportFeedback === undefined
    const reportFeedback = sampleReviewAi(review, record).reportFeedback
    const isOldSample = (value?: string) => !!value && value !== reportFeedback && value.replace(/\n{2,}/g, "\n") === reportFeedback?.replace(/\n{2,}/g, "\n")
    const updateSaved = missingSaved || isOldSample(record.reportFeedback)
    const updateDraft = missingDraft || isOldSample(record.aiDraft?.reportFeedback)
    if (!updateSaved && !updateDraft) return record
    return { ...record, reportFeedback: updateSaved ? reportFeedback : record.reportFeedback, aiDraft: updateDraft && record.aiDraft ? { ...record.aiDraft, reportFeedback } : record.aiDraft }
  }) }
}
export function canAccessReview(review: ReviewCommon, actor: ReviewActor) {
  return actor.role === "admin" || (actor.role === "student" && actor.studentId === review.studentId) ||
    (actor.role === "agency" && actor.institutionId === review.institutionId) ||
    (actor.role === "class" && actor.institutionId === review.institutionId && actor.classId === review.classId)
}
export function canRejectReview(record: ReviewRecord) { return record.writingStatus === "submitted" && record.feedbackStatus === "작성전" && record.aiHistory.length === 0 }
export function canChangeReviewTemplate(record: ReviewRecord) {
  return record.round === 1 && record.writingStatus === "writing" && record.stage === "items" && record.feedbackStatus === "작성전" && !record.rewriteEdited && !record.history.some(h => h.action === "enter-rewrite" || h.action === "submit")
}
export function canAwardReview(record: ReviewRecord) { return record.writingStatus === "submitted" && record.feedbackStatus !== "작성전" && record.flowers === 0 }
export function canSendReview(review: ReviewCommon, record: ReviewRecord) { return record.writingStatus === "submitted" && record.feedbackStatus === "작성완료" && !record.aiDraft && !record.aiHistory.some(h => h.status === "running") && (!review.reportEnabled || (!!record.report && validScores(review.level, record.teacherScores, record) && validAiScores(review.level, record.aiScores, record))) }
export function reportState(review: ReviewCommon, record: ReviewRecord) { return !review.reportEnabled ? "생성 불가" : record.report ? "생성 완료" : "생성 전" }

export type ReviewCommand = {
  type: "create"; common: Omit<ReviewCommon, "createdAt" | "progress" | "reportEnabled">;
} | { type: "start-second"; recordId: string }
  | { type: "switch-template"; recordId: string; template?: ReviewTemplate }
  | { type: "save-writing"; recordId: string; stage: "items" | "rewrite"; answers: Record<string, string>; body: string; itemIndex: number; rewriteChecklist?: number[] }
  | { type: "enter-rewrite" | "submit" | "seen" | "reject" | "send" | "parent" | "ai-start"; recordId: string }
  | { type: "flower"; recordId: string; amount: number }
  | { type: "ai-result"; recordId: string; runId: string; result?: { feedback: string; reportFeedback?: string; items: ItemFeedback[]; scores?: ReviewScores; unscorableReason?: string }; error?: string }
  | { type: "save-feedback"; recordId: string; feedback: string; reportFeedback?: string; items: ItemFeedback[]; scores?: ReviewScores; decision?: "request" | "complete" }

function requireCondition(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message) }
function makeRecord(review: ReviewCommon, round: 1 | 2, first?: ReviewRecord): ReviewRecord {
  const direct = !!first?.rewriteEdited
  const itemRewrite = reviewWritingMode(review.template) === "items"
  return {
    assessment: structuredClone(first?.assessment ?? snapshotReviewAssessment(review.level)),
    id: `${review.id}-r${round}`, reviewId: review.id, round, linkedRecordId: first?.id,
    writingStatus: "writing", feedbackStatus: "작성전", answers: first && (!direct || itemRewrite) ? structuredClone(first.answers) : {},
    initialBody: direct ? first!.finalBody : "", body: direct ? first!.finalBody : "", finalBody: "", rewriteEdited: false,
    initialStage: direct ? "rewrite" : "items", stage: direct ? "rewrite" : "items", itemIndex: 0,
    feedback: "", itemFeedback: review.template.items.map(i => ({ itemId: i.id, text: "", visible: true })),
    aiHistory: [], aiUsed: 0, parentContact: first?.parentContact ?? true, flowers: 0, history: [],
  }
}
function validateItems(review: ReviewCommon, items: ItemFeedback[]) {
  const expected = review.template.items.map(i => i.id)
  return Array.isArray(items) && items.every(i => i && typeof i.itemId === "string") && items.length === expected.length && new Set(items.map(i => i.itemId)).size === expected.length && items.every(i => expected.includes(i.itemId) && typeof i.text === "string" && typeof i.visible === "boolean")
}

/** Pure command boundary shared by the API and regression tests. Never mutate previous records. */
export function applyReviewCommand(database: ReviewDatabase, command: ReviewCommand, actor: ReviewActor, requestId: string, at: string): ReviewDatabase {
  const db = structuredClone(database)
  requireCondition(["create", "switch-template", "start-second", "save-writing", "enter-rewrite", "submit", "seen", "reject", "send", "parent", "ai-start", "ai-result", "flower", "save-feedback"].includes(command.type), "지원하지 않는 작업입니다.")
  if (db.records.some(r => r.history.some(h => h.requestId === requestId))) return db
  if (command.type === "create") {
    requireCondition(actor.role === "student" && actor.studentId === command.common.studentId, "본인 독후감만 작성할 수 있습니다.")
    if (db.reviews.some(r => r.sourceWorkbookId === command.common.sourceWorkbookId && r.studentId === actor.studentId)) return db
    requireCondition(!db.reviews.some(r => r.id === command.common.id), "이미 사용 중인 독후감 ID입니다.")
    requireCondition(command.common.template.items.length > 0 && new Set(command.common.template.items.map(i => i.id)).size === command.common.template.items.length, "템플릿 항목 ID를 확인해 주세요.")
    const review: ReviewCommon = { ...command.common, reportEnabled: command.common.template.reportEnabled, createdAt: at, progress: "first-writing" }
    db.reviews.push(review)
    const record = makeRecord(review, 1)
    record.history.push({ requestId, action: command.type, actor: actor.name, at })
    db.records.push(record)
    return db
  }
  const record = db.records.find(r => r.id === command.recordId)
  requireCondition(record, "독후감 레코드를 찾을 수 없습니다.")
  const review = db.reviews.find(r => r.id === record.reviewId)!
  requireCondition(canAccessReview(review, actor), "조회·처리 권한이 없습니다.")
  const studentAction = ["switch-template", "start-second", "save-writing", "enter-rewrite", "submit", "seen"].includes(command.type)
  requireCondition(studentAction ? actor.role === "student" : actor.role === "agency" || actor.role === "class", "이 작업을 처리할 권한이 없습니다.")
  const first = db.records.find(r => r.reviewId === review.id && r.round === 1)!
  const prefix = record.round === 1 ? "first" : "second"
  requireCondition(!record.templateSelectionPending || command.type === "switch-template", "독후감을 선택한 후 작성해 주세요.")
  if (command.type === "switch-template") {
    requireCondition(canChangeReviewTemplate(record) && !db.records.some(r => r.reviewId === review.id && r.round === 2), "고쳐쓰기 전 1차 작성 중에만 독후감을 교체할 수 있습니다.")
    if (command.template) {
      requireCondition(record.templateSelectionPending, "먼저 독후감 교체를 확인해 주세요.")
      requireCondition(command.template.items.length > 0 && new Set(command.template.items.map(i => i.id)).size === command.template.items.length, "템플릿 항목 ID를 확인해 주세요.")
      review.template = command.template
      review.reportEnabled = command.template.reportEnabled
    }
    const history = record.history
    const parentContact = record.parentContact
    Object.assign(record, makeRecord(review, 1), { history, parentContact, templateSelectionPending: !command.template })
    review.progress = "first-writing"
  } else if (command.type === "start-second") {
    requireCondition(record.round === 1 && record.seenAt && review.secondDecision === "request", "1차 피드백 확인 후 다시 작성할 수 있습니다.")
    if (db.records.some(r => r.reviewId === review.id && r.round === 2)) return db
    db.records.push(makeRecord(review, 2, first)); review.progress = "second-writing"
  } else if (command.type === "save-writing") {
    requireCondition(record.writingStatus === "writing", "제출한 글은 수정할 수 없습니다.")
    requireCondition(["items", "rewrite"].includes(command.stage) && Number.isInteger(command.itemIndex) && command.itemIndex >= 0 && command.itemIndex < review.template.items.length && typeof command.body === "string", "작성 단계와 항목 번호를 확인해 주세요.")
    requireCondition(command.stage !== "items" || (!record.rewriteEdited && record.initialStage !== "rewrite"), "고쳐쓰기 저장 후 이전 단계로 이동할 수 없습니다.")
    if (command.stage === "items") {
      requireCondition(command.answers && Object.entries(command.answers).every(([id, value]) => typeof value === "string" && review.template.items.some(i => i.id === id)), "잘못된 항목 ID입니다.")
      record.answers = command.answers
    } else {
      requireCondition(record.stage === "rewrite", "먼저 고쳐쓰기 단계로 이동해 주세요.")
      requireCondition(command.rewriteChecklist === undefined || (Array.isArray(command.rewriteChecklist) && command.rewriteChecklist.every(index => Number.isInteger(index) && index >= 0) && new Set(command.rewriteChecklist).size === command.rewriteChecklist.length), "고쳐쓰기 체크리스트를 확인해 주세요.")
      if (command.rewriteChecklist !== undefined) record.rewriteChecklist = command.rewriteChecklist
      if (reviewWritingMode(review.template) === "items") {
        requireCondition(command.answers && Object.entries(command.answers).every(([id, value]) => typeof value === "string" && review.template.items.some(i => i.id === id)), "잘못된 항목 ID입니다.")
        record.rewriteEdited ||= review.template.items.some(item => (command.answers[item.id] ?? "") !== (record.answers[item.id] ?? ""))
        record.answers = command.answers
        record.body = composeReviewBody(review.template, record.answers)
      } else {
        record.rewriteEdited ||= command.body !== record.body
        record.body = command.body
      }
    }
    record.stage = command.stage; record.itemIndex = command.itemIndex
  } else if (command.type === "enter-rewrite") {
    requireCondition(record.writingStatus === "writing", "제출한 글은 수정할 수 없습니다.")
    requireCondition(Object.values(record.answers).some(a => plainReviewText(a)), "작성한 내용이 없습니다.")
    if (!record.rewriteEdited && record.initialStage !== "rewrite") {
      record.body = composeReviewBody(review.template, record.answers)
      record.initialBody = record.body
    }
    record.stage = "rewrite"
  } else if (command.type === "submit") {
    if (reviewWritingMode(review.template) === "items") record.body = composeReviewBody(review.template, record.answers)
    requireCondition(record.writingStatus === "writing" && record.stage === "rewrite" && plainReviewText(record.body), "고쳐쓰기 본문을 작성해 주세요.")
    record.finalBody = record.body; record.writingStatus = "submitted"; record.submittedAt = at; record.feedbackStatus = "작성전"; review.progress = `${prefix}-submitted`
  } else if (command.type === "seen") {
    requireCondition(record.feedbackStatus === "전송완료", "아직 전송되지 않은 피드백입니다.")
    if (!record.seenAt) { record.seenAt = at; review.progress = record.round === 2 || review.secondDecision === "complete" ? "complete" : "second-available" }
  } else if (command.type === "reject") {
    requireCondition(canRejectReview(record), "AI 실행 이력이 없고 피드백 작성전인 경우만 반려할 수 있습니다.")
    record.writingStatus = "writing"; record.rejectedAt = at; record.feedback = ""; record.teacherScores = undefined; record.aiDraft = undefined
    record.itemFeedback = review.template.items.map(i => ({ itemId: i.id, text: "", visible: true })); review.progress = `${prefix}-writing`
  } else if (command.type === "ai-start") {
    // A browser closed between start/result must not permanently lock this record.
    record.aiHistory.forEach(h => { if (h.status === "running" && Date.parse(at) - Date.parse(h.at) >= 120_000) { h.status = "failure"; h.reason = "응답 대기 시간이 초과되었습니다." } })
    requireCondition(record.writingStatus === "submitted" && record.feedbackStatus !== "전송완료" && record.aiUsed < 2 && !record.aiHistory.some(h => h.status === "running"), "현재 AI 피드백을 생성할 수 없습니다.")
    record.aiHistory.push({ requestId, at, status: "running", actor: actor.name })
  } else if (command.type === "ai-result") {
    requireCondition(record.writingStatus === "submitted" && record.feedbackStatus !== "전송완료", "이미 처리된 피드백입니다.")
    const run = record.aiHistory.find(h => h.requestId === command.runId && h.status === "running")
    requireCondition(run, "진행 중인 AI 실행을 찾을 수 없습니다.")
    const result = command.result
    const unscorableReason = !command.error ? result?.unscorableReason?.trim() : undefined
    const valid = result && typeof result.feedback === "string" && plainReviewText(result.feedback).length >= 10 && validateItems(review, result.items) && result.items.every(i => !i.visible || plainReviewText(i.text)) && (!review.reportEnabled || (typeof result.reportFeedback === "string" && plainReviewText(result.reportFeedback).length >= 10 && (validAiScores(review.level, record.aiScores, record) || validAiScores(review.level, result.scores, record))))
    run.status = !unscorableReason && valid && !command.error ? "success" : "failure"
    if (run.status === "success" && result) {
      record.aiUsed++; record.aiDraft = { feedback: result.feedback, items: result.items, reportFeedback: review.reportEnabled ? result.reportFeedback : undefined }
      if (review.reportEnabled && !record.aiScores) record.aiScores = result.scores
    } else run.reason = command.error || (unscorableReason ? `채점 불가: ${unscorableReason}` : "빈 결과·항목 ID·평가 점수를 확인해 주세요.")
  } else if (command.type === "save-feedback") {
    requireCondition(record.writingStatus === "submitted" && record.feedbackStatus !== "전송완료", "피드백을 수정할 수 없습니다.")
    requireCondition(!record.aiHistory.some(h => h.status === "running"), "AI 생성이 끝난 뒤 저장해 주세요.")
    requireCondition(plainReviewText(command.feedback).length >= 10 && validateItems(review, command.items), "총평 10자와 템플릿 항목을 확인해 주세요.")
    requireCondition(record.round !== 1 || command.decision === "request" || command.decision === "complete", "2차 작성 여부를 선택해 주세요.")
    if (review.reportEnabled) {
      requireCondition(validAiScores(review.level, record.aiScores, record) && validScores(review.level, command.scores, record), "AI 생성 성공 및 선생님 평가 완료가 필요합니다.")
      record.teacherScores = command.scores
      const ai = scoreTotal(record.aiScores); const teacher = scoreTotal(command.scores)
      record.report = { version: 1, generatedAt: at, ai, teacher, score: (ai + teacher) / 2 }
      if (record.round === 2) {
        requireCondition(first.report, "1차 평가 보고서가 필요합니다.")
        const weightedAi = (first.report.ai + ai * 2) / 3; const weightedTeacher = (first.report.teacher + teacher * 2) / 3
        Object.assign(record.report, { firstScore: first.report.score, improvement: record.report.score - first.report.score, weightedAi, weightedTeacher, finalScore: (weightedAi + weightedTeacher) / 2 })
      }
    }
    if (record.round === 1) { review.secondDecision = command.decision; review.decidedBy = actor.name; review.decidedAt = at }
    if (review.reportEnabled) {
      if (command.reportFeedback !== undefined) requireCondition(typeof command.reportFeedback === "string" && plainReviewText(command.reportFeedback).length >= 10, "보고서용 총평을 10자 이상 입력해 주세요.")
      record.reportFeedback = command.reportFeedback ?? record.aiDraft?.reportFeedback ?? record.reportFeedback
    }
    record.feedback = command.feedback; record.itemFeedback = command.items; record.savedAt = at; record.feedbackStatus = "작성완료"; record.aiDraft = undefined; review.progress = `${prefix}-saved`
  } else if (command.type === "send") {
    requireCondition(canSendReview(review, record), "저장 및 평가 완료 후 전송할 수 있습니다.")
    record.feedbackStatus = "전송완료"; record.sentAt = at; review.progress = `${prefix}-sent`
  } else if (command.type === "parent") {
    requireCondition(record.feedbackStatus === "전송완료" && record.parentContact && !record.parentSentAt, "학부모 발송 조건을 확인해 주세요.")
    record.parentSentAt = at
  } else if (command.type === "flower") {
    requireCondition(canAwardReview(record) && [5, 10, 15, 20].includes(command.amount), "저장 완료한 차수에 한 번만 지급할 수 있습니다.")
    record.flowers = command.amount; record.flowersAt = at
  }
  record.history.push({ requestId, action: command.type, actor: actor.name, at })
  return db
}

/** Fixed demo output. Replace this adapter when a real AI service is connected. */
export function sampleReviewAi(review: ReviewCommon, record: ReviewRecord) {
  const lowerFeedback = review.level <= 2
  const copy = record.round === 1 ? REVIEW_FEEDBACK_SAMPLES.first : REVIEW_FEEDBACK_SAMPLES.second
  const criteria = assessmentCriteria(review.level, record)
  const scores = record.aiScores ?? Object.fromEntries(assessmentAreas(review.level, record).map(a => [a.id, Number((a.max * (record.round === 1 ? .7 : .8)).toFixed(1))]))
  const areas = [...new Set(criteria.map(criterion => criterion.area))]
  const reportFeedback = review.reportEnabled ? [
    `《${review.bookTitle}》을/를 읽고 ${record.round}차 독후감을 작성하였습니다. 영역별 평가 내용은 다음과 같습니다.`,
    ...areas.map(area => {
      const details = criteria.filter(criterion => criterion.area === area)
      const max = details.reduce((sum, criterion) => sum + criterion.max, 0)
      const score = scores[area] ?? 0
      const ratio = score / max
      const text = ratio >= .9 ? "해당 영역의 요구를 충족하며 내용을 명확하고 구체적으로 표현하였습니다." : ratio < .6 ? "해당 영역에서 필요한 내용을 구체적으로 작성하는 연습이 필요합니다. 핵심 내용을 정리하고 이유를 덧붙여 설명해 보아야 합니다." : REVIEW_FEEDBACK_SAMPLES.areas[area]
      return `${area}(${scoreLabel(score)}/${max}점): ${text ?? "해당 영역의 내용을 구체적으로 설명하는 연습이 필요합니다."}`
    }),
    ...(record.round === 2 ? [`\n[성장 요약] ${REVIEW_FEEDBACK_SAMPLES.second.growth}`] : []),
  ].join("\n") : undefined
  return {
    feedback: `${lowerFeedback ? copy.lower : copy.upper}\n\n${copy.mission}`,
    reportFeedback,
    items: review.template.items.map(item => {
      const sample = REVIEW_FEEDBACK_SAMPLES.items.find(sample => new RegExp(sample.match).test(item.title))
      const present = Boolean(plainReviewText(record.answers[item.id] ?? ""))
      const text = !present && !record.rewriteEdited ? "이 항목은 아직 쓰지 않았어요." : record.round === 1 ? sample?.first ?? "질문에 맞추어 자신의 생각을 적었어요. 그렇게 생각한 이유를 덧붙여 보세요." : sample?.second ?? "질문에 대한 생각은 적었지만 이유가 아직 짧아요. 책 내용과 연결하여 설명해 보세요."
      return { itemId: item.id, visible: true, text: record.round === 2 ? `(1차 피드백 ${sample?.status ?? "부분 반영"}) ${text}` : text }
    }),
    scores,
  }
}
