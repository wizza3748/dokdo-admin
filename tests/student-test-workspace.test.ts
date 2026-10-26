import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createStudentTestWorkspaceStore, studentTestWorkspace } from "../src/lib/student-test-workspace"
import { assertSharedReviewRequest } from "../src/lib/review-request-scope"
import { PrototypeStore } from "../src/lib/prototype-store"
import { emptyStudentTests, prepareStudentTests, getStudentTest, runStudentTest, resetStudentTest, controlStudentTest, currentStudentTest } from "../src/lib/student-test-store"
import { proUsage } from "../src/lib/pro-domain"
import { studentTestCases } from "../src/lib/student-test-scenarios"

const today = "2026-10-21T04:00:00.000Z"
const origin = "https://dokdo-admin.vercel.app"
const env = { VERCEL: "1", NODE_ENV: "production", DOKDO_STATE_PROVIDER: "neon", DOKDO_STATE_NAMESPACE: "dokdo-admin:production:v1", DATABASE_URL: "postgresql://test:test@workspace-test.neon.tech/test" }
function request(cookie?: string, method = "POST", extra: Record<string, string> = {}) {
  return new Request(`${origin}/api/mock/student-front-tests`, { method, headers: { origin, ...(cookie ? { cookie } : {}), ...extra } })
}
function owner() {
  const scope = studentTestWorkspace(request(), true, env)!
  return { scope, cookie: `${scope.cookie!.name}=${scope.cookie!.value}` }
}
function database() {
  const values = new Map<string, { payload: string; digest: string }>()
  const writes: string[] = []
  let fail = false
  const sql = async (query: string, parameters: unknown[]) => {
    const [key, a, b, c] = parameters.map(String), row = values.get(key)
    if (query.startsWith("SELECT")) return row ? [{ digest: row.digest, payload: row.digest === a ? null : row.payload }] : []
    if (fail) throw new Error("simulated storage failure")
    if (query.startsWith("INSERT") && !row) { values.set(key, { payload: a, digest: b }); writes.push(key); return [{ key }] }
    if (query.startsWith("UPDATE") && row?.digest === a) { values.set(key, { payload: b, digest: c }); writes.push(key); return [{ key }] }
    return []
  }
  return { values, writes, sql, failWrites: () => { fail = true } }
}

test("production browser ownership is secure, stable, opaque, and not inferred from case URLs", () => {
  const a = owner(), b = owner()
  assert.notEqual(a.scope.key, b.scope.key)
  assert.equal(studentTestWorkspace(request(a.cookie), false, env)!.key, a.scope.key)
  assert.equal(studentTestWorkspace(request(undefined, "GET"), false, env), null)
  const caseOnly = new Request(`${origin}/api/mock/student-front-tests?studentTest=known-case-token`)
  assert.equal(studentTestWorkspace(caseOnly, false, env), null)
  assert.equal(a.scope.cookie!.httpOnly, true)
  assert.equal(a.scope.cookie!.secure, true)
  assert.equal(a.scope.cookie!.sameSite, "strict")
  assert.equal(a.scope.cookie!.path, "/")
  assert.match(a.scope.cookie!.name, /^__Host-/)
  assert.ok(!a.scope.key.includes(a.scope.cookie!.value))
  assert.equal(studentTestWorkspace(request(a.cookie), false, env)!.cookie, undefined)
})

test("foreign origins, missing write origins, invalid cookies and unsafe cloud configuration fail closed", () => {
  const a = owner()
  const invalidHeaders: Record<string, string>[] = [{ origin: "https://other.example" }, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }]
  for (const headers of invalidHeaders) {
    assert.throws(() => studentTestWorkspace(request(a.cookie, "POST", headers), false, env))
  }
  assert.throws(() => studentTestWorkspace(new Request(`${origin}/api/mock/student-front-tests`, { method: "POST" }), true, env))
  assert.throws(() => studentTestWorkspace(request("__Host-dokdo-student-tests=../online-reviews"), true, env))
  assert.throws(() => studentTestWorkspace(request(`${a.cookie}; ${a.cookie}`), true, env))
  assert.throws(() => studentTestWorkspace(request(), true, { ...env, DOKDO_STATE_PROVIDER: "local" }))
  assert.throws(() => studentTestWorkspace(request(), true, { ...env, DOKDO_STATE_NAMESPACE: "" }))
  assert.throws(() => studentTestWorkspace(new Request("http://dokdo-admin.vercel.app/api/mock/student-front-tests"), false, env))
})

test("Neon namespaces isolate production, preview and shared data across browser actions, reset and races", async () => {
  const f = database(), shared = new PrototypeStore({ env, sql: f.sql })
  await shared.update("online-reviews", () => ({ preserved: "writing, feedback, reports, quota, history" }), s => s)
  const sharedBefore = structuredClone(f.values.get(shared.key("online-reviews")))
  const store = createStudentTestWorkspaceStore(env, { sql: f.sql }), a = owner(), b = owner()
  const preview = createStudentTestWorkspaceStore({ ...env, DOKDO_STATE_NAMESPACE: "dokdo-admin:preview:v1" }, { sql: f.sql })
  const initialA = await store.update(a.scope.key, emptyStudentTests, s => prepareStudentTests(s, today))
  await store.update(b.scope.key, emptyStudentTests, s => prepareStudentTests(s, today))
  await preview.update(a.scope.key, emptyStudentTests, s => prepareStudentTests(s, today))
  const bBefore = structuredClone(f.values.get(store.key(b.scope.key))), previewBefore = structuredClone(f.values.get(preview.key(a.scope.key)))
  const item = initialA.sessions.find(s => s.caseId === "apply-one")!
  await store.update(a.scope.key, emptyStudentTests, s => ({ ...s, sessions: s.sessions.map(c => c.token === item.token ? runStudentTest(c, "pro", { type: "apply", reviewId: c.targetId! }, "apply", today) : c) }))
  const reconnected = createStudentTestWorkspaceStore(env, { sql: f.sql })
  const reopened = await reconnected.read(a.scope.key, emptyStudentTests)
  const applied = getStudentTest(reopened, item.token)
  assert.equal(proUsage(applied.db.pro!, applied.db.pro!.members[0], today).pending, 1)
  assert.deepEqual(prepareStudentTests(reopened, today), reopened)
  const writeCount = f.writes.length
  await assert.rejects(store.update(b.scope.key, emptyStudentTests, s => resetStudentTest(s, item.token, today)))
  await assert.rejects(store.update(b.scope.key, emptyStudentTests, s => { getStudentTest(s, item.token); return s }))
  assert.equal(f.writes.length, writeCount)
  const reset = await reconnected.update(a.scope.key, emptyStudentTests, s => resetStudentTest(s, item.token, today))
  assert.throws(() => getStudentTest(reset, item.token))
  assert.deepEqual(reset.sessions.filter(s => s.caseId !== "apply-one"), reopened.sessions.filter(s => s.caseId !== "apply-one"))
  const change = reset.sessions.find(s => s.caseId === "change-one")!
  const locked = controlStudentTest(change, "teacher-start", today), before = JSON.stringify(locked)
  assert.throws(() => runStudentTest(locked, "pro", { type: "change", reviewId: locked.targetId!, previousReviewId: locked.db.pro!.cases.find(c => c.selectedAt)!.reviewId }, "too-late", today))
  assert.equal(JSON.stringify(locked), before)
  assert.deepEqual(f.values.get(shared.key("online-reviews")), sharedBefore)
  assert.deepEqual(f.values.get(store.key(b.scope.key)), bBefore)
  assert.deepEqual(f.values.get(preview.key(a.scope.key)), previewBefore)
  assert.ok(f.writes.slice(1).every(key => key.includes(":student-front-tests:v1:browser-")))
})

test("Neon concurrent prepare and updates do not lose results across instances", async () => {
  const f = database(), a = owner()
  const stores = [createStudentTestWorkspaceStore(env, { sql: f.sql }), createStudentTestWorkspaceStore(env, { sql: f.sql })]
  await Promise.all(stores.map(store => store.update(a.scope.key, emptyStudentTests, s => prepareStudentTests(s, today))))
  const initial = await stores[0].read(a.scope.key, emptyStudentTests)
  assert.equal(initial.sessions.length, studentTestCases.length)
  await Promise.all(stores.map((store, i) => store.update(a.scope.key, emptyStudentTests, s => ({ ...s, sessions: s.sessions.map(c => c.caseId === (i ? "apply-many" : "apply-one") ? runStudentTest(c, "pro", { type: "apply", reviewId: c.targetId! }, `parallel-${i}`, today) : c) }))))
  const result = await stores[0].read(a.scope.key, emptyStudentTests)
  for (const id of ["apply-one", "apply-many"]) assert.ok(result.sessions.find(s => s.caseId === id)!.changedAt)
})

test("next KST day prepares only that browser; old tabs and designated dates remain unchanged", async () => {
  const f = database(), store = createStudentTestWorkspaceStore(env, { sql: f.sql }), a = owner(), b = owner()
  const beforeMidnight = "2026-10-21T14:59:00.000Z", nextDay = "2026-10-21T15:01:00.000Z"
  const initial = await store.update(a.scope.key, emptyStudentTests, s => prepareStudentTests(s, beforeMidnight))
  await store.update(b.scope.key, emptyStudentTests, s => prepareStudentTests(s, beforeMidnight))
  const bBefore = structuredClone(f.values.get(store.key(b.scope.key)))
  const next = await store.update(a.scope.key, emptyStudentTests, s => prepareStudentTests(s, nextDay))
  assert.equal(next.day, "2026-10-22")
  assert.equal(next.sessions.filter(s => s.day === next.day).length, studentTestCases.length)
  for (const old of initial.sessions) assert.equal(JSON.stringify(getStudentTest(next, old.token)), JSON.stringify(old))
  const boundary = next.sessions.find(s => s.day === next.day && s.caseId === "month-boundary")!
  assert.equal(currentStudentTest(boundary, nextDay).pro!.clock, boundary.baseAt)
  assert.deepEqual(f.values.get(store.key(b.scope.key)), bBefore)
})

test("failed cloud saves preserve the last stored test results without another-store fallback", async () => {
  const f = database(), store = createStudentTestWorkspaceStore(env, { sql: f.sql }), a = owner()
  const initial = await store.update(a.scope.key, emptyStudentTests, s => prepareStudentTests(s, today))
  const before = structuredClone(f.values), item = initial.sessions.find(s => s.caseId === "apply-one")!
  f.failWrites()
  await assert.rejects(store.update(a.scope.key, emptyStudentTests, s => ({ ...s, sessions: s.sessions.map(c => c.token === item.token ? runStudentTest(c, "pro", { type: "apply", reviewId: c.targetId! }, "fail", today) : c) })), /Neon/)
  assert.deepEqual(f.values, before)
})

test("local browser migration copies legacy results without altering legacy or common files", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "dokdo-workspace-test-"))
  try {
    const legacy = new PrototypeStore({ env: { DOKDO_STATE_PROVIDER: "local" }, directory: path.join(directory, "student-front-tests") })
    const initial = await legacy.update("sessions", emptyStudentTests, s => prepareStudentTests(s, today))
    const filename = path.join(directory, "student-front-tests", "sessions.json"), before = await readFile(filename)
    const localEnv = { NODE_ENV: "development", DOKDO_LOCAL_STATE_DIR: directory }
    const store = createStudentTestWorkspaceStore(localEnv), req = new Request("http://localhost:3000/api/mock/student-front-tests", { method: "POST", headers: { origin: "http://localhost:3000" } })
    const a = studentTestWorkspace(req, true, localEnv)!, b = studentTestWorkspace(req, true, localEnv)!
    await store.update(a.key, () => initial, s => prepareStudentTests(s, today))
    await store.update(b.key, () => initial, s => prepareStudentTests(s, today))
    await store.update(a.key, emptyStudentTests, s => resetStudentTest(s, initial.sessions[0].token, today))
    assert.equal(JSON.stringify(await store.read(b.key, emptyStudentTests)), JSON.stringify(initial))
    assert.deepEqual(await readFile(filename), before)
  } finally { await rm(directory, { recursive: true }) }
})

test("dedicated context cannot accidentally route into shared student APIs", () => {
  for (const query of ["studentTest=", "studentTest=invalid", "demoStudent=student-test-apply-one", "role=agency&studentTest=case-token"]) {
    assert.throws(() => assertSharedReviewRequest(new Request(`${origin}/api/mock/online-reviews?${query}`)))
  }
  for (const query of ["role=agency", "role=admin", "role=student&demoStudent=pro-demo-1", "role=student&demoStudent=normal"]) {
    assert.doesNotThrow(() => assertSharedReviewRequest(new Request(`${origin}/api/mock/online-reviews?${query}`)))
  }
})
