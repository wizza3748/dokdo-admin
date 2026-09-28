"use client"

import * as React from "react"
import ui from "./exploration-test-server.module.css"
import { useReviews } from "@/lib/review-client"
import { StudentReviewRecordCard } from "./student-review-records"
import { SecondReviewStartModal } from "./second-review-start-modal"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, FileText, Home, Smartphone } from "lucide-react"

import { StudentHeader } from "@/components/student/student-header"
import { ModalHeader, ModalShell, YellowFooter } from "@/components/student/student-workbook-ui"
import { COMMON_READING_QUIZ } from "@/lib/reading-exploration"
import { READING_BOOKS } from "@/lib/reading-books"
import { getReadingRoundQuiz } from "@/lib/reading-quiz-settings"
import { getTransientReadingExplorationRecords, type TransientReadingExplorationRecord } from "@/lib/student-exploration-history"
import { readingRecordActivityTimestamp, sortExplorationTimelineItems } from "@/lib/reading-record-summary"
import { reviewActivityDate } from "@/lib/review-domain"
import { getReadingRoundResultsByBook } from "@/lib/student-mock-state"
import { cn } from "@/lib/utils"
import { getWorkbookById, getWorkbookRuntime, studentWorkbooks, type StudentWorkbook } from "@/lib/student-workbooks"

type TabName = "전체" | "책 읽기 탐험" | "글쓰기 탐험" | "영상편지" | "온라인 독후감" | "바닷속 도서관"

interface BasicRecord {
  id: string
  workbookId?: string
  onlineReviewId?: string
  year: number
  month: number
  day: number
  weekday: string
  type: Exclude<TabName, "전체" | "온라인 독후감">
  level: number
  title: string
  attempt: string
  progress: string
  questions: string
  questionAreas?: Array<"사실" | "추론" | "비판">
  questionResults?: boolean[]
}

const tabs: TabName[] = ["전체", "책 읽기 탐험", "글쓰기 탐험", "영상편지", "온라인 독후감", "바닷속 도서관"]

const basicRecords: BasicRecord[] = [
  { id: "r-0901-1", year: 2026, month: 9, day: 1, weekday: "화요일", type: "책 읽기 탐험", level: 4, title: "민주주의를 어떻게 이룰까요?", attempt: "첫 탐험", progress: "1/1", questions: "0/6" },
  { id: "reading-complete-room901-0825", workbookId: "reading-297-round-1", onlineReviewId: "review-seed-student-room901-0825", year: 2026, month: 9, day: 1, weekday: "화요일", type: "책 읽기 탐험", level: 2, title: "901호 띵똥 아저씨", attempt: "첫 탐험", progress: "1/1", questions: "6/6" },
  { id: "reading-complete-asia-table-0824", workbookId: "reading-407-round-1", onlineReviewId: "review-seed-student-asia-table-0824", year: 2026, month: 9, day: 1, weekday: "화요일", type: "책 읽기 탐험", level: 4, title: "밥.빵.국수 - 아시아의 식탁", attempt: "첫 탐험", progress: "1/1", questions: "6/6" },
  { id: "reading-complete-gamunjang-0824", workbookId: "reading-591-round-1", onlineReviewId: "review-seed-student-gamunjang-0824", year: 2026, month: 9, day: 1, weekday: "화요일", type: "책 읽기 탐험", level: 1, title: "감은장아기", attempt: "첫 탐험", progress: "1/1", questions: "6/6" },
  { id: "reading-complete-new-review-writing-room901", workbookId: "reading-726-round-2", onlineReviewId: "review-seed-new-writing", year: 2026, month: 9, day: 7, weekday: "월요일", type: "책 읽기 탐험", level: 2, title: "남몰래 거울", attempt: "첫 탐험", progress: "2/2", questions: "6/6" },
  { id: "reading-complete-new-review-submitted-gamunjang", workbookId: "reading-729-round-1", onlineReviewId: "review-seed-new-submitted", year: 2026, month: 9, day: 7, weekday: "월요일", type: "책 읽기 탐험", level: 1, title: "우리 곧 사라져요", attempt: "첫 탐험", progress: "1/1", questions: "6/6" },
  { id: "reading-complete-review-second-available-room901", workbookId: "reading-725-round-2", onlineReviewId: "review-seed-second-available", year: 2026, month: 9, day: 6, weekday: "일요일", type: "책 읽기 탐험", level: 2, title: "미술관으로 간 백곰", attempt: "첫 탐험", progress: "2/2", questions: "6/6" },
  { id: "reading-complete-review-second-writing-room901", workbookId: "reading-727-round-5", onlineReviewId: "review-seed-second-writing", year: 2026, month: 9, day: 5, weekday: "토요일", type: "책 읽기 탐험", level: 6, title: "괴물을 사랑한 아이 윌로딘", attempt: "첫 탐험", progress: "5/5", questions: "6/6" },
  { id: "reading-complete-review-second-submitted-squirrel", workbookId: "reading-728-round-1", onlineReviewId: "review-seed-second-submitted", year: 2026, month: 9, day: 3, weekday: "목요일", type: "책 읽기 탐험", level: 3, title: "쥐와 다람쥐의 이야기", attempt: "첫 탐험", progress: "1/1", questions: "6/6" },
  { id: "reading-complete-review-two-round-sample", workbookId: "reading-730-round-3", onlineReviewId: "review-seed-two-rounds", year: 2026, month: 9, day: 2, weekday: "수요일", type: "책 읽기 탐험", level: 5, title: "푸른 눈의 독립운동가 [개정본]", attempt: "첫 탐험", progress: "3/3", questions: "6/6" },
  { id: "r-0728", year: 2026, month: 7, day: 28, weekday: "화요일", type: "책 읽기 탐험", level: 4, title: "나는 개가 아닙니다", attempt: "첫 탐험", progress: "3/3", questions: "1/6" },
  { id: "p-0721", year: 2026, month: 7, day: 21, weekday: "화요일", type: "글쓰기 탐험", level: 3, title: "여름 바다에서 만난 친구", attempt: "첫 탐험", progress: "2/2", questions: "6/6" },
  { id: "v-0715", year: 2026, month: 7, day: 15, weekday: "수요일", type: "영상편지", level: 3, title: "독도에게 보내는 영상편지", attempt: "첫 탐험", progress: "1/1", questions: "-" },
]

export function ExplorationRecord() {
  const reviewHook = useReviews()
  const router = useRouter()
  const [secondStart, setSecondStart] = React.useState<{ recordId: string; sourceWorkbookId: string } | null>(null)
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1
  const [year, setYear] = React.useState(currentYear)
  const [month, setMonth] = React.useState(currentMonth)
  const [tab, setTab] = React.useState<TabName>("전체")
  const [readingLevel, setReadingLevel] = React.useState("")
  const [readingAttempt, setReadingAttempt] = React.useState("")
  const tabListRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const list = tabListRef.current
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (list && active && window.innerWidth < 640) list.scrollLeft += active.getBoundingClientRect().left - list.getBoundingClientRect().left - (list.clientWidth - active.offsetWidth) / 2
  }, [tab])
  const [mounted, setMounted] = React.useState(false)
  const [transientReadingRecords, setTransientReadingRecords] = React.useState<TransientReadingExplorationRecord[]>([])
  const [selectedReadingRecord, setSelectedReadingRecord] = React.useState<BasicRecord | TransientReadingExplorationRecord | null>(null)
  const [, refresh] = React.useReducer((value) => value + 1, 0)

  React.useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    if (params.get("tab") === "workbook") setTab("온라인 독후감")
    const requestedMonth = /^(\d{4})-(\d{2})$/.exec(params.get("month") ?? "")
    if (requestedMonth) { setYear(Number(requestedMonth[1])); setMonth(Number(requestedMonth[2])) }
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
  const visibleWorkbooks = [...transientWorkbooks, ...studentWorkbooks.filter((item) => !transientWorkbookIds.has(item.id))].filter((item) => item.year === year && item.month === month && !reviewHook.db.reviews.some(c => c.sourceWorkbookId === item.id))
  const visibleBasics = [...transientReadingRecords, ...basicRecords].filter((item) => item.year === year && item.month === month && (tab === "전체" || item.type === tab) && (tab !== "책 읽기 탐험" || ((!readingLevel || String(item.level) === readingLevel) && (!readingAttempt || item.attempt === readingAttempt))))
  const transientActivityByWorkbookId = new Map(transientReadingRecords.map(record => [record.workbookId, readingRecordActivityTimestamp(record)]))
  const transientActivityById = new Map(transientReadingRecords.map(record => [record.id, readingRecordActivityTimestamp(record)]))
  let sourceOrder = 0
  const rows = [
    ...(tab === "전체" || tab === "온라인 독후감" ? reviewHook.db.records.flatMap((item) => {
      const common = reviewHook.db.reviews.find(review => review.id === item.reviewId)
      if (!common) return []
      const activity = reviewActivityDate(common)
      if (activity.monthKey !== `${year}-${String(month).padStart(2, "0")}`) return []
      return [{ kind: "review" as const, item, day: activity.day, activityAt: Date.parse(common.createdAt) || new Date(activity.year, activity.month - 1, activity.day).getTime(), sourceOrder: sourceOrder++, reviewId: item.reviewId, round: item.round }]
    }) : []),
    ...(tab === "전체" || tab === "온라인 독후감" ? visibleWorkbooks.map((item) => ({ kind: "workbook" as const, item, day: item.day, activityAt: transientActivityByWorkbookId.get(item.id) ?? new Date(item.year, item.month - 1, item.day).getTime(), sourceOrder: sourceOrder++ })) : []),
    ...(tab !== "온라인 독후감" ? visibleBasics.map((item) => ({ kind: "basic" as const, item, day: item.day, activityAt: transientActivityById.get(item.id) ?? new Date(item.year, item.month - 1, item.day).getTime(), sourceOrder: sourceOrder++ })) : []),
  ].sort((a, b) => b.day - a.day)
  const grouped = rows.reduce<Record<number, typeof rows>>((result, row) => {
    result[row.day] = [...(result[row.day] ?? []), row]
    return result
  }, {})
  const monthBasics = [...transientReadingRecords, ...basicRecords].filter(item => item.year === year && item.month === month)
  const monthReviews = reviewHook.db.records.filter(record => reviewHook.db.reviews.some(c => c.id === record.reviewId && reviewActivityDate(c).monthKey === `${year}-${String(month).padStart(2,"0")}`))
  const tabCount = (name: TabName) => name === "온라인 독후감" ? monthReviews.length + visibleWorkbooks.length : name === "전체" ? monthBasics.length + monthReviews.length + visibleWorkbooks.length : monthBasics.filter(r => r.type === name).length
  const flowers = rows.reduce((sum, row) => sum + (row.kind === "review" ? row.item.flowers : 0), 0)
  const monthStart = new Date(year, month - 1, 1).getDay()
  const monthDays = new Date(year, month, 0).getDate()
  const canNext = year < currentYear || (year === currentYear && month < currentMonth)
  const days = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  const moveMonth = (direction: -1 | 1) => {
    let nextMonth = month + direction
    let nextYear = year
    if (nextMonth === 0) { nextMonth = 12; nextYear -= 1 }
    if (nextMonth === 13) { nextMonth = 1; nextYear += 1 }
    setYear(nextYear)
    setMonth(nextMonth)
  }

  const startSecondReview = (recordId: string, sourceWorkbookId: string) => setSecondStart({ recordId, sourceWorkbookId })

  return (
    <div className={ui.page}>
      <StudentHeader />
      {secondStart && <SecondReviewStartModal {...secondStart} run={reviewHook.run} onClose={() => setSecondStart(null)} />}
      <section className={ui.top}>
        <div className="mx-auto flex max-w-[920px] items-center justify-center gap-2">
          <button aria-label="이전 월" onClick={() => moveMonth(-1)} className="grid size-8 place-items-center rounded-full bg-[#2ca4e6] text-white transition hover:bg-[#168fd1]"><ChevronLeft className="size-5" /></button>
          <button type="button" className="flex h-9 items-center gap-2 rounded-full border-2 border-[#36a7e7] bg-white px-5 text-[16px] font-black text-[#1688ca]"><CalendarDays className="size-5" />{year}년 {month}월</button>
          <button aria-label="다음 월" disabled={!canNext} onClick={() => moveMonth(1)} className="grid size-8 place-items-center rounded-full bg-[#2ca4e6] text-white transition hover:bg-[#168fd1] disabled:cursor-not-allowed disabled:opacity-0"><ChevronRight className="size-5" /></button>
        </div>
        <div ref={tabListRef} role="tablist" aria-label="탐험 유형" className={ui.tabs}>
          {tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={ui.tab}>{item}<span>{tabCount(item)}</span></button>)}
        </div>
      </section>

      <main className={ui.layout}>
        <aside className={ui.calendar}><h2>{month}월의 탐험</h2><p className={ui.stats}><strong>{rows.length}</strong> 회 학습 <span><Image className="inline-block" src="/student-assets/flower-reward.svg" alt="섬초롱꽃" width={20} height={20} /> <b>{flowers}</b>개</span></p><div className={ui.days}>{["일","월","화","수","목","금","토"].map((d,i)=><span className={ui.weekday} key={d} data-sunday={i===0}>{d}</span>)}{Array.from({length:monthStart},(_,i)=><span key={`blank-${i}`} />)}{Array.from({length:monthDays},(_,i)=><span key={i} data-active={Boolean(grouped[i+1])} data-today={year===currentYear && month===currentMonth && i+1===currentDate.getDate()}>{i+1}</span>)}</div><footer><p><i />책 + 글　<i />책 또는 글　<i />그 외</p><p>이번 달 <strong>{days.length}일</strong> 탐험했어요</p></footer></aside>
        <div className={ui.timeline}>{tab === "책 읽기 탐험" && <div className={ui.readingFilters}><label>레벨 <select aria-label="레벨" value={readingLevel} onChange={e=>setReadingLevel(e.target.value)}><option value="">선택</option>{[1,2,3,4,5,6].map(level=><option key={level} value={level}>{level}레벨</option>)}</select></label><label>탐험 구분 <select aria-label="탐험 구분" value={readingAttempt} onChange={e=>setReadingAttempt(e.target.value)}><option value="">선택</option><option>첫 탐험</option><option>재탐험</option></select></label></div>}{tab === "온라인 독후감" && <p className={ui.notice}>보고서는 제공되는 독후감에만 표시돼요.</p>}
        {days.length === 0 ? <div className="grid min-h-[390px] place-items-center rounded-[22px] bg-white text-[#999] shadow-[0_4px_18px_rgba(45,62,72,.08)]"><p>탐험 기록이 없는 달이에요</p></div> : (
          <div className="space-y-8">
            {days.map(day => {
              const dayRows = sortExplorationTimelineItems(grouped[day] ?? [])
              const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(year, month - 1, day))
              return <section key={day} className={ui.dayGroup}><h2 className="mb-4 flex items-center gap-2 text-base font-black"><CalendarDays className="size-5 text-[#60baf0]" />{String(month).padStart(2, "0")}월 {String(day).padStart(2, "0")}일 ({weekday})</h2><ul className={ui.cards}>{dayRows.map((row) => row.kind === "review" ? <StudentReviewRecordCard key={row.item.id} db={reviewHook.db} record={row.item} onStartSecond={(record, sourceWorkbookId) => startSecondReview(record.id, sourceWorkbookId)} /> : row.kind === "workbook" ? <WorkbookRow key={row.item.id} workbook={row.item} mounted={mounted} onClick={() => router.push(`/student/online-workbook/${row.item.id}?from=records`)} /> : <BasicRow key={row.item.id} item={row.item} onClick={row.item.type === "책 읽기 탐험" ? () => setSelectedReadingRecord(row.item) : undefined} />)}</ul></section>
            })}
          </div>
        )}
        </div>
      </main>

      {selectedReadingRecord && <ReadingExplorationDetailModal record={selectedReadingRecord} onClose={() => setSelectedReadingRecord(null)} onRead={(mode) => {
        const identity = getReadingRecordIdentity(selectedReadingRecord)
        if (!identity.bookId) return
        setSelectedReadingRecord(null)
        router.push(`/reading/index?bookId=${identity.bookId}&round=${identity.round}&mode=${mode}`)
      }} />}

      <Link href="/student" aria-label="학생 홈으로 돌아가기" className="fixed bottom-6 left-7 grid size-14 place-items-center rounded-full border-4 border-white bg-white text-[#1298df] shadow-[0_5px_25px_rgba(0,0,0,.18)]"><Home className="size-7" /></Link>
      <button type="button" aria-label="위로가기" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 right-7 grid size-14 place-items-center rounded-full border-4 border-white bg-white text-2xl font-black text-[#1298df] shadow-[0_5px_25px_rgba(0,0,0,.18)]">↑</button>
    </div>
  )
}

function WorkbookRow({ workbook, mounted, onClick }: { workbook: StudentWorkbook; mounted: boolean; onClick: () => void }) {
  const runtime = mounted ? getWorkbookRuntime(workbook) : { status: workbook.status, feedbackSeen: workbook.feedback?.seen ?? true }
  const isNewReview = `${workbook.year}-${String(workbook.month).padStart(2, "0")}` >= "2026-09"
  const unread = runtime.status === "feedback" && !runtime.feedbackSeen
  const finished = runtime.status === "feedback" && !unread
  const action = runtime.status === "before" ? "글 시작하기" : runtime.status === "writing" ? "이어서 쓰기" : runtime.status === "completed" ? "선생님 확인 중" : unread ? "피드백 확인하기" : "피드백 다시 보기"
  return <li><button type="button" onClick={onClick} aria-label={`${workbook.bookTitle} ${action}`} className={ui.recordRow}><div className={ui.rowText}><div className={ui.rowMeta}><span><i data-type="review" />온라인 독후감</span>{isNewReview && <span>1차</span>}<span>{workbook.level}레벨</span>{finished && <b>활동 완료</b>}{runtime.status === "completed" && <span>선생님 확인 중</span>}</div><p>{workbook.bookTitle}</p></div>{runtime.status === "completed" ? <ChevronRight size={16} className="text-[#aaa]" /> : <span className={ui.rowAction} data-tone={unread ? "pink" : finished ? "outline" : "blue"}>{action}{unread && <small>NEW</small>}</span>}</button></li>
}

function BasicRow({ item, onClick }: { item: BasicRecord | TransientReadingExplorationRecord; onClick?: () => void }) {
  const content = <><div className={ui.rowText}><div className={ui.rowMeta}><span><i data-type={item.type === "책 읽기 탐험" ? "reading" : "other"} />{item.type}</span><span>{item.level}레벨 · {item.attempt}</span></div><p>{item.title}<small>{item.progress.replace("/", " / ")} 회차</small></p></div><div className={ui.rowScore}><Pencil size={15} fill="#b88bdd" stroke="#ad7fd2" /><strong>{item.questions}</strong><ChevronRight size={16} /></div></>
  return <li>{onClick ? <button type="button" onClick={onClick} className={ui.recordRow}>{content}</button> : <div className={ui.recordRow}>{content}</div>}</li>
}

function getReadingRecordIdentity(record: BasicRecord | TransientReadingExplorationRecord) {
  const workbookId = ("workbookId" in record ? record.workbookId : "") ?? ""
  const idMatch = /^reading-(\d+)-round-(\d+)$/.exec(workbookId)
  const book = idMatch
    ? READING_BOOKS.find((item) => item.id === Number(idMatch[1]))
    : READING_BOOKS.find((item) => item.title === record.title)
  const progressRound = Number(record.progress.split("/")[0])
  return { bookId: book?.id, round: Number(idMatch?.[2]) || progressRound || 1 }
}

function ReadingExplorationDetailModal({ record, onClose, onRead }: { record: BasicRecord | TransientReadingExplorationRecord; onClose: () => void; onRead: (mode: "ebook" | "paper") => void }) {
  const identity = getReadingRecordIdentity(record)
  const storedResult = identity.bookId ? getReadingRoundResultsByBook()[identity.bookId]?.[identity.round] : undefined
  const [, questionTotalText] = record.questions.split("/")
  const totalQuestions = record.questionResults?.length ?? storedResult?.totalQuestions ?? (Number(questionTotalText) || 6)
  const quiz = identity.bookId ? getReadingRoundQuiz(identity.bookId, identity.round) : COMMON_READING_QUIZ
  const areas = record.questionAreas ?? storedResult?.questionAreas ?? Array.from({ length: totalQuestions }, (_, index) => quiz[index]?.area ?? "사실")
  const correctCount = storedResult?.correctCount ?? (Number(record.questions.split("/")[0]) || 0)
  const results = record.questionResults ?? storedResult?.questionResults ?? Array.from({ length: totalQuestions }, (_, index) => index < correctCount)
  const columns = Math.max(totalQuestions, 1)
  return <ModalShell width="830px"><ModalHeader title="책 읽기 탐험 상세" onClose={onClose} /><div className="px-5 py-4"><div className="grid grid-cols-2 gap-3 text-center text-[18px]"><div className="rounded-lg border border-[#dce3e7] px-4 py-3">{record.level}레벨</div><div className="rounded-lg border border-[#dce3e7] px-4 py-3">{record.attempt}</div></div><div className="mt-3 flex items-center justify-center gap-3 rounded-lg border border-[#dce3e7] px-4 py-3 text-[20px] font-black"><span>{record.title}</span><span className="shrink-0 rounded bg-[#eef0f2] px-2 py-0.5 text-[14px] font-semibold text-[#757d83]">{record.progress.replace("/", " / ")}</span></div><div className="mt-4 overflow-x-auto rounded-lg border border-[#dce3e7] bg-[#f9fafb] p-4"><div className="min-w-[600px] overflow-hidden border border-[#dce3e7] bg-white" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(86px, 1fr))` }}>{Array.from({ length: totalQuestions }, (_, index) => <span key={`number-${index}`} className="border-b border-r border-[#dce3e7] px-2 py-2 text-center font-bold text-[#92999e]">{index + 1}</span>)}{Array.from({ length: totalQuestions }, (_, index) => <span key={`area-${index}`} className="border-b border-r border-[#dce3e7] px-2 py-2 text-center">{areas[index] ?? "사실"}</span>)}{Array.from({ length: totalQuestions }, (_, index) => <span key={`result-${index}`} className={cn("border-r border-[#dce3e7] px-2 py-3 text-center text-[26px] font-black", results[index] ? "text-[#458df5]" : "text-[#ff5e94]")}>{results[index] ? "O" : "×"}</span>)}</div></div></div><YellowFooter><button type="button" disabled={!identity.bookId} onClick={() => onRead("ebook")} className="flex items-center justify-center gap-2 disabled:opacity-50"><Smartphone className="size-6" />전자책 다시 읽기</button><button type="button" disabled={!identity.bookId} onClick={() => onRead("paper")} className="flex items-center justify-center gap-2 disabled:opacity-50"><FileText className="size-6" />종이책 다시 읽기</button></YellowFooter></ModalShell>
}
