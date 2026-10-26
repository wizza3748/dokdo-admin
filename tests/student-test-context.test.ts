import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { agencyStudentTestToken, studentTestApi, studentTestScreen, studentTestScreenHref, studentTestToken } from "../src/lib/student-test-context"

test("student layout does not render the test banner", async () => {
  const layout = await readFile("src/app/student/layout.tsx", "utf8")
  assert.doesNotMatch(layout, /StudentTestBanner/)
  assert.match(layout, /StudentToastProvider/)
})

test("screen options apply only to dedicated test links and preserve context", () => {
  const href = "/student/exploration-record?tab=workbook&month=2026-10&studentTest=example&demoStudent=student-test-draft"
  for (const screen of ["normal", "loading", "error"] as const) {
    const url = new URL(studentTestScreenHref(href, screen), "http://localhost")
    assert.equal(url.searchParams.get("studentTestScreen"), screen)
    assert.equal(url.searchParams.get("studentTest"), "example")
    assert.equal(url.searchParams.get("month"), "2026-10")
    assert.equal(url.searchParams.get("demoStudent"), "student-test-draft")
  }
  const common = "/student/exploration-record?demoStudent=pro-demo-1"
  assert.equal(studentTestScreenHref(common, "error"), common)
})

test("agency test scope is URL-only, preserves safe return links and never contaminates ordinary agency navigation", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window")
  const location = { search: "?studentTest=owned-example" }
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location } })
  try {
    assert.equal(agencyStudentTestToken(), "owned-example")
    assert.equal(studentTestApi("reviews", "/shared", "agency"), "/api/mock/student-front-tests/reviews")
    location.search = "?returnTo=" + encodeURIComponent("/agency/pro-management?studentTest=owned-example")
    assert.equal(agencyStudentTestToken(), "owned-example")
    location.search = "?returnTo=" + encodeURIComponent("https://elsewhere.example/agency/pro-management?studentTest=foreign")
    assert.equal(agencyStudentTestToken(), "")
    location.search = "?role=agency"
    assert.equal(agencyStudentTestToken(), "")
    assert.equal(studentTestApi("reviews", "/shared", "agency"), "/shared")
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor)
    else Reflect.deleteProperty(globalThis, "window")
  }
})

test("dedicated teacher detail resolves real record IDs without falling back to an unrelated legacy example", async () => {
  const source = await readFile("src/components/online-workbooks/workbook-detail.tsx", "utf8")
  assert.match(source, /db\.records\.find\(r => r\.id === id\)/)
  assert.match(source, /role === "admin" \|\| agencyStudentTestToken\(\)/)
})

test("test-list choice survives internal navigation, normal re-entry restores display, common entry clears test scope", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window")
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage")
  const entries = new Map<string, string>()
  const location = { search: "?studentTest=example&studentTestScreen=loading" }
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location } })
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  } })
  try {
    assert.equal(studentTestScreen(), "loading")
    location.search = "?round=1"
    assert.equal(studentTestScreen(), "loading")
    assert.equal(studentTestToken(), "example")
    location.search = "?studentTest=example&studentTestScreen=error"
    assert.equal(studentTestScreen(), "error")
    location.search = "?studentTest=example&studentTestScreen=normal"
    assert.equal(studentTestScreen(), "normal")
    location.search = "?demoStudent=pro-demo-1&studentTestScreen=error"
    assert.equal(studentTestScreen(), "normal")
    assert.equal(studentTestToken(), "")
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor)
    else Reflect.deleteProperty(globalThis, "window")
    if (storageDescriptor) Object.defineProperty(globalThis, "sessionStorage", storageDescriptor)
    else Reflect.deleteProperty(globalThis, "sessionStorage")
  }
})
