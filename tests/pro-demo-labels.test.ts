import { test } from "node:test"
import assert from "node:assert/strict"
// @ts-expect-error Node tests load TypeScript sources.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { ensureProAttentionExamples } from "../src/lib/pro-attention-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { proDemoStudentName, refreshProDemoLabels } from "../src/lib/pro-demo-labels.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { resetTodayProDemo, TODAY_DEMO_IDS } from "../src/lib/pro-today-demo.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { beginProClockTest, endProClockTest } from "../src/lib/review-clock.ts"

const now = "2026-10-15T01:00:00.000Z"
const formerNames = ["박프로(작성필요)", "최프로(선정대기)", "정프로(한도사용)", "이프로(처리지연)", "한프로(2차대기)", "김프로(전송대기)", "오프로(집중관리)", "임프로(본사확인)", "서프로(관리완료)", "강프로(2차피드백)"]
function previousTodayDemo() {
  const db = resetTodayProDemo(initializePro(emptyReviewDatabase()), now)
  for (const [index, id] of TODAY_DEMO_IDS.entries()) {
    db.pro!.members.find(m => m.id === id)!.name = formerNames[index]
    for (const review of db.reviews.filter(r => r.studentId === id)) review.studentName = formerNames[index]
  }
  return db
}

test("기존 예시의 이름과 도서명만 변경하고 작성·처리 이력은 보존", () => {
  const db = initializePro(emptyReviewDatabase())
  db.pro!.members.find(m => m.id === "pro-demo-6")!.name = "프로 기록승계"
  const review = db.reviews.find(r => r.id === "review-pro-migrated-pending")!
  review.studentName = "프로 기록승계"
  review.bookTitle = "승계된 작성 기록"
  const before = structuredClone(db)
  const result = refreshProDemoLabels(db)
  assert.equal(result.pro!.members.find(m => m.id === "pro-demo-6")!.name, "김프로")
  assert.equal(result.reviews.find(r => r.id === review.id)!.studentName, "김프로")
  assert.equal(result.reviews.find(r => r.id === review.id)!.bookTitle, "별을 찾는 아이")
  assert.deepEqual(result.records, before.records)
  assert.deepEqual({ ...result.pro, members: [] }, { ...before.pro, members: [] })
  assert.deepEqual(db, before)
  assert.equal(refreshProDemoLabels(result), result)
})

test("사용자가 바꾼 예시 이름·도서명과 일반 학생은 덮어쓰지 않음", () => {
  const db = initializePro(emptyReviewDatabase())
  db.pro!.members.find(m => m.id === "pro-demo-6")!.name = "직접 바꾼 학생"
  const review = db.reviews.find(r => r.id === "review-pro-migrated-pending")!
  review.studentName = "직접 바꾼 학생"
  review.bookTitle = "직접 바꾼 책"
  const normal = db.reviews.find(r => r.studentId === "pro-demo-9")!
  normal.studentName = "프로 기록승계"
  normal.bookTitle = "승계된 작성 기록"
  assert.equal(refreshProDemoLabels(db), db)
})

test("새 예시 데이터와 집중 관리 예시에도 같은 이름 형식을 적용", () => {
  const db = ensureProAttentionExamples(initializePro(emptyReviewDatabase()), "2026-10-12T01:00:00.000Z")
  assert.equal(db.pro!.members.find(m => m.id === "pro-demo-4")!.name, "이프로")
  assert.equal(db.pro!.members.find(m => m.id === "pro-demo-attention")!.name, "오프로")
  assert.equal(db.pro!.members.find(m => m.id === "pro-demo-hq-check")!.name, "임프로")
  assert.equal(ensureProAttentionExamples(db, "2026-10-12T01:00:00.000Z"), db)
})

test("오늘 예시의 이름만 통일하고 제출·피드백·상담·경고 관련 데이터는 보존", () => {
  const db = previousTodayDemo(), before = structuredClone(db)
  const result = initializePro(db)
  for (const id of TODAY_DEMO_IDS) {
    assert.equal(result.pro!.members.find(m => m.id === id)!.name, proDemoStudentName(id))
    for (const review of result.reviews.filter(r => r.studentId === id)) assert.equal(review.studentName, proDemoStudentName(id))
  }
  assert.deepEqual(result.records, before.records)
  assert.deepEqual({ ...result.pro, members: [] }, { ...before.pro, members: [] })
  assert.deepEqual(result.pro!.members.map(m => ({ ...m, name: "" })), before.pro!.members.map(m => ({ ...m, name: "" })))
  assert.deepEqual(result.reviews.map(r => ({ ...r, studentName: "" })), before.reviews.map(r => ({ ...r, studentName: "" })))
  assert.deepEqual(db, before)
  assert.equal(initializePro(result), result)
})

test("학생명만 먼저 갱신된 경우에도 독후감에 남은 예시 이름을 통일", () => {
  const db = previousTodayDemo()
  db.pro!.members.find(m => m.id === "pro-demo-1")!.name = "박프로"
  const result = refreshProDemoLabels(db)
  assert.ok(result.reviews.some(r => r.studentId === "pro-demo-1"))
  assert.ok(result.reviews.filter(r => r.studentId === "pro-demo-1").every(r => r.studentName === "박프로"))
})

test("날짜 테스트 복귀용 스냅샷도 이름만 통일하고 기록은 보존", () => {
  const db = previousTodayDemo()
  beginProClockTest(db)
  db.pro!.clockMode = "test"
  const before = structuredClone(db)
  const result = refreshProDemoLabels(db), baseline = result.proTestBaseline!
  assert.deepEqual(baseline.records, before.proTestBaseline!.records)
  assert.deepEqual({ ...baseline.pro, members: [] }, { ...before.proTestBaseline!.pro, members: [] })
  assert.deepEqual(db, before)
  assert.equal(refreshProDemoLabels(result), result)
  const restored = endProClockTest(structuredClone(result), now)
  for (const id of TODAY_DEMO_IDS) {
    assert.equal(restored.pro!.members.find(m => m.id === id)!.name, proDemoStudentName(id))
    assert.ok(restored.reviews.filter(r => r.studentId === id).every(r => r.studentName === proDemoStudentName(id)))
  }
  assert.deepEqual(restored.records, before.records)
})

test("수동 초기화로 생성하는 새 예시도 상태 없는 동일한 학생명을 사용", () => {
  const db = resetTodayProDemo(initializePro(emptyReviewDatabase()), now)
  for (const member of db.pro!.members.filter(m => m.product === "pro")) {
    assert.equal(member.name, proDemoStudentName(member.id))
    assert.doesNotMatch(member.name, /[()]/)
    assert.ok(db.reviews.filter(r => r.studentId === member.id).every(r => r.studentName === member.name))
  }
  assert.equal(refreshProDemoLabels(db), db)
})
