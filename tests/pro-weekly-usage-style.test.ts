import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const css = readFileSync(new URL("../src/components/pro-management/pro-management.module.css", import.meta.url), "utf8")
const weekly = readFileSync(new URL("../src/components/pro-management/weekly-student-row.tsx", import.meta.url), "utf8")
const detail = readFileSync(new URL("../src/components/pro-management/student-management-detail.tsx", import.meta.url), "utf8")

test("compact quota typography is scoped to the weekly usage cell", () => {
  const usageCell = weekly.match(/data-label="피드백 이용 권수">([\s\S]*?)<\/td>/)?.[1] ?? ""
  assert.ok(usageCell.includes('className={`${styles.usage} ${styles.weeklyUsage}`}'))
  assert.ok(usageCell.includes("member.caseOnly ?"))
  assert.ok(!detail.includes("styles.weeklyUsage"))
  assert.match(css, /\.weeklyUsage \.usageAmount strong \{[^}]*font-size: 14px;[^}]*font-weight: 600;/)
  assert.match(css, /\.weeklyUsage \.usageAmount span \{[^}]*font-size: 14px;/)
  assert.match(css, /\.weeklyUsage \.usageAvailable \{[^}]*color: #64748b;[^}]*white-space: nowrap;/)
  assert.match(css, /\.weeklyUsage \.usageAvailable strong \{[^}]*color: #334155;[^}]*font-size: 14px;/)
})

test("shared detail styles and weekly quota text remain intact", () => {
  assert.match(css, /^\.usageAmount strong \{[^}]*font-size: 26px;/m)
  assert.match(css, /^\.usageAvailable \{[^}]*color: #1d4ed8;/m)
  assert.match(css, /^\.usageAvailable strong \{[^}]*font-size: 16px;/m)
  assert.match(css, /^\.usageRollover \{ color: #64748b; font-size: 12px; \}/m)
  assert.ok(weekly.includes("남은 신청 권수 <strong>{row.usage.available}권</strong>"))
  assert.ok(weekly.includes("row.usage.rolloverAvailable > 0"))
  assert.ok(weekly.includes("(이월 {row.usage.rolloverAvailable}권 포함)"))
})
