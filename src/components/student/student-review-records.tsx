"use client"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, CalendarDays, FileText } from "lucide-react"
import { reviewActivityDate, sortStudentReviewRecords, studentReviewListAction, type ReviewDatabase, type ReviewRecord } from "@/lib/review-domain"

export function StudentReviewRecords({ db, month, day, embedded = false, onStartSecond }: { db: ReviewDatabase; month: string; day?: number; embedded?: boolean; onStartSecond?: (record: ReviewRecord, sourceWorkbookId: string) => Promise<void> | void }) {
  const records = db.records.filter(r => db.reviews.some(c => {
    const activity = reviewActivityDate(c)
    return c.id === r.reviewId && activity.monthKey === month && (day === undefined || activity.day === day)
  }))
  const groups = Map.groupBy(records, r => reviewActivityDate(db.reviews.find(c => c.id === r.reviewId)!).day)
  if (!records.length) return null
  return <div className={embedded ? "mb-2" : "mb-8 space-y-8"}>{[...groups].sort(([a],[b]) => b-a).map(([day, rows]) => <section key={day} className={embedded ? undefined : "rounded-[22px] bg-white px-4 py-8 sm:px-8 shadow-[0_4px_18px_rgba(45,62,72,.08)]"}>{!embedded && <h2 className="mb-4 flex items-center gap-2 text-base font-black"><CalendarDays className="size-5 text-[#60baf0]" />{month.slice(5)}월 {String(day).padStart(2,"0")}일</h2>}<ul className="space-y-2">{sortStudentReviewRecords(rows).map(r => <StudentReviewRecordCard key={r.id} db={db} record={r} onStartSecond={onStartSecond} />)}</ul></section>)}</div>
}

export function StudentReviewRecordCard({ db, record: r, onStartSecond }: { db: ReviewDatabase; record: ReviewRecord; onStartSecond?: (record: ReviewRecord, sourceWorkbookId: string) => Promise<void> | void }) {
    const [highlighted, setHighlighted] = useState(false)
    const [startingSecond, setStartingSecond] = useState(false)
    const c = db.reviews.find(c => c.id === r.reviewId)!
    const sent = r.feedbackStatus === "전송완료"
    const secondAvailable = r.round === 1 && c.progress === "second-available"
    const unreadFeedback = sent && !r.seenAt
    const href = `/student/online-workbook/${c.sourceWorkbookId}?round=${r.round}${unreadFeedback ? `&feedback=${r.round}` : ""}`
    const actionLabel = studentReviewListAction(c, r)
    const reportAvailable = c.reportEnabled && r.report && sent
    const highlightClass = highlighted ? (unreadFeedback ? "review-card-glow-feedback" : "review-card-glow-writing") : ""

    useEffect(() => {
      const hashId = decodeURIComponent(window.location.hash.slice(1))
      const noticeKind = new URLSearchParams(window.location.search).get("notice")
      const matchesNotice = noticeKind === "all"
        ? unreadFeedback || secondAvailable
        : noticeKind === "feedback"
          ? unreadFeedback
          : noticeKind === "writing-request"
            ? secondAvailable
            : hashId === r.id

      if (!matchesNotice) return

      let clearTimer = 0
      const frame = window.requestAnimationFrame(() => {
        const target = document.getElementById(r.id)
        if (!target) return
        if (hashId === r.id) {
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" })
        }
        setHighlighted(true)
        clearTimer = window.setTimeout(() => setHighlighted(false), 5100)
      })

      return () => {
        window.cancelAnimationFrame(frame)
        window.clearTimeout(clearTimer)
      }
    }, [r.id, secondAvailable, unreadFeedback])

    const openRecord = async () => {
      if (!secondAvailable || !onStartSecond || startingSecond) return
      setStartingSecond(true)
      try { await onStartSecond(r, c.sourceWorkbookId) }
      finally { setStartingSecond(false) }
    }

    const finished = sent && !unreadFeedback && !secondAvailable
    const label = finished ? "피드백 다시 보기" : actionLabel
    const buttonStyle = `relative z-20 inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border px-3 text-sm font-bold ${unreadFeedback ? "border-[#ff6597] bg-[#ff6597] text-white" : secondAvailable || r.writingStatus === "writing" ? "border-[#0077cb] bg-[#0077cb] text-white" : "border-[#eee] bg-white text-[#555]"}`
    return <li id={r.id} className={`relative isolate flex min-h-[74px] w-full scroll-mt-24 items-center gap-2 border-b border-[#f0f0f0] bg-white px-4 py-3 text-left ${highlightClass}`}>
      <Link href={href} aria-label={`${c.bookTitle} ${r.round}차 ${label}`} className="review-card-link absolute inset-0 z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#239cde]" />
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#777]"><span><span className="mr-1 text-[#ff6597]">●</span>온라인 독후감</span><span>{r.round}차</span><span>{c.level}레벨</span>{finished && <span className="font-bold text-[#127a6a]">활동 완료</span>}{r.writingStatus === "submitted" && !sent && <span>선생님 확인 중</span>}</div><p className="mt-1 text-sm font-bold leading-5">{c.bookTitle}</p>{r.flowers > 0 && <p className="mt-2 text-[11px]"><Image className="mr-1 inline-block" src="/student-assets/flower-reward.svg" alt="섬초롱꽃" width={16} height={16} />{r.flowers}개</p>}</div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {reportAvailable && <Link className="relative z-20 inline-flex h-9 items-center gap-1 rounded-md border border-[#eee] bg-white px-2 text-xs font-semibold text-[#666]" target="_blank" rel="noopener noreferrer" href={`/online-review/report/${r.id}?role=student`}><FileText size={13}/>{r.round}차 보고서</Link>}
        {r.writingStatus === "submitted" && !sent ? <ArrowRight className="size-4 text-[#aaa]" /> : secondAvailable && onStartSecond ? <button type="button" disabled={startingSecond} onClick={() => void openRecord()} className={buttonStyle}>2차 글 시작하기<span className="absolute -right-1 -top-2 rounded bg-[#0077cb] px-1 text-[9px] leading-3 text-white">NEW</span></button> : <Link href={href} className={buttonStyle}>{label}{unreadFeedback && <span className="absolute -right-1 -top-2 rounded bg-[#ff6597] px-1 text-[9px] leading-3 text-white">NEW</span>}</Link>}
      </div>
    </li>
}
