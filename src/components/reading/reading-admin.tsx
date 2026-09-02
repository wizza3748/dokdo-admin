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
  FilePenLine,
  FileText,
  Grid2X2,
  ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react"

import {
  getOnlineWorkbookSettingId,
  getReadingBook,
  READING_BOOK_PAGE_SIZE,
  READING_BOOKS,
  type ReadingBookRecord,
} from "@/lib/reading-books"
import { getReadingBookCover } from "@/lib/reading-book-covers"
import { getReadingBookDetailData } from "@/lib/reading-book-details"
import { COMMON_READING_QUIZ, type ReadingQuizQuestion } from "@/lib/reading-exploration"
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
      if (online && active) return <Link key={index} title="온라인 워크북 설정" aria-label={`${book.title} 온라인 워크북 설정`} href={`/admin/exploration/reading/${book.id}/workbook/${getOnlineWorkbookSettingId(book.id)}`} className="cursor-pointer text-blue-600 transition hover:scale-110 hover:text-blue-700">{icon}</Link>
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

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl bg-white p-6 shadow-sm">
    <h2 className="mb-6 border-b border-slate-200 pb-4 text-lg font-extrabold text-slate-800">{title}</h2>
    {children}
  </section>
}

function FormField({ label, children, required = false, className = "" }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return <div className={className}>
    <label className="mb-2 block text-sm font-bold text-slate-600">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>
    {children}
  </div>
}

const readOnlyInput = `${controlClass} bg-slate-50 text-slate-600`
const layoutButton = "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm"

function EbookCard({ title, format, date, current = false }: { title: string; format: string; date: string; current?: boolean }) {
  return <div className={`rounded-lg border p-5 ${current ? "border-blue-300 bg-blue-50/30" : "border-slate-200"}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`grid size-11 place-items-center rounded-lg ${current ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}><FileText className="size-5" /></span>
        <div><div className="flex items-center gap-2"><h3 className="font-extrabold text-slate-800">{title}</h3>{current && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-600">현재 버전</span>}</div><p className="mt-1 text-xs text-slate-400">{format} · 등록일 {date}</p></div>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500"><CheckCircle2 className="size-4" />등록완료</span>
    </div>
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      <button type="button" className={layoutButton}>미리보기</button>
      <button type="button" className={layoutButton}><Upload className="size-3.5" />파일 교체</button>
      {!current && <button type="button" className={layoutButton}>이 버전 적용</button>}
      <button type="button" className={`${layoutButton} text-red-500`}><Trash2 className="size-3.5" />삭제</button>
    </div>
  </div>
}

export function ReadingBookDetail({ bookId }: { bookId: number }) {
  const book = getReadingBook(bookId) ?? READING_BOOKS[0]
  const detail = React.useMemo(() => getReadingBookDetailData(book), [book])
  const [toast, setToast] = React.useState("")
  const [editingRound, setEditingRound] = React.useState<number | null>(null)
  const [draftQuestions, setDraftQuestions] = React.useState<ReadingQuizQuestion[]>(COMMON_READING_QUIZ)
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 1800) }

  const openQuizEditor = (round: number) => {
    setEditingRound(round)
    setDraftQuestions(getReadingRoundQuiz(book.id, round))
  }
  const updateQuestion = (index: number, patch: Partial<ReadingQuizQuestion>) => {
    setDraftQuestions((questions) => questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question))
  }
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setDraftQuestions((questions) => questions.map((question, index) => {
      if (index !== questionIndex) return question
      const options = [...question.options] as ReadingQuizQuestion["options"]
      options[optionIndex] = value
      return { ...question, options }
    }))
  }
  const saveQuiz = () => {
    if (!editingRound) return
    saveReadingRoundQuiz(book.id, editingRound, draftQuestions)
    notify(`${editingRound}회차 문제가 저장되었습니다.`)
  }
  const resetQuiz = () => {
    if (!editingRound) return
    setDraftQuestions(resetReadingRoundQuiz(book.id, editingRound))
    notify(`${editingRound}회차 문제를 공통 문제로 초기화했습니다.`)
  }

  return <div className="space-y-4 pb-24 text-slate-700">
    <DetailSection title="책 읽기 상세 정보">
      <div className="grid gap-8 xl:grid-cols-[210px_minmax(0,1fr)]">
        <div>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[190px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
            <Image src={getReadingBookCover(book.id)} alt={`${book.title} 표지`} fill sizes="190px" className="object-contain" priority />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className={layoutButton}><ImageIcon className="size-3.5" />이미지 업로드</button><button type="button" className={`${layoutButton} text-red-500`}><Trash2 className="size-3.5" />이미지 삭제</button></div>
        </div>
        <div className="grid content-start gap-4 md:grid-cols-2">
          <FormField label="ISBN" required><div className="flex gap-2"><input className={readOnlyInput} value={detail.isbn} readOnly placeholder="ISBN을 입력해 주세요." /><button type="button" className="h-10 shrink-0 rounded-md bg-slate-700 px-4 text-sm font-bold text-white">가져오기</button></div></FormField>
          <FormField label="고유번호"><input className={readOnlyInput} value={book.id} readOnly /></FormField>
          <FormField label="제목" required><input className={readOnlyInput} value={book.title} readOnly /></FormField>
          <FormField label="출판사" required><input className={readOnlyInput} value={book.publisher} readOnly /></FormField>
          <FormField label="저자"><input className={readOnlyInput} value={detail.author} readOnly placeholder="저자 정보" /></FormField>
          <FormField label="발행일"><div className="relative"><input className={readOnlyInput} value={detail.publishedAt} readOnly placeholder="YYYY-MM-DD" /><CalendarDays className="pointer-events-none absolute right-3 top-3 size-4 text-slate-400" /></div></FormField>
          <FormField label="책 소개" className="md:col-span-2"><textarea className="min-h-28 w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600 outline-none" value={detail.introduction} readOnly /></FormField>
          <FormField label="태그" className="md:col-span-2"><div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">{detail.tags.map((tag) => <span key={tag} className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-600">{tag}</span>)}</div></FormField>
          <FormField label="권장 연령"><input className={readOnlyInput} value={detail.recommendedAge} readOnly /></FormField>
          <FormField label="분류"><input className={readOnlyInput} value={detail.classification} readOnly /></FormField>
          <FormField label="레벨"><input className={readOnlyInput} value={`${book.level}레벨`} readOnly /></FormField>
          <FormField label="책 종류"><input className={readOnlyInput} value={book.bookType} readOnly /></FormField>
        </div>
      </div>
    </DetailSection>

    <DetailSection title="교과 연계 정보">
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full min-w-[900px] text-center text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">연계 유형</th><th>학교급</th><th>교과</th><th>학년</th><th>학기</th><th className="w-[42%]">단원</th><th className="w-16">관리</th></tr></thead>
          <tbody>{detail.curriculumLinks.map((link, index) => <tr key={`${link.kind}-${index}`} className="border-t border-slate-200"><td className="px-4 py-4"><span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">{link.kind}</span></td><td>{link.school}</td><td>{link.subject}</td><td>{link.grade}</td><td>{link.semester}</td><td className="px-4 text-left">{link.unit}</td><td><button type="button" className="text-slate-400"><Pencil className="mx-auto size-4" /></button></td></tr>)}</tbody>
        </table>
      </div>
      <button type="button" className={`${secondaryButton} mt-4`}><Plus className="size-4" />교과 연계 추가</button>
    </DetailSection>

    <DetailSection title="이북 업로드">
      <div className="mb-5 flex items-center justify-between rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-5"><div><h3 className="font-extrabold text-slate-800">새 이북 파일 등록</h3><p className="mt-1 text-sm text-slate-500">PDF 또는 PUBHTML 파일을 등록할 수 있습니다.</p></div><button type="button" className={primaryButton}><Upload className="size-4" />이북 업로드</button></div>
      <div className="grid gap-4 lg:grid-cols-2"><EbookCard title={`${book.title} 이북`} format="dokdo-viewer" date="2026-07-28 19:35" current /><EbookCard title="이전 이북 파일" format="pubhtml" date="2026-02-24 16:59" /></div>
    </DetailSection>

    <DetailSection title="책 상세 정보">
      <div className="grid gap-5 lg:grid-cols-2">
        <FormField label="목차"><textarea className="min-h-48 w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600 outline-none" value={detail.tableOfContents} readOnly placeholder="목차 정보가 없습니다." /></FormField>
        <FormField label="요약"><textarea className="min-h-48 w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600 outline-none" value={detail.summary} readOnly /></FormField>
      </div>
    </DetailSection>

    <DetailSection title="탐험 내용">
      <div className="mb-5 flex items-center justify-between"><p className="text-sm text-slate-500">회차별 읽기 범위와 확인 문제를 관리합니다. 기본값은 모든 책에 공통 문제 6개가 적용됩니다.</p><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">총 {detail.rounds.length}회차</span></div>
      <div className="grid gap-4 xl:grid-cols-3">{detail.rounds.map((round) => <article key={round.round} className={`rounded-lg border p-5 transition ${editingRound === round.round ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}>
        <div className="flex items-center justify-between"><h3 className="text-base font-extrabold text-slate-800">{round.round}회차</h3><button type="button" onClick={() => openQuizEditor(round.round)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50"><Pencil className="size-3.5" />문제 수정</button></div>
        <dl className="mt-5 grid grid-cols-2 gap-y-3 text-sm"><dt className="text-slate-400">책 페이지</dt><dd className="text-right font-semibold">{round.startPage}~{round.endPage}쪽</dd><dt className="text-slate-400">PDF 페이지</dt><dd className="text-right font-semibold">{round.pdfStartPage}~{round.pdfEndPage}쪽</dd><dt className="text-slate-400">확인 문제</dt><dd className="text-right font-semibold text-blue-600">{round.questionCount}문제</dd></dl>
      </article>)}</div>

      {editingRound && <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/20 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-extrabold text-slate-800">{editingRound}회차 확인 문제 수정</h3><p className="mt-1 text-xs text-slate-500">저장한 문제는 학생의 해당 책·회차 퀴즈에서 공통 문제보다 우선 적용됩니다.</p></div><div className="flex gap-2"><button type="button" onClick={resetQuiz} className={secondaryButton}><RefreshCw className="size-4" />공통 문제로 초기화</button><button type="button" onClick={saveQuiz} className={primaryButton}>문제 저장</button></div></div>
        <div className="space-y-4">{draftQuestions.map((question, questionIndex) => <div key={questionIndex} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">{questionIndex + 1}</span><input value={question.question} onChange={(event) => updateQuestion(questionIndex, { question: event.target.value })} className={controlClass} aria-label={`${questionIndex + 1}번 문제`} /></div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className={`flex items-center gap-2 rounded-md border p-2 ${question.correctOption === optionIndex + 1 ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}><input type="radio" name={`correct-${editingRound}-${questionIndex}`} checked={question.correctOption === optionIndex + 1} onChange={() => updateQuestion(questionIndex, { correctOption: (optionIndex + 1) as ReadingQuizQuestion["correctOption"] })} /><span className="text-xs font-bold text-slate-400">{optionIndex + 1}</span><input value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label={`${questionIndex + 1}번 문제 ${optionIndex + 1}번 선택지`} /></label>)}</div>
        </div>)}</div>
      </div>}
    </DetailSection>

    <div className="fixed bottom-0 left-[var(--admin-fixed-left)] right-0 z-30 flex h-20 items-center justify-between border-t border-slate-200 bg-white px-8 shadow-[0_-4px_18px_rgba(15,23,42,.06)] transition-[left] duration-200"><Link href="/admin/exploration/reading" className={secondaryButton}>목록</Link><button type="button" className={primaryButton}>저장</button></div>
    {toast && <div className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-slate-800 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
  </div>
}
