import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TypeScript sources directly.
import { emptyReviewDatabase, type ReviewActor } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { resetTodayProDemo } from "../src/lib/pro-today-demo.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { applyProCommand, reconcilePro, proUsage } from "../src/lib/pro-domain.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { studentProView, scopePro } from "../src/lib/pro-selectors.ts"
// @ts-expect-error Node tests load TypeScript sources directly.
import { PrototypeStore } from "../src/lib/prototype-store.ts"

const now = "2026-10-15T05:00:00.000Z"
const studentId = "pro-demo-6"
const actor = { role: "agency" as const, institutionId: "dokdo", name: "검증 선생님" }
const fixture = () => reconcilePro(resetTodayProDemo(initializePro(emptyReviewDatabase()), now))
const command = (text: string, expectedRevision: string | null = null) => ({ type: "management-memo" as const, studentId, text, expectedRevision })
const member = (db: ReturnType<typeof fixture>) => db.pro!.members.find(m => m.id === studentId)!
const source = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8")

test("관리 메모는 학생별로 저장·수정·비우기 가능하고 기존 데이터는 유지", () => {
  const original = fixture(), before = structuredClone(original)
  const saved = applyProCommand(original, command("독려 참고\n다음 연락 때 확인"), actor, "memo-1", now)
  assert.deepEqual(member(saved).managementMemo, { text: "독려 참고\n다음 연락 때 확인", revision: "memo-1", actor: actor.name, at: now })
  assert.deepEqual(original, before)
  assert.deepEqual(saved.records, original.records)
  assert.deepEqual(saved.reviews, original.reviews)
  assert.deepEqual(saved.pro!.cases, original.pro!.cases)
  assert.deepEqual(saved.pro!.reminders, original.pro!.reminders)
  assert.deepEqual(saved.pro!.consultations, original.pro!.consultations)
  assert.deepEqual(proUsage(saved.pro!, member(saved), now), proUsage(original.pro!, member(original), now))
  assert.equal(saved.pro!.audit.at(-1)?.month, undefined)
  const updated = applyProCommand(saved, command("수정 메모", "memo-1"), actor, "memo-2", now)
  const cleared = applyProCommand(updated, command("", "memo-2"), actor, "memo-3", now)
  assert.equal(member(updated).managementMemo?.text, "수정 메모")
  assert.equal(member(cleared).managementMemo?.text, "")
  assert.equal(member(updated).managementMemo?.revision, "memo-2")
})

test("관리 메모는 이전 월과 다음 월 조회에 종속되지 않고 초기화하지 않는 한 유지", () => {
  const saved = applyProCommand(fixture(), command("월과 무관한 학생 메모"), actor, "memo-month", now)
  const reloaded = initializePro(JSON.parse(JSON.stringify(saved)))
  for (const month of ["2026-09", "2026-10", "2026-11"]) proUsage(reloaded.pro!, member(reloaded), now, month)
  assert.equal(member(reloaded).managementMemo?.text, "월과 무관한 학생 메모")
  assert.equal(member(resetTodayProDemo(reloaded, now)).managementMemo, undefined)
})

test("다른 기관·학생·본사는 저장 불가하며 비프로 학생에게는 저장하지 않음", () => {
  const db = fixture(), before = structuredClone(db)
  for (const other of [
    { role: "agency", institutionId: "other-agency", name: "다른 기관" },
    { role: "student", studentId, name: "학생" },
    { role: "admin", name: "본사" },
    { role: "external", name: "외부" },
  ] as ReviewActor[]) assert.throws(() => applyProCommand(db, command("접근 불가"), other, `denied-${other.role}`, now), /권한|기관관리자/)
  assert.deepEqual(db, before)
  member(db).product = "normal"
  assert.throws(() => applyProCommand(db, command("일반 학생"), actor, "normal", now), /입력값/)
})

test("관리 메모는 학생 응답과 다른 기관 응답에 포함하지 않음", () => {
  const saved = applyProCommand(fixture(), command("기관 내부 메모"), actor, "memo-private", now)
  assert.ok(!JSON.stringify(studentProView(saved, studentId)).includes("기관 내부 메모"))
  assert.ok(!JSON.stringify(scopePro(saved.pro!, "other-agency")).includes("기관 내부 메모"))
  assert.equal(scopePro(saved.pro!, "dokdo").members.find(m => m.id === studentId)?.managementMemo?.text, "기관 내부 메모")
})

test("중복 저장은 한 번만 반영하고 오래된 편집으로 다른 저장 내용을 덮어쓰지 않음", () => {
  const first = applyProCommand(fixture(), command("먼저 저장"), actor, "memo-once", now)
  assert.deepEqual(applyProCommand(first, command("먼저 저장"), actor, "memo-once", now), first)
  assert.throws(() => applyProCommand(first, command("오래된 입력"), actor, "memo-stale", now), /다른 화면에서 변경/)
  assert.equal(member(first).managementMemo?.text, "먼저 저장")
})

test("영구 저장소 재조회에서도 관리 메모 유지 (격리된 저장소 모의 검증)", async () => {
  let payload: string | null = null
  let digest = ""
  const sql = async (query: string, values: unknown[]) => {
    if (query.startsWith("SELECT")) return payload === null ? [] : [{ digest, payload: digest === values[1] ? null : payload }]
    if (query.startsWith("INSERT") && payload === null) { payload = String(values[1]); digest = String(values[2]); return [{ key: values[0] }] }
    if (query.startsWith("UPDATE") && digest === values[1]) { payload = String(values[2]); digest = String(values[3]); return [{ key: values[0] }] }
    return []
  }
  const options = { env: { DOKDO_STATE_PROVIDER: "neon", DOKDO_STATE_NAMESPACE: "memo-test", DOKDO_NEON_DATABASE_URL: "postgres://test:test@memo-test.neon.tech/test" }, sql }
  const original = fixture(), first = new PrototypeStore(options)
  await first.update("online-reviews", () => original, db => applyProCommand(db, command("재조회 확인"), actor, "memo-store", now))
  const reloaded = await new PrototypeStore(options).read("online-reviews", () => original)
  assert.equal(member(reloaded).managementMemo?.text, "재조회 확인")
})

test("메모는 상담 아래 별도 박스이며 월 변경·상담 편집과 독립된 상시 입력란", () => {
  const detail = source("components/pro-management/student-management-detail.tsx"), ui = source("components/pro-management/student-management-memo.tsx")
  assert.match(detail, /className=\{styles\.studentDetailRight\}/)
  assert.ok(detail.indexOf('<StudentManagementMemo key={member.id}') > detail.indexOf('aria-label="학부모 상담"'))
  assert.match(detail, /a\.kind !== "management-memo"/)
  assert.match(ui, /<textarea/)
  assert.match(ui, /onClick=\{\(\) => void save\(\)\}>저장<\/Button>/)
  assert.match(ui, /readOnly=\{hook\.readOnly\}/)
  assert.doesNotMatch(ui, /selectedMonth|setEditor|useEffect|setInterval|setTimeout|Dialog|dangerouslySetInnerHTML/)
  assert.match(ui, /if \(await hook\.runPro\([\s\S]*\)\) setDraft\(null\)/)
  assert.match(ui, /previous \? previous\.revision : saved\?\.revision \?\? null/)
})
