"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight, Home } from "lucide-react"

import { StudentHeader } from "@/components/student/student-header"
import { getTransientReadingExplorationRecords, type TransientReadingExplorationRecord } from "@/lib/student-exploration-history"
import { cn } from "@/lib/utils"
import { getWorkbookById, getWorkbookRuntime, studentWorkbooks, type StudentWorkbook, type WorkbookStatus } from "@/lib/student-workbooks"

type TabName = "전체" | "책 읽기 탐험" | "글쓰기 탐험" | "영상편지" | "온라인 워크북"

interface BasicRecord {
  id: string
  year: number
  month: number
  day: number
  weekday: string
  type: Exclude<TabName, "전체" | "온라인 워크북">
  level: number
  title: string
  attempt: string
  progress: string
  questions: string
}

const tabs: TabName[] = ["전체", "책 읽기 탐험", "글쓰기 탐험", "영상편지", "온라인 워크북"]

const basicRecords: BasicRecord[] = [
  { id: "r-0901-1", year: 2026, month: 9, day: 1, weekday: "화요일", type: "책 읽기 탐험", level: 4, title: "민주주의를 어떻게 이룰까요?", attempt: "첫 탐험", progress: "1/1", questions: "0/6" },
  { id: "r-0901-2", year: 2026, month: 9, day: 1, weekday: "화요일", type: "책 읽기 탐험", level: 4, title: "901호 띵똥 아저씨", attempt: "첫 탐험", progress: "1/1", questions: "0/6" },
  { id: "r-0901-3", year: 2026, month: 9, day: 1, weekday: "화요일", type: "책 읽기 탐험", level: 4, title: "밥.빵.국수 - 아시아의 식탁", attempt: "첫 탐험", progress: "1/1", questions: "1/6" },
  { id: "r-0901-4", year: 2026, month: 9, day: 1, weekday: "화요일", type: "책 읽기 탐험", level: 4, title: "감은장아기", attempt: "첫 탐험", progress: "1/1", questions: "0/6" },
  { id: "r-0728", year: 2026, month: 7, day: 28, weekday: "화요일", type: "책 읽기 탐험", level: 4, title: "나는 개가 아닙니다", attempt: "첫 탐험", progress: "3/3", questions: "1/6" },
  { id: "p-0721", year: 2026, month: 7, day: 21, weekday: "화요일", type: "글쓰기 탐험", level: 3, title: "여름 바다에서 만난 친구", attempt: "첫 탐험", progress: "2/2", questions: "6/6" },
  { id: "v-0715", year: 2026, month: 7, day: 15, weekday: "수요일", type: "영상편지", level: 3, title: "독도에게 보내는 영상편지", attempt: "첫 탐험", progress: "1/1", questions: "-" },
]

const statusLabel: Record<WorkbookStatus, string> = { before: "작성 전", writing: "작성 중", completed: "작성 완료", feedback: "피드백 확인" }
const statusClass: Record<WorkbookStatus, string> = { before: "text-[#e87916]", writing: "text-[#178ad1]", completed: "text-[#3f4549]", feedback: "text-[#2c966f]" }

export function ExplorationRecord() {
  const router = useRouter()
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1
  const [year, setYear] = React.useState(currentYear)
  const [month, setMonth] = React.useState(currentMonth)
  const [tab, setTab] = React.useState<TabName>("전체")
  const [mounted, setMounted] = React.useState(false)
  const [transientReadingRecords, setTransientReadingRecords] = React.useState<TransientReadingExplorationRecord[]>([])
  const [, refresh] = React.useReducer((value) => value + 1, 0)

  React.useEffect(() => {
    setMounted(true)
    setTransientReadingRecords(getTransientReadingExplorationRecords())
    const handleWorkbookChange = () => refresh()
    const handleExplorationChange = () => setTransientReadingRecords(getTransientReadingExplorationRecords())
    window.addEventListener("dokdo-workbook-change", handleWorkbookChange)
    window.addEventListener("dokdo-exploration-record-change", handleExplorationChange)
    return () => {
      window.removeEventListener("dokdo-workbook-change", handleWorkbookChange)
      window.removeEventListener("dokdo-exploration-record-change", handleExplorationChange)
    }
  }, [])

  const includedTransientWorkbookIds = new Set<string>()
  const transientWorkbooks = transientReadingRecords.flatMap((record) => {
    if (includedTransientWorkbookIds.has(record.workbookId)) return []
    includedTransientWorkbookIds.add(record.workbookId)
    const workbook = getWorkbookById(record.workbookId)
    return workbook ? [{ ...workbook, year: record.year, month: record.month, day: record.day, weekday: record.weekday }] : []
  })
  const transientWorkbookIds = new Set(transientWorkbooks.map((item) => item.id))
  const visibleWorkbooks = [...transientWorkbooks, ...studentWorkbooks.filter((item) => !transientWorkbookIds.has(item.id))].filter((item) => item.year === year && item.month === month)
  const visibleBasics = [...transientReadingRecords, ...basicRecords].filter((item) => item.year === year && item.month === month && (tab === "전체" || item.type === tab))
  const rows = [
    ...(tab === "전체" || tab === "온라인 워크북" ? visibleWorkbooks.map((item) => ({ kind: "workbook" as const, item })) : []),
    ...(tab !== "온라인 워크북" ? visibleBasics.map((item) => ({ kind: "basic" as const, item })) : []),
  ].sort((a, b) => b.item.day - a.item.day)
  const grouped = rows.reduce<Record<number, typeof rows>>((result, row) => {
    result[row.item.day] = [...(result[row.item.day] ?? []), row]
    return result
  }, {})
  const canNext = year < currentYear || (year === currentYear && month < currentMonth)

  const moveMonth = (direction: -1 | 1) => {
    let nextMonth = month + direction
    let nextYear = year
    if (nextMonth === 0) { nextMonth = 12; nextYear -= 1 }
    if (nextMonth === 13) { nextMonth = 1; nextYear += 1 }
    setYear(nextYear)
    setMonth(nextMonth)
  }

  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#3f4549] [&_button:not(:disabled)]:cursor-pointer">
      <StudentHeader />
      <section className="border-b border-[#e5e9ec] bg-white px-4 pb-8 pt-8">
        <div className="mx-auto flex max-w-[920px] items-center justify-center gap-2">
          <button aria-label="이전 월" onClick={() => moveMonth(-1)} className="grid size-8 place-items-center rounded-full bg-[#2ca4e6] text-white transition hover:bg-[#168fd1]"><ChevronLeft className="size-5" /></button>
          <button type="button" className="flex h-9 items-center gap-2 rounded-full border-2 border-[#36a7e7] bg-white px-5 text-[16px] font-black text-[#1688ca]"><CalendarDays className="size-5" />{year}년 {month}월</button>
          <button aria-label="다음 월" disabled={!canNext} onClick={() => moveMonth(1)} className="grid size-8 place-items-center rounded-full bg-[#2ca4e6] text-white transition hover:bg-[#168fd1] disabled:cursor-not-allowed disabled:opacity-0"><ChevronRight className="size-5" /></button>
        </div>
        <div role="tablist" aria-label="탐험 유형" className="mx-auto mt-6 flex h-10 max-w-[560px] items-center justify-center rounded-full bg-[#fafafa] p-1">
          {tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={cn("h-8 flex-1 whitespace-nowrap rounded-full px-3 text-[15px] font-bold transition", tab === item ? "bg-[#cdebf8] text-[#1497d9] shadow-sm" : "text-[#8b9297] hover:text-[#1688ca]")}>{item}</button>)}
        </div>
      </section>

      <main className="mx-auto max-w-[930px] px-4 py-8">
        {rows.length === 0 ? <div className="grid min-h-[390px] place-items-center rounded-[22px] bg-white text-[#999] shadow-[0_4px_18px_rgba(45,62,72,.08)]"><p>탐험 기록이 없는 달이에요</p></div> : (
          <div className="space-y-8">
            {Object.entries(grouped).sort(([a], [b]) => Number(b) - Number(a)).map(([day, dayRows]) => {
              const first = dayRows[0].item
              return <section key={day} className="rounded-[22px] bg-white px-8 py-8 shadow-[0_4px_18px_rgba(45,62,72,.08)]"><h2 className="mb-4 flex items-center gap-2 text-base font-black"><CalendarDays className="size-5 text-[#60baf0]" />{String(month).padStart(2, "0")}월 {String(day).padStart(2, "0")}일 {first.weekday}</h2><ul className="space-y-2">{dayRows.map((row) => row.kind === "workbook" ? <WorkbookRow key={row.item.id} workbook={row.item} mounted={mounted} onClick={() => router.push(`/student/online-workbook/${row.item.id}`)} /> : <BasicRow key={row.item.id} item={row.item} />)}</ul></section>
            })}
          </div>
        )}
      </main>

      <Link href="/student" aria-label="학생 홈으로 돌아가기" className="fixed bottom-6 left-7 grid size-14 place-items-center rounded-full border-4 border-white bg-white text-[#1298df] shadow-[0_5px_25px_rgba(0,0,0,.18)]"><Home className="size-7" /></Link>
      <button type="button" aria-label="위로가기" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 right-7 grid size-14 place-items-center rounded-full border-4 border-white bg-white text-2xl font-black text-[#1298df] shadow-[0_5px_25px_rgba(0,0,0,.18)]">↑</button>
    </div>
  )
}

function WorkbookRow({ workbook, mounted, onClick }: { workbook: StudentWorkbook; mounted: boolean; onClick: () => void }) {
  const runtime = mounted ? getWorkbookRuntime(workbook) : { status: workbook.status, feedbackSeen: workbook.feedback?.seen ?? true }
  return <li><button type="button" onClick={onClick} className="flex min-h-[92px] w-full items-stretch overflow-hidden rounded-lg border border-[#e4e8eb] bg-[#f8fafb] text-left transition hover:bg-[#eef3f6]"><div className="min-w-0 flex-1 px-5 py-4"><div className="flex items-center gap-2 text-[12px] font-bold"><span className="rounded-full bg-[#ffe4ee] px-2.5 py-1 text-[#f05d94]">온라인 워크북</span><span className="text-[#f05d94]">{workbook.level}레벨</span></div><p className="mt-2 truncate text-base font-black">{workbook.bookTitle}</p></div><div className={cn("relative grid w-[120px] shrink-0 place-items-center border-l border-dashed border-[#dce1e4] px-4 text-center font-black", statusClass[runtime.status])}>{runtime.status === "feedback" && !runtime.feedbackSeen && <span className="absolute right-2 top-2 rounded-full bg-[#ff4c79] px-2 py-0.5 text-[10px] text-white">NEW</span>}{statusLabel[runtime.status]}</div></button></li>
}

function BasicRow({ item }: { item: BasicRecord }) {
  const typeClass = item.type === "책 읽기 탐험" ? "bg-[#ecebff] text-[#7971ee]" : item.type === "글쓰기 탐험" ? "bg-[#e3f8ef] text-[#2ba97b]" : "bg-[#fff0dc] text-[#e58b2e]"
  return <li className="flex min-h-[92px] items-stretch overflow-hidden rounded-lg border border-[#e4e8eb] bg-[#f8fafb]"><div className="min-w-0 flex-1 px-5 py-4"><div className="flex items-center gap-2 text-[12px] font-bold"><span className={cn("rounded-full px-2.5 py-1", typeClass)}>{item.type.replace(" 탐험", "")}</span><span className="text-[#7971ee]">{item.level}레벨 · {item.attempt}</span></div><p className="mt-2 truncate text-base font-black">{item.title} <span className="ml-2 rounded bg-[#e9edef] px-2 py-0.5 text-xs text-[#7a8288]">{item.progress}</span></p></div><div className="grid w-[120px] shrink-0 place-items-center border-l border-dashed border-[#dce1e4] font-black">{item.questions}</div></li>
}
