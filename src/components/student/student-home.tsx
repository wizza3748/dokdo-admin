"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { BookOpen, ClipboardList, PenLine, RotateCcw, Shirt, Telescope } from "lucide-react"

import { StudentHeader } from "@/components/student/student-header"
import { getCompletedReadingRoundCount, resetStudentMockState, subscribeCompletedReadingRoundCount } from "@/lib/student-mock-state"

const shortcuts = [
  { label: "강치 옷장", icon: Shirt },
  { label: "탐험 기록", icon: Telescope, href: "/student/exploration-record", active: true },
  { label: "탐험 보고서", icon: ClipboardList },
]

type TreasureState = "locked" | "ready" | "open"

const treasurePosition: Record<TreasureState, string> = {
  locked: "left center",
  ready: "center center",
  open: "right center",
}

function TreasureGift({ state = "locked" }: { state?: TreasureState }) {
  const stateLabel = state === "locked" ? "잠긴 보물 상자" : state === "ready" ? "열 수 있는 보물 상자" : "열린 보물 상자"

  return (
    <div
      role="img"
      aria-label={stateLabel}
      className="absolute bottom-[18%] right-[23%] hidden h-[180px] w-[240px] lg:block"
      style={{
        backgroundImage: "url('/student-assets/new-gifts.svg')",
        backgroundPosition: treasurePosition[state],
        backgroundRepeat: "no-repeat",
        backgroundSize: "300% 100%",
      }}
    />
  )
}

function MissionButton({ type, count }: { type: "reading" | "writing"; count: number }) {
  const reading = type === "reading"
  const Icon = reading ? BookOpen : PenLine

  const content = (
    <>
      <Icon className={`size-14 stroke-[1.7] sm:size-16 ${reading ? "text-[#9b8cff]" : "text-[#74d9c5]"}`} />
      <strong className="text-xl font-black text-[#252525] sm:text-2xl">
        {reading ? "책 읽기" : "글쓰기"}
      </strong>
      <span className={`absolute -bottom-5 inline-flex h-11 min-w-16 items-center justify-center rounded-full px-5 text-center text-lg font-black leading-none text-white shadow ${count > 0 ? "bg-[#16b790]" : "bg-[#6c747a]"}`}>
        {count}
      </span>
    </>
  )

  const className = "group relative flex h-36 w-32 flex-col items-center justify-center gap-3 rounded-[24px] bg-white shadow-[0_12px_32px_rgba(28,78,105,0.18)] transition hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(28,78,105,0.24)] sm:h-44 sm:w-44 lg:h-[176px] lg:w-[176px]"
  if (reading) return <Link href="/reading/index" aria-label={`책 읽기 ${count}`} className={className}>{content}</Link>
  return <button type="button" aria-label={`글쓰기 ${count}`} className={className}>{content}</button>
}

export function StudentHome() {
  const [readingCount, setReadingCount] = useState(0)

  useEffect(() => {
    const syncReadingCount = () => setReadingCount(getCompletedReadingRoundCount())
    syncReadingCount()
    return subscribeCompletedReadingRoundCount(syncReadingCount)
  }, [])

  const resetMockState = async () => {
    await resetStudentMockState()
    window.location.reload()
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#87def4]">
      <StudentHeader />

      <main className="relative isolate min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#bdeeff]">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-top bg-no-repeat"
          style={{
            backgroundImage: "url('/student-assets/bg-sky-day.webp')",
            backgroundSize: "auto 50%",
          }}
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-[#82def4]" />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 -z-10 h-1/2 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(110% 22% at 12% 7%, transparent 58%, rgba(255,255,255,.3) 60%, transparent 63%), radial-gradient(85% 18% at 82% 25%, transparent 58%, rgba(255,255,255,.22) 60%, transparent 63%), linear-gradient(175deg, transparent 0 20%, rgba(255,255,255,.12) 21% 26%, transparent 27% 48%, rgba(255,255,255,.13) 49% 54%, transparent 55%)",
          }}
        />

        <aside className="absolute left-4 top-5 z-20 flex items-center gap-2 sm:left-8 sm:top-6">
          <div className="flex h-11 min-w-28 items-center justify-between rounded-full bg-white px-4 text-lg font-black text-[#252525] shadow-sm">
            <span aria-hidden="true">🌻</span>
            <span>62</span>
          </div>
          <button type="button" className="hidden rounded-full bg-[#ff8b2d] px-6 py-3 font-black text-[#34302b] shadow-sm transition hover:brightness-105 sm:block">
            끊어 읽기
          </button>
          <button type="button" className="hidden rounded-full bg-[#ffd41f] px-6 py-3 font-black text-[#34302b] shadow-sm transition hover:brightness-105 sm:block">
            독서능력 종합검사
          </button>
        </aside>

        <aside className="absolute right-0 top-5 z-20 flex flex-col items-end sm:top-7">
          <Image
            src="/student-assets/event-logo.webp"
            width={250}
            height={103}
            alt="강치 자랑 대회"
            priority
            className="h-auto w-40 object-contain sm:w-[220px] lg:w-[250px]"
          />
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-lg bg-white px-3 py-2 text-center text-xs leading-5 text-[#444] shadow-sm sm:text-sm">
              4일 11시간<br />남았어요!
            </span>
            <Image src="/student-assets/gull-letter.svg" width={120} height={68} alt="영상 편지를 물고 있는 갈매기" className="h-auto w-20 sm:w-[120px]" />
          </div>
        </aside>

        <section className="absolute left-1/2 top-[43%] z-10 flex w-full max-w-[1260px] -translate-x-1/2 items-center justify-between px-5 sm:px-12 lg:px-20">
          <MissionButton type="reading" count={readingCount} />

          <div className="relative flex flex-col items-center">
            <div className="absolute -top-24 left-1/2 w-64 -translate-x-1/2 rounded-xl bg-white px-5 py-3 text-sm font-medium leading-6 text-[#303030] shadow-sm sm:-top-28 sm:w-80">
              진독도님 반가워요~ 강치와 함께 독도 탐험을 시작해 보세요!
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 border-x-[12px] border-t-[14px] border-x-transparent border-t-white" />
            </div>
            <div className="relative grid size-48 place-items-center sm:size-64 lg:size-72">
              <div className="absolute bottom-0 h-[30%] w-[128%] rounded-[50%] bg-black/10 blur-[1px]" />
              <div className="absolute bottom-[-17%] h-[45%] w-[155%] rounded-[50%] bg-[#d4d4d4]" />
              <div className="absolute bottom-[-12%] h-[45%] w-[155%] rounded-[50%] bg-white shadow-[0_10px_10px_rgba(0,0,0,.1)]" />
              <Image src="/student-assets/kangchi.svg" width={300} height={300} alt="강치 진순이" priority className="relative z-10 size-full object-contain" />
            </div>
            <strong className="relative z-20 -mt-2 rounded-lg bg-[#616161] px-5 py-2 text-sm text-white shadow">진순이</strong>
          </div>

          <MissionButton type="writing" count={0} />
        </section>

        <Image
          src="/student-assets/submarine.svg"
          width={280}
          height={140}
          alt=""
          aria-hidden="true"
          className="absolute bottom-[18%] left-[21%] hidden h-[140px] w-[280px] lg:block"
        />
        <TreasureGift state="locked" />

        <button type="button" onClick={resetMockState} className="fixed bottom-6 right-7 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-white/70 bg-white/95 px-5 text-sm font-black text-[#4c5a62] shadow-[0_6px_20px_rgba(20,82,110,.2)] transition hover:bg-white" aria-label="학생 목데이터 초기화">
          <RotateCcw className="size-4" />초기화
        </button>

        <nav aria-label="학생 바로가기" className="fixed bottom-0 left-1/2 z-30 flex -translate-x-1/2 overflow-hidden rounded-t-2xl bg-[#0788d0] text-white shadow-[0_-8px_28px_rgba(0,93,148,.24)]">
          {shortcuts.map(({ label, icon: Icon, href, active }) => {
            const classes = `flex w-28 flex-col items-center gap-1 px-3 py-3 text-xs font-bold transition hover:bg-[#006eb6] sm:w-32 sm:px-5 sm:py-4 ${active ? "bg-[#0677be]" : ""}`
            const content = <><Icon className="size-7" /><span>{label}</span></>

            return href ? <Link key={label} href={href} className={classes}>{content}</Link> : <button key={label} type="button" className={classes}>{content}</button>
          })}
        </nav>
      </main>
    </div>
  )
}
