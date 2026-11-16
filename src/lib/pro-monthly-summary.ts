import type { ReviewDatabase } from "./review-domain"
// @ts-expect-error Node tests load TypeScript directly.
import { academyName, monthlyLate } from "./pro-monthly.ts"
export type MonthlyFilters = { month: string; institution: string; required: string; status: string; student: string }
export function summarizeMonthly(db: ReviewDatabase, filters: MonthlyFilters) {
  const pro=db.pro!, all=pro.monthly?.records.filter(r=>r.month===filters.month)??[]
  const institutions=[...new Set(all.map(r=>r.sent?.institutionId??r.institutionId))].map(id=>({id,name:academyName(db,id)})).sort((a,b)=>a.name.localeCompare(b.name,"ko"))
  const academies=institutions.filter(i=>!filters.institution||i.id===filters.institution).map(i=>{
    const owned=all.filter(r=>(r.sent?.institutionId??r.institutionId)===i.id), required=owned.filter(r=>r.required), sent=required.filter(r=>r.sent).length, late=required.filter(r=>monthlyLate(r,pro.clock)).length
    return {...i,target:required.length,sent,unsent:required.length-sent,late,optional:owned.filter(r=>!r.required).length,rate:required.length?(sent/required.length*100).toFixed(1):"-"}
  }).sort((a,b)=>b.late-a.late||b.unsent-a.unsent||a.name.localeCompare(b.name,"ko"))
  const students=all.filter(r=>(!filters.institution||(r.sent?.institutionId??r.institutionId)===filters.institution)&&(!filters.required||(filters.required==="required"?r.required:!r.required))&&(!filters.status||(filters.status==="sent"?!!r.sent:filters.status==="late"?monthlyLate(r,pro.clock):!r.sent))&&(!filters.student.trim()||pro.members.find(m=>m.id===r.studentId)?.name.includes(filters.student.trim())))
    .sort((a,b)=>Number(monthlyLate(b,pro.clock))-Number(monthlyLate(a,pro.clock))||Number(!!a.sent)-Number(!!b.sent)||a.due.localeCompare(b.due)||(pro.members.find(m=>m.id===a.studentId)?.name??"").localeCompare(pro.members.find(m=>m.id===b.studentId)?.name??"","ko"))
  const evaluated=pro.monthly?.evaluatedMonths.includes(filters.month)||all.length>0
  return {all,institutions,academies,students,evaluated}
}
