"use client"
import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { addDays, cutoffLabel, dateLabel, kstDate, weekdayNames, weekSchedule, weekStart } from "@/lib/pro-calendar"
import { weekdayFor } from "@/lib/pro-domain"
import { field, panel, ProNotice, useProManagement } from "./pro-common"
export function FeedbackDaySettings() {
  const hook = useProManagement(), [weekday, setWeekday] = React.useState(7), [teacherId, setTeacherId] = React.useState("teacher-1")
  const pro = hook.db.pro
  if (!hook.loaded) return <p className="p-6">불러오는 중…</p>
  if (!pro) return <p className="p-6">{hook.error || "프로 관리 이력이 없습니다."}</p>
  const member = pro.members.find(m => m.teacherId === teacherId), current = member ? weekdayFor(pro, member, weekStart(pro.clock)) : 7
  const nextWeek = addDays(weekStart(pro.clock), 7), preview = weekSchedule(nextWeek, weekday), pending = pro.schedules.find(s => s.teacherId === teacherId && s.from === nextWeek)
  return <div className="space-y-5 p-6"><h1 className="text-2xl font-semibold">피드백 요일 설정</h1><ProNotice hook={hook}/><section className={panel}><p className="mb-4">현재 {weekdayNames[current - 1]} {pending && `· 다음 주 ${weekdayNames[pending.weekday - 1]} 적용 예정`}</p><div className="flex flex-wrap gap-3"><label>담당 선생님 <select className={field} value={teacherId} onChange={e => setTeacherId(e.target.value)}>{[...new Set(pro.members.map(m => m.teacherId))].map(id => <option key={id} value={id}>담당 선생님 ({id})</option>)}</select></label><label>피드백 요일 <select disabled={hook.readOnly} className={field} value={weekday} onChange={e => setWeekday(Number(e.target.value))}>{weekdayNames.map((day, i) => <option key={day} value={i + 1}>{day}</option>)}</select></label></div>{weekday !== 7 && <p className="mt-3 text-sm text-amber-700">일요일을 권장합니다. 다른 요일을 선택하면 제출 주차와 피드백 처리 주차가 달라질 수 있습니다.</p>}<div className="mt-5 space-y-2 text-sm"><h2 className="font-semibold">일정 미리보기</h2><p>적용 시작일: {kstDate(nextWeek)}</p><p>제출 및 신청 마감: {cutoffLabel(preview.cutoff)}</p><p>1차 독려: {dateLabel(preview.remind1)} · 2차 독려: {dateLabel(preview.remind2)}</p><p>피드백 처리 기한: {dateLabel(preview.due)}</p><p>학생 안내: {cutoffLabel(preview.cutoff)}까지 피드백받을 글을 골라 주세요. 남은 자리는 최근에 제출한 글부터 자동으로 골라요.</p><p>이미 배정된 관리 건의 마감과 처리 기한은 변경되지 않습니다.</p></div><div className="mt-5 flex gap-2"><Button asChild variant="outline"><Link href={`/agency/pro-management?role=${hook.role}`}>목록</Link></Button>{!hook.readOnly && <Button disabled={hook.busy} onClick={async () => { if (await hook.runPro({ type: "schedule", weekday, teacherId })) hook.setMessage(`피드백 요일을 저장했습니다. ${kstDate(nextWeek)}부터 적용됩니다.`) }}>저장</Button>}</div></section></div>
}
