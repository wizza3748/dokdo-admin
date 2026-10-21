// Explicit smoke test. Creates its OWN browser-cookie workspaces; never resets shared/user workspaces.
// Usage: node scripts/verify-student-test-isolation.mjs http://localhost:3000
import assert from "node:assert/strict"
import { randomUUID, createHash } from "node:crypto"
import { readFile } from "node:fs/promises"

const base = new URL(process.argv[2] || "http://localhost:3000")
if (!["localhost", "127.0.0.1", "dokdo-admin.vercel.app"].includes(base.hostname)) throw new Error("Explicitly supported test host required")
const root = "/api/mock/student-front-tests"
const local = ["localhost", "127.0.0.1"].includes(base.hostname)
const hash = value => createHash("sha256").update(value).digest("hex")
const sharedHash = async () => local ? hash(await readFile(".local-state/online-reviews.json")) : null
const beforeHash = await sharedHash()
const results = []
function client() {
  let cookie = ""
  return async (path = root, data, expectOK = true) => {
    const response = await fetch(new URL(path, base), {
      method: data === undefined ? "GET" : "POST", cache: "no-store",
      headers: { Origin: base.origin, ...(cookie ? { Cookie: cookie } : {}), ...(data === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: AbortSignal.timeout(60000),
    })
    const setCookie = response.headers.get("set-cookie")
    if (setCookie) {
      assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=strict/i)
      if (!local) assert.match(setCookie, /Secure/i)
      cookie = setCookie.split(";")[0]
    }
    const value = await response.json()
    assert.equal(response.ok, expectOK, `${path.split("?")[0]}: ${value.message || response.status}`)
    assert.match(response.headers.get("cache-control") || "", /no-store/)
    return value
  }
}
const a = client(), b = client(), stranger = client()
const commonBefore = (await a()).common
await a(root, { action: "prepare" }); await b(root, { action: "prepare" })
let catalog = await a()
assert.equal(catalog.rows.length, 19)
const bBefore = (await b()).rows
const signature = rows => hash(JSON.stringify(rows.map(({ token, initial, current, changed }) => ({ token, initial, current, changed }))))
const commonHash = hash(JSON.stringify(commonBefore))
results.push("19 cases available in separate browser workspaces")
const row = id => catalog.rows.find(r => r.id === id)
const refresh = async () => { catalog = await a() }
const reset = async id => { await a(root, { action: "reset", token: row(id).token }); await refresh(); return row(id) }
const query = item => `?role=student&studentTest=${encodeURIComponent(item.token)}`
const read = item => a(`${root}/reviews${query(item)}`)
const command = (item, kind, command, ok = true, requestId = randomUUID()) => a(`${root}/${kind}${query(item)}`, { command, requestId }, ok)
const quota = db => [db.studentPro.usage.used, db.studentPro.usage.pending, db.studentPro.usage.available, db.studentPro.usage.rolloverAvailable]
const stable = db => JSON.stringify({ reviews: db.reviews, records: db.records, usage: db.studentPro.usage, cases: db.studentPro.cases })

let item = await reset("apply-one"), initial = await read(item)
const target = initial.studentPro.cases.find(c => c.canApply).reviewId
const requestId = randomUUID()
const applied = await command(item, "pro", { type: "apply", reviewId: target }, true, requestId)
assert.equal(applied.studentPro.usage.available, initial.studentPro.usage.available - 1)
assert.equal(applied.studentPro.usage.used, initial.studentPro.usage.used)
assert.deepEqual(quota(await command(item, "pro", { type: "apply", reviewId: target }, true, requestId)), quota(applied))
await refresh()
assert.equal(row("apply-one").token, item.token)
assert.equal(row("apply-one").changed, true)
await a(root, { action: "prepare" })
assert.deepEqual(quota(await read(item)), quota(applied))
const cancelled = await command(item, "pro", { type: "cancel", reviewId: target })
assert.deepEqual(quota(cancelled), quota(initial))
results.push("apply/cancel, idempotence, same-day refresh and re-entry preserve results")

await stranger(`${root}/reviews${query(item)}`, undefined, false)
await b(`${root}/reviews${query(item)}`, undefined, false)
await b(`${root}?studentTest=${item.token}`, undefined, false)
for (const action of ["reset", "teacher-start", "cutoff"]) await b(root, { action, token: item.token }, false)
await b(`${root}/pro${query(item)}`, { command: { type: "apply", reviewId: target }, requestId: randomUUID() }, false)
await b(`${root}/reviews${query(item)}`, { command: { type: "seen", recordId: `${target}-r1` }, requestId: randomUUID() }, false)
for (const endpoint of ["online-reviews", "pro-management", "review-share"]) {
  const response = await fetch(new URL(`/api/mock/${endpoint}?studentTest=${item.token}&role=student`, base), { method: "POST", headers: { Origin: base.origin, "Content-Type": "application/json" }, body: JSON.stringify({ command: { type: "apply", reviewId: target }, requestId: randomUUID(), recordId: `${target}-r1` }) })
  assert.equal(response.ok, false)
}
results.push("foreign/missing browser ownership and shared-API fallback blocked")

item = await reset("change-one"); initial = await read(item)
let candidate = initial.studentPro.cases.find(c => c.changeCandidates.length)
const changed = await command(item, "pro", { type: "change", reviewId: candidate.reviewId, previousReviewId: candidate.changeCandidates[0] })
assert.deepEqual(quota(changed), quota(initial))
assert.equal(changed.studentPro.cases.find(c => c.reviewId === candidate.reviewId).selected, true)
assert.equal(changed.studentPro.cases.find(c => c.reviewId === candidate.changeCandidates[0]).selected, false)
results.push("atomic change preserves quota and transfers selection")

for (const action of ["teacher-start", "cutoff"]) {
  item = await reset("change-one"); initial = await read(item)
  candidate = initial.studentPro.cases.find(c => c.changeCandidates.length)
  await a(root, { action, token: item.token })
  const locked = await read(item)
  await command(item, "pro", { type: "change", reviewId: candidate.reviewId, previousReviewId: candidate.changeCandidates[0] }, false)
  await command(item, "pro", { type: "cancel", reviewId: candidate.changeCandidates[0] }, false)
  assert.equal(stable(await read(item)), stable(locked))
}
results.push("teacher-start/cutoff races reject change/cancel without losing requests")

for (const id of ["draft", "second-draft", "reject-first", "reject-second"]) {
  item = await reset(id); initial = await read(item)
  const record = initial.records.find(r => r.writingStatus === "writing")
  const answers = { ...record.answers }
  const firstKey = Object.keys(answers)[0]
  answers[firstKey] += " 검증한 내용을 저장했어요."
  const saved = await command(item, "reviews", { type: "save-writing", recordId: record.id, stage: record.stage, answers, body: record.body, itemIndex: record.itemIndex })
  assert.equal(saved.records.find(r => r.id === record.id).answers[firstKey], answers[firstKey])
  if (record.stage === "items") await command(item, "reviews", { type: "enter-rewrite", recordId: record.id })
  const submitted = await command(item, "reviews", { type: "submit", recordId: record.id })
  assert.equal(submitted.records.find(r => r.id === record.id).writingStatus, "submitted")
  assert.equal(submitted.studentPro.usage.used, initial.studentPro.usage.used)
}
results.push("first/second draft and rejected writing save/submit with usage preserved")

item = row("unassigned")
const unassigned = await read(item)
assert.equal(unassigned.studentPro.assigned, false)
await command(item, "pro", { type: "apply", reviewId: unassigned.reviews[0].id }, false)
assert.equal(row("month-boundary").designated, true)
results.push("unassigned access and designated-date example work without widening agency scope")

await refresh()
const oldToken = row("apply-one").token
const otherCases = signature(catalog.rows.filter(r => r.id !== "apply-one"))
await reset("apply-one")
assert.equal(signature(catalog.rows.filter(r => r.id !== "apply-one")), otherCases)
await a(`${root}/reviews?studentTest=${oldToken}`, undefined, false)
assert.equal(signature((await b()).rows), signature(bBefore))
assert.equal(hash(JSON.stringify((await a()).common)), commonHash)
assert.equal(await sharedHash(), beforeHash)
results.push("individual reset affects only its case; browser B and common data unchanged")
console.log(JSON.stringify({ origin: base.origin, passed: results.length, results, localSharedFileUnchanged: local ? true : "not inspected; API common projection unchanged" }, null, 2))
