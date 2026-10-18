import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node tests load TypeScript sources.
import { studentFrontTestRows, STUDENT_FRONT_TEST_PATH } from "../src/lib/pro-demo-navigation.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { isProDemoResetRequest } from "../src/lib/pro-demo-reset.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { initializePro } from "../src/lib/pro-seeds.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { resetTodayProDemo } from "../src/lib/pro-today-demo.ts"
// @ts-expect-error Node tests load TypeScript sources.
import { scopePro } from "../src/lib/pro-selectors.ts"

const now = "2026-10-13T05:00:00.000Z"
test("기존 기관 검증 도구의 모든 학생을 유지하고 마지막 세 항목을 지정 순서로 표시", () => {
  const db = resetTodayProDemo(initializePro(emptyReviewDatabase()), now)
  const pro = scopePro(db.pro!, "dokdo"), before = JSON.stringify(pro)
  const rows = studentFrontTestRows(pro)
  assert.equal(rows.length, pro.members.length + 1)
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length)
  assert.deepEqual(rows.slice(-3).map(r => r.name), ["장프로", "일반 학생 확인", "일반 외부예시"])
  assert.deepEqual(new Set(rows.filter(r => r.id !== "normal").map(r => r.id)), new Set(pro.members.map(m => m.id)))
  assert.equal(JSON.stringify(pro), before, "목록 생성은 데이터를 변경하지 않음")
  assert.equal(STUDENT_FRONT_TEST_PATH, "/agency/pro-management/student-front-test")
})

test("이름에는 상태를 붙이지 않고 확인할 내용에서 학생과 선생님의 할 일을 구분", () => {
  const db = resetTodayProDemo(initializePro(emptyReviewDatabase()), now)
  const rows = studentFrontTestRows(scopePro(db.pro!, "dokdo"))
  assert.ok(rows.every(r => !/[()]/.test(r.name)))
  assert.equal(rows.find(r => r.id === "pro-demo-1")!.purpose, "학생 제출 완료 · 선생님 피드백 작성 전")
  assert.equal(rows.find(r => r.id === "pro-demo-second")!.purpose, "학생 2차 제출 완료 · 선생님 피드백 작성 전")
  assert.equal(rows.find(r => r.id === "pro-demo-6")!.purpose, "선생님 피드백 작성 완료 · 학생에게 전송 전")
})

test("학생 링크에 각자의 ID와 기준 시각의 한국 월을 포함하고 일반 학생 전환도 명시", () => {
  const db = initializePro(emptyReviewDatabase())
  const rows = studentFrontTestRows({ ...db.pro!, clock: "2026-10-31T15:00:00.000Z" })
  for (const row of rows) {
    const url = new URL(row.href, "http://localhost:3000")
    assert.equal(url.pathname, "/student/exploration-record")
    assert.equal(url.searchParams.get("tab"), "workbook")
    assert.equal(url.searchParams.get("demoStudent"), row.id)
    if (row.id !== "normal") assert.equal(url.searchParams.get("month"), "2026-11")
    assert.ok(row.purpose)
  }
})

test("로컬·배포 모두 동일 출처의 기관관리자 POST만 초기화 허용", () => {
  for (const origin of ["http://localhost:3000", "https://dokdo-admin.vercel.app", "https://prototype-preview.vercel.app"]) {
    const request = (query = "role=agency", from = origin, method = "POST") => new Request(`${origin}/api/mock/pro-demo?${query}`, { method, headers: { origin: from } })
    assert.equal(isProDemoResetRequest(request()), true)
    for (const role of ["student", "admin", "external"]) assert.equal(isProDemoResetRequest(request(`role=${role}`)), false)
    assert.equal(isProDemoResetRequest(request("role=agency&demoAgency=other-agency")), false)
    assert.equal(isProDemoResetRequest(request("role=agency", "https://other.example")), false)
    assert.equal(isProDemoResetRequest(request("role=agency", origin, "GET")), false)
    assert.equal(isProDemoResetRequest(new Request(`${origin}/api/mock/pro-demo?role=agency`, {method:"POST"})), false)
  }
})

test("조회·새로고침 경로에는 초기화 호출이 없고 확인된 수동 요청에만 포함", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
  const client = read("../src/lib/review-client.ts")
  assert.doesNotMatch(client, /api\/mock\/pro-demo|dokdoTodayDemoReady/)
  assert.doesNotMatch(read("../src/components/pro-management/student-front-test.tsx"), /resetProDemo|resetDemo|runPro/)
  assert.match(read("../src/lib/pro-client.ts"), /confirmed: true/)
  assert.match(read("../src/app/api/mock/pro-demo/route.ts"), /confirmed !== true/)
  const page = read("../src/app/page.tsx")
  assert.match(page, /href=\{STUDENT_FRONT_TEST_PATH\}/)
  assert.doesNotMatch(page, /demoStudent=pro-demo-1/)
})
