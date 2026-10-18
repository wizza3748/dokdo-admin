import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TypeScript sources directly.
import { resetTodayProDemo } from "../src/lib/pro-today-demo.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { applyProCommand, consultDue, currentConsultations, proUsage, reconcilePro } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { adjustmentValues, consultationResultLabel, detailDateTime, localDateTime, regularConsultationLabel, studentConsultation, studentFeedbackRows } from "../src/lib/pro-student-detail.ts"

const now = "2026-10-13T05:00:00.000Z"
const actor = { role: "agency" as const, institutionId: "dokdo", name: "검증 선생님" }
const fixture = () => reconcilePro(resetTodayProDemo(initializePro(emptyReviewDatabase()), now))

test("월별 피드백은 원래 관리 주차별로 정렬하고 관리 건을 한 번만 표시", () => {
  const db = fixture()
  for (const member of db.pro!.members) {
    const rows = studentFeedbackRows(db, member.id, "2026-10")
    assert.equal(new Set(rows.map(r => r.c.reviewId)).size, rows.length)
    assert.ok(rows.every(r => r.c.month === "2026-10" && r.c.studentId === member.id))
    assert.deepEqual(rows.map(r => r.c.week), rows.map(r => r.c.week).sort())
  }
  assert.ok(studentFeedbackRows(db, "pro-demo-4", "2026-10").length > 0)
})

test("차감 취소는 해당 관리 건의 사용 권수만 되돌리고 원문·발송 기록을 보존", () => {
  const before = fixture(), member = before.pro!.members.find(m => m.id === "pro-demo-4")!
  const selected = before.pro!.cases.find(c => c.studentId === member.id && c.firstSentAt && !c.debitCancelledAt)!
  assert.ok(selected)
  const usage = proUsage(before.pro!, member, now, selected.month)
  const command = { type: "cancel-debit" as const, reviewId: selected.reviewId, reason: "같은 글 중복 발송", memo: "테스트 사유" }
  const after = applyProCommand(before, command, actor, "student-detail-cancel", now)
  const row = studentFeedbackRows(after, member.id, selected.month).find(r => r.c.reviewId === selected.reviewId)!
  assert.equal(proUsage(after.pro!, after.pro!.members.find(m => m.id === member.id)!, now, selected.month).used, usage.used - 1)
  assert.equal(row.c.debitCancelledAt, now)
  assert.equal(row.cancellation?.reason, command.reason)
  assert.equal(row.cancellation?.memo, command.memo)
  assert.equal(row.cancellation?.month, selected.month)
  assert.equal(adjustmentValues(row.cancellation!), `사용 ${usage.used}권 → ${usage.used - 1}권`)
  assert.deepEqual(after.records, before.records)
  assert.deepEqual(after.reviews, before.reviews)
  assert.deepEqual(row.c.parent, selected.parent)
  assert.deepEqual(after.pro!.cases.filter(c => c.reviewId !== selected.reviewId), before.pro!.cases.filter(c => c.reviewId !== selected.reviewId))
  assert.equal(selected.debitCancelledAt, undefined)
  assert.throws(() => applyProCommand(after, command, actor, "double-cancel", now))
  assert.throws(() => applyProCommand(before, {...command, memo:""}, actor, "missing-memo", now))
  assert.throws(() => applyProCommand(before, command, {...actor, role:"admin"}, "readonly", now))
})

test("월 한도는 메모 없이 사유만으로 조정하고 기존 이력과 관리 건을 보존", () => {
  const before = fixture(), studentId = "pro-demo-4"
  const member = before.pro!.members.find(m => m.id === studentId)!
  const usage = proUsage(before.pro!, member, now)
  const command = { type:"limit" as const, studentId, limit:usage.limit + 1, reason:"추가 피드백 제공" }
  const after = applyProCommand(before, command, actor, "limit-reason-only", now)
  const audit = after.pro!.audit.find(a => a.id === "limit-reason-only")!
  assert.equal(after.pro!.members.find(m => m.id === studentId)!.limits["2026-10"], command.limit)
  assert.equal(proUsage(after.pro!, after.pro!.members.find(m => m.id === studentId)!, now).used, usage.used)
  assert.equal(audit.reason, command.reason)
  assert.equal(audit.memo, undefined)
  assert.equal(audit.month, "2026-10")
  assert.deepEqual(after.pro!.audit.filter(a => a.id !== audit.id), before.pro!.audit)
  assert.deepEqual(after.pro!.cases, before.pro!.cases)
  assert.deepEqual(after.records, before.records)
  assert.deepEqual(after.reviews, before.reviews)
  assert.equal(proUsage(before.pro!, member, now).limit, usage.limit)
  assert.doesNotThrow(() => applyProCommand(before, {...command,memo:""},actor,"empty-limit-memo",now))
  assert.throws(() => applyProCommand(before, {...command,reason:"  "},actor,"missing-limit-reason",now))
  assert.throws(() => applyProCommand(before, {...command,limit:usage.used + usage.pending - 1},actor,"invalid-limit",now))
  assert.throws(() => applyProCommand(before, command,{...actor,role:"admin"},"readonly-limit",now))
})

test("월별 예정일 변경·정기 일정 변경은 서로와 상담 기록을 보존", () => {
  let db = fixture()
  const studentId = "pro-demo-4", member = db.pro!.members.find(m => m.id === studentId)!
  const initialSchedule = structuredClone(member.consultation), originalRecords = structuredClone(db.pro!.consultations)
  const override = "2026-09-18T07:00:00.000Z"
  db = applyProCommand(db, {type:"consult-schedule", studentId, nth:2, weekday:4, time:"15:00", month:"2026-09", override}, actor, "month-override", now)
  const changed = db.pro!.members.find(m => m.id === studentId)!
  assert.deepEqual(changed.consultation, initialSchedule)
  assert.equal(consultDue(changed,"2026-09"), override)
  assert.equal(db.pro!.audit.find(a => a.id === "month-override")?.month, "2026-09")
  db = applyProCommand(db, {type:"consult-schedule", studentId, nth:5, weekday:1, time:"16:30"}, actor, "regular-change", now)
  const regular = db.pro!.members.find(m => m.id === studentId)!
  assert.equal(regular.overrides["2026-09"], override)
  assert.equal(regular.overrides["2026-10"], member.overrides["2026-10"])
  assert.equal(consultDue({...regular,overrides:{}},"2026-10"), "2026-10-26T07:30:00.000Z", "없는 다섯째 월요일은 마지막 월요일")
  assert.deepEqual(db.pro!.consultations, originalRecords)
})

test("상담 추가와 수정은 최신 내용만 표시하면서 과거 버전을 유지", () => {
  let db = fixture()
  const base = {type:"consult" as const, studentId:"pro-demo-4", month:"2026-09", result:"유선 상담 완료" as const, actualAt:"2026-09-18T07:00:00.000Z", memo:"처음 상담"}
  db = applyProCommand(db, base, actor, "consult-new", now)
  db = applyProCommand(db, {...base, memo:"수정된 상담", previousId:"consult-new"}, actor, "consult-edit", now)
  db = applyProCommand(db, {...base, result:"미진행", memo:"추가 연락 부재"}, actor, "consult-add", now)
  const latest = currentConsultations(db.pro!,base.studentId,base.month)
  assert.deepEqual(latest.map(c=>c.memo).sort(), ["수정된 상담","추가 연락 부재"].sort())
  assert.ok(db.pro!.consultations.some(c => c.id === "consult-new" && c.memo === "처음 상담"))
  assert.ok(db.pro!.audit.filter(a => ["consult-new","consult-edit","consult-add"].includes(a.id)).every(a => a.month === base.month))
  assert.equal(studentConsultation(db.pro!,db.pro!.members.find(m=>m.id===base.studentId)!,base.month).status.label, "유선 상담 완료")
  assert.throws(() => applyProCommand(db,{...base,memo:""},actor,"empty",now))
  assert.throws(() => applyProCommand(db,{...base,actualAt:"2026-10-14T00:00:00.000Z"},actor,"future",now))
})

test("일정은 한국 시간으로 표시하고 기록 없음을 구분", () => {
  assert.equal(localDateTime(now),"2026-10-13T14:00")
  assert.equal(detailDateTime(now),"10/13(화) 14:00")
  assert.equal(detailDateTime(),"미설정")
  assert.equal(regularConsultationLabel({nth:2,weekday:4,time:"15:00"}),"매월 둘째 목요일 15:00")
  assert.equal(consultationResultLabel("유선 상담 완료"), "유선 상담 완료")
  assert.equal(consultationResultLabel("부재 후 카톡 상담으로 대체"), "부재 → 카톡 상담으로 대체")
  assert.equal(consultationResultLabel("미진행"), "미진행")
})

test("학생 상세는 2차 작성 여부를 유지하고 차감 취소는 선택한 행 바로 아래에서 입력", () => {
  const source = readFileSync(new URL("../src/components/pro-management/student-management-detail.tsx",import.meta.url),"utf8")
  assert.doesNotMatch(source, /<details|JSON\.stringify|online-review\/|reviewPath|styles\.detailGrid|WeeklyReminders|진행 상태|StudentDetailDialog/)
  for (const value of ["정기 일정 변경", "일정만 변경", "차감 취소", "취소 사유", "consultation.records", "previousId", "월별 피드백 내역", "2차 작성 여부"]) assert.ok(source.includes(value), value)
  assert.match(source, /<\/tr>\s*\{editor === "cancel-debit" && cancelId === row\.c\.reviewId && <tr className=\{styles\.debitEditorRow\}><td colSpan=\{4\}>/)
  assert.match(source, /type:"cancel-debit", reviewId:row\.c\.reviewId, reason, memo/)
  const limitForm = source.slice(source.indexOf('{editor === "limit" &&'), source.indexOf('<div className="overflow-x-auto"'))
  assert.doesNotMatch(limitForm, /메모|memo/)
  assert.match(limitForm, /조정 사유 \(필수\)<Input required/)
  assert.match(source, /window\.location\.hash !== "#consultation"/)
  assert.match(source, /selectedMonth === currentMonth/)
  assert.match(source, /사용 권수만 되돌립니다\. 이미 보낸 피드백과 발송 기록은 유지됩니다\./)
})

test("2차 작성 여부는 저장된 선택값이며 진행 상태나 완료 결과로 덮어쓰지 않음", () => {
  const db = fixture(), review = db.reviews.find(r => db.pro!.cases.some(c => c.studentId === "pro-demo-4" && c.reviewId === r.id))!
  const read = () => studentFeedbackRows(db, "pro-demo-4", "2026-10").find(r => r.c.reviewId === review.id)!.finishMethod
  review.secondDecision = undefined
  assert.equal(read(), "-")
  review.secondDecision = "complete"
  assert.equal(read(), "1차 완료")
  review.secondDecision = "request"
  assert.equal(read(), "2차 작성 요청")
  db.pro!.cases.find(c => c.reviewId === review.id)!.closedAt = now
  assert.equal(read(), "2차 작성 요청")
})

test("학생 상세 양쪽 박스는 같은 높이로 늘어나고 좁은 화면은 내용 높이를 사용", () => {
  const css = readFileSync(new URL("../src/components/pro-management/pro-management.module.css",import.meta.url),"utf8")
  assert.match(css, /\.studentDetailLayout \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*align-items: stretch;/)
  assert.match(css, /\.studentDetailLayout > section \{ min-height: 400px; \}/)
  assert.match(css, /@container student-detail \(max-width: 1100px\) \{[^}]*\}[^}]*\.studentDetailLayout > section \{ min-height: 0; \}/)
})

test("상담 변경 이력의 빈 안내는 상담 기록과 일정 변경 이력이 모두 없을 때만 표시", () => {
  const source = readFileSync(new URL("../src/components/pro-management/student-management-detail.tsx",import.meta.url),"utf8")
  assert.match(source, /consultationScheduleHistory\.length > 0 && auditRows\(consultationScheduleHistory\)/)
  assert.match(source, /!consultationHistory\.length && !consultationScheduleHistory\.length && <p[^>]*>기록된 이력이 없습니다\./)
})
