"use client"
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
    const href = `/student/online-workbook/${c.sourceWorkbookId}?round=${r.round}`
    const sent = r.feedbackStatus === "전송완료"
    const secondAvailable = r.round === 1 && c.progress === "second-available"
    const unreadFeedback = sent && !r.seenAt
    const actionLabel = studentReviewListAction(c, r)
    const actionable = r.writingStatus === "writing" || secondAvailable || unreadFeedback
    const actionColor = unreadFeedback ? "text-[#d93670]" : actionable ? "text-[#178ad1]" : sent ? "text-[#2c966f]" : "text-[#6f7b83]"
    const reportAvailable = c.reportEnabled && r.report && sent
    const actionClass = "relative z-20 inline-flex min-h-10 whitespace-nowrap items-center justify-center gap-1.5 rounded-lg border border-[#b9d8eb] bg-white px-3 py-2 text-sm font-bold text-[#147fbd] transition hover:border-[#239cde] hover:bg-[#eaf6fd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#239cde]"
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

    return <li id={r.id} className={`relative isolate flex min-h-[92px] w-full scroll-mt-24 items-stretch overflow-hidden rounded-lg border border-[#e4e8eb] bg-[#f8fafb] text-left transition has-[>.review-card-link:hover]:bg-[#eef3f6] ${highlightClass}`}>
      {secondAvailable && onStartSecond
        ? <button type="button" disabled={startingSecond} onClick={() => void openRecord()} aria-label={`${c.bookTitle} 2차 글 시작하기`} className="review-card-link absolute inset-0 z-10 rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#239cde] disabled:cursor-wait" />
        : <Link href={href} aria-label={`${c.bookTitle} ${r.round}차 ${actionLabel}`} className="review-card-link absolute inset-0 z-10 rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#239cde]" />}
      <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center">
        <div className="block min-w-0 flex-1 px-3 py-4 sm:px-5"><div className="flex flex-wrap items-center gap-2 text-[12px] font-bold"><span className="rounded-full bg-[#ffe4ee] px-2.5 py-1 text-[#f05d94]">온라인 독후감</span><span className="text-[#f05d94]">{c.level}레벨 · {r.round}차</span></div><p className="mt-2 truncate text-base font-black">{c.bookTitle}</p></div>
        {reportAvailable && <div role="group" aria-label={`${r.round}차 독후감 부가 기능`} className="flex shrink-0 flex-wrap justify-end gap-2 px-3 pb-4 sm:flex-col sm:px-3 sm:py-4 lg:flex-row"><Link className={actionClass} target="_blank" rel="noopener noreferrer" href={`/online-review/report/${r.id}?role=student`}><FileText aria-hidden="true" className="size-4 shrink-0" />{r.round}차 보고서</Link></div>}
      </div>
      <div className={`relative flex w-[160px] shrink-0 items-center justify-center gap-1 border-l border-dashed border-[#dce1e4] px-3 py-5 text-center text-xs font-black sm:w-[180px] sm:px-4 sm:text-sm ${actionColor}`}>{(unreadFeedback || secondAvailable) && <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] text-white shadow-sm ${unreadFeedback ? "bg-[#ff4c79]" : "bg-[#168fd1]"}`}>NEW</span>}<span className="whitespace-nowrap">{actionLabel}</span>{actionable && <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />}</div>
    </li>
}
