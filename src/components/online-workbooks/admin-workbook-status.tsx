"use client"

import * as React from "react"
import {
  CalendarDays,
  ChevronDown,
  Columns3,
  Download,
  Expand,
  Info,
  RefreshCw,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type WorkbookStatus = "작성전" | "작성완료" | "전송완료"
type SortKey = "id" | "submittedAt" | "feedbackAt"

interface AdminWorkbookRow {
  id: string
  institution: string
  student: string
  level: number
  book: string
  template: string
  submittedAt: string
  feedbackAt: string
  status: WorkbookStatus
  flowers: number
}

const rows: AdminWorkbookRow[] = [
  { id: "42784", institution: "개발테스트학원", student: "진독도", level: 1, book: "감은장아기", template: "68.[저] 통합형 독서록 – 독서 일기", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 15 },
  { id: "42765", institution: "인천교육청-채 경미", student: "이현민", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42741", institution: "전주용흥초등학교", student: "13번", level: 3, book: "기차 타고 부산에서 런던까지", template: "4.[중] 통합형 독서록 – 기본", submittedAt: "2026-08-24", feedbackAt: "", status: "작성전", flowers: 20 },
  { id: "42728", institution: "인천교육청-채 경미", student: "김소은", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42727", institution: "인천교육청-채 경미", student: "이다은", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42704", institution: "인천교육청-채 경미", student: "전유하", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42692", institution: "인천교육청-채 경미", student: "이아인", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42618", institution: "인천교육청-채 경미", student: "민지한", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42607", institution: "인천교육청-채 경미", student: "박서아", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42605", institution: "인천교육청-채 경미", student: "이루나", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42569", institution: "인천교육청-채 경미", student: "최하준", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42553", institution: "인천교육청-채 경미", student: "남연우", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42551", institution: "인천교육청-채 경미", student: "권현서", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42543", institution: "인천교육청-채 경미", student: "이소율", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42534", institution: "인천교육청-채 경미", student: "김예서", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42531", institution: "인천교육청-채 경미", student: "이지연", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42520", institution: "인천교육청-채 경미", student: "윤석진", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42511", institution: "인천교육청-채 경미", student: "박준우", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42458", institution: "인천교육청-채 경미", student: "박소윤", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
  { id: "42455", institution: "인천교육청-채 경미", student: "김이나", level: 3, book: "거울 속 도플갱어", template: "3.[중][고] 통합형 독서록 – 주제/이해 중심", submittedAt: "2026-08-24", feedbackAt: "2026-08-24", status: "전송완료", flowers: 0 },
]

const selectClass = "h-9 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-blue-400"
const labelClass = "w-[88px] shrink-0 text-right text-sm font-semibold text-slate-700"

export function AdminWorkbookStatus() {
  const [period, setPeriod] = React.useState<"three" | "all">("all")
  const [institution, setInstitution] = React.useState("all")
  const [level, setLevel] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [flower, setFlower] = React.useState("all")
  const [keyword, setKeyword] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [filtersOpen, setFiltersOpen] = React.useState(true)
  const [sort, setSort] = React.useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "id", direction: "desc" })
  const [page, setPage] = React.useState(1)
  const [notice, setNotice] = React.useState("")

  const filteredRows = React.useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return rows
      .filter((row) => institution === "all" || row.institution === institution)
      .filter((row) => level === "all" || row.level === Number(level))
      .filter((row) => status === "all" || row.status === status)
      .filter((row) => flower === "all" || (flower === "yes" ? row.flowers > 0 : row.flowers === 0))
      .filter((row) => !normalized || `${row.student} ${row.book}`.toLowerCase().includes(normalized))
      .sort((a, b) => {
        const result = a[sort.key].localeCompare(b[sort.key], "ko", { numeric: true })
        return sort.direction === "asc" ? result : -result
      })
  }, [institution, level, status, flower, query, sort])

  const toggleSort = (key: SortKey) => setSort((current) => current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" })

  const reset = () => {
    setPeriod("all")
    setInstitution("all")
    setLevel("all")
    setStatus("all")
    setFlower("all")
    setKeyword("")
    setQuery("")
    setPage(1)
    setNotice("")
  }

  const downloadCsv = () => {
    const headings = ["고유번호", "기관명", "학생명", "레벨", "도서명", "템플릿명", "학생 제출일", "피드백 작성일", "피드백 상태", "섬초롱꽃"]
    const data = filteredRows.map((row) => [row.id, row.institution, row.student, row.level, row.book, row.template, row.submittedAt, row.feedbackAt, row.status, row.flowers || "-"])
    const csv = [headings, ...data].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "online-workbook-status.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const summaryCards = [
    { label: "피드백 작성전", count: 734, meta: "72개 기관 / 228명 학생", color: "bg-[#747d8c]" },
    { label: "피드백 작성완료", count: 9, meta: "7개 기관 / 9명 학생", color: "bg-[#3d82f6]" },
    { label: "피드백 전송완료", count: 261, meta: "29개 기관 / 125명 학생", color: "bg-[#20c464]" },
  ]

  return (
    <div className="-m-4 min-h-full bg-[#f3f5f7] lg:-m-6">
      <section className="bg-white px-5 py-5">
        <h1 className="text-xl font-semibold text-slate-800">독도 온라인워크북 현황</h1>
        <p className="mt-4 text-sm text-slate-600">전체 기관의 책 읽기 온라인 워크북 진행 및 피드백 상태를 통합 조회할 수 있습니다.</p>
      </section>

      <div className="space-y-4 p-4">
        <section className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => <div key={card.label} className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
            <div className={cn("px-6 py-4 text-lg font-semibold text-white", card.color)}>{card.label}</div>
            <div className="px-6 py-6"><p className="text-[28px] font-semibold text-slate-700">{card.count}건</p><p className="mt-2 text-sm text-slate-500">{card.meta}</p></div>
          </div>)}
        </section>

        <div className="flex min-h-12 items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-4 text-sm text-sky-700">
          <Info className="size-4" /><span><strong>안내:</strong> 기본 조회는 오늘 날짜 기준 전체 기관의 책 읽기 워크북 현황입니다.</span>
        </div>

        <div className="flex gap-2">
          <Button variant={period === "three" ? "default" : "outline"} onClick={() => setPeriod("three")} className={cn("h-9", period === "three" && "bg-blue-600")}>최근 3개월</Button>
          <Button variant={period === "all" ? "default" : "outline"} onClick={() => setPeriod("all")} className={cn("h-9", period === "all" && "bg-blue-600")}>전체 기간</Button>
        </div>

        {filtersOpen && <section className="grid gap-x-12 gap-y-3 bg-white px-8 py-5 xl:grid-cols-3">
          <div className="flex items-center gap-3"><span className={labelClass}>집계 기간</span><div className="flex h-9 flex-1 items-center rounded-md border border-slate-200 px-3 text-sm text-slate-600"><span>{period === "all" ? "2025-09-01" : "2026-05-24"}</span><span className="mx-auto text-slate-300">→</span><span>2026-08-24</span><CalendarDays className="ml-3 size-4 text-slate-300" /></div></div>
          <div className="flex items-center gap-3"><label htmlFor="admin-institution" className={labelClass}>기관</label><select id="admin-institution" value={institution} onChange={(event) => setInstitution(event.target.value)} className={selectClass}><option value="all">기관 선택</option><option value="개발테스트학원">개발테스트학원</option><option value="인천교육청-채 경미">인천교육청-채 경미</option><option value="전주용흥초등학교">전주용흥초등학교</option></select></div>
          <div className="flex items-center gap-3"><label htmlFor="admin-level" className={labelClass}>책 읽기 레벨</label><select id="admin-level" value={level} onChange={(event) => setLevel(event.target.value)} className={selectClass}><option value="all">레벨 선택</option>{[1, 2, 3, 4, 5, 6].map((item) => <option key={item} value={item}>{item}레벨</option>)}</select></div>
          <div className="flex items-center gap-3"><label htmlFor="admin-status" className={labelClass}>피드백 상태</label><select id="admin-status" value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}><option value="all">상태 선택</option><option value="작성전">작성전</option><option value="작성완료">작성완료</option><option value="전송완료">전송완료</option></select></div>
          <div className="flex items-center gap-3"><label htmlFor="admin-flower" className={labelClass}>섬초롱꽃</label><select id="admin-flower" value={flower} onChange={(event) => setFlower(event.target.value)} className={selectClass}><option value="all">선택</option><option value="yes">지급</option><option value="no">미지급</option></select></div>
          <div className="flex items-center gap-3"><label htmlFor="admin-keyword" className={labelClass}>검색어</label><Input id="admin-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setQuery(keyword)} placeholder="학생명, 도서명" className="h-9 flex-1 border-slate-200 shadow-none" /></div>
          <div className="col-span-full flex justify-end gap-2"><Button variant="outline" onClick={reset} className="h-9 px-5 font-normal">초기화</Button><Button onClick={() => setQuery(keyword)} className="h-9 bg-blue-600 px-5 hover:bg-blue-700">검색</Button><button type="button" onClick={() => setFiltersOpen(false)} className="flex items-center gap-1 text-sm text-blue-600">접기 <ChevronDown className="size-4 rotate-180" /></button></div>
        </section>}
        {!filtersOpen && <div className="flex justify-end"><button type="button" onClick={() => setFiltersOpen(true)} className="flex items-center gap-1 text-sm text-blue-600">필터 펼치기 <ChevronDown className="size-4" /></button></div>}

        {notice && <div role="status" className="border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>}

        <section className="bg-white px-2 pt-4">
          <div className="flex items-center justify-between gap-4 pb-3">
            <h2 className="text-lg font-semibold text-slate-800">워크북 목록</h2>
            <div className="flex items-center gap-2"><Button onClick={downloadCsv} className="h-9 gap-2 bg-[#52c41a] px-4 hover:bg-[#48ad17]"><Download className="size-4" />엑셀 다운로드</Button><button type="button" aria-label="목록 검색" onClick={() => setQuery(keyword)} className="grid size-9 place-items-center rounded-full bg-blue-600 text-white"><Search className="size-4" /></button><button type="button" aria-label="목록 새로고침" onClick={reset} className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><RefreshCw className="size-4" /></button><button type="button" aria-label="전체 화면" className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><Expand className="size-4" /></button><button type="button" aria-label="열 설정" className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><Columns3 className="size-4" /></button></div>
          </div>

          <div className="overflow-hidden border border-slate-200">
            <table className="w-full table-fixed text-[11px] 2xl:text-[13px]">
              <colgroup>{[5, 11, 7, 4, 17, 20, 10, 10, 8, 6, 4].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
              <thead className="bg-[#fafafa] text-slate-700"><tr className="h-10 border-b border-slate-200">{[
                ["고유번호", "id"], ["기관명", ""], ["학생명", ""], ["레벨", ""], ["도서명", ""], ["템플릿명", ""], ["학생 제출일", "submittedAt"], ["피드백 작성일", "feedbackAt"], ["피드백 상태", ""], ["섬초롱꽃", ""], ["관리", ""],
              ].map(([label, key]) => <th key={label} className="px-2 text-center font-semibold">{key ? <button type="button" onClick={() => toggleSort(key as SortKey)}>{label} <span className="text-slate-300">◆</span></button> : label}</th>)}</tr></thead>
              <tbody>{filteredRows.map((row) => <tr key={row.id} className="h-10 border-b border-slate-200 text-slate-600 hover:bg-slate-50"><td className="px-2 text-center">{row.id}</td><td className="truncate px-2 text-center" title={row.institution}>{row.institution}</td><td className="truncate px-2 text-center">{row.student}</td><td className="px-2 text-center">{row.level}</td><td className="truncate px-2 text-center" title={row.book}>{row.book}</td><td className="truncate px-2 text-center" title={row.template}>{row.template}</td><td className="px-2 text-center">{row.submittedAt}</td><td className="px-2 text-center">{row.feedbackAt}</td><td className="px-2 text-center">{row.status}</td><td className="px-2 text-center">{row.flowers ? `🌻 ${row.flowers}개` : "-"}</td><td className="px-2 text-center"><button type="button" aria-label={`${row.student} 워크북 관리`} onClick={() => setNotice(`${row.student} 학생의 ${row.book} 워크북을 선택했습니다.`)} className="text-blue-600"><Search className="size-4" /></button></td></tr>)}</tbody>
            </table>
          </div>

          <div className="flex h-12 items-center justify-between px-1 text-xs text-slate-600"><div className="flex items-center gap-4"><span>총 1004 레코드</span><span className="flex items-center gap-2 border-l border-slate-200 pl-4">20 항목/페이지 <ChevronDown className="size-4 text-slate-300" /></span></div><div className="flex items-center gap-3 text-slate-400"><span>│‹</span><span>≪</span><button type="button" onClick={() => setPage(Math.max(1, page - 1))}>‹</button>{[1, 2, 3, 4, 5].map((number) => <button type="button" key={number} onClick={() => setPage(number)} className={cn("grid size-7 place-items-center rounded", page === number && "bg-blue-600 text-white")}>{number}</button>)}<button type="button" onClick={() => setPage(page + 1)}>›</button><span>≫</span><span>›│</span></div></div>
        </section>
      </div>
    </div>
  )
}
