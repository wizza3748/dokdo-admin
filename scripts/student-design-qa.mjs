// Isolated synthetic state only. Never reads or resets the shared .local-state.
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { initializePro } from "../src/lib/pro-seeds.ts"
import { emptyReviewDatabase } from "../src/lib/review-domain.ts"
import { applyProCommand, applyManagedReviewCommand } from "../src/lib/pro-domain.ts"
const directory=path.resolve("artifacts/student-design-qa/state")
let db=initializePro(emptyReviewDatabase());db.pro.clockMode="test"
const actor={role:"student",studentId:"pro-demo-1",name:"QA 변경 검증"}
db=applyManagedReviewCommand(db,{type:"submit",recordId:"review-pro-writing-r1"},actor,"qa-submit",db.pro.clock)
db=applyProCommand(db,{type:"apply",reviewId:"review-pro-apply-a"},actor,"qa-apply-a")
db=applyProCommand(db,{type:"apply",reviewId:"review-pro-apply-b"},actor,"qa-apply-b")
// A separately named family makes test identities unmistakable even in URLs.
db=JSON.parse(JSON.stringify(db).replaceAll("pro-demo-","qa-design-").replaceAll("review-pro-","review-qa-design-"))
db.pro.members.forEach(m=>{m.name=`검증 ${m.id.split("-").at(-1)}번`;m.account=m.id})
db.reviews.forEach(r=>{r.studentName=db.pro.members.find(m=>m.id===r.studentId)?.name??r.studentName})
const directoryFile=path.join(directory,"online-reviews.json")
await mkdir(directory,{recursive:true})
await writeFile(directoryFile,JSON.stringify(db,null,2),{encoding:"utf8",flag:"wx"})
console.log(`Created isolated QA state: ${directoryFile}`)
console.log("Multi-candidate detail: http://localhost:3100/student/online-workbook/review-qa-design-writing?round=1&demoStudent=qa-design-1")
console.log("List: http://localhost:3100/student/exploration-record?tab=workbook&month=2026-10&demoStudent=qa-design-1")
