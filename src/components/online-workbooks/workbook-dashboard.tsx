"use client"

import * as React from "react"
import {
  AlertTriangle, Bot, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Download, Flower2, MailCheck, RotateCcw, Search, Send, Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  ONLINE_WORKBOOK_INSTITUTIONS, ONLINE_WORKBOOKS,
  type FeedbackStatus, type OnlineWorkbook,
} from "@/lib/online-workbooks"

type DashboardMode = "admin" | "agency"
type SortKey = "id" | "submittedAt" | "feedbackAt" | "flowers"
const PAGE_SIZE = 10

const statusStyles: Record<FeedbackStatus, string> = {
  작성전: "border-amber-200 bg-amber-50 text-amber-700",
  작성완료: "border-blue-200 bg-blue-50 text-blue-700",
  전송완료: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

const summaryMeta = [
  { status: "작성전" as const, description: "학생이 워크북을 제출한 상태", icon: CalendarDays, tone: "text-amber-600 bg-amber-50" },
  { status: "작성완료" as const, description: "피드백이 저장된 상태 (전송 전)", icon: CheckCircle2, tone: "text-blue-600 bg-blue-50" },
  { status: "전송완료" as const, description: "피드백이 학생에게 전송 완료", icon: MailCheck, tone: "text-emerald-600 bg-emerald-50" },
]

function SummaryCards({ records, mode }: { records: OnlineWorkbook[]; mode: DashboardMode }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {summaryMeta.map(({ status, description, icon: Icon, tone }) => {
        const matching = records.filter((record) => record.status === status)
        return (
          <Card key={status} className="border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-slate-800">피드백 {status}</p>
                <p className="mt-1 text-xs text-slate-500">{description}</p>
                {mode === "admin" && <p className="mt-3 text-xs font-medium text-slate-400">기관 {new Set(matching.map((record) => record.institution)).size} · 학생 {matching.length}</p>}
              </div>
              <div className={cn("rounded-xl p-2.5", tone)}><Icon className="size-5" /></div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">{matching.length}<span className="ml-1 text-sm font-semibold text-slate-400">건</span></p>
          </Card>
        )
      })}
    </div>
  )
}

function FilterSelect({ label, value, onValueChange, options }: {
  label: string; value: string; onValueChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-slate-600">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 w-full min-w-32 bg-white"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}

export function WorkbookDashboard({ mode }: { mode: DashboardMode }) {
  const [records, setRecords] = React.useState(ONLINE_WORKBOOKS)
  const [institution, setInstitution] = React.useState("all")
  const [level, setLevel] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [aiUsed, setAiUsed] = React.useState("all")
  const [flower, setFlower] = React.useState("all")
  const [keyword, setKeyword] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [anomalyOnly, setAnomalyOnly] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [sort, setSort] = React.useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "id", direction: "desc" })
  const [page, setPage] = React.useState(1)
  const [notice, setNotice] = React.useState("")
  const [dateRange, setDateRange] = React.useState<"3months" | "all">("3months")

  const filteredRecords = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return records
      .filter((record) => mode === "admin" || record.institution === "독도학원")
      .filter((record) => institution === "all" || record.institution === institution)
      .filter((record) => level === "all" || record.level === Number(level))
      .filter((record) => status === "all" || record.status === status)
      .filter((record) => aiUsed === "all" || record.aiUsed === Number(aiUsed))
      .filter((record) => flower === "all" || (flower === "yes" ? record.flowers > 0 : record.flowers === 0))
      .filter((record) => !anomalyOnly || record.anomaly)
      .filter((record) => !normalizedQuery || `${record.studentName} ${record.bookTitle}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const result = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), "ko", { numeric: true })
        return sort.direction === "asc" ? result : -result
      })
  }, [records, mode, institution, level, status, aiUsed, flower, anomalyOnly, query, sort])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const pagedRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const allVisibleSelected = pagedRecords.length > 0 && pagedRecords.every((record) => selectedIds.includes(record.id))

  React.useEffect(() => setPage(1), [institution, level, status, aiUsed, flower, anomalyOnly, query])
  React.useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages])

  const reset = () => {
    setInstitution("all"); setLevel("all"); setStatus("all"); setAiUsed("all"); setFlower("all")
    setKeyword(""); setQuery(""); setAnomalyOnly(false); setDateRange("3months"); setSelectedIds([]); setNotice("")
  }

  const toggleSort = (key: SortKey) => setSort((current) => current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" })

  const toggleAllVisible = (checked: boolean) => {
    const visibleIds = pagedRecords.map((record) => record.id)
    setSelectedIds((current) => checked ? Array.from(new Set([...current, ...visibleIds])) : current.filter((id) => !visibleIds.includes(id)))
  }

  const runBulkAction = (action: "ai" | "send" | "parent" | "flower") => {
    if (!selectedIds.length) return
    const labels = { ai: "AI 피드백 생성", send: "피드백 전송", parent: "학부모 발송", flower: "섬초롱꽃 지급" }
    setRecords((current) => current.map((record) => {
      if (!selectedIds.includes(record.id)) return record
      if (action === "ai") return { ...record, aiUsed: Math.min(2, record.aiUsed + 1) }
      if (action === "send" && record.status === "작성완료") return { ...record, status: "전송완료" }
      if (action === "parent" && record.status === "전송완료") return { ...record, parentSent: true }
      if (action === "flower") return { ...record, flowers: record.flowers || 10 }
      return record
    }))
    setNotice(`${selectedIds.length}건의 ${labels[action]} 작업을 프로토타입 데이터에 반영했습니다.`)
    setSelectedIds([])
  }

  const downloadCsv = () => {
    const headings = ["고유번호", "기관", "학생 이름", "레벨", "도서명", "템플릿명", "학생 제출일", "피드백 작성일", "피드백 상태", "섬초롱꽃"]
    const rows = filteredRecords.map((record) => [record.id, record.institution, record.studentName, record.level, record.bookTitle, record.templateName, record.submittedAt, record.feedbackAt ?? "", record.status, record.flowers])
    const csv = [headings, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "online-workbooks.csv"; anchor.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6 pb-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Online workbook</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{mode === "admin" ? "[본사] 온라인 워크북 현황" : "[기관] 온라인 워크북 목록"}</h1>
        <p className="mt-2 text-sm text-slate-500">학생 제출부터 피드백 작성·전송까지 한 화면에서 관리합니다.</p>
      </div>

      <SummaryCards records={mode === "admin" ? records : records.filter((record) => record.institution === "독도학원")} mode={mode} />

      {mode === "agency" && (
        <>
          <button type="button" onClick={() => setAnomalyOnly((current) => !current)} className={cn("flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors", anomalyOnly ? "border-amber-400 bg-amber-100" : "border-amber-200 bg-amber-50 hover:bg-amber-100/70")}>
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div><p className="font-bold text-amber-900">워크북 특이사항 감지 {records.filter((record) => record.institution === "독도학원" && record.anomaly).length}건</p><p className="mt-1 text-xs leading-5 text-amber-800">불성실 작성·반복 텍스트·비속어 등의 기준에 따라 자동 감지된 워크북입니다. 배너를 클릭하면 해당 워크북만 표시됩니다.</p></div>
          </button>
          <Card className="border-blue-100 bg-blue-50/60 p-5 shadow-none">
            <ul className="grid gap-2 text-xs leading-5 text-blue-950 md:grid-cols-2">
              <li>• 피드백 작성전인 워크북을 우선적으로 처리해 주세요.</li><li>• AI 생성 후 내용을 확인하고 피드백을 저장해 주세요.</li>
              <li>• AI 자동 작성은 워크북당 최대 2회까지 사용할 수 있습니다.</li><li>• 저장한 피드백은 학생에게 전송해야 완료됩니다.</li>
              <li>• 학부모 발송은 1회만 가능하니 신중히 진행해 주세요.</li>
            </ul>
          </Card>
        </>
      )}

      <Card className="border-slate-200 bg-white p-5 shadow-sm">
        {mode === "admin" && (
          <div className="mb-5 flex flex-wrap items-end gap-3 border-b border-slate-100 pb-5">
            <div className="mr-auto space-y-2"><Label className="text-xs font-bold text-slate-600">집계 기간</Label><div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">2026.05.24 - 2026.08.24</div></div>
            <Button variant={dateRange === "3months" ? "default" : "outline"} onClick={() => setDateRange("3months")}>최근 3개월</Button>
            <Button variant={dateRange === "all" ? "default" : "outline"} onClick={() => setDateRange("all")}>전체 기간</Button>
          </div>
        )}
        <div className={cn("grid gap-4", mode === "admin" ? "md:grid-cols-2 xl:grid-cols-6" : "md:grid-cols-2 xl:grid-cols-5")}>
          {mode === "admin" && <FilterSelect label="기관" value={institution} onValueChange={setInstitution} options={[{ value: "all", label: "기관 선택" }, ...ONLINE_WORKBOOK_INSTITUTIONS.map((item) => ({ value: item, label: item }))]} />}
          <FilterSelect label="책 읽기 레벨" value={level} onValueChange={setLevel} options={[{ value: "all", label: "전체" }, ...[1, 2, 3, 4, 5, 6].map((item) => ({ value: String(item), label: `${item}레벨` }))]} />
          <FilterSelect label="피드백 상태" value={status} onValueChange={setStatus} options={[{ value: "all", label: "전체" }, ...summaryMeta.map((item) => ({ value: item.status, label: item.status }))]} />
          {mode === "agency" && <FilterSelect label="AI 사용횟수" value={aiUsed} onValueChange={setAiUsed} options={[{ value: "all", label: "전체" }, { value: "0", label: "0회" }, { value: "1", label: "1회" }, { value: "2", label: "2회" }]} />}
          <FilterSelect label="섬초롱꽃" value={flower} onValueChange={setFlower} options={[{ value: "all", label: "전체" }, { value: "yes", label: "지급" }, { value: "no", label: "미지급" }]} />
          <div className="space-y-2 xl:col-span-2"><Label className="text-xs font-bold text-slate-600">검색어</Label><div className="flex gap-2"><Input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setQuery(keyword)} placeholder={mode === "admin" ? "학생명 또는 도서명 검색" : "학생명 또는 도서명을 입력"} className="h-10" /><Button onClick={() => setQuery(keyword)} className="gap-2"><Search className="size-4" />검색</Button></div></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {mode === "agency" ? <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600"><Checkbox checked={anomalyOnly} onCheckedChange={(checked) => setAnomalyOnly(checked === true)} />특이사항 감지 워크북만 보기</label> : <span />}
          <Button variant="ghost" onClick={reset} className="gap-2 text-slate-500"><RotateCcw className="size-4" />재설정</Button>
        </div>
      </Card>

      {mode === "agency" && <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!selectedIds.length} onClick={() => runBulkAction("ai")} className="gap-2"><Bot className="size-4" />일괄 AI 피드백 생성 ({selectedIds.length})</Button>
        <Button variant="outline" disabled={!selectedIds.length} onClick={() => runBulkAction("send")} className="gap-2"><Send className="size-4" />일괄 피드백 전송 ({selectedIds.length})</Button>
        <Button variant="outline" disabled={!selectedIds.length} onClick={() => runBulkAction("parent")} className="gap-2"><MailCheck className="size-4" />일괄 학부모 발송 ({selectedIds.length})</Button>
        <Button variant="outline" disabled={!selectedIds.length} onClick={() => runBulkAction("flower")} className="gap-2"><Flower2 className="size-4" />일괄 섬초롱꽃 지급 ({selectedIds.length})</Button>
      </div>}

      {notice && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><Sparkles className="size-4" />{notice}</div>}

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-black text-slate-800">워크북 목록</h2><p className="mt-1 text-xs text-slate-400">총 {filteredRecords.length}개 결과</p></div>{mode === "admin" && <Button variant="outline" onClick={downloadCsv} className="gap-2"><Download className="size-4" />엑셀 다운로드</Button>}</div>
        <Table>
          <TableHeader className="bg-slate-50"><TableRow>
            {mode === "agency" && <TableHead className="w-12 text-center"><Checkbox aria-label="모든 항목 선택" checked={allVisibleSelected} onCheckedChange={(checked) => toggleAllVisible(checked === true)} /></TableHead>}
            <TableHead><button onClick={() => toggleSort("id")} className="font-bold">고유번호 ↕</button></TableHead>{mode === "admin" && <TableHead>기관</TableHead>}<TableHead>학생 이름</TableHead><TableHead className="text-center">레벨</TableHead><TableHead>도서명</TableHead>{mode === "admin" && <TableHead>템플릿명</TableHead>}<TableHead><button onClick={() => toggleSort("submittedAt")} className="font-bold">학생 제출일 ↕</button></TableHead><TableHead><button onClick={() => toggleSort("feedbackAt")} className="font-bold">피드백 작성일 ↕</button></TableHead><TableHead>피드백 상태</TableHead>
            {mode === "agency" && <><TableHead className="text-center">피드백 전송</TableHead><TableHead className="text-center">학부모 발송</TableHead></>}<TableHead className="text-center"><button onClick={() => toggleSort("flowers")} className="font-bold">섬초롱꽃 ↕</button></TableHead><TableHead className="text-center">{mode === "agency" ? "피드백 작성 (AI 잔여)" : "상세"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!pagedRecords.length ? <TableRow><TableCell colSpan={mode === "admin" ? 11 : 12} className="h-40 text-center text-slate-400">조건에 맞는 온라인 워크북이 없습니다.</TableCell></TableRow> : pagedRecords.map((record) => <TableRow key={record.id} data-state={selectedIds.includes(record.id) ? "selected" : undefined}>
              {mode === "agency" && <TableCell className="text-center"><Checkbox aria-label={`${record.studentName} 학생 선택`} checked={selectedIds.includes(record.id)} onCheckedChange={(checked) => setSelectedIds((current) => checked ? [...current, record.id] : current.filter((id) => id !== record.id))} /></TableCell>}
              <TableCell className="font-mono text-xs font-bold text-slate-600">{record.id}</TableCell>{mode === "admin" && <TableCell><Badge variant="outline">{record.institution}</Badge></TableCell>}<TableCell><div className="flex items-center gap-2"><span className="font-bold text-slate-800">{record.studentName}</span>{record.anomaly && <AlertTriangle aria-label="특이사항 감지" className="size-4 text-amber-500" />}</div></TableCell><TableCell className="text-center"><span className="inline-flex size-7 items-center justify-center rounded-lg bg-blue-50 font-black text-blue-700">{record.level}</span></TableCell><TableCell className="font-medium text-slate-700">{record.bookTitle}</TableCell>{mode === "admin" && <TableCell className="text-slate-500">{record.templateName}</TableCell>}<TableCell className="text-slate-500">{record.submittedAt}</TableCell><TableCell className="text-slate-500">{record.feedbackAt ?? "-"}</TableCell><TableCell><Badge variant="outline" className={statusStyles[record.status]}>{record.status}</Badge></TableCell>
              {mode === "agency" && <><TableCell className="text-center">{record.status === "전송완료" ? <CheckCircle2 className="mx-auto size-4 text-emerald-500" /> : "-"}</TableCell><TableCell className="text-center">{record.parentSent ? <CheckCircle2 className="mx-auto size-4 text-emerald-500" /> : "-"}</TableCell></>}<TableCell className="text-center">{record.flowers ? <span className="font-bold text-amber-600">🌻{record.flowers}</span> : "-"}</TableCell><TableCell className="text-center">{mode === "agency" ? <span className="font-bold text-blue-700">{2 - record.aiUsed}/2</span> : <Button size="sm" variant="ghost" onClick={() => setNotice(`${record.studentName} 학생의 ${record.bookTitle} 워크북을 선택했습니다.`)}>보기</Button>}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4"><p className="text-xs text-slate-500">총 <strong>{filteredRecords.length}</strong>개 · {page}/{totalPages} 페이지</p><div className="flex items-center gap-1"><Button size="icon" variant="ghost" disabled={page === 1} onClick={() => setPage((current) => current - 1)} aria-label="이전 페이지"><ChevronLeft className="size-4" /></Button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <Button key={pageNumber} size="icon" variant={page === pageNumber ? "default" : "ghost"} onClick={() => setPage(pageNumber)}>{pageNumber}</Button>)}<Button size="icon" variant="ghost" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} aria-label="다음 페이지"><ChevronRight className="size-4" /></Button></div></div>
      </Card>
    </div>
  )
}
