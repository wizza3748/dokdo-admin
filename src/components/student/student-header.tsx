"use client"

import Image from "next/image"
import Link from "next/link"
import { BellRing, ClipboardList, Menu, Megaphone } from "lucide-react"

import { useReviews } from "@/lib/review-client"
import { reviewActivityDate, studentReviewNotices } from "@/lib/review-domain"

export function StudentHeader({ section }: { section?: string }) {
  const { db } = useReviews()
  const notices = studentReviewNotices(db)
  const firstNotice = notices[0]
  const noticeHref = firstNotice
    ? `/student/exploration-record?tab=workbook&month=${reviewActivityDate(firstNotice.review).monthKey}&notice=all#${firstNotice.record.id}`
    : "/student/exploration-record?tab=workbook"
  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date())

  return (
    <header className="relative z-30 flex min-h-12 flex-wrap items-center justify-between gap-y-1 border-b border-[#dce4e8] bg-white px-3 py-1 sm:h-12 sm:flex-nowrap sm:px-6 sm:py-0">
      <Link href="/student" className="flex items-center gap-2 font-black text-[#171b1e]">
        <Image src="/student-assets/dokdo-logo.svg" alt="독도" width={40} height={34} priority />
        <span>진독도</span>
      </Link>
      <div className="order-last w-full text-center text-sm sm:absolute sm:left-1/2 sm:order-none sm:w-auto sm:-translate-x-1/2">{section ? <strong>{section}</strong> : <><span className="text-[#454c51]">{todayLabel}</span><strong className="ml-2">탐험</strong></>}</div>
      <div className="flex items-center gap-2 text-[#078ed5] sm:gap-3">
        <Link href={noticeHref} aria-label={notices.length ? `알림 ${notices.length}건` : "알림"} className="relative grid size-7 place-items-center text-[#f05d94] transition hover:text-[#d93670] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f05d94] focus-visible:ring-offset-2">
          <ClipboardList className="size-6" />
          {notices.length > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 inline-flex size-4 items-center justify-center rounded-full bg-[#ff4c79] text-[10px] font-black text-white">{notices.length}</span>}
        </Link>
        <button type="button" aria-label="공지 사항"><Megaphone className="size-6" /></button><button type="button" aria-label="오류신고"><BellRing className="size-6" /></button><button type="button" aria-label="메뉴열기/닫기"><Menu className="size-7" /></button>
      </div>
    </header>
  )
}
