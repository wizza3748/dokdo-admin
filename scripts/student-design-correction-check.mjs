import assert from "node:assert/strict"

// Only the separate local visual-QA server and qa-visual identities are writable.
const base = "http://127.0.0.1:3200/api/mock/online-reviews"
const mode = process.argv[2] ?? "snapshot"
const studentId = "qa-visual-1"
async function api(role, command) {
  const response = await fetch(`${base}?role=${role}&demoStudent=${studentId}`, command ? {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ command, requestId: `visual-${crypto.randomUUID()}` }),
  } : undefined)
  const data = await response.json()
  assert.equal(response.status, 200, JSON.stringify(data))
  return data
}
if (mode === "lock") await api("agency", {
  type: "save-feedback", recordId: "review-qa-visual-apply-b-r1",
  feedback: "검증용 피드백입니다. 글에 나타난 생각을 잘 살펴보았어요.", items: [], decision: "complete",
})
const data = await api("student")
console.log(JSON.stringify({ usage: data.studentPro.usage, cases: data.studentPro.cases.map(c => ({
  reviewId: c.reviewId, selected: c.selected, locked: c.locked, changeCandidates: c.changeCandidates,
})) }, null, 2))
const admin = await api("agency")
console.log(JSON.stringify(admin.pro.audit.filter(a => a.studentId === studentId && ["change", "cancel"].includes(a.kind)), null, 2))
