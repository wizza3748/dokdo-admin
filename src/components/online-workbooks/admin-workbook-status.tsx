"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, CircleHelp, Download, FileText, RefreshCw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminWorkbookRow } from "@/lib/admin-workbook-seeds"
import {
  getAgencyWorkbookListAsync,
  subscribeStudentSubmittedAgencyWorkbooks,
  type FeedbackStatus,
} from "@/lib/online-workbooks"
import { cn } from "@/lib/utils"
import {
  matchesWorkbookClassification,
  REPORT_STATUS_OPTIONS,
  workbookClassification,
  WRITING_TYPE_OPTIONS,
} from "@/lib/workbook-classification"

import { ReviewListTools } from "./review-list-tools"

type SortKey = "id" | "submittedAt" | "feedbackAt"
type Period = "today" | "custom" | "three" | "all"

const labelClass = "w-[88px] shrink-0 text-right text-sm font-semibold text-slate-700"

const statusText: Record<FeedbackStatus, string> = {
  작성전: "피드백 작성 전",
  작성완료: "피드백 작성 완료",
  전송완료: "피드백 전송 완료",
}

const summary = [
  { status: "작성전" as const, title: "피드백 작성전", description: "학생이 독후감을 제출한 상태", color: "text-slate-700" },
  { status: "작성완료" as const, title: "피드백 작성완료", description: "피드백이 저장된 상태 (전송 전)", color: "text-blue-500" },
  { status: "전송완료" as const, title: "피드백 전송완료", description: "피드백이 학생에게 전송 완료", color: "text-emerald-500" },
]

function writingInfo(row: AdminWorkbookRow) {
  const classification = workbookClassification(row)
  return classification.writing === "기존 방식" ? "기존" : classification.writing
}

function secondDecisionInfo(row: AdminWorkbookRow) {
  const classification = workbookClassification(row)
  return classification.writing === "1차" ? classification.decision : "-"
}

function CompactSelect({ value, onValueChange, placeholder, options, label }: {
  label?: string
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label} className="h-9 min-w-0 flex-1 rounded-md border-slate-200 bg-white px-3 text-[13px] shadow-none">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function SummaryCards({ records, selectedStatus, onSelect }: {
  records: AdminWorkbookRow[]
  selectedStatus: string
  onSelect: (status: FeedbackStatus) => void
}) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {summary.map((item) => {
        const matching = records.filter((record) => record.status === item.status)
        const institutionCount = new Set(matching.map((record) => record.institution)).size
        const studentCount = new Set(matching.map((record) => `${record.institution}:${record.student}`)).size
        return (
          <button
            type="button"
            onClick={() => onSelect(item.status)}
            key={item.status}
            className={cn(
              "flex h-[104px] items-center justify-between rounded-[10px] border bg-white px-7 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:border-blue-300",
              selectedStatus === item.status ? "border-blue-500 ring-1 ring-blue-100" : "border-slate-200",
            )}
          >
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-700">{item.title}</h2>
              <p className={cn("mt-1 text-sm", item.color)}>{item.description}</p>
              <p className="mt-1 text-xs text-slate-400">{institutionCount}개 기관 · {studentCount}명 학생</p>
            </div>
            <p className="shrink-0 pl-4 text-[32px] font-bold leading-none text-slate-700">
              {matching.length}<span className="ml-1 text-sm font-normal">건</span>
            </p>
          </button>
        )
      })}
    </section>
  )
}

export function AdminWorkbookStatus() {
  const [studentRows, setStudentRows] = React.useState<AdminWorkbookRow[]>([])
  const [period, setPeriod] = React.useState<Period>("today")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [institution, setInstitution] = React.useState("all")
  const [level, setLevel] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [flower, setFlower] = React.useState("all")
  const [writingRound, setWritingRound] = React.useState("전체")
  const [reportFilter, setReportFilter] = React.useState("전체")
  const [keyword, setKeyword] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [filtersOpen, setFiltersOpen] = React.useState(true)
  const [guideOpen, setGuideOpen] = React.useState(false)
  const [sort, setSort] = React.useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "submittedAt", direction: "desc" })
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(50)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [notice, setNotice] = React.useState("")

  React.useEffect(() => {
    const today = new Date().toLocaleDateString("sv-SE")
    setStartDate(today)
    setEndDate(today)
  }, [])

  React.useEffect(() => {
    setPage(1)
  }, [institution, level, status, flower, query, sort, writingRound, reportFilter, period, startDate, endDate, pageSize])

  React.useEffect(() => {
    let active = true
    const syncRows = async () => {
      const records = await getAgencyWorkbookListAsync("admin")
      if (!active) return
      setStudentRows(records.map((record) => ({
        id: record.id,
        displayNumber: record.displayNumber,
        writingRound: record.writingRound,
        secondDecision: record.secondDecision,
        reportStatus: record.reportStatus,
        reviewId: record.reviewId,
        institution: record.institution,
        student: record.studentName,
        level: record.level,
        book: record.bookTitle,
        template: record.templateName,
        submittedAt: record.submittedAt,
        submittedAtTime: record.submittedAtTime,
        feedbackAt: record.feedbackAt ?? "",
        status: record.status,
        flowers: record.flowers,
      })))
    }
    void syncRows()
    const unsubscribe = subscribeStudentSubmittedAgencyWorkbooks(() => void syncRows())
    const interval = window.setInterval(() => void syncRows(), 1500)
    return () => {
      active = false
      unsubscribe()
      window.clearInterval(interval)
    }
  }, [refreshKey])

  const baseFilteredRows = React.useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return studentRows
      .filter((row) => matchesWorkbookClassification(row, writingRound, "전체", reportFilter))
      .filter((row) => period === "all" || ((!startDate || row.submittedAt >= startDate) && (!endDate || row.submittedAt <= endDate)))
      .filter((row) => institution === "all" || row.institution === institution)
      .filter((row) => level === "all" || row.level === Number(level))
      .filter((row) => flower === "all" || row.flowers === Number(flower))
      .filter((row) => !normalized || `${row.student} ${row.book}`.toLowerCase().includes(normalized))
  }, [studentRows, institution, level, flower, query, writingRound, reportFilter, period, startDate, endDate])

  const filteredRows = React.useMemo(() => baseFilteredRows
    .filter((row) => status === "all" || row.status === status)
    .sort((a, b) => {
      const aDisplayNumber = a.displayNumber ?? a.id.padStart(5, "0")
      const bDisplayNumber = b.displayNumber ?? b.id.padStart(5, "0")
      const aValue = sort.key === "id" ? aDisplayNumber : sort.key === "submittedAt" ? a.submittedAtTime || a.submittedAt : a.feedbackAt
      const bValue = sort.key === "id" ? bDisplayNumber : sort.key === "submittedAt" ? b.submittedAtTime || b.submittedAt : b.feedbackAt
      const result = aValue.localeCompare(bValue, "ko", { numeric: true })
      const fallback = result || aDisplayNumber.localeCompare(bDisplayNumber, "ko", { numeric: true })
      return sort.direction === "asc" ? fallback : -fallback
    }), [baseFilteredRows, status, sort])

  const institutionOptions = React.useMemo(() => [
    { value: "all", label: "전체" },
    ...Array.from(new Set(studentRows.map((row) => row.institution))).sort((a, b) => a.localeCompare(b, "ko")).map((value) => ({ value, label: value })),
  ], [studentRows])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (key: SortKey) => setSort((current) => current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" })

  const setRecentThreeMonths = () => {
    const today = new Date()
    const start = new Date(today)
    start.setMonth(start.getMonth() - 3)
    setStartDate(start.toLocaleDateString("sv-SE"))
    setEndDate(today.toLocaleDateString("sv-SE"))
    setPeriod("three")
  }

  const reset = () => {
    const today = new Date().toLocaleDateString("sv-SE")
    setPeriod("today")
    setStartDate(today)
    setEndDate(today)
    setInstitution("all")
    setLevel("all")
    setStatus("all")
    setFlower("all")
    setWritingRound("전체")
    setReportFilter("전체")
    setKeyword("")
    setQuery("")
    setPage(1)
    setNotice("")
  }

  const downloadCsv = () => {
    const headings = ["고유번호", "기관명", "학생명", "레벨", "도서명", "템플릿명", "차수", "2차 작성 여부", "학생 제출일", "피드백 작성일", "피드백 상태", "섬초롱꽃", "평가 보고서"]
    const data = filteredRows.map((row) => {
      const classification = workbookClassification(row)
      return [row.displayNumber ?? row.id.padStart(5, "0"), row.institution, row.student, row.level, row.book, row.template, writingInfo(row), secondDecisionInfo(row), row.submittedAt, row.feedbackAt || "-", statusText[row.status], row.flowers || "-", classification.report]
    })
    const csv = [headings, ...data].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "online-review-status.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="-m-4 min-h-full bg-[#f3f5f7] lg:-m-6">
      <section className="bg-white px-5 py-5">
        <h1 className="text-xl font-semibold text-slate-800">독도 온라인 독후감 현황</h1>
        <p className="mt-4 text-sm text-slate-600">전체 기관의 책 읽기 온라인 독후감 진행 및 피드백 상태를 통합 조회할 수 있습니다.</p>
      </section>

      <div className="space-y-4 p-4">
        <SummaryCards records={baseFilteredRows} selectedStatus={status} onSelect={setStatus} />

        <section className="border border-blue-100 bg-[#edf7ff] text-sm leading-7 text-blue-600">
          <button type="button" aria-expanded={guideOpen} aria-controls="admin-workbook-guide" onClick={() => setGuideOpen(open => !open)} className="flex w-full cursor-pointer items-center justify-between px-6 py-3 text-left font-semibold focus-visible:outline-2 focus-visible:outline-blue-600">
            <span>온라인 독후감 현황 조회 안내</span><span className="flex items-center gap-1 font-normal">{guideOpen ? "접기" : "펼치기"}<ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", guideOpen && "rotate-180")} /></span>
          </button>
          <div id="admin-workbook-guide" hidden={!guideOpen} className="mx-6 mb-3 border-t border-blue-100">
            <ol className="list-decimal divide-y divide-blue-100 pl-7 text-sm leading-5">
              <li className="py-2"><strong>1차 제출:</strong> 피드백 작성 → 2차 작성 여부 선택 → 저장 → 학생 전송 순서로 진행됩니다.</li>
              <li className="py-2"><strong>학생 확인:</strong> 1차 완료 글은 활동이 끝나고, 2차 작성 요청 글은 학생이 2차 작성을 시작합니다.</li>
              <li className="py-2"><strong>2차 진행:</strong> 학생의 2차 제출 → 피드백 작성·저장 → 학생 전송 → 학생 확인 후 최종 완료됩니다.</li>
            </ol>
            <p className="border-t border-blue-100 py-2 text-sm leading-5">본사관리자는 차수별 작성글·피드백·평가 보고서 이력을 조회하며, 피드백 작성·수정·전송은 할 수 없습니다.</p>
          </div>
        </section>

        <div role="group" aria-label="조회 기간" className="flex gap-2">
          <Button aria-pressed={period === "today"} variant={period === "today" ? "default" : "outline"} onClick={() => { const today = new Date().toLocaleDateString("sv-SE"); setPeriod("today"); setStartDate(today); setEndDate(today) }} className={cn("h-9", period === "today" && "bg-blue-600")}>오늘</Button>
          <Button aria-pressed={period === "three"} variant={period === "three" ? "default" : "outline"} onClick={setRecentThreeMonths} className={cn("h-9", period === "three" && "bg-blue-600")}>최근 3개월</Button>
          <Button aria-pressed={period === "all"} variant={period === "all" ? "default" : "outline"} onClick={() => { setPeriod("all"); setStartDate(""); setEndDate("") }} className={cn("h-9", period === "all" && "bg-blue-600")}>전체 기간</Button>
        </div>

        {filtersOpen && (
          <section className="grid gap-x-10 gap-y-3 bg-white px-8 py-6 lg:grid-cols-3">
            <div className="flex items-center gap-3">
              <span className={labelClass}>집계 기간</span>
              <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-600">
                <input aria-label="시작일" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPeriod("custom") }} className="min-w-0 flex-1 bg-transparent outline-none" />
                <span>→</span>
                <input aria-label="종료일" type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPeriod("custom") }} className="min-w-0 flex-1 bg-transparent outline-none" />
              </div>
            </div>
            <div className="flex items-center gap-3"><span className={labelClass}>기관</span><CompactSelect label="기관" value={institution} onValueChange={setInstitution} placeholder="전체" options={institutionOptions} /></div>
            <div className="flex items-center gap-3"><span className={labelClass}>책읽기 레벨</span><CompactSelect label="책읽기 레벨" value={level} onValueChange={setLevel} placeholder="전체" options={[{ value: "all", label: "전체" }, ...[1, 2, 3, 4, 5, 6].map((item) => ({ value: String(item), label: `${item}레벨` }))]} /></div>
            <div className="flex items-center gap-3"><span className={labelClass}>차수</span><CompactSelect label="차수" value={writingRound} onValueChange={setWritingRound} placeholder="전체" options={WRITING_TYPE_OPTIONS.map((value) => ({ value, label: value === "기존 방식" ? "기존" : value }))} /></div>
            <div className="flex items-center gap-3"><span className={labelClass}>피드백 상태</span><CompactSelect label="피드백 상태" value={status} onValueChange={setStatus} placeholder="전체" options={[{ value: "all", label: "전체" }, { value: "작성전", label: "피드백 작성 전" }, { value: "작성완료", label: "피드백 작성 완료" }, { value: "전송완료", label: "피드백 전송 완료" }]} /></div>
            <div className="flex items-center gap-3"><span className={labelClass}>평가 보고서</span><CompactSelect label="평가 보고서" value={reportFilter} onValueChange={setReportFilter} placeholder="전체" options={REPORT_STATUS_OPTIONS.map((value) => ({ value, label: value }))} /></div>
            <div className="flex items-center gap-3"><span className={labelClass}>섬초롱꽃</span><CompactSelect label="섬초롱꽃" value={flower} onValueChange={setFlower} placeholder="전체" options={[{ value: "all", label: "전체" }, { value: "0", label: "미지급" }, ...[5, 10, 15, 20].map((amount) => ({ value: String(amount), label: `${amount}개` }))]} /></div>
            <div className="flex items-center gap-3"><label htmlFor="admin-keyword" className={labelClass}>검색</label><Input id="admin-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setQuery(keyword)} placeholder="학생명 또는 도서명 검색" className="h-9 flex-1 border-slate-200 text-[13px] shadow-none" /></div>
            <div className="col-span-full flex flex-wrap items-center justify-end gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={reset} className="h-9 border-slate-200 px-5 font-normal">초기화</Button>
                <Button onClick={() => setQuery(keyword)} className="h-9 bg-blue-600 px-5 hover:bg-blue-700">검색</Button>
                <button type="button" onClick={() => setFiltersOpen(false)} className="flex h-9 items-center gap-1 text-sm text-blue-600">접기 <ChevronDown className="size-4 rotate-180" /></button>
              </div>
            </div>
          </section>
        )}
        {!filtersOpen && <div className="flex justify-end"><button type="button" onClick={() => setFiltersOpen(true)} className="flex items-center gap-1 text-sm text-blue-600">필터 펼치기 <ChevronDown className="size-4" /></button></div>}

        {notice && <div role="status" className="border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>}

        <section id="admin-review-table" className="min-h-[700px] bg-white px-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <h2 className="text-lg font-semibold text-slate-800">온라인 독후감 목록</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button onClick={downloadCsv} className="h-9 gap-2 bg-[#52c41a] px-4 hover:bg-[#48ad17]"><Download className="size-4" />엑셀 다운로드</Button>
              <button type="button" aria-label="목록 검색" onClick={() => setQuery(keyword)} className="grid size-9 place-items-center rounded-full bg-blue-600 text-white"><Search className="size-4" /></button>
              <button type="button" aria-label="목록 새로고침" onClick={() => setRefreshKey((current) => current + 1)} className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><RefreshCw className="size-4" /></button>
              <ReviewListTools tableId="admin-review-table" columns={["고유번호", "기관명", "학생명", "레벨", "도서명", "템플릿명", "차수", "2차 작성 여부", "학생 제출일", "피드백 작성일", "피드백 상태", "섬초롱꽃", "평가 보고서", "관리"]} />
            </div>
          </div>

          <div className="min-h-[610px] overflow-auto border border-slate-200">
            <Table className="min-w-[1600px] whitespace-nowrap text-[11px] 2xl:text-[13px]">
              <TableHeader className="bg-[#fafafa]">
                <TableRow className="h-14 hover:bg-transparent">
                  <TableHead className="text-center"><button type="button" onClick={() => toggleSort("id")} className="font-semibold">고유번호 <span className="text-slate-300">◆</span></button></TableHead>
                  <TableHead className="text-center font-semibold">기관명</TableHead>
                  <TableHead className="text-center font-semibold">학생명</TableHead>
                  <TableHead className="text-center font-semibold">레벨</TableHead>
                  <TableHead className="text-center font-semibold">도서명</TableHead>
                  <TableHead className="text-center font-semibold">템플릿명</TableHead>
                  <TableHead className="text-center font-semibold">차수</TableHead>
                  <TableHead className="text-center font-semibold">2차 작성 여부</TableHead>
                  <TableHead className="text-center"><button type="button" onClick={() => toggleSort("submittedAt")} className="font-semibold">학생 제출일 <span className="text-slate-300">◆</span></button></TableHead>
                  <TableHead className="text-center"><button type="button" onClick={() => toggleSort("feedbackAt")} className="font-semibold">피드백 작성일 <span className="text-slate-300">◆</span></button></TableHead>
                  <TableHead className="text-center font-semibold">피드백 상태</TableHead>
                  <TableHead className="text-center font-semibold">섬초롱꽃</TableHead>
                  <TableHead className="text-center font-semibold">평가 보고서</TableHead>
                  <TableHead className="text-center font-semibold">관리 <CircleHelp className="inline size-3 text-slate-500" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => {
                  const classification = workbookClassification(row)
                  return (
                    <TableRow key={row.id} className="h-[46px] text-slate-700 hover:bg-slate-50">
                      <TableCell className="text-center tabular-nums">{row.displayNumber ?? row.id.padStart(5, "0")}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-center" title={row.institution}>{row.institution}</TableCell>
                      <TableCell className="text-center">{row.student}</TableCell>
                      <TableCell className="text-center">{row.level}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-center" title={row.book}>{row.book}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-center" title={row.template}>{row.template}</TableCell>
                      <TableCell className="text-center">{writingInfo(row)}</TableCell>
                      <TableCell className="text-center">{secondDecisionInfo(row)}</TableCell>
                      <TableCell className="text-center">{row.submittedAt}</TableCell>
                      <TableCell className="text-center">{row.feedbackAt || "-"}</TableCell>
                      <TableCell className="text-center">{statusText[row.status]}</TableCell>
                      <TableCell className="text-center">{row.flowers ? <span>🌻&nbsp; {row.flowers}개</span> : "-"}</TableCell>
                      <TableCell className="text-center">
                        {classification.report === "생성 완료" ? (
                          <Link
                            target="_blank"
                            href={`/online-review/report/${row.id}?role=admin`}
                            aria-label={`${writingInfo(row)} 보고서 보기`}
                            title={`${writingInfo(row)} 보고서 보기`}
                            className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50"
                          >
                            <FileText className="size-4" />
                          </Link>
                        ) : classification.report}
                      </TableCell>
                      <TableCell className="text-center">
                        <button type="button" aria-label={`${row.student} 독후감 관리`} onClick={() => row.reviewId ? window.open(`/agency/online-workbooks/${row.id}?role=admin`, "_blank", "noopener") : setNotice("연결된 상세 데이터가 없는 항목입니다.")} className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50"><Search className="size-4" /></button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!filteredRows.length && <TableRow><TableCell colSpan={14} className="h-40 text-center text-slate-400">조건에 맞는 온라인 독후감이 없습니다.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>

          <div className="flex h-12 items-center justify-between px-1 text-[13px] text-slate-600">
            <div className="flex items-center gap-4"><span>총 {filteredRows.length} 레코드</span><span className="flex items-center gap-3 border-l border-slate-200 pl-4"><label>페이지당 항목 수 <select aria-label="페이지당 항목 수" className="rounded border p-1" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{[10, 20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></span></div>
            <div className="flex items-center gap-3"><Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((current) => current - 1)}>이전</Button><span>{currentPage} / {pageCount}</span><Button variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage((current) => current + 1)}>다음</Button></div>
          </div>
        </section>
      </div>
    </div>
  )
}
