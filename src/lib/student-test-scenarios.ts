import { addDays, kstDate, managementMonth, monthWeeks, weekStart } from "./pro-calendar"
import { applyManagedReviewCommand, applyProCommand, reconcilePro } from "./pro-domain"
import { emptyReviewDatabase, type ReviewActor, type ReviewCommand, type ReviewDatabase } from "./review-domain"
import { studentProView } from "./pro-selectors"
import { proBookPresentation, proListGuidance, proSummaryText } from "./student-pro-presentation"
import { atReviewTime } from "./review-clock"
import { WORKBOOK_TEMPLATES } from "./workbook-templates"
import rewriteGuides from "./workbook-rewrite-guides.json" with { type: "json" }
import { studentTestBook } from "./student-test-books"

export const studentTestCases = [
  { id: "empty", name: "제출한 글 없음", path: "온라인 독후감 목록 → [책 읽으러 가기]", expect: "신청할 글 없음 안내. 권수는 유지되고 책 읽기로 이동합니다." },
  { id: "draft", name: "1차 임시 저장 → 제출", path: "목록 [이어서 쓰기] → 고쳐쓰기 [제출하기] → 나의 글 완성", expect: "저장한 글을 이어 쓰고 제출합니다. 제출 직후 피드백 신청 모달에서 직접 신청합니다." },
  { id: "apply-one", name: "신청 가능한 글 1편", path: "목록 [피드백 신청] → [신청하기]", expect: "남은 신청 권수 1→0권, 피드백 대기. 상세 [신청 취소] 후 1권으로 복구됩니다." },
  { id: "apply-many", name: "신청 가능한 글 여러 편", path: "목록의 원하는 글 [피드백 신청] → [신청하기]", expect: "3편 중 1편을 선택합니다. 나머지 글의 목록 신청 버튼은 숨기고, 상세에서 변경할 수 있습니다." },
  { id: "change-one", name: "직접 신청 · 변경 후보 1건", path: "‘바꿀 글’의 나의 글 완성 → [이 글로 바꾸기] → [바꾸기]", expect: "기존 신청 자동 선택. 기존 신청 해제·새 글 신청, 권수 유지, ‘신청을 바꿨어요.’ 안내. 기존 글에서는 신청 취소도 확인합니다." },
  { id: "change-many", name: "직접 신청 · 변경 후보 2건", path: "‘바꿀 글’의 나의 글 완성 → [이 글로 바꾸기] → 기존 신청 선택 → [바꾸기]", expect: "처음에는 [바꾸기] 비활성. 선택한 1건만 교체하고 권수는 유지합니다. 취소 1회만으로 이월 잔여가 복구되지 않을 수도 있습니다." },
  { id: "partial", name: "일부 신청 · 이월 잔여 있음", path: "목록 [피드백 신청] → 신청·취소 후 목록/상세/신청 모달 확인", expect: "3권 중 1권 신청 상태. 추가 신청 시 이월 잔여부터 줄고, 0권이면 괄호 안내가 사라집니다. 취소 후 재계산합니다." },
  { id: "locked", name: "권수 0 · 변경 가능한 신청 없음", path: "‘바꿀 글’의 나의 글 완성 → 피드백 신청 영역", expect: "기존 신청은 피드백 작성 중. 이 글로 바꾸기 불가, 취소 불가. 기존 신청과 권수는 유지됩니다." },
  { id: "arrival", name: "이전 피드백 도착 + 이번 주 신청", path: "목록의 ‘도착한 글’ [피드백 확인하기]", expect: "상단은 현재 신청 상태 유지. 도착한 글은 개별 카드에서 확인하고 읽음이 반영됩니다." },
  { id: "second-request", name: "2차 작성 요청", path: "1차 [피드백 확인하기] → [2차 글 시작하기] → 진입 확인", expect: "2차 제출 기한 표시. 2차 작성 시작·제출 시 1차 이용 권수 추가 차감 없음." },
  { id: "second-draft", name: "2차 작성 중 · 임시 저장", path: "2차 [이어서 쓰기] → 고쳐쓰기 → [제출하기]", expect: "저장한 2차 글 유지. 제출 후 피드백 대기, 추가 신청·권수 차감 없음." },
  { id: "second-sent", name: "2차 피드백 도착", path: "2차 [피드백 확인하기]", expect: "2차 피드백과 읽음 확인. 관리 종료, 1차 사용 1권만 유지됩니다." },
  { id: "schedule-first", name: "1차 완료 · 예약 전송", path: "관리자 상세 → [피드백 예약 전송] → [예약하기] → 학생 화면", expect: "예약 중 작성 중·사용 0권 유지. 실제 전송 후 도착·사용 1권·관리 종료. 예약 확인에서 취소 후 다시 등록할 수 있습니다." },
  { id: "schedule-request", name: "2차 요청 · 예약 전송", path: "관리자 상세 → [피드백 예약 전송] → [예약하기] → 학생 화면", expect: "실제 1차 전송 후 사용 1권·2차 작성 요청. 2차 제출 기한은 실제 전송 시각으로 계산합니다." },
  { id: "schedule-second", name: "2차 완료 · 예약 전송", path: "관리자 상세 → [피드백 예약 전송] → [예약하기] → 학생 화면", expect: "2차 예약 중 피드백 대기. 실제 전송 후 도착·관리 종료, 사용 1권 유지. 화면을 닫아도 로컬 서버가 처리합니다." },
  { id: "expired-empty", name: "2차 미작성 · 제출 기한 종료", path: "기한 종료 글의 목록 → 1차 피드백 확인", expect: "2차 작성 진입 불가. 1차 글과 피드백 조회 가능. 제출 이력을 임의로 만들지 않습니다." },
  { id: "expired-draft", name: "2차 임시 저장 · 제출 기한 종료", path: "기한 종료 글의 목록 → 2차 글 확인", expect: "임시 저장 내용은 보존하고 수정·제출은 차단합니다. 추가 권수 차감 없음." },
  { id: "reject-first", name: "1차 반려 · 수정 후 재제출", path: "목록 [다시 쓰기] → 수정 → [제출하기]", expect: "반려된 신청 해제·권수 복구. 재제출 시 제출 시점의 관리 주차로 판단하고 다시 신청합니다." },
  { id: "reject-second", name: "2차 반려 · 수정 후 재제출", path: "2차 [다시 쓰기] → 수정 → [제출하기]", expect: "기존 2차 제출 기한과 1차 사용 권수 유지. 기한 내 재제출 후 피드백 대기." },
  { id: "unassigned", name: "기관 배정 전", path: "온라인 독후감 목록 → 제출한 글의 나의 글 완성", expect: "기관 배정 안내, 권수 숨김·신청 불가. 일반 기관관리자 조회 범위에는 추가되지 않습니다." },
  { id: "closed-next", name: "신청 마감 · 자동 선정 · 다음 주 글", path: "목록 → ‘미선정 글’ / ‘다음 주 글’의 나의 글 완성", expect: "마감에 가장 최근 글만 자동 선정. 미선정 글 신청 불가, 마감 후 제출은 다음 주 귀속·아직 신청 불가." },
  { id: "month-boundary", name: "월 경계 · 이월 소멸", path: "온라인 독후감 목록 → 이번 주 권수와 관리 주차 확인", expect: "달력 월과 관리 월을 구분합니다. 지난 관리 월 잔여는 새 관리 월로 넘어오지 않습니다." },
] as const
export type StudentTestCaseId = typeof studentTestCases[number]["id"]
// Keep case descriptions in the test catalog, not in student identity fields.
export const studentTestNames: Record<StudentTestCaseId, string> = {
  empty: "김하준", draft: "이서연", "apply-one": "박도윤", "apply-many": "최지우",
  "change-one": "정민준", "change-many": "강서윤", partial: "조예준", locked: "윤하은",
  arrival: "장시우", "second-request": "임지아", "second-draft": "한준서", "second-sent": "오수아",
  "schedule-first": "배서진", "schedule-request": "문하린", "schedule-second": "차이준",
  "expired-empty": "서도현", "expired-draft": "신예린", "reject-first": "권지호", "reject-second": "황채원",
  unassigned: "안유찬", "closed-next": "송다은", "month-boundary": "유시온",
}
export type StudentTestFixture = { db: ReviewDatabase; baseAt: string; designated: boolean; dateReason: string; targetId?: string; listMonth: string }
const firstTemplate = WORKBOOK_TEMPLATES.find(t => t.id === 51)!
const template = { id: "51", title: firstTemplate.studentTitle, reportEnabled: false, rewriteMode: firstTemplate.rewriteMode, rewriteGuide: rewriteGuides["51"], items: firstTemplate.questions.map(q => ({ ...q, id: String(q.id) })) }
const sample = [
  "친구와 생각이 달라서 다툰 적이 있어 이 책을 골랐다. 주인공은 친구와 마음이 맞지 않을 때 어떻게 문제를 해결하는지 알고 싶었다.",
  "주인공은 친구들과 서로 다른 생각 때문에 갈등을 겪었다. 처음에는 자기 생각만 말했지만, 친구의 이유를 듣고 모두에게 좋은 방법을 함께 찾아갔다.",
  "친구의 이야기를 끝까지 듣는 장면이 기억에 남았다. 나도 내 생각만 옳다고 말했던 적이 있어서 부끄러웠고, 다른 생각도 존중해야겠다고 느꼈다.",
  "다음에 친구와 하고 싶은 놀이가 다르면 먼저 이유를 물어볼 것이다. 서로 하고 싶은 놀이를 번갈아 해 보고, 그때 느낀 점을 독서록에 적어 보고 싶다.",
]
const answers = Object.fromEntries(template.items.map((item, i) => [item.id, sample[i]]))
export const testTeacher: ReviewActor = { role: "agency", institutionId: "dokdo", name: "전용 예시 선생님" }
export function testStudent(db: ReviewDatabase): ReviewActor { const m = db.pro!.members[0]; return { role: "student", studentId: m.id, name: m.name } }
export function testFeedback(recordId: string, decision: "complete" | "request" = "complete"): ReviewCommand {
  return { type: "save-feedback", recordId, feedback: "친구의 마음과 자신의 경험을 연결하여 잘 썼어요. 기억에 남은 장면을 더 구체적으로 설명해 보세요.", items: template.items.map(i => ({ itemId: i.id, text: "", visible: false })), decision }
}

/** Fixtures replay the real commands; no fabricated usage counters or eligibility flags. */
export function buildStudentTest(id: StudentTestCaseId, today: string): StudentTestFixture {
  let baseAt = today, dateReason = "한국 시간 접속일 기준. 전용 기관의 피드백 요일은 월요일입니다."
  const minWeeks = id === "partial" ? 3 : ["change-many", "arrival"].includes(id) ? 2 : 1
  const weeks = monthWeeks(managementMonth(today)), elapsed = weeks.indexOf(weekStart(today)) + 1
  if (elapsed < minWeeks) { baseAt = addDays(weeks[minWeeks - 1], 2.5); dateReason = `${minWeeks}주분의 권수가 필요한 케이스로, 이번 관리 월 ${minWeeks}주차 수요일 정오를 사용합니다.` }
  if (id === "closed-next") { baseAt = "2026-10-23T03:00:00.000Z"; dateReason = "금요일 피드백 기관의 마감 직후(금요일 정오). 자동 선정·마감 후 다음 주 귀속을 함께 확인합니다." }
  if (id === "month-boundary") { baseAt = "2026-11-02T03:00:00.000Z"; dateReason = "새 관리 월 첫 주 월요일 정오. 직전 주는 10월 관리 주차이며, 남은 권수는 11월로 이월되지 않습니다." }
  const designated = baseAt !== today, week = weekStart(baseAt)
  const expired = id.startsWith("expired-")
  const previousMonth = managementMonth(addDays(monthWeeks(managementMonth(baseAt))[0], -7))
  const historicalWeek = monthWeeks(previousMonth)[0]
  const assigned = expired ? historicalWeek : id === "month-boundary" ? monthWeeks(previousMonth)[0] : addDays(week, -(minWeeks - 1) * 7)
  const weekday = id === "closed-next" ? 5 : 1
  const studentId = `student-test-${id}`, studentName = studentTestNames[id]
  let db: ReviewDatabase = { ...emptyReviewDatabase(), pro: { version: 1, clock: assigned, clockMode: "real", effectiveAt: assigned, effectiveMonth: managementMonth(assigned), members: [{ id: studentId, name: studentName, account: studentId, level: 4, age: 11, product: "pro", status: "active", external: true, institutionId: id === "unassigned" ? undefined : "dokdo", teacherId: "teacher-1", assignedAt: id === "unassigned" ? undefined : assigned, effectiveAt: assigned, effectiveMonth: managementMonth(assigned), serviceEnd: addDays(baseAt, 730), parentContact: true, limits: {}, overrides: {} }], cases: [], schedules: [{ institutionId: "dokdo", teacherId: "teacher-1", weekday, from: assigned }], audit: [], reminders: [], consultations: [], processed: [], reminderSnapshots: [] } }
  let sequence = 0, targetId: string | undefined
  const run = (command: ReviewCommand, at = baseAt, teacher = false) => { db = applyManagedReviewCommand(db, command, teacher ? testTeacher : testStudent(db), `fixture:${++sequence}`, at) }
  const select = (reviewId: string, at = baseAt) => { db = applyProCommand(db, { type: "apply", reviewId }, testStudent(db), `fixture:${++sequence}`, at) }
  const write = (recordId: string, at: string, submit = true) => {
    run({ type: "save-writing", recordId, stage: "items", itemIndex: 3, answers, body: "" }, at)
    run({ type: "enter-rewrite", recordId }, at)
    if (submit) run({ type: "submit", recordId }, at)
  }
  const add = (slug: string, bookRole: string, at = baseAt, submit = true) => {
    const reviewId = `test-${id}-${slug}`
    run({ type: "create", common: { id: reviewId, sourceWorkbookId: reviewId, studentId, studentName, institutionId: id === "unassigned" ? "unassigned" : "dokdo", institution: "전용 테스트 기관", classId: "external", ...studentTestBook(bookRole), month: kstDate(at).slice(0, 7), template } }, at)
    write(`${reviewId}-r1`, at, submit); targetId = reviewId; return reviewId
  }
  const send = (reviewId: string, at: string, requestSecond = false, round = 1) => { run(testFeedback(`${reviewId}-r${round}`, requestSecond ? "request" : "complete"), at, true); run({ type: "send", recordId: `${reviewId}-r${round}` }, at, true) }
  if (id.startsWith("schedule-")) {
    const r = add("target", "신청할 글"); select(r)
    if (id === "schedule-second") {
      send(r, baseAt, true)
      run({ type: "seen", recordId: `${r}-r1` })
      run({ type: "start-second", recordId: `${r}-r1` })
      write(`${r}-r2`, baseAt)
    }
    run(testFeedback(`${r}-r${id === "schedule-second" ? 2 : 1}`, id === "schedule-request" ? "request" : "complete"), baseAt, true)
  } else if (id === "draft") add("draft", "이어 쓰는 이야기", baseAt, false)
  else if (id === "apply-one" || id === "unassigned") add("target", "신청할 글")
  else if (id === "apply-many") for (let n = 1; n <= 3; n++) add(`book-${n}`, `신청할 글 ${n}`)
  else if (["change-one", "change-many", "partial", "locked"].includes(id)) {
    const count = id === "change-many" ? 2 : 1
    for (let n = 1; n <= count; n++) { const r = add(`selected-${n}`, `기존 신청 ${n}`); select(r); if (id === "locked") run(testFeedback(`${r}-r1`), baseAt, true) }
    add("target", "바꿀 글")
    if (id === "partial") add("extra", "추가로 신청할 글")
  } else if (id === "arrival") {
    const arrivedAt = addDays(week, -1)
    const first = add("arrived", "도착한 글", arrivedAt); select(first, arrivedAt); send(first, arrivedAt)
    const current = add("current", "이번 주 신청한 글"); select(current)
  } else if (id.startsWith("second-") || expired || id === "reject-second") {
    const at = expired ? historicalWeek : baseAt
    const r = add("second", "두 번째 생각", at); select(r, at); send(r, at, true)
    if (id !== "second-request" && id !== "expired-empty") {
      run({ type: "seen", recordId: `${r}-r1` }, at)
      run({ type: "start-second", recordId: `${r}-r1` }, at)
      write(`${r}-r2`, at, id === "second-sent" || id === "reject-second")
      if (id === "second-sent") send(r, at, false, 2)
      if (id === "reject-second") run({ type: "reject", recordId: `${r}-r2` }, at, true)
    }
  } else if (id === "reject-first") {
    const r = add("rejected", "다시 다듬는 글"); select(r); run({ type: "reject", recordId: `${r}-r1` }, baseAt, true)
  } else if (id === "closed-next") {
    add("old", "미선정 글", week)
    add("auto", "자동 선정 글", addDays(week, 1))
    add("next", "다음 주 글", baseAt)
  } else if (id === "month-boundary") {
    add("previous", "지난 관리 월 글", assigned)
    add("current", "새 관리 월 글", week)
  }
  db = reconcilePro(atReviewTime(db, baseAt), baseAt)
  db.pro!.clockMode = designated ? "test" : "real"; db.pro!.clock = baseAt
  return { db, baseAt, designated, dateReason, targetId, listMonth: expired ? kstDate(historicalWeek).slice(0, 7) : kstDate(baseAt).slice(0, 7) }
}

export function studentTestSummary(db: ReviewDatabase, now: string) {
  const current = reconcilePro(atReviewTime(structuredClone(db), now)), view = studentProView(current, current.pro!.members[0].id)!
  const usage = view.assigned ? `사용 ${view.usage.used}/${view.usage.limit}권 · 신청 대기 ${view.usage.pending}권 · 남은 신청 ${view.usage.available}권 · 이월 잔여 ${view.usage.rolloverAvailable}권` : "기관 배정 전 · 신청 권수 비노출"
  const records = current.records.filter(r => current.reviews.some(c => c.id === r.reviewId && c.studentId === view.studentId))
  const books = current.reviews.filter(r => r.studentId === view.studentId).map(r => {
    const latest = records.filter(record => record.reviewId === r.id).sort((a,b) => b.round - a.round)[0]
    const state = latest?.writingStatus === "writing" ? `${latest.round}차 ${latest.rejectedAt ? "반려 · 다시 쓰기" : "작성 중"}` : latest?.feedbackStatus === "전송완료" ? `${latest.round}차 피드백 ${latest.seenAt ? "확인함" : "도착"}` : latest?.round === 2 ? "2차 피드백 대기" : proBookPresentation(view, r.id)?.status ?? "제출 완료"
    return `${r.bookTitle}: ${state}${view.cases.find(c => c.reviewId === r.id)?.expired ? " · 2차 제출 기한 종료" : ""}`
  })
  return { summary: `${proListGuidance({ ...current, studentPro: view })?.message ?? proSummaryText(view)} / ${usage}`, books, cutoff: view.cutoff, due: view.due, secondDeadline: view.cases.find(c => c.secondDeadline)?.secondDeadline }
}
