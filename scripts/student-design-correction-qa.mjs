// A fresh QA family for the visual correction. Never reads or resets shared data.
import { mkdir, writeFile } from "node:fs/promises"
import { initializePro } from "../src/lib/pro-seeds.ts"
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
import { applyProCommand, applyManagedReviewCommand } from "../src/lib/pro-domain.ts"

let db = initializePro(emptyReviewDatabase())
db.pro.clockMode = "test"
const student = { role: "student", studentId: "pro-demo-1", name: "디자인 검증" }
db = applyManagedReviewCommand(db, { type: "submit", recordId: "review-pro-writing-r1" }, student, "visual-submit", db.pro.clock)
for (const letter of ["a", "b"]) db = applyProCommand(db, { type: "apply", reviewId: `review-pro-apply-${letter}` }, student, `visual-apply-${letter}`)
db = JSON.parse(JSON.stringify(db).replaceAll("pro-demo-", "qa-visual-").replaceAll("review-pro-", "review-qa-visual-"))
db.pro.members.forEach(member => { member.name = `화면 검증 ${member.id.slice(10)}`; member.account = member.id })
db.reviews.forEach(review => { review.studentName = db.pro.members.find(member => member.id === review.studentId)?.name ?? review.studentName })
const directory = "artifacts/student-design-correction/state"
await mkdir(directory, { recursive: true })
await writeFile(`${directory}/online-reviews.json`, JSON.stringify(db, null, 2), { encoding: "utf8", flag: "wx" })
console.log("New isolated visual QA data created; shared and previous QA data untouched.")
