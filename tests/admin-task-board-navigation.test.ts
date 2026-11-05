import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
// @ts-expect-error Node native TS tests use explicit extensions.
import { ADMIN_PRO_WEEKLY_PATH, ADMIN_PRO_WEEKLY_TITLE } from "../src/lib/admin-navigation.ts"

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("일감보드 목록은 NEW·노란 강조 없이 기존 링크를 보존", () => {
  const board = read("src/app/page.tsx")
  assert.doesNotMatch(board, />NEW<|(?:bg|border|text)-(?:amber|orange)-/)
  assert.equal((board.match(/<Card className="[^"]*bg-white/g) ?? []).length, 3)
  for (const link of ["/agency/pro-management", "/agency/online-workbooks", "/student?demoStudent=normal"]) assert.ok(board.includes(`href="${link}"`))
  assert.match(board, /href=\{STUDENT_FRONT_TEST_PATH\}/)
})

test("DD-1798은 본사관리자 첫 항목이며 Jira ID와 공통 화면 링크를 구분", () => {
  const board = read("src/app/page.tsx")
  assert.match(board, /href="https:\/\/sloop-dev\.atlassian\.net\/browse\/DD-1798"/)
  assert.ok(board.indexOf("/browse/DD-1798") < board.indexOf("/browse/DD-1654"))
  assert.match(board, /<Link href=\{ADMIN_PRO_WEEKLY_PATH\}[^>]*>\s*프로학생 주간관리현황 기능/)
})

test("본사 학생관리의 학생목록 다음에 새 메뉴를 연결하고 탭·경로명 일치", () => {
  const nav = read("src/components/app/nav.tsx")
  assert.match(nav, /id: "admin-b2c",\s*title: "학생관리"/)
  assert.match(nav, /\{ title: "학생목록", href: "\/admin\/b2c\/students" \},\s*\{ title: ADMIN_PRO_WEEKLY_TITLE, href: ADMIN_PRO_WEEKLY_PATH \}/)
  assert.equal(ADMIN_PRO_WEEKLY_TITLE, "프로학생 주간관리현황")
  assert.match(read("src/components/app/admin-page-tabs.tsx"), /pathname === ADMIN_PRO_WEEKLY_PATH.*title: ADMIN_PRO_WEEKLY_TITLE/)
  const breadcrumb = read("src/components/ui/breadcrumb-header.tsx")
  assert.doesNotMatch(breadcrumb, /B2C관리/)
  assert.match(breadcrumb, /pathname === ADMIN_PRO_WEEKLY_PATH/)
})

test("신규 화면은 조회 권한을 확인한 뒤 본사 주간 현황을 제공", () => {
  const page = read(`src/app${ADMIN_PRO_WEEKLY_PATH}/page.tsx`)
  assert.match(page, /if \(!adminWeeklyAllowed\(\)\)/)
  assert.match(page, /<AdminWeeklyManagement/)
  assert.doesNotMatch(page, /reset|localStorage/)
})
