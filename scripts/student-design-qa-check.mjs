// Network checks are restricted to the isolated local QA server and QA identities.
import assert from "node:assert/strict"
const base="http://127.0.0.1:3100/api/mock"
const mode=process.argv[2]??"snapshot"
async function api(endpoint,role,command){
  const res=await fetch(`${base}/${endpoint}?role=${role}&demoStudent=qa-design-1`,command?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({command,requestId:`qa-${mode}-${crypto.randomUUID()}`})}:undefined)
  const data=await res.json();assert.equal(res.status,200,JSON.stringify(data));return data
}
if(mode==="lock") await api("online-reviews","agency",{type:"save-feedback",recordId:"review-qa-design-apply-b-r1",feedback:"검증용 피드백입니다. 글에 나타난 생각을 잘 살펴보았어요.",items:[],decision:"complete"})
const data=await api("online-reviews","student")
console.log(JSON.stringify({usage:data.studentPro.usage,cases:data.studentPro.cases.map(c=>({reviewId:c.reviewId,selected:c.selected,locked:c.locked,changeCandidates:c.changeCandidates}))},null,2))
if(mode==="snapshot"){
  const admin=await api("online-reviews","agency")
  console.log(JSON.stringify(admin.pro.audit.filter(a=>a.studentId==="qa-design-1"&&["change","cancel"].includes(a.kind)),null,2))
}
