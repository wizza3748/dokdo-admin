import { randomUUID } from "node:crypto"
import path from "node:path"
import { PrototypeStore } from "./prototype-store"
import { buildStudentTest, studentTestCases, studentTestNames, studentTestSummary, testFeedback, testStudent, testTeacher, type StudentTestCaseId, type StudentTestFixture } from "./student-test-scenarios"
import { addDays, kstDate, weekStart } from "./pro-calendar"
import { atReviewTime, reviewNow } from "./review-clock"
import { applyManagedReviewCommand, applyProCommand, reconcilePro } from "./pro-domain"
import type { ReviewCommand, ReviewDatabase } from "./review-domain"
import type { ProCommand } from "./pro-types"
import { connectStudentTestBooks, studentTestBookPath } from "./student-test-books"

export type StudentTestSession = StudentTestFixture & { token: string; caseId: StudentTestCaseId; day: string; createdAt: string; changedAt?: string; initial: ReturnType<typeof studentTestSummary> }
export type StudentTestState = { day: string; sessions: StudentTestSession[] }
export const emptyStudentTests = (): StudentTestState => ({ day: "", sessions: [] })
/** Read-only legacy source, copied once into a local browser workspace. Never used on Vercel. */
export const legacyStudentTestStore = new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory: path.join(process.env.DOKDO_LOCAL_STATE_DIR || path.join(process.cwd(), ".local-state"), "student-front-tests") })

export function newStudentTestSession(caseId: StudentTestCaseId, now: string): StudentTestSession {
  const fixture = buildStudentTest(caseId, now)
  return { ...fixture, caseId, token: randomUUID(), day: kstDate(now), createdAt: now, initial: studentTestSummary(fixture.db, fixture.baseAt) }
}
function connectSessionMetadata(session: StudentTestSession): StudentTestSession {
  let db = connectStudentTestBooks(session.db, session.caseId)
  const studentId = `student-test-${session.caseId}`
  const legacyName = `테스트 · ${studentTestCases.find(c => c.id === session.caseId)!.name}`
  const name = studentTestNames[session.caseId]
  const members = db.pro?.members.map(member => member.id === studentId && member.name === legacyName ? { ...member, name } : member)
  const reviews = db.reviews.map(review => review.studentId === studentId && review.studentName === legacyName ? { ...review, studentName: name } : review)
  const memberChanged = members?.some((member, index) => member !== db.pro!.members[index])
  if (memberChanged || reviews.some((review, index) => review !== db.reviews[index])) {
    db = { ...db, reviews, pro: memberChanged && db.pro ? { ...db.pro, members: members! } : db.pro }
  }
  if (db === session.db) return session
  const initialBooks = session.initial.books.map(line => {
    const old = session.db.reviews.find(review => line.startsWith(`${review.bookTitle}: `))
    const updated = old && db.reviews.find(review => review.id === old.id)
    return old && updated ? `${updated.bookTitle}${line.slice(old.bookTitle.length)}` : line
  })
  return { ...session, db, initial: { ...session.initial, books: initialBooks } }
}
/** Only entering the catalog creates today's generation. Previous-day open tabs keep their own data. */
export function prepareStudentTests(state: StudentTestState, now: string): StudentTestState {
  const day = kstDate(now)
  const sessions = state.sessions.map(connectSessionMetadata)
  if (sessions.some((session, index) => session !== state.sessions[index])) state = { ...state, sessions }
  if (state.day === day) return state
  const previousDay = kstDate(addDays(now, -1))
  return { day, sessions: [...state.sessions.filter(s => s.day === previousDay), ...studentTestCases.map(c => newStudentTestSession(c.id, now))] }
}
export function getStudentTest(state: StudentTestState, token: string) {
  const session = state.sessions.find(s => s.token === token)
  if (!session) throw new Error("이 예시는 초기화되었거나 사용 기간이 끝났습니다. 학생프론트 테스트 목록에서 다시 열어 주세요.")
  return connectSessionMetadata(session)
}
export function resetStudentTest(state: StudentTestState, token: string, now: string): StudentTestState {
  const old = getStudentTest(state, token)
  if (old.day !== kstDate(now)) throw new Error("이전 날짜 예시입니다. 테스트 목록을 다시 열어 오늘 예시를 사용해 주세요.")
  return { ...state, sessions: state.sessions.map(s => s.token === token ? newStudentTestSession(s.caseId, now) : s) }
}
export function currentStudentTest(session: StudentTestSession, now: string): ReviewDatabase {
  return reconcilePro(atReviewTime(structuredClone(connectSessionMetadata(session).db), now))
}
export function runStudentTest(session: StudentTestSession, kind: "review" | "pro", command: ReviewCommand | ProCommand, requestId: string, now: string): StudentTestSession {
  let current = currentStudentTest(session, now)
  if (kind === "pro" && !["apply", "cancel", "change"].includes(command.type)) throw new Error("학생 테스트에서 허용하지 않는 요청입니다.")
  if (kind === "review") {
    let reviewCommand = command as ReviewCommand
    // Same student identity rebinding as the existing API, without touching shared seeds.
    if (reviewCommand.type === "create") {
      const m = current.pro!.members[0]
      reviewCommand = { ...reviewCommand, common: { ...reviewCommand.common, id: `${reviewCommand.common.id}-${m.id}`, studentId: m.id, studentName: m.name, institutionId: m.institutionId || "unassigned", institution: "전용 테스트 기관", classId: "external" } }
    }
    current = applyManagedReviewCommand(current, reviewCommand, testStudent(current), requestId, now)
  } else current = applyProCommand(current, command as ProCommand, testStudent(current), requestId, now)
  return { ...session, db: current, changedAt: now }
}
/** Dedicated-session-only race injection. It still performs a real save or policy reconciliation. */
export function controlStudentTest(session: StudentTestSession, action: "teacher-start" | "cutoff", now: string): StudentTestSession {
  if (!["change-one", "change-many"].includes(session.caseId)) throw new Error("이 예시에서는 처리 중 상태 변경을 지원하지 않습니다.")
  let db = currentStudentTest(session, now)
  if (action === "teacher-start") {
    const selected = db.pro!.cases.filter(c => c.selection === "student" && c.selectedAt && !c.firstSentAt && !c.closedAt)
    if (!selected.length) throw new Error("작성 시작할 기존 신청이 없습니다. 이 예시만 초기화해 주세요.")
    for (const c of selected) db = applyManagedReviewCommand(db, testFeedback(`${c.reviewId}-r1`), testTeacher, randomUUID(), now)
  } else {
    const cutoff = db.pro!.cases.find(c => c.week === weekStart(reviewNow(db, now)))?.cutoff
    if (!cutoff || cutoff <= reviewNow(db, now)) throw new Error("이미 마감되었습니다. 이 예시만 초기화해 주세요.")
    db.pro!.clockMode = "test"; db.pro!.clock = cutoff; db = reconcilePro(db)
  }
  return { ...session, db, changedAt: now }
}
export function studentTestRow(session: StudentTestSession, now: string) {
  session = connectSessionMetadata(session)
  const c = studentTestCases.find(c => c.id === session.caseId)!
  const db = currentStudentTest(session, now), at = reviewNow(db, now)
  const query = `studentTest=${session.token}&demoStudent=${db.pro!.members[0].id}`
  const targetRound = Math.max(1, ...db.records.filter(record => record.reviewId === session.targetId).map(record => record.round))
  return { ...c, path: studentTestBookPath(c.path), token: session.token, student: db.pro!.members[0].name, initial: session.initial, current: studentTestSummary(db, at), changed: !!session.changedAt, baseAt: session.baseAt, now: at, day: session.day, designated: db.pro!.clockMode === "test", dateReason: session.dateReason,
    href: `/student/exploration-record?tab=workbook&month=${session.listMonth}&${query}`,
    detailHref: session.targetId ? `/student/online-workbook/${session.targetId}?round=${targetRound}&${query}` : undefined }
}
export type StudentTestRow = ReturnType<typeof studentTestRow>
