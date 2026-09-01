"use client"

import * as React from "react"
import Link from "next/link"
import {
  BookOpen,
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
  Plus,
  RefreshCw,
  Search,
} from "lucide-react"

import {
  getOnlineWorkbookSettingId,
  getReadingBook,
  READING_BOOK_PAGE_SIZE,
  READING_BOOKS,
  type ReadingBookRecord,
} from "@/lib/reading-books"

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
      const active = index < activeCount
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
        <table className="min-w-[1540px] table-fixed text-center text-xs">
          <thead className="h-12 bg-slate-50 text-slate-600"><tr><th className="w-20">고유번호</th><th className="w-140px w-[140px]">책그룹</th><th className="w-[230px]">제목</th><th className="w-[110px]">출판사</th><th className="w-16">레벨</th><th className="w-20">책 회차</th><th className="w-24">카테고리</th><th className="w-24">성향</th><th className="w-20">유형</th><th className="w-20">책종류</th><th className="w-16">이북</th><th className="w-24">워크북</th><th className="w-28">온라인 워크북</th><th className="w-24">상태</th><th className="w-20">관리</th></tr></thead>
          <tbody>{rows.map((book) => <tr key={book.id} className="min-h-14 border-t border-slate-200 hover:bg-blue-50/30"><td className="py-3">{book.id}</td><td className="px-2 py-2"><div className="flex flex-wrap justify-center gap-1">{book.groups.map((item) => <span key={item} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500">{item}</span>)}</div></td><td className="px-3 py-3 text-left font-medium">{book.title}</td><td>{book.publisher}</td><td>{book.level}</td><td>{book.rounds}</td><td>{book.category}</td><td>{book.tendency}</td><td>{book.type}</td><td><span className="rounded-md bg-[#cf6567] px-2 py-1 text-[10px] font-bold text-white">종+전</span></td><td>{book.ebook ? <FileText className="mx-auto size-5" /> : "-"}</td><td><WorkbookIcons book={book} /></td><td><WorkbookIcons book={book} online /></td><td><span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-500">검수완료</span></td><td><Link href={`/admin/exploration/reading/${book.id}/edit`} aria-label={`${book.title} 상세`} title="상세" className="inline-grid size-8 cursor-pointer place-items-center rounded-md text-blue-600 transition hover:bg-blue-100"><FilePenLine className="size-[17px]" /></Link></td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-3 text-xs text-slate-600"><span>총 {filtered.length} 레코드</span><span className="rounded-md border border-slate-200 px-3 py-2">20 항목/페이지</span></div><Pager page={page} pageCount={pageCount} onChange={setPage} /></div>
    </section>
    {toast && <div className="fixed bottom-7 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-slate-800 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
  </div>
}

function InfoField({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "col-span-2" : ""}><dt className="mb-2 text-sm font-bold text-slate-600">{label}</dt><dd className="min-h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">{value}</dd></div>
}

export function ReadingBookDetail({ bookId }: { bookId: number }) {
  const book = getReadingBook(bookId) ?? READING_BOOKS[0]
  const [toast, setToast] = React.useState("")
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 1800) }
  return <div className="space-y-4 pb-20 text-slate-700">
    <section className="rounded-xl bg-white p-6 shadow-sm"><h1 className="mb-5 border-b border-slate-200 pb-4 text-lg font-extrabold">책 읽기 상세</h1><div className="grid grid-cols-[180px_1fr] gap-7"><div className="flex h-[250px] flex-col justify-between rounded-lg bg-gradient-to-br from-[#195ca8] via-[#3a86cc] to-[#7fc6df] p-5 text-white shadow-inner"><div><span className="rounded bg-white/20 px-2 py-1 text-xs">{book.level}레벨 · {book.rounds}회차</span><h2 className="mt-6 break-keep text-xl font-black leading-8">{book.title}</h2></div><p className="text-sm font-semibold">{book.publisher}</p></div><dl className="grid grid-cols-2 gap-4"><InfoField label="고유번호" value={book.id} /><InfoField label="ISBN" value={`978-89-${String(book.id).padStart(5, "0")}-0`} /><InfoField label="제목" value={book.title} /><InfoField label="출판사" value={book.publisher} /><InfoField label="저자" value="독도 독서연구소" /><InfoField label="발행일" value="2025-09-01" /><InfoField label="책 소개" value={`${book.title}의 주요 내용을 읽고 생각을 넓히는 독서 탐험 도서입니다.`} wide /></dl></div></section>
    <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-5 border-b border-slate-200 pb-4 text-lg font-extrabold">분류 정보</h2><dl className="grid grid-cols-3 gap-4"><InfoField label="레벨" value={`${book.level}레벨`} /><InfoField label="책종류" value={book.bookType} /><InfoField label="책 회차" value={`${book.rounds}회차`} /><InfoField label="책그룹" value={<span className="flex flex-wrap gap-1">{book.groups.map((item) => <span key={item} className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs">{item}</span>)}</span>} /><InfoField label="카테고리" value={book.category} /><InfoField label="유형" value={book.type} /><InfoField label="성향" value={book.tendency} /><InfoField label="검수 상태" value={<span className="font-bold text-emerald-500">검수완료</span>} /><InfoField label="온라인 워크북" value={`${book.activeOnlineCount}/${book.onlineWorkbookCount} 활성`} /></dl></section>
    <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-5 border-b border-slate-200 pb-4 text-lg font-extrabold">학습 콘텐츠</h2><div className="grid grid-cols-2 gap-5"><div className="rounded-lg border border-slate-200 p-5"><h3 className="font-extrabold">이북 파일</h3><p className="mt-3 text-sm text-slate-500">{book.title}.pdf</p><button type="button" onClick={() => notify("이북 미리보기를 준비했습니다.")} className={`${secondaryButton} mt-4`}><FileText className="size-4" />미리보기</button></div><div className="rounded-lg border border-slate-200 p-5"><h3 className="font-extrabold">워크북 및 온라인 워크북</h3><p className="mt-3 text-sm text-slate-500">워크북 {book.workbookCount}개 · 온라인 워크북 {book.onlineWorkbookCount}개</p>{book.activeOnlineCount > 0 && <Link href={`/admin/exploration/reading/${book.id}/workbook/${getOnlineWorkbookSettingId(book.id)}`} className={`${primaryButton} mt-4`}><BookOpen className="size-4" />온라인 워크북 설정</Link>}</div></div></section>
    <div className="fixed bottom-0 left-[var(--sidebar-width)] right-0 z-30 flex h-20 items-center justify-between border-t border-slate-200 bg-white px-8 shadow-[0_-4px_18px_rgba(15,23,42,.06)]"><Link href="/admin/exploration/reading" className={secondaryButton}>목록</Link><button type="button" onClick={() => notify("책 읽기 정보가 저장되었습니다.")} className={primaryButton}>저장</button></div>
    {toast && <div className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-slate-800 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
  </div>
}
