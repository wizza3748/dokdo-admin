import { NextResponse } from "next/server"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { applyReviewCommand, canAccessReview, expandLegacyReviewScores, upgradeUnscoredMockAssessments, hydrateLegacyReviewFeedback, mergeReviewSeeds, normalizeReviewFeedbackScope, type ReviewActor, type ReviewCommand, type ReviewDatabase } from "@/lib/review-domain"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"

export const runtime = "nodejs"
const statePath = path.join(process.cwd(), ".local-state", "online-reviews.json")
const shared = globalThis as typeof globalThis & { reviewQueue?: Promise<unknown> }
async function readState(): Promise<ReviewDatabase> {
  try {
    const db = JSON.parse(await readFile(statePath, "utf8")) as ReviewDatabase
    const scoped = normalizeReviewFeedbackScope(db)
    // Persist only the approved item-feedback cleanup, not unrelated hydration changes.
    if (scoped !== db) await writeState(scoped)
    return normalizeReviewFeedbackScope(hydrateLegacyReviewFeedback(upgradeUnscoredMockAssessments(expandLegacyReviewScores(mergeReviewSeeds(scoped, getDefaultReviewDatabase())))))
  }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return getDefaultReviewDatabase(); throw error }
}
async function writeState(db: ReviewDatabase) {
  await mkdir(path.dirname(statePath), { recursive: true })
  await writeFile(`${statePath}.tmp`, JSON.stringify(db), "utf8")
  await rename(`${statePath}.tmp`, statePath)
}
// Explicit demo identities, not production authentication. Replace at the real auth boundary.
function actorFor(request: Request): ReviewActor {
  const role = new URL(request.url).searchParams.get("role")
  if (role === "admin") return { role: "admin", name: "본사관리자" }
  if (role === "agency" || role === "class") return { role, institutionId: "dokdo", classId: "class-1", name: "담당 선생님" }
  if (role === "external") return { role: "external", name: "외부 조회" }
  return { role: "student", studentId: "26142", name: "진독도" }
}
function visibleState(db: ReviewDatabase, actor: ReviewActor, sharedRecordId?: string | null) {
  // Local prototype sharing: an explicit unguessable record URL grants read-only access.
  // Production must replace this with signed, expiring share credentials.
  const sharedRecord = actor.role === "external" ? db.records.find(r => r.id === sharedRecordId && r.feedbackStatus === "전송완료") : undefined
  const reviews = db.reviews.filter(r => canAccessReview(r, actor) || r.id === sharedRecord?.reviewId)
  const records = db.records.filter(r => reviews.some(common => common.id === r.reviewId) && (actor.role !== "external" || (r.feedbackStatus === "전송완료" && r.round <= sharedRecord!.round))).map(record => {
    if (actor.role !== "student" && actor.role !== "external") return record
    // Unsent drafts/evaluations never reach student clients.
    if (record.feedbackStatus !== "전송완료") return { ...record, feedback: "", reportFeedback: "", itemFeedback: [], aiDraft: undefined, aiScores: undefined, legacyAiScores: undefined, teacherScores: undefined, report: undefined, aiHistory: [] }
    return { ...record, legacyAiScores: undefined, aiDraft: undefined, aiHistory: [], history: [], parentContact: false, itemFeedback: record.itemFeedback.filter(i => i.visible) }
  })
  return { version: 1, reviews, records }
}
export async function GET(request: Request) {
  // Reads may perform the one-time prototype migration; serialize them with writes.
  const job = (shared.reviewQueue ?? Promise.resolve()).catch(() => undefined).then(async () => visibleState(await readState(), actorFor(request), new URL(request.url).searchParams.get("recordId")))
  shared.reviewQueue = job.catch(() => undefined)
  return NextResponse.json(await job, { headers: { "Cache-Control": "no-store" } })
}
export async function POST(request: Request) {
  const actor = actorFor(request)
  const payload = await request.json() as { command: ReviewCommand; requestId: string }
  const job = (shared.reviewQueue ?? Promise.resolve()).catch(() => undefined).then(async () => {
    if (!payload.requestId || !payload.command?.type) throw new Error("잘못된 요청입니다.")
    const db = applyReviewCommand(await readState(), payload.command, actor, payload.requestId, new Date().toISOString())
    await writeState(db)
    return visibleState(db, actor)
  })
  shared.reviewQueue = job.catch(() => undefined)
  try { return NextResponse.json(await job) }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "처리에 실패했습니다." }, { status: 400 }) }
}
export async function DELETE() {
  const job = (shared.reviewQueue ?? Promise.resolve()).catch(() => undefined).then(() => writeState(getDefaultReviewDatabase()))
  shared.reviewQueue = job
  await job
  return NextResponse.json({ ok: true })
}
