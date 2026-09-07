"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  BookOpen,
  Check,
  Clock3,
  Flag,
  Heart,
  Home,
  LockKeyhole,
  LogOut,
  Play,
  Search,
  X,
} from "lucide-react"

import { StudentHeader } from "@/components/student/student-header"
import { getReadingBookCover } from "@/lib/reading-book-covers"
import { READING_BOOKS, type ReadingBookRecord } from "@/lib/reading-books"
import { COMMON_READING_QUIZ, getBookSummary, getRoundPages, sortStudentReadingBooks } from "@/lib/reading-exploration"
import { getReadingRoundQuiz } from "@/lib/reading-quiz-settings"
import { addTransientReadingExplorationRecord } from "@/lib/student-exploration-history"
import { getCompletedReadingRoundsByBook, getReadingRoundResultsByBook, markReadingRoundCompleted, STUDENT_MOCK_STORAGE_KEYS, type ReadingRoundResult } from "@/lib/student-mock-state"
import { cn } from "@/lib/utils"

const categories = ["전체", "찜한책", "인문", "문학", "사회", "과학/수학", "예체능"] as const
type Category = (typeof categories)[number]
type Stage = "catalog" | "paper-ready" | "paper-reading" | "ebook" | "quiz" | "rating" | "gift" | "complete"

function Cover({ book, className, priority = false }: { book: ReadingBookRecord; className?: string; priority?: boolean }) {
  return (
    <Image
      src={getReadingBookCover(book.id)}
      alt={`${book.title} 표지`}
      fill
      priority={priority}
      unoptimized
      sizes="(max-width: 640px) 42vw, (max-width: 1280px) 22vw, 180px"
      className={cn("object-cover", className)}
    />
  )
}

function BookCard({
  book,
  favorite,
  completed,
  onFavorite,
  onOpen,
}: {
  book: ReadingBookRecord
  favorite: boolean
  completed: boolean
  onFavorite: () => void
  onOpen: () => void
}) {
  return (
    <article className="group relative min-w-0">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full cursor-pointer text-left"
        aria-label={`${book.title} 상세 보기`}
      >
        <div className="relative aspect-[3/4.15] w-full overflow-hidden rounded-[10px] bg-slate-200 shadow-[0_5px_16px_rgba(37,57,72,.18)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_10px_24px_rgba(37,57,72,.24)]">
          <Cover book={book} />
          {completed && (
            <div
              className="absolute bottom-2 right-2 grid size-[78px] rotate-[-8deg] place-items-center bg-white p-[5px] drop-shadow-[0_3px_2px_rgba(74,82,88,.35)]"
              style={{ clipPath: "polygon(50% 0%,61% 9%,75% 5%,82% 18%,95% 23%,92% 38%,100% 50%,91% 62%,95% 77%,81% 82%,75% 95%,61% 91%,50% 100%,39% 91%,25% 95%,18% 82%,5% 77%,9% 62%,0% 50%,9% 38%,5% 23%,19% 18%,25% 5%,39% 9%)" }}
              aria-label="완독"
            >
              <div
                className="grid size-full place-items-center bg-[#ff6676] text-base font-black text-white"
                style={{ clipPath: "inherit" }}
              >
                완독!
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex min-h-11 items-start gap-1.5">
          <span aria-label="전자책" className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[3px] border-2 border-[#159ce4] text-[11px] font-black leading-none text-[#159ce4]">e</span>
          <h3 className="line-clamp-2 text-[15px] font-black leading-[1.45] text-[#252b31]">{book.title}</h3>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#65727a]">
          <span className="rounded-full bg-[#e9edef] px-2.5 py-1">{book.level}레벨</span>
          <span className="rounded-full bg-[#e9edef] px-2.5 py-1">총 {book.rounds}회차</span>
          <span className="rounded-full bg-[#e9edef] px-2.5 py-1">{book.category}</span>
        </div>
      </button>
      <button
        type="button"
        onClick={onFavorite}
        className="absolute right-2 top-2 grid size-10 cursor-pointer place-items-center rounded-full bg-white/90 shadow"
        aria-label={favorite ? `${book.title} 찜 해제` : `${book.title} 찜하기`}
      >
        <Heart className={cn("size-6", favorite ? "fill-[#ff5e94] text-[#ff5e94]" : "text-[#a8afb4]")} />
      </button>
    </article>
  )
}

function BookDetailModal({
  book,
  favorite,
  completedRound,
  roundResults,
  selectedRound,
  onRound,
  onFavorite,
  onClose,
  onPaper,
  onEbook,
}: {
  book: ReadingBookRecord
  favorite: boolean
  completedRound: number
  roundResults: Record<number, ReadingRoundResult>
  selectedRound: number
  onRound: (round: number) => void
  onFavorite: () => void
  onClose: () => void
  onPaper: () => void
  onEbook: () => void
}) {
  const pages = getRoundPages(book, selectedRound)
  const allRoundsCompleted = completedRound >= book.rounds
  const selectedRoundCompleted = selectedRound <= completedRound
  const completedDates = Object.values(roundResults).map((result) => result.completedAt).sort()
  const startedAt = completedDates[0] ?? "2026-09-01"
  const finishedAt = completedDates.at(-1) ?? startedAt
  const replayLabel = book.rounds > 1 ? `${selectedRound}회차 다시 보기` : "다시 보기"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={`${book.title} 도서 정보`}>
      <div className="relative grid max-h-[92vh] w-full max-w-[1180px] overflow-y-auto rounded-[34px] bg-white lg:grid-cols-[1fr_1fr] lg:overflow-visible">
        <button type="button" onClick={onClose} className="absolute -right-3 -top-3 z-20 grid size-14 cursor-pointer place-items-center rounded-full bg-[#078bd3] text-white shadow-lg" aria-label="닫기">
          <X className="size-8" />
        </button>
        <section className="border-b border-dashed border-slate-300 p-7 sm:p-9 lg:border-b-0 lg:border-r">
          <div className="flex gap-5">
            <div className="relative h-[228px] w-[165px] shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-lg">
              <Cover book={book} priority />
              {allRoundsCompleted && (
                <div className="absolute bottom-2 right-2 grid size-16 rotate-[-8deg] place-items-center bg-white p-1 shadow" style={{ clipPath: "polygon(50% 0%,61% 9%,75% 5%,82% 18%,95% 23%,92% 38%,100% 50%,91% 62%,95% 77%,81% 82%,75% 95%,61% 91%,50% 100%,39% 91%,25% 95%,18% 82%,5% 77%,9% 62%,0% 50%,9% 38%,5% 23%,19% 18%,25% 5%,39% 9%)" }}>
                  <span className="grid size-full place-items-center bg-[#ff6676] text-sm font-black text-white" style={{ clipPath: "inherit" }}>완독!</span>
                </div>
              )}
            </div>
            <div className="min-w-0 pt-2">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#0d8bd5] px-3 py-1 text-sm font-black text-white">{book.category}</span>
                <span className="rounded-full bg-[#edf3f7] px-3 py-1 text-sm font-bold text-[#63717b]">{book.tendency}</span>
              </div>
              <h2 className="mt-4 text-2xl font-black leading-tight text-[#23282c] sm:text-3xl">{book.title}</h2>
              <p className="mt-4 text-base text-[#626c72]">펴낸 곳&nbsp; {book.publisher}</p>
              <p className="mt-2 text-base text-[#626c72]">쪽수&nbsp; {pages.totalPages}쪽</p>
              <p className="mt-2 text-base text-[#626c72]">회차&nbsp; {book.rounds}회차</p>
            </div>
          </div>
          <div className="mt-7 border-t border-slate-200 pt-5">
            <strong className="text-sm text-[#69747b]">줄거리</strong>
            <p className="mt-2 max-h-36 overflow-y-auto pr-2 text-[15px] font-medium leading-7 text-[#414a50]">{getBookSummary(book)}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-[#078bd3]">
              <span>#{book.category.replace("/", "")}</span><span>#{book.tendency}</span><span>#{book.type}</span>
            </div>
          </div>
          <button type="button" onClick={onFavorite} className={cn("mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 font-black", favorite ? "border-[#ff5e94] bg-[#ff5e94] text-white" : "border-slate-300 text-slate-600")}>
            <Heart className={cn("size-5", favorite && "fill-current")} /> {favorite ? "찜 해제" : "찜하기"}
          </button>
        </section>
        <section className="flex min-h-[520px] flex-col p-7 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-2xl font-black text-[#24292d]">{allRoundsCompleted ? "다 읽었어요!" : completedRound ? `${completedRound}회차까지 읽었어요` : "아직 안 읽었어요"}</h3>
            {allRoundsCompleted && (
              <div className="flex items-center gap-4 text-xs text-[#777f84]">
                <span>시작한 날 <strong className="ml-1 border-b border-dashed border-[#9aa1a5] pb-1 text-[#3d4448]">{startedAt}</strong></span>
                <span>다 읽은 날 <strong className="ml-1 border-b border-dashed border-[#9aa1a5] pb-1 text-[#3d4448]">{finishedAt}</strong></span>
              </div>
            )}
          </div>
          <div className="mt-7 flex flex-1 flex-wrap content-center justify-center gap-5 rounded-[24px] bg-[#f4f5f5] p-7">
            {Array.from({ length: book.rounds }, (_, index) => index + 1).map((round) => {
              const completed = round <= completedRound
              const available = round <= completedRound + 1
              const result = roundResults[round]
              const completedDate = result?.completedAt ?? finishedAt
              const [, month = "9", day = "1"] = completedDate.split("-").map((value) => String(Number(value)))
              return (
                <button
                  key={round}
                  type="button"
                  disabled={!available}
                  onClick={() => onRound(round)}
                  className={cn(
                    "flex min-h-28 min-w-24 flex-col items-center justify-center rounded-2xl border-2 p-2 text-sm font-black transition",
                    !available && "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
                    available && "cursor-pointer border-transparent bg-transparent text-[#606a70] hover:border-[#0b91d8]",
                    selectedRound === round && available && "border-solid border-[#77c9ef] bg-white text-[#078bd3]",
                  )}
                >
                  {completed ? (
                    <>
                      <span className="flex size-20 flex-col items-center justify-center rounded-full border-[5px] border-double border-[#29b9cb] text-[#29b9cb]">
                        <span className="text-xs font-black">{completedDate.slice(0, 4)}</span>
                        <span className="relative my-0.5 grid size-8 place-items-center rounded border-2 border-current"><BookOpen className="size-6" /><Check className="absolute size-5 stroke-[4]" /></span>
                        <span className="text-xs font-black">{month}.{day}</span>
                      </span>
                      <span className="mt-2 text-base text-[#30363a]"><strong>{result?.correctCount ?? 0}</strong><span className="text-[#8a9094]">/{result?.totalQuestions ?? 6}</span></span>
                    </>
                  ) : (
                    <><span className="grid size-20 place-items-center rounded-full border-2 border-dashed border-[#9da5aa] bg-white">{available ? <BookOpen className="size-9" /> : <LockKeyhole className="size-9" />}</span><span className="mt-2">{round}회차</span></>
                  )}
                </button>
              )
            })}
          </div>
          <p className="mt-5 text-center text-sm font-medium text-[#7c878d]">{allRoundsCompleted ? "원하는 회차를 골라서 다시 볼 수 있어요" : `${selectedRound}회차 · ${pages.start}~${pages.end}쪽을 읽어요`}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={onPaper} className="h-14 cursor-pointer rounded-full border-2 border-[#078bd3] bg-white text-lg font-black text-[#078bd3]">종이책 읽기</button>
            <button type="button" onClick={onEbook} className="h-14 cursor-pointer rounded-full bg-[#078bd3] text-lg font-black text-white">{selectedRoundCompleted ? replayLabel : "전자책 읽기"}</button>
          </div>
        </section>
      </div>
    </div>
  )
}

function ReadingTop({ book, round }: { book: ReadingBookRecord; round: number }) {
  return (
    <div className="bg-gradient-to-r from-[#087fe8] to-[#12a6e8] px-5 py-6 text-white sm:px-12">
      <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4 rounded-2xl bg-white/20 p-3">
          <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded bg-white"><Cover book={book} /></div>
          <div className="min-w-0"><strong className="line-clamp-2 text-base sm:text-xl">{book.title}</strong><span className="mt-2 inline-block rounded-full bg-[#ffe52b] px-3 py-1 text-sm font-black text-[#323232]">{round}회차</span></div>
        </div>
        <div className="hidden items-center gap-5 sm:flex">
          <Image src="/student-assets/kangchi.svg" width={130} height={130} alt="책을 읽는 강치" className="size-32 object-contain" />
          <strong className="text-lg">진독도님, 고른 책을 강치와 함께 읽어 봐요.</strong>
        </div>
      </div>
    </div>
  )
}

function SolvePrompt({ onSolve }: { onSolve: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5">
      <div className="flex flex-col items-center text-center text-white">
        <h2 className="text-[28px] font-black leading-[1.5] sm:text-[34px]">읽기를 완료했어요!<br />이제 문제를 풀어 볼까요?</h2>
        <Image src="/student-assets/kangchi-reading.svg" width={250} height={205} alt="책을 읽는 강치" className="mt-4 h-[205px] w-[250px] object-contain" priority />
        <button type="button" onClick={onSolve} className="-mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#ff5e94] px-9 py-4 text-2xl font-black shadow-xl"><Flag className="size-7" />문제 풀러 가기</button>
      </div>
    </div>
  )
}

export function ReadingExploration() {
  const sortedBooks = useMemo(() => sortStudentReadingBooks(READING_BOOKS), [])
  const [category, setCategory] = useState<Category>("전체")
  const [query, setQuery] = useState("")
  const [favorites, setFavorites] = useState<Set<number>>(() => new Set([729]))
  const [completedRounds, setCompletedRounds] = useState<Record<number, number>>({})
  const [selectedBook, setSelectedBook] = useState<ReadingBookRecord | null>(null)
  const [selectedRound, setSelectedRound] = useState(1)
  const [stage, setStage] = useState<Stage>("catalog")
  const [seconds, setSeconds] = useState(0)
  const [solvePrompt, setSolvePrompt] = useState(false)
  const [ebookConfirm, setEbookConfirm] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([])
  const [rating, setRating] = useState(0)
  const [isReexploration, setIsReexploration] = useState(false)
  const [storageReady, setStorageReady] = useState(false)
  const activeQuiz = useMemo(
    () => selectedBook ? getReadingRoundQuiz(selectedBook.id, selectedRound) : COMMON_READING_QUIZ,
    [selectedBook, selectedRound],
  )

  useEffect(() => {
    setCompletedRounds(getCompletedReadingRoundsByBook())
    try {
      const storedFavorites = window.localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.readingFavorites)
      if (storedFavorites !== null) setFavorites(new Set(JSON.parse(storedFavorites) as number[]))
    } catch {
      window.localStorage.removeItem(STUDENT_MOCK_STORAGE_KEYS.readingFavorites)
    } finally {
      setStorageReady(true)
    }
  }, [])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.readingFavorites, JSON.stringify([...favorites]))
  }, [favorites, storageReady])

  useEffect(() => {
    if (stage !== "paper-reading") return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [stage])

  useEffect(() => {
    if (stage !== "gift") return
    const timer = window.setTimeout(() => setStage("complete"), 2000)
    return () => window.clearTimeout(timer)
  }, [stage])

  const filteredBooks = useMemo(() => sortedBooks.filter((book) => {
    const matchesCategory = category === "전체" || (category === "찜한책" ? favorites.has(book.id) : book.category === category)
    return matchesCategory && book.title.toLocaleLowerCase("ko").includes(query.trim().toLocaleLowerCase("ko"))
  }), [category, favorites, query, sortedBooks])

  const completedBookCount = storageReady ? Object.entries(completedRounds).filter(([id, round]) => {
    const book = READING_BOOKS.find((item) => item.id === Number(id))
    return book && round >= book.rounds
  }).length : 0

  const toggleFavorite = (bookId: number) => setFavorites((current) => {
    const next = new Set(current)
    if (next.has(bookId)) next.delete(bookId)
    else next.add(bookId)
    return next
  })

  const openBook = (book: ReadingBookRecord) => {
    const nextRound = Math.min((completedRounds[book.id] ?? 0) + 1, book.rounds)
    setIsReexploration((completedRounds[book.id] ?? 0) >= nextRound)
    setSelectedBook(book)
    setSelectedRound(nextRound)
  }

  const startStage = (next: "paper-ready" | "ebook") => {
    setStage(next)
    setSeconds(0)
    setRating(0)
    setSolvePrompt(false)
    setEbookConfirm(false)
  }

  const beginQuiz = () => {
    setSolvePrompt(false)
    setEbookConfirm(false)
    setRating(0)
    setQuizIndex(0)
    setQuizAnswers(Array.from({ length: activeQuiz.length }, () => null))
    setStage("quiz")
  }

  const selectQuizOption = (option: number) => {
    setQuizAnswers((current) => {
      const nextAnswers = Array.from({ length: activeQuiz.length }, (_, index) => current[index] ?? null)
      nextAnswers[quizIndex] = option
      return nextAnswers
    })
    if (quizIndex < activeQuiz.length - 1) {
      setQuizIndex((current) => current + 1)
    }
  }

  const submitQuiz = () => {
    if (!selectedBook) return
    if (quizAnswers.some((answer) => answer === null) || quizAnswers.length !== activeQuiz.length) return
    setCompletedRounds((current) => ({ ...current, [selectedBook.id]: Math.max(current[selectedBook.id] ?? 0, selectedRound) }))
    markReadingRoundCompleted(selectedBook.id, selectedRound, {
      correctCount: quizAnswers.filter((answer, index) => answer === activeQuiz[index]?.correctOption).length,
      totalQuestions: activeQuiz.length,
    })
    if (selectedRound >= selectedBook.rounds) {
      addTransientReadingExplorationRecord({
        bookId: selectedBook.id,
        level: selectedBook.level,
        title: selectedBook.title,
        attempt: isReexploration ? "재탐험" : "첫 탐험",
        currentRound: selectedRound,
        totalRounds: selectedBook.rounds,
        correctCount: quizAnswers.filter((answer, index) => answer === activeQuiz[index]?.correctOption).length,
        totalQuestions: activeQuiz.length,
      })
    }
    setStage("gift")
  }

  const returnToCatalog = () => {
    setStage("catalog")
    setSelectedBook(null)
    setSolvePrompt(false)
    setEbookConfirm(false)
  }

  if (selectedBook && stage !== "catalog") {
    const pages = getRoundPages(selectedBook, selectedRound)
    const allRoundsComplete = Math.max(completedRounds[selectedBook.id] ?? 0, stage === "rating" || stage === "gift" || stage === "complete" ? selectedRound : 0) >= selectedBook.rounds
    const correctCount = quizAnswers.filter((answer, index) => answer === activeQuiz[index]?.correctOption).length

    if (stage === "quiz") {
      const question = activeQuiz[quizIndex] ?? activeQuiz[0]
      const answeredCount = quizAnswers.filter((answer) => answer !== null).length
      const selectedOption = quizAnswers[quizIndex] ?? null
      const allAnswered = answeredCount === activeQuiz.length
      const isLastQuestion = quizIndex === activeQuiz.length - 1
      return (
        <main className="min-h-screen bg-[#e8eff3] text-[#171717]">
          <header className="flex h-[50px] items-center justify-between bg-[#50c3b4] px-5 font-black text-[#173d3b]">
            <span>{selectedBook.level}레벨&nbsp; {selectedBook.title}&nbsp; {selectedRound}/{selectedBook.rounds}</span>
            <div className="flex items-center gap-5 text-white">
              <div className="flex h-9 w-[420px] max-w-[48vw] items-center gap-3 rounded-full bg-white px-3 text-sm font-bold text-[#7d8790]">
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-[#e7eef2]"><span className="block h-full rounded-full bg-[#ff5e94] transition-[width]" style={{ width: `${(answeredCount / activeQuiz.length) * 100}%` }} /></span>
                <span>{answeredCount}/{activeQuiz.length}</span>
              </div>
              <BellRing className="size-7" aria-label="알림" />
              <LogOut className="size-7" aria-label="나가기" />
            </div>
          </header>
          <section className="mx-auto px-5 py-16 sm:px-10 sm:py-20">
            <h1 className="mx-auto max-w-[1280px] text-center text-2xl font-black leading-relaxed text-[#0782c9] sm:text-[34px]">{question.question}</h1>
            <div className="mt-12 space-y-5">
              {question.options.map((option, index) => {
                const optionNumber = index + 1
                return <button key={option} type="button" onClick={() => {
                  selectQuizOption(optionNumber)
                }} className={cn("w-full cursor-pointer rounded-[18px] border-[4px] px-6 py-5 text-center text-lg font-medium transition sm:text-[26px]", selectedOption === optionNumber ? "border-[#28577d] bg-[#28577d] text-white" : "border-[#9babbe] bg-white hover:border-[#2d9fe7] hover:bg-[#2d9fe7] hover:text-white")}>{option}</button>
              })}
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button type="button" onClick={() => setQuizIndex((value) => Math.max(0, value - 1))} disabled={quizIndex === 0} aria-label="이전 문항" className="grid size-12 cursor-pointer place-items-center rounded-full border-2 border-[#a5a5a5] bg-white text-[#555] disabled:invisible"><ArrowLeft className="size-7" /></button>
              <span className="min-w-[140px] rounded-full border-2 border-[#aaa] bg-white px-7 py-2 text-center text-2xl font-black"><strong>{quizIndex + 1}</strong><span className="mx-2 text-[#98a2ad]">/</span>{activeQuiz.length}</span>
              <button type="button" onClick={() => setQuizIndex((value) => Math.min(activeQuiz.length - 1, value + 1))} disabled={isLastQuestion || selectedOption === null} aria-label="다음 문항" className="grid size-12 cursor-pointer place-items-center rounded-full border-2 border-[#a5a5a5] bg-white text-[#555] disabled:cursor-not-allowed disabled:opacity-35"><ArrowRight className="size-7" /></button>
            </div>
            {isLastQuestion && allAnswered && <div className="mt-7 text-center"><button type="button" onClick={submitQuiz} className="cursor-pointer rounded-full bg-[#078bd3] px-14 py-3 text-2xl font-black text-white shadow-sm">제출하기</button></div>}
          </section>
        </main>
      )
    }

    if (stage === "gift") {
      const giftQuestion = activeQuiz.at(-1) ?? activeQuiz[0]
      const giftSelectedOption = quizAnswers.at(-1) ?? null
      return (
        <main className="min-h-screen bg-[#e8eff3] text-[#171717]">
          <header className="flex h-[50px] items-center justify-between bg-[#50c3b4] px-5 font-black text-[#173d3b]"><span>{selectedBook.level}레벨&nbsp; {selectedBook.title}&nbsp; {selectedRound}/{selectedBook.rounds}</span><div className="flex items-center gap-5 text-white"><div className="flex h-9 w-[420px] max-w-[48vw] items-center gap-3 rounded-full bg-white px-3 text-sm font-bold text-[#7d8790]"><span className="h-3 flex-1 overflow-hidden rounded-full bg-[#e7eef2]"><span className="block h-full w-full rounded-full bg-[#ff5e94]" /></span><span>{activeQuiz.length}/{activeQuiz.length}</span></div><BellRing className="size-7" /><LogOut className="size-7" /></div></header>
          <section className="mx-auto px-5 py-16 sm:px-10 sm:py-20"><h1 className="mx-auto max-w-[1280px] text-center text-2xl font-black leading-relaxed text-[#0782c9] sm:text-[34px]">{giftQuestion.question}</h1><div className="mt-12 space-y-5">{giftQuestion.options.map((option, index) => <div key={option} className={cn("w-full rounded-[18px] border-[4px] px-6 py-5 text-center text-lg font-medium sm:text-[26px]", giftSelectedOption === index + 1 ? "border-[#28577d] bg-[#28577d] text-white" : "border-[#9babbe] bg-white")}>{option}</div>)}</div><div className="mt-5 flex items-center justify-center gap-3"><span className="grid size-12 place-items-center rounded-full border-2 border-[#a5a5a5] bg-white"><ArrowLeft className="size-7" /></span><span className="min-w-[140px] rounded-full border-2 border-[#aaa] bg-white px-7 py-2 text-center text-2xl font-black">{activeQuiz.length}<span className="mx-2 text-[#98a2ad]">/</span>{activeQuiz.length}</span><span className="grid size-12 place-items-center rounded-full border-2 border-[#a5a5a5] bg-white opacity-35"><ArrowRight className="size-7" /></span></div><div className="mt-7 text-center"><span className="inline-block rounded-full bg-[#078bd3] px-14 py-3 text-2xl font-black text-white">제출하기</span></div></section>
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 text-white">
            <section className="text-center">
              <h1 className="text-[28px] font-black leading-[1.45] sm:text-[34px]">책 읽기 탐험이 끝났어요!<br />강치가 선물을 줄 거예요!</h1>
              <Image src="/student-assets/kangchi-gift.svg" width={250} height={210} alt="선물을 안고 있는 강치" className="mx-auto mt-5 h-[210px] w-[250px] object-contain" priority />
            </section>
          </div>
        </main>
      )
    }

    if (stage === "rating") {
      return (
        <main className="grid min-h-screen place-items-center bg-[#292929] p-4">
          <section className="w-full max-w-[560px] overflow-hidden rounded-[22px] bg-white text-center shadow-2xl">
            <div className="h-12 border-b border-dashed border-slate-300" />
            <div className="px-8 pb-8 pt-5">
              <h1 className="text-3xl font-black text-[#171717]">이 책은 어땠나요?</h1>
              <p className="mt-5 text-base font-medium text-[#292929]">{selectedBook.title}</p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { value: 1, emoji: "🤔", label: "별로예요" },
                  { value: 3, emoji: "🙂", label: "보통이에요" },
                  { value: 5, emoji: "😍", label: "좋아요" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRating(item.value)}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-2 border-0 outline-none transition focus:outline-none",
                      rating !== item.value && "opacity-25",
                    )}
                    aria-label={item.label}
                  >
                    <span className="text-[68px] leading-none" aria-hidden="true">{item.emoji}</span>
                    <span className="text-base font-medium text-[#171717]">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="button" disabled={!rating} onClick={() => setStage("gift")} className="h-16 w-full cursor-pointer bg-[#ffe477] text-xl font-black text-[#171717] transition disabled:cursor-not-allowed disabled:bg-[#fff0b4] disabled:text-[#999]">확인</button>
          </section>
        </main>
      )
    }

    if (stage === "complete") {
      return (
        <main className="grid min-h-screen place-items-center bg-[#25292c] p-4">
          <section className="w-full max-w-[700px] overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="border-b border-dashed border-slate-300 p-6 text-center"><h1 className="text-3xl font-black text-[#394148]">탐험 완료</h1></div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 text-center text-xl"><div className="rounded-xl border p-3">{selectedBook.level}레벨</div><div className="rounded-xl border p-3">{isReexploration ? "재탐험" : "첫 탐험"}</div></div>
              <div className="mt-3 flex items-center justify-center gap-3 rounded-xl border p-4 text-center text-xl font-black"><span>{selectedBook.title}</span><span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-base font-medium text-slate-500">{selectedRound} / {selectedBook.rounds}</span></div>
              <div className="mt-5 overflow-hidden rounded-xl border">
                <div className="grid grid-cols-6 bg-slate-50">{activeQuiz.map((_, index) => <span key={index} className="border-r p-2 text-center font-bold">{index + 1}</span>)}</div>
                <div className="grid grid-cols-6">{activeQuiz.map((question, index) => {
                  const isCorrect = quizAnswers[index] === question.correctOption
                  return <span key={index} className={cn("border-r p-3 text-center text-2xl font-black", isCorrect ? "text-[#458df5]" : "text-[#ff5e94]")}>{isCorrect ? "O" : "×"}</span>
                })}</div>
              </div>
              <div className="mt-5 text-center"><span className="rounded-full bg-[#073c68] px-6 py-2 text-xl font-black text-white">⭐ +{Math.max(1, correctCount)}</span><p className="mt-4 font-black text-[#078bd3]">{allRoundsComplete ? "책 한 권을 끝까지 해냈어요!" : `${selectedRound}회차를 완료했어요!`}</p></div>
            </div>
            <div className={cn("grid bg-[#ffd51f]", allRoundsComplete && selectedBook.activeOnlineCount > 0 ? "grid-cols-3" : "grid-cols-2")}>
              <button type="button" onClick={() => {
                setIsReexploration(true)
                beginQuiz()
              }} className="h-20 cursor-pointer border-r border-[#e9bd13] text-lg font-black">만점 도전하기</button>
              {allRoundsComplete && selectedBook.activeOnlineCount > 0 && <Link href={`/student/online-workbook/reading-${selectedBook.id}-round-${selectedRound}`} className="grid h-20 place-items-center border-r border-[#e9bd13] text-lg font-black">온라인 워크북</Link>}
              <button type="button" onClick={() => {
                if (selectedRound < selectedBook.rounds) {
                  setSelectedRound(selectedRound + 1)
                  setStage("catalog")
                } else returnToCatalog()
              }} className="h-20 cursor-pointer text-lg font-black">{selectedRound < selectedBook.rounds ? "다음 회차" : "탐험 끝내기"}</button>
            </div>
          </section>
        </main>
      )
    }

    if (stage === "ebook") {
      return (
        <main className="min-h-screen bg-[#242424] text-white">
          <header className="flex h-12 items-center justify-between bg-white px-4 text-[#383838]"><button type="button" onClick={() => setStage("catalog")} className="inline-flex cursor-pointer items-center gap-2 font-bold"><ArrowLeft className="size-4" />끝까지 읽어 주세요</button><span className="font-bold">{pages.start}~{pages.end} / {pages.totalPages}쪽</span><button type="button" onClick={() => setEbookConfirm(true)} className="cursor-pointer rounded-full bg-[#078bd3] px-5 py-2 font-black text-white">다 읽었어요</button></header>
          <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1180px] items-center justify-center gap-1 p-6">
            <div className="relative h-[75vh] w-[45%] bg-white shadow-2xl"><div className="absolute inset-0 grid place-items-center p-10 text-center text-[#333]"><div><BookOpen className="mx-auto size-20 text-[#078bd3]" /><h2 className="mt-6 text-2xl font-black">{selectedBook.title}</h2><p className="mt-3 text-slate-500">{selectedRound}회차 전자책 미리보기</p></div></div></div>
            <div className="relative h-[75vh] w-[45%] overflow-hidden bg-white shadow-2xl"><Cover book={selectedBook} /></div>
          </div>
          {ebookConfirm && <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-5"><div role="dialog" aria-modal="true" aria-label="읽기 완료 확인" className="w-full max-w-[700px] overflow-hidden rounded-[30px] bg-white text-center text-[#222] shadow-2xl"><div className="flex h-16 items-center justify-end border-b border-dashed border-slate-300 px-6"><button type="button" onClick={() => setEbookConfirm(false)} className="grid size-10 cursor-pointer place-items-center text-[#555]" aria-label="닫기"><X className="size-8" /></button></div><div className="flex min-h-[325px] flex-col items-center justify-center px-8 py-7"><Image src="/student-assets/kangchi.svg" width={190} height={145} alt="웃고 있는 강치" className="h-[145px] w-[190px] object-contain" priority /><h2 className="mt-7 text-[30px] font-medium">정말로 끝까지 다 읽었나요?</h2></div><div className="grid grid-cols-2 bg-[#ffd51f] text-[24px] font-black"><button type="button" onClick={() => setEbookConfirm(false)} className="h-20 cursor-pointer border-r border-[#e8bd16]">더 읽을게요</button><button type="button" onClick={() => { setEbookConfirm(false); setSolvePrompt(true) }} className="h-20 cursor-pointer">다 읽었어요!</button></div></div></div>}
          {solvePrompt && <SolvePrompt onSolve={beginQuiz} />}
        </main>
      )
    }

    return (
      <main className="min-h-screen bg-white">
        <StudentHeader section="책 읽기 탐험" />
        <ReadingTop book={selectedBook} round={selectedRound} />
        <section className="mx-auto max-w-[1480px] px-5 py-12">
          <div className="rounded-[30px] bg-[#e8eef1] p-7 sm:p-10">
            {stage === "paper-ready" ? <h1 className="py-10 text-center text-3xl font-black sm:text-4xl">{pages.start}~{pages.end} 페이지를 펴 주세요!</h1> : <div className="py-2"><div className="mb-2 flex items-end justify-between"><div><span className="rounded-full border-2 border-[#333] bg-white px-4 py-1 font-black">강치는 여기 읽는 중!</span><Image src="/student-assets/kangchi.svg" width={95} height={80} alt="책 읽는 강치" className="mt-2 h-20 w-24 object-contain" /></div><span className="flex items-center gap-1 font-black text-[#ff5e94]"><Clock3 className="size-5" />{Math.floor(seconds / 60)}분 {seconds % 60}초</span></div><div className="h-5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#50c3b4]" style={{ width: `${Math.max(8, Math.round((selectedRound / selectedBook.rounds) * 100))}%` }} /></div><div className="mt-3 font-black text-[#43bcae]"><BookOpen className="mr-1 inline size-5" />{pages.start} / {pages.end}쪽</div></div>}
          </div>
          <div className="mt-8 flex items-center justify-between"><button type="button" onClick={() => setStage("catalog")} className="inline-flex h-14 cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-7 text-lg font-black text-slate-600"><ArrowLeft />이전 화면</button>{stage === "paper-ready" ? <button type="button" onClick={() => setStage("paper-reading")} className="inline-flex h-14 cursor-pointer items-center gap-2 rounded-full bg-[#50c3b4] px-8 text-xl font-black text-white"><Play />읽기 시작</button> : <button type="button" onClick={() => setSolvePrompt(true)} className="inline-flex h-14 cursor-pointer items-center gap-2 rounded-full bg-[#ff5e94] px-8 text-xl font-black text-white"><BookOpen />다 읽었어요!</button>}</div>
        </section>
        {solvePrompt && <SolvePrompt onSolve={beginQuiz} />}
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#edf4f7]">
      <StudentHeader section="책 읽기 탐험" />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-[#72d8fb] via-[#a8e9fb] to-[#37cde5] px-5 pt-8 text-[#172a36] sm:pt-10">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://app.dokdo.app/assets/hero_bg_sea_layer-Dv0xPHa4.webp')", backgroundPosition: "center bottom" }} />
            <div className="absolute left-[5%] top-[14%] h-8 w-28 rounded-[999px] bg-white/35 blur-[1px] sm:w-40" />
            <div className="absolute left-[46%] top-[23%] hidden h-10 w-36 rounded-[999px] bg-white/30 blur-[1px] sm:block" />
            <div className="absolute bottom-[4.5rem] right-[2%] hidden h-[60%] w-[34%] bg-contain bg-bottom bg-right bg-no-repeat md:block" style={{ backgroundImage: "url('https://app.dokdo.app/assets/hero_dokdo_layer_rock-CO_L7eaF.webp')" }} />
            <div className="absolute bottom-9 right-[25%] hidden h-[140px] w-[180px] lg:block">
              <div className="reading-kangchi-bob absolute -top-4 left-1/2 z-10 h-[140px] w-[190px] -translate-x-1/2 bg-top bg-no-repeat [background-size:190px_auto]" style={{ backgroundImage: "url('https://app.dokdo.app/assets/kc_swim_read_main-D8dV3Pv9.svg')" }} />
              <div className="absolute bottom-0 left-1/2 z-20 h-[35px] w-[170px] -translate-x-1/2 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: "url(\"data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxNzAnIGhlaWdodD0nMzUnIHZpZXdCb3g9JzAgMCAxNzAgMzUnIGZpbGw9J25vbmUnPjxwYXRoIGQ9J00xNjQuNzIxIDBINC44MTIwNkMyLjE1NDQxIDAgMCAyLjE1NDQ5IDAgNC44MTIxM0MwIDcuNDY5NzggMi4xNTQ0MSA5LjYyNDIgNC44MTIwNiA5LjYyNDJIMTkuNDg2NUMxNy40OTg4IDEwLjIxNTggMTYuMDQ4NCAxMi4wNTQ3IDE2LjA0ODQgMTQuMjM0NkMxNi4wNDg0IDE2Ljg5MjIgMTguMjAyOSAxOS4wNDY2IDIwLjg2MDUgMTkuMDQ2NkgxNDguNjczQzE1MS4zMyAxOS4wNDY2IDE1My40ODUgMTYuODkyMiAxNTMuNDg1IDE0LjIzNDZDMTUzLjQ4NSAxMi4wNTQ3IDE1Mi4wMzQgMTAuMjE1OCAxNTAuMDQ3IDkuNjI0MkgxNjQuNzIxQzE2Ny4zNzkgOS42MjQyIDE2OS41MzMgNy40Njk3OCAxNjkuNTMzIDQuODEyMTNDMTY5LjUzMyAyLjE1NDQ5IDE2Ny4zNzkgMCAxNjQuNzIxIDBaJyBmaWxsPScjMDA5Q0Q1Jy8+PHBhdGggZD0nTTEyMy43NDEgMjQuNzFINDUuNzkyM0M0My4xMzQ2IDI0LjcxIDQwLjk4MDIgMjYuODY0NCA0MC45ODAyIDI5LjUyMkM0MC45ODAyIDMyLjE3OTcgNDMuMTM0NiAzNC4zMzQxIDQ1Ljc5MjMgMzQuMzM0MUgxMjMuNzQxQzEyNi4zOTkgMzQuMzM0MSAxMjguNTUzIDMyLjE3OTcgMTI4LjU1MyAyOS41MjJDMTI4LjU1MyAyNi44NjQ0IDEyNi4zOTkgMjQuNzEgMTIzLjc0MSAyNC43MVonIGZpbGw9JyMwMDlDRDUnLz48L3N2Zz4=\")" }} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-sky-200/5" />
          </div>
          <div className="relative z-10 mx-auto flex min-h-[178px] max-w-[1180px] items-start gap-7 pb-12 sm:items-center sm:pb-10">
            <div className="hidden w-28 shrink-0 flex-col items-center sm:flex">
              <div role="img" aria-label="골목대장 성향 배지" className="h-24 w-24 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: "url('https://app.dokdo.app/assets/per1-CCzhGoSl.png')" }} />
              <strong className="-mt-1 rounded-full border-2 border-white bg-[#252525] px-5 py-1 text-sm text-white shadow">골목대장</strong>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black sm:text-3xl">진독도님 반가워요!</h1>
              <p className="mt-1.5 text-sm font-medium sm:text-base">아직 탐험이 끝나지 않은 책이 있어요. 강치와 함께 남은 탐험을 하러 떠나요.</p>
              <div className="mt-4 flex max-w-[402px] items-center gap-3 rounded-2xl bg-white/95 px-4 py-2.5 shadow-sm">
                <span className="inline-flex shrink-0 items-center gap-1.5 font-black"><BookOpen className="size-5 text-[#168ed0]" />전체레벨</span>
                <div className="h-3 min-w-16 flex-1 overflow-hidden rounded-full bg-[#cfe9f8]"><div className="h-full rounded-full bg-[#078bd3] transition-[width]" style={{ width: `${(completedBookCount / 293) * 100}%` }} /></div>
                <strong className="shrink-0 text-lg text-[#168ed0]"><span className="text-[#075f9e]">{completedBookCount}권</span>/293권</strong>
              </div>
            </div>
          </div>
          <div className="relative z-10 mx-auto flex max-w-[1180px] items-end gap-2">
            <button type="button" className="h-12 min-w-32 rounded-t-2xl bg-white px-8 font-black text-[#25323a]">둘러보기</button>
            <button type="button" disabled aria-disabled="true" className="h-12 min-w-32 cursor-not-allowed rounded-t-2xl bg-[#087ec4] px-8 font-black text-white/65">내 책장</button>
          </div>
        </section>
        <section className="mx-auto max-w-[1260px] px-5 py-10 sm:px-8">
          <div>
            <h2 className="text-2xl font-black text-[#25313a]">전체레벨 <span className="text-[#078bd3]">293권</span> 중 <span className="text-[#078bd3]">{completedBookCount}권</span>을 읽었어요</h2>
            <p className="mt-1 text-sm text-[#6e7c85]">관심 가는 책부터 골라 읽어보세요</p>
          </div>
          <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn("cursor-pointer rounded-full border px-5 py-2.5 text-sm font-black transition", category === item ? "border-[#078bd3] bg-[#078bd3] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#078bd3]")}>{item}</button>)}
            </div>
            <label className="flex h-12 w-full shrink-0 items-center gap-3 rounded-full bg-white px-5 shadow-sm lg:max-w-md"><Search className="size-5 text-[#078bd3]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="책 제목 검색" className="min-w-0 flex-1 bg-transparent text-base outline-none" /></label>
          </div>
          <p className="mt-6 text-sm font-bold text-[#71808a]">검색 결과 {filteredBooks.length}권</p>
          {filteredBooks.length ? <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{filteredBooks.map((book) => <BookCard key={book.id} book={book} favorite={favorites.has(book.id)} completed={storageReady && (completedRounds[book.id] ?? 0) >= book.rounds} onFavorite={() => toggleFavorite(book.id)} onOpen={() => openBook(book)} />)}</div> : <div className="mt-8 rounded-[28px] bg-white py-24 text-center"><Search className="mx-auto size-12 text-slate-300" /><p className="mt-4 font-bold text-slate-500">조건에 맞는 책이 없어요.</p></div>}
        </section>
      </main>
      <Link href="/student" className="fixed bottom-6 left-6 z-30 grid size-12 place-items-center rounded-full bg-white text-[#078bd3] shadow-xl" aria-label="학생 홈"><Home /></Link>
      {selectedBook && <BookDetailModal book={selectedBook} favorite={favorites.has(selectedBook.id)} completedRound={completedRounds[selectedBook.id] ?? 0} roundResults={getReadingRoundResultsByBook()[selectedBook.id] ?? {}} selectedRound={selectedRound} onRound={setSelectedRound} onFavorite={() => toggleFavorite(selectedBook.id)} onClose={() => setSelectedBook(null)} onPaper={() => startStage("paper-ready")} onEbook={() => startStage("ebook")} />}
    </div>
  )
}
