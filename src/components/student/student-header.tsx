"use client"

import Image from "next/image"
import Link from "next/link"
import { BellRing, Menu, Megaphone } from "lucide-react"

export function StudentHeader({ section }: { section?: string }) {
  return (
    <header className="relative z-30 flex h-12 items-center justify-between border-b border-[#dce4e8] bg-white px-6">
      <Link href="/student" className="flex items-center gap-2 font-black text-[#171b1e]">
        <Image src="/student-assets/dokdo-logo.svg" alt="독도" width={40} height={34} priority />
        <span>진독도</span>
      </Link>
      <div className="absolute left-1/2 -translate-x-1/2 text-sm">{section ? <strong>{section}</strong> : <><span className="text-[#454c51]">8월 26일 수요일</span><strong className="ml-2">탐험</strong></>}</div>
      <div className="flex items-center gap-3 text-[#078ed5]"><button type="button" aria-label="공지 사항"><Megaphone className="size-6" /></button><button type="button" aria-label="오류신고"><BellRing className="size-6" /></button><button type="button" aria-label="메뉴열기/닫기"><Menu className="size-7" /></button></div>
    </header>
  )
}
