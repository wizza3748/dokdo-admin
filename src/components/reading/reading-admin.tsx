"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Expand,
  FileDown,
  FilePenLine,
  FileText,
  FileUp,
  Grid2X2,
  ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import {
  getReadingBook,
  READING_BOOK_PAGE_SIZE,
  READING_BOOKS,
  type ReadingBookRecord,
} from "@/lib/reading-books"
import { getReadingBookCover } from "@/lib/reading-book-covers"
import { getReadingBookDetailData, type ReadingBookRoundDetail } from "@/lib/reading-book-details"
import { getWorkbookRoundSetting } from "@/lib/workbook-round-settings"
import {
  COMMON_READING_QUIZ,
  READING_QUESTION_AREAS,
  type ReadingQuizQuestion,
} from "@/lib/reading-exploration"
import { getReadingRoundQuiz, resetReadingRoundQuiz, saveReadingRoundQuiz } from "@/lib/reading-quiz-settings"

const controlClass = "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
const primaryButton = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0877ea] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0567cf]"
const secondaryButton = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-9 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600">{children}</button>
}

function Pager({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index)
  return <div className="flex items-center gap-1 text-sm">
    <button type="button" className="cursor-pointer p-2 text-slate-400 hover:text-blue-600" onClick={() => onChange(1)} aria-label="첫 페이지"><ChevronsLeft className="size-4" /></button>
    <button type="button" className="cursor-pointer p-2 text-slate-400 hover:text-blue-600" onClick={() => onChange(Math.max(1, page - 1))} aria-label="이전 페이지"><ChevronLeft className="size-4" /></button>
    {pages.map((item) => <button type="button" key={item} onClick={() => onChange(item)} className={`size-8 cursor-pointer rounded-md font-bold ${page === item ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50"}`}>{item}</button>)}
    <button type="button" className="cursor-pointer p-2 text-slate-400 hover:text-blue-600" onClick={() => onChange(Math.min(pageCount, page + 1))} aria-label="다음 페이지"><ChevronRight className="size-4" /></button>
    <button type="button" className="cursor-pointer p-2 text-slate-400 hover:text-blue-600" onClick={() => onChange(pageCount)} aria-label="마지막 페이지"><ChevronsRight className="size-4" /></button>
  </div>
}

function WorkbookIcons({ book, online = false }: { book: ReadingBookRecord; online?: boolean }) {
  const count = online ? book.onlineWorkbookCount : book.workbookCount
  const activeCount = online ? book.activeOnlineCount : book.workbookCount
  if (!count) return <span className="text-slate-300">-</span>
  return <div className="flex max-w-[92px] flex-wrap justify-center gap-1">
    {Array.from({ length: count }, (_, index) => {
      const active = online ? index >= count - activeCount : index < activeCount
      const icon = online ? <BookOpen className="size-[17px]" /> : <FilePenLine className="size-[17px]" />
      if (online && active) return <Link key={index} title="온라인 워크북 설정" aria-label={`${book.title} 온라인 워크북 설정`} href={`/admin/exploration/reading/${book.id}/workbook/${getWorkbookRoundSetting(book.id).settingId}`} className="cursor-pointer text-blue-600 transition hover:scale-110 hover:text-blue-700">{icon}</Link>
      return <span key={index} title={active ? "워크북" : "미설정"} className={active ? "text-slate-700" : "text-slate-300"}>{icon}</span>
    })}
  </div>
}

export function ReadingBookList() {
  const [filtersOpen, setFiltersOpen] = React.useState(true)
  const [keyword, setKeyword] = React.useState("")
  const [level, setLevel] = React.useState("")
  const [publisher, setPublisher] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [group, setGroup] = React.useState("")
  const [tendency, setTendency] = React.useState("")
  const [type, setType] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [toast, setToast] = React.useState("")

  const filtered = React.useMemo(() => READING_BOOKS.filter((book) => {
    const term = keyword.trim().toLowerCase()
    return (!term || `${book.title} ${book.publisher}`.toLowerCase().includes(term))
      && (!level || book.level === Number(level))
      && (!publisher || book.publisher === publisher)
      && (!category || book.category === category)
      && (!group || book.groups.includes(group))
      && (!tendency || book.tendency === tendency)
      && (!type || book.type === type)
  }), [category, group, keyword, level, publisher, tendency, type])
  const pageCount = Math.max(1, Math.ceil(filtered.length / READING_BOOK_PAGE_SIZE))
  const rows = filtered.slice((page - 1) * READING_BOOK_PAGE_SIZE, page * READING_BOOK_PAGE_SIZE)
  const publishers = React.useMemo(() => [...new Set(READING_BOOKS.map((book) => book.publisher))].sort(), [])
  const categories = React.useMemo(() => [...new Set(READING_BOOKS.map((book) => book.category))].sort(), [])
  const tendencies = React.useMemo(() => [...new Set(READING_BOOKS.map((book) => book.tendency))].sort(), [])
  const types = React.useMemo(() => [...new Set(READING_BOOKS.map((book) => book.type))].sort(), [])
  const groups = React.useMemo(() => [...new Set(READING_BOOKS.flatMap((book) => book.groups))].sort((a, b) => Number(a) - Number(b)), [])

  const reset = () => {
    setKeyword(""); setLevel(""); setPublisher(""); setCategory(""); setGroup(""); setTendency(""); setType(""); setPage(1)
  }
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 1800) }

  return <div className="space-y-3 text-slate-700">
    <section className="rounded-xl bg-white p-5 shadow-sm">
      {filtersOpen && <div className="grid grid-cols-[80px_minmax(180px,1fr)_80px_minmax(180px,1fr)] items-center gap-x-3 gap-y-3 2xl:grid-cols-[80px_minmax(160px,1fr)_80px_minmax(160px,1fr)_80px_minmax(160px,1fr)]">
        <label className="text-right text-sm font-bold">책그룹</label><select value={group} onChange={(event) => setGroup(event.target.value)} className={`${controlClass} cursor-pointer`}><option value="">책그룹 선택</option>{groups.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="text-right text-sm font-bold">레벨</label><select value={level} onChange={(event) => setLevel(event.target.value)} className={`${controlClass} cursor-pointer`}><option value="">레벨 선택</option>{[1,2,3,4,5,6].map((item) => <option key={item} value={item}>{item}레벨</option>)}</select>
        <label className="text-right text-sm font-bold">성향</label><select value={tendency} onChange={(event) => setTendency(event.target.value)} className={`${controlClass} cursor-pointer`}><option value="">성향 선택</option>{tendencies.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="text-right text-sm font-bold">유형</label><select value={type} onChange={(event) => setType(event.target.value)} className={`${controlClass} cursor-pointer`}><option value="">유형 선택</option>{types.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="text-right text-sm font-bold">카테고리</label><select value={category} onChange={(event) => setCategory(event.target.value)} className={`${controlClass} cursor-pointer`}><option value="">카테고리 선택</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="text-right text-sm font-bold">출판사</label><select value={publisher} onChange={(event) => setPublisher(event.target.value)} className={`${controlClass} cursor-pointer`}><option value="">출판사 선택</option>{publishers.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="text-right text-sm font-bold">검색</label><input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setPage(1)} className={controlClass} placeholder="제목, 출판사" />
        <label className="text-right text-sm font-bold">책종류</label><div className="flex h-10 min-w-max items-center whitespace-nowrap"><span className="rounded-l-md border border-blue-600 bg-white px-4 py-2 text-sm text-slate-500">전체</span><span className="border-y border-blue-600 px-4 py-2 text-sm text-slate-500">종이책</span><span className="border border-blue-600 px-4 py-2 text-sm text-slate-500">전자책</span><span className="rounded-r-md bg-blue-600 px-4 py-2 text-sm font-bold text-white">종이책+전자책</span></div>
        <label className="text-right text-sm font-bold">상태</label><div className="flex h-10 min-w-max items-center whitespace-nowrap"><span className="rounded-l-md border border-blue-600 px-4 py-2 text-sm text-slate-500">전체</span><span className="border-y border-blue-600 px-4 py-2 text-sm text-slate-500">작성중</span><span className="border border-blue-600 px-4 py-2 text-sm text-slate-500">검수요청</span><span className="rounded-r-md bg-blue-600 px-4 py-2 text-sm font-bold text-white">검수완료</span></div>
      </div>}
      <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={reset} className={secondaryButton}>초기화</button><button type="button" onClick={() => setPage(1)} className={primaryButton}><Search className="size-4" />검색</button><button type="button" onClick={() => setFiltersOpen((open) => !open)} className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-blue-600">{filtersOpen ? "접기" : "펼치기"}<ChevronDown className={`size-4 transition ${filtersOpen ? "rotate-180" : ""}`} /></button></div>
    </section>

    <section className="rounded-xl bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between"><h1 className="text-lg font-extrabold">책 읽기 목록</h1><div className="flex items-center gap-2"><button type="button" onClick={() => notify("엑셀 파일을 준비했습니다.")} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#52c41a] px-4 text-sm font-bold text-white hover:bg-[#47ad16]"><Download className="size-4" />엑셀다운로드</button><button type="button" onClick={() => notify("책 읽기 등록 화면은 프로토타입에서 결과만 표시합니다.")} className={primaryButton}><Plus className="size-4" />책 읽기 등록</button><IconButton label="검색"><Search className="size-4" /></IconButton><IconButton label="새로고침"><RefreshCw className="size-4" /></IconButton><IconButton label="전체 화면"><Expand className="size-4" /></IconButton><IconButton label="컬럼 설정"><Grid2X2 className="size-4" /></IconButton></div></div>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[1540px] table-fixed text-center text-xs">
          <thead className="h-12 bg-slate-50 text-slate-600"><tr><th className="w-20">고유번호</th><th className="w-[140px]">책그룹</th><th className="w-[230px]">제목</th><th className="w-[110px]">출판사</th><th className="w-16">레벨</th><th className="w-20">책 회차</th><th className="w-24">카테고리</th><th className="w-24">성향</th><th className="w-20">유형</th><th className="w-20">책종류</th><th className="w-16">이북</th><th className="w-24">워크북</th><th className="w-28">온라인 워크북</th><th className="w-24">상태</th><th className="w-20">관리</th></tr></thead>
          <tbody>{rows.map((book) => <tr key={book.id} className="min-h-14 border-t border-slate-200 hover:bg-blue-50/30"><td className="py-3">{book.id}</td><td className="px-2 py-2"><div className="flex flex-wrap justify-center gap-1">{book.groups.map((item) => <span key={item} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500">{item}</span>)}</div></td><td className="px-3 py-3 text-left font-medium">{book.title}</td><td>{book.publisher}</td><td>{book.level}</td><td>{book.rounds}</td><td>{book.category}</td><td>{book.tendency}</td><td>{book.type}</td><td><span className="rounded-md bg-[#cf6567] px-2 py-1 text-[10px] font-bold text-white">종+전</span></td><td>{book.ebook ? <FileText className="mx-auto size-5" /> : "-"}</td><td><WorkbookIcons book={book} /></td><td><WorkbookIcons book={book} online /></td><td><span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-500">검수완료</span></td><td><Link href={`/admin/exploration/reading/${book.id}/edit`} aria-label={`${book.title} 상세`} title="상세" className="inline-grid size-8 cursor-pointer place-items-center rounded-md text-blue-600 transition hover:bg-blue-100"><FilePenLine className="size-[17px]" /></Link></td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-3 text-xs text-slate-600"><span>총 {filtered.length} 레코드</span><span className="rounded-md border border-slate-200 px-3 py-2">20 항목/페이지</span></div><Pager page={page} pageCount={pageCount} onChange={setPage} /></div>
    </section>
    {toast && <div className="fixed bottom-7 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-slate-800 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
  </div>
}

function DetailSection({ title, children, description }: { title: string; children: React.ReactNode; description?: string }) {
  return <section className="rounded-xl bg-white p-6 shadow-sm">
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-200 pb-4"><h2 className="text-base font-extrabold text-slate-800">{title}</h2>{description && <p className="text-xs text-slate-400">{description}</p>}</div>
    {children}
  </section>
}

function FormField({ label, children, required = false, className = "" }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return <div className={className}><label className="mb-2 block text-sm font-bold text-slate-600">{required && <span className="mr-1 text-red-500">*</span>}{label}</label>{children}</div>
}

function QuizEditorField({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return <div className="grid gap-2 md:grid-cols-[130px_minmax(0,1fr)] md:items-start">
    <label className="pt-2.5 text-sm font-medium text-slate-600 md:text-right">{required && <span className="mr-1 text-red-500">*</span>}{label} :</label>
    <div>{children}</div>
  </div>
}

function QuizPageInputs({ label, paper, ebook, onPaperChange, onEbookChange }: { label: string; paper: string; ebook: string; onPaperChange: (value: string) => void; onEbookChange: (value: string) => void }) {
  return <div className="mt-2 flex flex-wrap justify-end gap-3">
    <label className="flex items-center gap-2 text-sm text-slate-500">종이책<input value={paper} onChange={(event) => onPaperChange(event.target.value)} aria-label={`${label} 종이책 쪽수`} className="h-8 w-28 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" /></label>
    <label className="flex items-center gap-2 text-sm text-slate-500">전자책<input value={ebook} onChange={(event) => onEbookChange(event.target.value)} aria-label={`${label} 전자책 쪽수`} className="h-8 w-28 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" /></label>
  </div>
}

const readOnlyInput = `${controlClass} bg-white text-slate-600`
const layoutButton = "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"

const liveGroupNames: Record<string, string> = {
  "15": "292종 전자책 + 2권(다른별 학교, 아빠 바이올린)", "105": "292권 전자책2 (b2c, 28권 교체)", "120": "292권 전자책 (3종 교체)", "403": "2024 1월 종이책그룹", "406": "24.05(24종교체)종이책그룹", "410": "와우톡_292권 전자책2 + 전자책만료 28권", "416": "292권 전자책2 + 바른국어논술", "417": "292권 전자책2 + 생각자람논술", "418": "292권 전자책2 + 구쌤국어논술", "419": "25.03 406번에서 2권 절판(290권)", "420": "2024 1월 종이책그룹(5레벨 교체)", "421": "292종 전자책 + 김남진국어학원 추가 구매", "422": "292종 전자책 + 2권 [복사]", "423": "26.01 [22종 교체]", "424": "26.01 [22종 교체] + 메이저 164종", "425": "419번 + 옆집의 방화범 - 로이독서논술",
}

function StaticSelect({ value }: { value: string }) {
  return <div className="flex h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600"><span>{value}</span><ChevronDown className="size-4 text-slate-400" /></div>
}

function EbookVersion({ previous = false }: { previous?: boolean }) {
  return <div className="grid gap-5 border-t border-slate-200 px-5 py-5 first:border-t-0 lg:grid-cols-[200px_1fr_auto] lg:items-center">
    <div><h3 className="font-extrabold text-slate-800">{previous ? "이전 뷰어 파일" : "신규 뷰어 파일"}</h3><p className="mt-1 text-xs text-slate-400">파일 형식 · {previous ? "pubhtml" : "dokdo-viewer"}</p></div>
    <div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-emerald-500" /><div><p className="text-sm font-semibold text-slate-700">전자책 파일 등록됨</p><p className="mt-1 text-xs text-slate-400">{previous ? "2026-02-24 16:59" : "2026-07-28 19:35"} 업로드</p></div>{!previous && <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-600">적용 중</span>}</div>
    <div className="flex flex-wrap gap-2">{previous && <button type="button" className={primaryButton}>이 버전 적용</button>}<button type="button" className={layoutButton}>미리보기</button><button type="button" className={layoutButton}><Upload className="size-3.5" />파일 교체</button><button type="button" className={`${layoutButton} text-red-500`}>삭제</button></div>
  </div>
}

function CurriculumItem({ item, index }: { item: ReturnType<typeof getReadingBookDetailData>["curriculumLinks"][number]; index: number }) {
  return <div className="relative rounded-lg border border-slate-200 bg-slate-50/40 p-5">
    <button type="button" aria-label={`${index + 1}번째 교과 연계 삭제`} className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-400">−</button>
    <div className="grid gap-3 lg:grid-cols-[170px_repeat(4,minmax(110px,1fr))_90px]"><StaticSelect value={item.kind} /><StaticSelect value={item.school} /><StaticSelect value={item.subject} /><StaticSelect value={item.grade} /><StaticSelect value={item.semester} /><div className="flex h-10 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-sm text-slate-400">상세</div></div>
    <textarea aria-label={`${item.kind} 단원`} value={item.unit} readOnly className="mt-3 min-h-20 w-full resize-none rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600 outline-none" />
  </div>
}

export function ReadingBookDetail({ bookId }: { bookId: number }) {
  const book = getReadingBook(bookId) ?? READING_BOOKS[0]
  const detail = React.useMemo(() => getReadingBookDetailData(book), [book])
  const [toast, setToast] = React.useState("")
  const [rounds, setRounds] = React.useState<ReadingBookRoundDetail[]>(detail.rounds)
  const [editingRound, setEditingRound] = React.useState<number | null>(null)
  const [roundToDelete, setRoundToDelete] = React.useState<number | null>(null)
  const [draftQuestions, setDraftQuestions] = React.useState<ReadingQuizQuestion[]>(COMMON_READING_QUIZ)
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 1800) }
  const activeRound = rounds.find((round) => round.round === editingRound)

  const openQuizEditor = (round: number) => { setEditingRound(round); setDraftQuestions(getReadingRoundQuiz(book.id, round)) }
  const updateQuestion = (index: number, patch: Partial<ReadingQuizQuestion>) => setDraftQuestions((questions) => questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question))
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => setDraftQuestions((questions) => questions.map((question, index) => {
    if (index !== questionIndex) return question
    const options = [...question.options] as ReadingQuizQuestion["options"]
    options[optionIndex] = value
    return { ...question, options }
  }))
  const updateExplanation = (questionIndex: number, optionIndex: number, value: string) => setDraftQuestions((questions) => questions.map((question, index) => {
    if (index !== questionIndex) return question
    const explanations = [...question.explanations] as ReadingQuizQuestion["explanations"]
    explanations[optionIndex] = value
    return { ...question, explanations }
  }))
  const updatePageReference = (questionIndex: number, optionIndex: number, kind: "paper" | "ebook", value: string) => setDraftQuestions((questions) => questions.map((question, index) => {
    if (index !== questionIndex) return question
    const pageReferences = question.pageReferences.map((reference) => ({ ...reference })) as ReadingQuizQuestion["pageReferences"]
    pageReferences[optionIndex][kind] = value
    return { ...question, pageReferences }
  }))
  const saveQuiz = () => {
    if (!editingRound) return
    saveReadingRoundQuiz(book.id, editingRound, draftQuestions)
    notify(`${editingRound}회차 문제가 저장되었습니다.`)
    setEditingRound(null)
  }
  const resetQuiz = () => {
    if (!editingRound) return
    setDraftQuestions(resetReadingRoundQuiz(book.id, editingRound))
    notify(`${editingRound}회차 문제를 공통 문제로 초기화했습니다.`)
  }
  const addRound = () => {
    const previous = rounds.at(-1)
    const round = (previous?.round ?? 0) + 1
    const startPage = (previous?.endPage ?? 0) + 1
    const pdfStartPage = (previous?.pdfEndPage ?? 4) + 1
    setRounds((items) => [...items, { round, startPage, endPage: startPage + 29, pdfStartPage, pdfEndPage: pdfStartPage + 29, questionCount: 6 }])
  }
  const deleteRound = () => {
    if (!roundToDelete) return
    setRounds((items) => items.filter((round) => round.round !== roundToDelete))
    resetReadingRoundQuiz(book.id, roundToDelete)
    notify(`탐험내용 ${roundToDelete}회차를 삭제했습니다.`)
    setRoundToDelete(null)
  }

  return <div className="space-y-4 pb-6 text-slate-700">
    <h1 className="px-1 text-xl font-extrabold text-slate-900">책 읽기 상세 정보</h1>

    <section className="rounded-xl bg-white p-6 shadow-sm"><FormField label="ISBN"><div className="flex max-w-2xl gap-2"><input className={readOnlyInput} value={detail.isbn} readOnly placeholder="입력해주세요" /><button type="button" className="h-10 shrink-0 rounded-md bg-[#0877ea] px-5 text-sm font-bold text-white">가져오기</button></div></FormField></section>

    <DetailSection title="책 기본 정보">
      <div className="grid gap-7 xl:grid-cols-[210px_minmax(0,1fr)]">
        <FormField label="이미지"><div className="relative mx-auto aspect-[3/4] w-full max-w-[190px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><Image src={getReadingBookCover(book.id)} alt={`${book.title} 표지`} fill sizes="190px" className="object-contain" priority unoptimized /><button type="button" aria-label="이미지 삭제" className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/95 text-red-500 shadow"><Trash2 className="size-4" /></button></div><button type="button" className={`${layoutButton} mt-3 w-full`}><ImageIcon className="size-4" />업로드</button></FormField>
        <div className="grid content-start gap-4 md:grid-cols-2"><FormField label="제목" required><input className={readOnlyInput} value={book.title} readOnly /></FormField><FormField label="저자"><input className={readOnlyInput} value={detail.author} readOnly /></FormField><FormField label="출판사" required><StaticSelect value={book.publisher} /></FormField><FormField label="발행일"><div className="relative"><input className={readOnlyInput} value={detail.publishedAt} readOnly placeholder="날짜 선택" /><CalendarDays className="absolute right-3 top-3 size-4 text-slate-400" /></div></FormField><FormField label="책소개" className="md:col-span-2"><textarea className="min-h-32 w-full resize-none rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600 outline-none" value={detail.introduction} readOnly /></FormField></div>
      </div>
    </DetailSection>

    <DetailSection title="책 읽기 상세 정보">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><FormField label="레벨" required><StaticSelect value={`${book.level}`} /></FormField><FormField label="책종류" required><StaticSelect value={book.bookType} /></FormField><FormField label="카테고리" required><StaticSelect value={book.category} /></FormField><FormField label="유형" required><StaticSelect value={book.type} /></FormField><FormField label="성향" required><StaticSelect value={book.tendency} /></FormField><FormField label="권장 연령" required><StaticSelect value={detail.recommendedAge} /></FormField></div>
      <FormField label="책그룹" className="mt-5"><div className="flex min-h-12 flex-wrap gap-2 rounded-md border border-slate-200 bg-white p-3">{book.groups.map((group) => <span key={group} className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600">{group}.{liveGroupNames[group] ?? `책그룹 ${group}`}</span>)}</div></FormField>
      <FormField label="태그" className="mt-5"><div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-2">{detail.tags.map((tag) => <span key={tag} className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">{tag}</span>)}</div></FormField>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><FormField label="토론하기"><button type="button" className={layoutButton}><Upload className="size-4" />PDF 업로드</button></FormField><FormField label="검수 상태" required><StaticSelect value="검수완료" /></FormField><FormField label="정산 대상" required><div className="flex h-10 items-center gap-6"><label className="flex items-center gap-2 text-sm"><input type="radio" name="settlement" />대상</label><label className="flex items-center gap-2 text-sm"><input type="radio" name="settlement" defaultChecked />대상 아님</label></div></FormField><FormField label="도서 분류"><StaticSelect value={detail.classification} /></FormField></div>
    </DetailSection>

    <DetailSection title="교과 연계 정보"><div className="space-y-4">{detail.curriculumLinks.map((item, index) => <React.Fragment key={`${item.kind}-${index}`}><CurriculumItem item={item} index={index} />{index < detail.curriculumLinks.length - 1 && <div className="flex justify-center"><button type="button" aria-label="교과 연계 추가" className="grid size-8 place-items-center rounded-full border border-blue-300 bg-white text-blue-600"><Plus className="size-4" /></button></div>}</React.Fragment>)}</div></DetailSection>

    <DetailSection title="이북 업로드" description="도서에 사용할 전자책 뷰어 파일을 등록합니다."><div className="overflow-hidden rounded-lg border border-slate-200"><EbookVersion /><EbookVersion previous /></div></DetailSection>

    <DetailSection title="책 상세 정보"><div className="grid gap-5 lg:grid-cols-2"><FormField label="목차"><textarea className="min-h-48 w-full resize-none rounded-md border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600 outline-none" value={detail.tableOfContents} readOnly /></FormField><FormField label="책요약"><textarea className="min-h-48 w-full resize-none rounded-md border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600 outline-none" value={detail.summary} readOnly /></FormField></div></DetailSection>

    <section className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm"><Link href="/admin/exploration/reading" className={secondaryButton}>목록</Link><button type="button" className={primaryButton}>저장</button></section>

    <section className="rounded-xl bg-white p-6 shadow-sm"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-extrabold text-slate-800">탐험내용</h2><div className="flex flex-wrap gap-2"><button type="button" onClick={addRound} className={primaryButton}><Plus className="size-4" />회차 추가</button><button type="button" className={secondaryButton}><FileUp className="size-4" />엑셀 업로드</button><button type="button" className={secondaryButton}><FileDown className="size-4" />엑셀 다운로드</button></div></div>
      <div className="space-y-3">{rounds.map((round) => <article key={round.round} className="flex flex-wrap items-center gap-5 rounded-lg border border-slate-200 px-5 py-4"><h3 className="min-w-20 text-base font-extrabold text-slate-800">{round.round} 회차</h3><span className="text-sm text-slate-600">{round.startPage}p ~ {round.endPage}p</span><span className="text-sm text-slate-400">PDF: {round.pdfStartPage}p ~ {round.pdfEndPage}p</span><span className="text-sm text-slate-400">문제수: {round.questionCount}</span><div className="ml-auto flex gap-2"><button type="button" onClick={() => openQuizEditor(round.round)} aria-label={`${round.round}회차 문제 수정`} className="grid size-9 place-items-center rounded-md border border-slate-200 text-blue-600 hover:bg-blue-50"><FilePenLine className="size-4" /></button><button type="button" onClick={() => setRoundToDelete(round.round)} aria-label={`${round.round}회차 삭제`} className="grid size-9 place-items-center rounded-md border border-slate-200 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button></div></article>)}</div>
    </section>

    {editingRound && activeRound && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-2 sm:p-5"><section role="dialog" aria-modal="true" aria-label={`${book.title} ${editingRound}회차 문제 수정`} className="flex max-h-[94vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"><header className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4"><h2 className="font-extrabold text-slate-800">{book.title} {editingRound} 회차</h2><div className="flex items-center gap-2"><span className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">길라잡이 검수상태 ●</span><button type="button" className={layoutButton}>길라잡이 미리보기</button><button type="button" className={primaryButton}>미리보기</button><button type="button" onClick={() => setEditingRound(null)} aria-label="문제 수정 닫기" className="grid size-9 place-items-center text-slate-400"><X className="size-5" /></button></div></header>
      <div className="overflow-y-auto p-6"><div className="rounded-lg border border-slate-200 bg-slate-50/40 p-5"><FormField label="책 소개"><textarea value={detail.introduction} disabled className="min-h-24 w-full resize-none rounded-md border border-slate-200 bg-slate-100 p-3 text-sm leading-6 text-slate-400" /></FormField><div className="mt-4 grid gap-4 md:grid-cols-[130px_1fr]"><span className="text-sm font-bold text-slate-600">워크북</span><div><button type="button" className={layoutButton}>워크북 업로드</button><p className="mt-2 text-xs text-blue-600">📎 {book.title}-워크북.pdf</p></div><span className="text-sm font-bold text-slate-600">온라인 워크북</span><span className="text-sm text-slate-500">✎</span><span className="text-sm font-bold text-slate-600">소제목</span><input className={controlClass} /><span className="text-sm font-bold text-slate-600">회차 줄거리</span><textarea value={detail.summary} readOnly className="min-h-20 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600" /></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><FormField label="페이지 범위"><div className="flex items-center gap-2"><input value={activeRound.startPage} readOnly className={controlClass} /><span>~</span><input value={activeRound.endPage} readOnly className={controlClass} /></div></FormField><FormField label="전자책 페이지"><div className="flex items-center gap-2"><input value={activeRound.pdfStartPage} readOnly className={controlClass} /><span>~</span><input value={activeRound.pdfEndPage} readOnly className={controlClass} /></div></FormField><FormField label="기준 독서 시간"><div className="flex items-center gap-2"><input value="35" readOnly className={controlClass} /><span className="shrink-0 text-xs text-slate-400">빈칸일 경우 20분</span></div></FormField></div></div>
        <div className="mt-4 space-y-4">{draftQuestions.map((question, questionIndex) => {
          const correctOptionIndex = question.correctOption - 1
          const incorrectOptionIndexes = question.options.map((_, optionIndex) => optionIndex).filter((optionIndex) => optionIndex !== correctOptionIndex)

          return <div key={questionIndex} className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3"><h3 className="text-sm font-extrabold">객관식 문제 {questionIndex + 1}</h3><div className="flex gap-2"><button type="button" className={layoutButton}>취소</button><button type="button" className={`${layoutButton} text-red-500`}>삭제</button></div></div>
            <div className="space-y-5 p-4 sm:p-5">
              <QuizEditorField label="문항 영역" required><select value={question.area} onChange={(event) => updateQuestion(questionIndex, { area: event.target.value as ReadingQuizQuestion["area"] })} aria-label={`${questionIndex + 1}번 문항 영역`} className={`${controlClass} cursor-pointer`}>{READING_QUESTION_AREAS.map((area) => <option key={area} value={area}>{area}</option>)}</select></QuizEditorField>
              <QuizEditorField label="문제" required><input value={question.question} onChange={(event) => updateQuestion(questionIndex, { question: event.target.value })} className={controlClass} aria-label={`${questionIndex + 1}번 문제`} /></QuizEditorField>
              <QuizEditorField label="정답" required><input value={question.options[correctOptionIndex]} onChange={(event) => updateOption(questionIndex, correctOptionIndex, event.target.value)} className={controlClass} aria-label={`${questionIndex + 1}번 정답`} /></QuizEditorField>
              <QuizEditorField label="정답 해설"><textarea value={question.explanations[correctOptionIndex]} onChange={(event) => updateExplanation(questionIndex, correctOptionIndex, event.target.value)} aria-label={`${questionIndex + 1}번 정답 해설`} className="min-h-20 w-full resize-y rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-blue-400" /><QuizPageInputs label={`${questionIndex + 1}번 정답 해설`} paper={question.pageReferences[correctOptionIndex].paper} ebook={question.pageReferences[correctOptionIndex].ebook} onPaperChange={(value) => updatePageReference(questionIndex, correctOptionIndex, "paper", value)} onEbookChange={(value) => updatePageReference(questionIndex, correctOptionIndex, "ebook", value)} /></QuizEditorField>
              {incorrectOptionIndexes.map((optionIndex, incorrectIndex) => <div key={optionIndex} className="space-y-4 border-t border-slate-100 pt-5">
                <QuizEditorField label={`선지${incorrectIndex + 1}`} required={incorrectIndex < 2}><input value={question.options[optionIndex]} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} className={controlClass} aria-label={`${questionIndex + 1}번 선지${incorrectIndex + 1}`} /></QuizEditorField>
                <QuizEditorField label={`오답 해설${incorrectIndex + 1}`}><textarea value={question.explanations[optionIndex]} onChange={(event) => updateExplanation(questionIndex, optionIndex, event.target.value)} aria-label={`${questionIndex + 1}번 오답 해설${incorrectIndex + 1}`} className="min-h-20 w-full resize-y rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-blue-400" /><QuizPageInputs label={`${questionIndex + 1}번 오답 해설${incorrectIndex + 1}`} paper={question.pageReferences[optionIndex].paper} ebook={question.pageReferences[optionIndex].ebook} onPaperChange={(value) => updatePageReference(questionIndex, optionIndex, "paper", value)} onEbookChange={(value) => updatePageReference(questionIndex, optionIndex, "ebook", value)} /></QuizEditorField>
              </div>)}
              <QuizEditorField label="오답도움말"><input value={question.wrongAnswerHint} onChange={(event) => updateQuestion(questionIndex, { wrongAnswerHint: event.target.value })} className={controlClass} aria-label={`${questionIndex + 1}번 오답도움말`} /></QuizEditorField>
            </div>
          </div>
        })}</div>
      </div><footer className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3"><button type="button" className="h-9 rounded-md border border-blue-500 px-4 text-xs font-bold text-blue-600">+ 객관식 문제</button><div className="flex gap-2"><button type="button" onClick={resetQuiz} className={secondaryButton}><RefreshCw className="size-4" />공통 문제 초기화</button><button type="button" onClick={() => setEditingRound(null)} className={secondaryButton}>취소</button><button type="button" onClick={saveQuiz} className={primaryButton}>저장</button></div></footer></section></div>}

    {roundToDelete && <div className="fixed inset-0 z-[110] grid place-items-center bg-black/45 p-5"><section role="alertdialog" aria-modal="true" aria-label={`탐험내용 ${roundToDelete}회차 삭제 확인`} className="w-full max-w-[420px] rounded-xl bg-white p-6 shadow-2xl"><div className="flex items-start gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-400 font-black text-white">!</span><div><h2 className="font-extrabold text-slate-800">탐험내용 {roundToDelete}회차</h2><p className="mt-3 text-sm text-slate-500">삭제 하시겠습니까?</p></div></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setRoundToDelete(null)} className={secondaryButton}>취소</button><button type="button" onClick={deleteRound} className="inline-flex h-10 items-center rounded-lg border border-red-400 px-5 text-sm font-bold text-red-500">확인</button></div></section></div>}
    {toast && <div className="fixed bottom-7 left-1/2 z-[120] -translate-x-1/2 rounded-lg bg-slate-800 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
  </div>
}
