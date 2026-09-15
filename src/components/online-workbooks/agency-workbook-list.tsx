"use client"

import * as React from "react"
import { ReviewListTools } from "./review-list-tools"
import Link from "next/link"
import {
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  FileText,
  Flower2,
  Mail,
  Pencil,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AGENCY_ONLINE_WORKBOOKS,
  getAgencyWorkbookListAsync,
  subscribeStudentSubmittedAgencyWorkbooks,
  upsertStudentSubmittedAgencyWorkbook,
  type FeedbackStatus,
  type OnlineWorkbook,
} from "@/lib/online-workbooks"
import { performReviewListAction } from "@/lib/review-list-adapter"
import { cn } from "@/lib/utils"
import { workbookClassification } from "@/lib/workbook-classification"

type SortKey = "id" | "submittedAt"
type FilterOption = { value: string; label: string }

const writingFilterOptions: FilterOption[] = [
  { value: "all", label: "전체" },
  { value: "legacy", label: "기존" },
  { value: "first", label: "1차" },
  { value: "second", label: "2차" },
]

const reportFilterOptions: FilterOption[] = [
  { value: "all", label: "전체" },
  { value: "legacy", label: "해당 없음 (-)" },
  { value: "unavailable", label: "미제공" },
  { value: "pending", label: "준비 중" },
  { value: "ready", label: "보고서 있음" },
]

const statusText: Record<FeedbackStatus, string> = {
  작성전: "피드백 작성 전",
  작성완료: "피드백 작성 완료",
  전송완료: "피드백 전송 완료",
}

const summary = [
  { status: "작성전" as const, title: "피드백 작성전", description: "학생이 온라인 독후감을 제출한 상태", color: "text-slate-700" },
  { status: "작성완료" as const, title: "피드백 작성완료", description: "피드백이 저장된 상태 (전송 전)", color: "text-blue-500" },
  { status: "전송완료" as const, title: "피드백 전송완료", description: "피드백이 학생에게 전송 완료", color: "text-emerald-500" },
]

function writingInfo(record: OnlineWorkbook) {
  const classification = workbookClassification(record)
  if (classification.writing === "기존 방식") return "기존"
  return classification.writing
}

function secondDecisionInfo(record: OnlineWorkbook) {
  const classification = workbookClassification(record)
  return classification.writing === "1차" ? classification.decision : "-"
}

function reportText(record: OnlineWorkbook) {
  const classification = workbookClassification(record)
  if (classification.report === "-") return "-"
  if (classification.report === "생성 불가") return "미제공"
  if (classification.report === "생성 전") return "준비 중"
  return `${classification.writing} 보고서 보기`
}

function ReportCell({ record, role }: { record: OnlineWorkbook; role: "agency" | "class" }) {
  const classification = workbookClassification(record)
  if (classification.report !== "생성 완료") return <span className="text-slate-400">{reportText(record)}</span>
  const label = `${classification.writing} 보고서 보기`
  return (
    <Link
      target="_blank"
      href={`/online-review/report/${record.id}?role=${role}`}
      aria-label={label}
      title={label}
      className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50"
    >
      <FileText className="size-4" />
    </Link>
  )
}

function FeedbackAction({ record, role }: { record: OnlineWorkbook; role: "agency" | "class" }) {
  const action = record.status === "작성전" ? "작성" : record.status === "작성완료" ? "수정" : "보기"
  const isEditable = record.status !== "전송완료"
  return (
    <Link
      href={`/agency/online-workbooks/${record.id}?role=${role}`}
      aria-label={`${record.studentName} 피드백 ${action}, AI 사용 ${record.aiUsed}/2회`}
      className="inline-flex items-center gap-2 font-medium text-blue-600 hover:underline"
    >
      <Pencil className={cn("size-4", isEditable ? "text-blue-600" : "text-slate-400")} />
      <span className="tabular-nums">({record.aiUsed}/2)</span>
    </Link>
  )
}

function HeaderHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" aria-label={label} className="ml-1 inline-flex text-slate-400 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600">
        <CircleHelp className="size-3.5" />
      </button>
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-64 -translate-x-1/2 whitespace-normal rounded-lg bg-slate-800 px-3 py-2 text-left text-xs font-normal leading-5 text-white shadow-lg group-hover:block group-focus-within:block">
        {children}
      </span>
    </span>
  )
}

type BulkAction = "ai" | "send" | "parent" | "flower"
type ActionDialog = { kind: "bulk"; action: BulkAction } | { kind: "parent" | "single-send"; record: OnlineWorkbook } | null

const flowerCriteria = [
  { amount: 5, medal: "🥉", description: "작성 내용이 단순하고, 구체적인 감상 표현이 부족한 글" },
  { amount: 10, medal: "🥈", description: "독서록 양식에 따라 충실히 작성했으나, 의견이나 생각이 부족한 글" },
  { amount: 15, medal: "🥇", description: "인상 깊은 내용을 구체적으로 쓰고, 경험이나 생각과 연결해 감상을 풍부하게 적은 글" },
  { amount: 20, medal: "🏆", description: "주제에 대한 깊이 있는 분석, 창의적 해석과 독창적인 표현이 돋보이는 글" },
]

function AlertDialog({ title, message, onClose, onConfirm }: { title: string; message: React.ReactNode; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/45 p-4">
      <div role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-[520px] rounded-2xl bg-white px-7 py-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-amber-400 text-sm font-black text-white">!</span>
          <div className="min-w-0 flex-1"><h2 className="text-xl font-bold text-slate-700">{title}</h2><div className="mt-4 text-[15px] leading-7 text-slate-600">{message}</div></div>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>취소</Button><Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">확인</Button></div>
      </div>
    </div>
  )
}

function FlowerDialog({ count, selectedFlower, onSelect, onClose, onConfirm }: { count: number; selectedFlower: number | null; onSelect: (amount: number) => void; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/45 p-4">
      <div role="dialog" aria-modal="true" aria-label={`선택한 ${count}개 온라인 독후감에 섬초롱꽃을 지급할까요?`} className="w-full max-w-[750px] rounded-xl bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><h2 className="text-xl font-bold text-slate-700">선택한 {count}개 온라인 독후감에 섬초롱꽃을 지급할까요?</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기"><X className="size-5 text-slate-400" /></Button></div>
        <p className="mt-6 text-sm text-slate-600">선별된 섬초롱꽃 미지급 온라인 독후감에만 적용됩니다.</p>
        <p className="mt-1 text-sm text-slate-600">지급된 섬초롱꽃은 되돌릴 수 없습니다. 지급 개수를 확인해 주세요.</p>
        <p className="mt-6 text-sm font-bold text-slate-700">지급 개수</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{flowerCriteria.map((item) => <button key={item.amount} type="button" role="radio" aria-checked={selectedFlower === item.amount} onClick={() => onSelect(item.amount)} className={cn("rounded-lg border px-4 py-3 text-center text-sm transition-colors", selectedFlower === item.amount ? "border-blue-500 bg-blue-50 font-semibold text-blue-700" : "border-slate-200 text-slate-600 hover:border-blue-300")}><span>🌻　{item.amount}개</span></button>)}</div>
        <div className="mt-7 space-y-3 rounded-xl bg-[#eef6ff] p-5"><p className="font-bold text-slate-700">권장 기준 안내</p>{flowerCriteria.map((item) => <p key={item.amount} className="text-sm leading-6 text-slate-600">{item.medal} <strong>{item.amount}개:</strong> {item.description}</p>)}</div>
        <div className="mt-7 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>취소</Button><Button disabled={!selectedFlower} onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">확인</Button></div>
      </div>
    </div>
  )
}

function FilterMenu({ label, value, onValueChange, options }: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: FilterOption[]
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-9 w-full min-w-0 gap-2 rounded-full border-slate-200 bg-white px-3.5 text-xs shadow-none transition-colors hover:border-blue-300 focus:ring-2 focus:ring-blue-100 sm:w-auto sm:min-w-[168px]",
          value !== "all" && "border-blue-300 bg-blue-50 text-blue-700"
        )}
      >
        <span className="font-bold">{label}</span>
        <span className="text-slate-300">·</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  )
}

function SummaryCards({ records }: { records: OnlineWorkbook[] }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {summary.map((item) => (
        <div key={item.status} className="flex h-[104px] items-center justify-between rounded-[10px] border border-slate-200 bg-white px-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div>
            <h2 className="text-lg font-semibold text-slate-700">{item.title}</h2>
            <p className={cn("mt-1 text-sm", item.color)}>{item.description}</p>
          </div>
          <p className="shrink-0 text-[32px] font-bold leading-none text-slate-700">
            {records.filter((record) => record.status === item.status).length}
            <span className="ml-1 text-sm font-normal">건</span>
          </p>
        </div>
      ))}
    </section>
  )
}

export function AgencyWorkbookList({ role = "agency" }: { role?: "agency" | "class" }) {
  const [records, setRecords] = React.useState(AGENCY_ONLINE_WORKBOOKS)
  const [writingFilter, setWritingFilter] = React.useState("all")
  const [reportFilter, setReportFilter] = React.useState("all")
  const [level, setLevel] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [aiRemaining, setAiRemaining] = React.useState("all")
  const [flower, setFlower] = React.useState("all")
  const [keyword, setKeyword] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [sort, setSort] = React.useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "submittedAt", direction: "desc" })
  const [filtersOpen, setFiltersOpen] = React.useState(true)
  const [guideOpen, setGuideOpen] = React.useState(true)
  const [notice, setNotice] = React.useState("")
  const [actionDialog, setActionDialog] = React.useState<ActionDialog>(null)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(50)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [selectedFlower, setSelectedFlower] = React.useState<number | null>(null)

  React.useEffect(() => {
    let active = true
    const syncRecords = async () => {
      try { const nextRecords = await getAgencyWorkbookListAsync(role); if (active) setRecords(nextRecords) }
      catch { if (active) setNotice("목록을 불러오지 못했습니다. 새로고침해 주세요.") }
    }
    void syncRecords()
    const unsubscribe = subscribeStudentSubmittedAgencyWorkbooks(() => void syncRecords())
    const interval = window.setInterval(() => void syncRecords(), 1500)
    return () => {
      active = false
      unsubscribe()
      window.clearInterval(interval)
    }
  }, [role, refreshKey])

  React.useEffect(() => { setPage(1); setSelectedIds([]) }, [writingFilter, reportFilter, level, status, aiRemaining, flower, query, pageSize])

  const filteredRecords = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return records
      .filter((record) => {
        if (writingFilter === "all") return true
        const classification = workbookClassification(record)
        if (writingFilter === "legacy") return classification.writing === "기존 방식"
        if (writingFilter === "second") return classification.writing === "2차"
        return classification.writing === "1차"
      })
      .filter((record) => {
        if (reportFilter === "all") return true
        const report = workbookClassification(record).report
        if (reportFilter === "legacy") return report === "-"
        if (reportFilter === "unavailable") return report === "생성 불가"
        if (reportFilter === "pending") return report === "생성 전"
        return report === "생성 완료"
      })
      .filter((record) => level === "all" || record.level === Number(level))
      .filter((record) => status === "all" || record.status === status)
      .filter((record) => aiRemaining === "all" || 2 - record.aiUsed === Number(aiRemaining))
      .filter((record) => flower === "all" || record.flowers === Number(flower))
      .filter((record) => !normalizedQuery || `${record.studentName} ${record.bookTitle}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const aDisplayNumber = a.displayNumber ?? a.id.padStart(5, "0")
        const bDisplayNumber = b.displayNumber ?? b.id.padStart(5, "0")
        const aValue = sort.key === "id" ? aDisplayNumber : a.submittedAtTime || a.submittedAt
        const bValue = sort.key === "id" ? bDisplayNumber : b.submittedAtTime || b.submittedAt
        const result = String(aValue).localeCompare(String(bValue), "ko", { numeric: true })
        const fallback = result || aDisplayNumber.localeCompare(bDisplayNumber, "ko", { numeric: true })
        return sort.direction === "asc" ? fallback : -fallback
      })
  }, [records, level, status, aiRemaining, flower, query, sort, writingFilter, reportFilter])

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const allSelected = pageRecords.length > 0 && pageRecords.every((record) => selectedIds.includes(record.id))
  const toggleSort = (key: SortKey) => setSort((current) => current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" })

  const reset = () => {
    setWritingFilter("all")
    setReportFilter("all")
    setLevel("all")
    setStatus("all")
    setAiRemaining("all")
    setFlower("all")
    setKeyword("")
    setQuery("")
    setSelectedIds([])
    setNotice("")
  }

  const applyRecordUpdates = (updatedRecords: OnlineWorkbook[]) => {
    const updatedById = new Map(updatedRecords.map((record) => [record.id, record]))
    setRecords((current) => current.map((record) => updatedById.get(record.id) ?? record))
    void Promise.all(updatedRecords.map((record) => upsertStudentSubmittedAgencyWorkbook(record)))
  }

  const sendSingleFeedback = async (record: OnlineWorkbook) => {
    setActionDialog(null)
    if (record.reviewId) { try { await performReviewListAction(record.id, "send", 0, role); setRecords(await getAgencyWorkbookListAsync(role)); setNotice("피드백을 전송했습니다.") } catch (e) { setNotice(String(e)) } return }
    if (record.status !== "작성완료") return
    const nextRecord = { ...record, status: "전송완료" as const }
    applyRecordUpdates([nextRecord])
    setNotice(`${record.studentName} 학생에게 피드백을 전송했습니다.`)
  }

  const confirmSingleParentSend = async () => {
    if (!actionDialog || actionDialog.kind !== "parent") return
    const { record } = actionDialog
    if (record.status !== "전송완료" || record.parentSent || record.parentContactRegistered === false) return
    if (record.reviewId) { try { await performReviewListAction(record.id, "parent", 0, role); setRecords(await getAgencyWorkbookListAsync(role)) } catch (e) { setNotice(String(e)); return } } else applyRecordUpdates([{ ...record, parentSent: true }])
    setNotice(`${record.studentName} 학생의 학부모에게 발송했습니다.`)
    setActionDialog(null)
  }

  const confirmBulkAction = async () => {
    if (!actionDialog || actionDialog.kind !== "bulk") return
    const allRecords = records.filter((record) => selectedIds.includes(record.id))
    const selectedRecords = allRecords.filter(r => !r.reviewId)
    const { action } = actionDialog
    const outcomes: string[] = []
    for (const r of allRecords.filter(r => r.reviewId)) { try { await performReviewListAction(r.id, action, selectedFlower ?? 0, role); outcomes.push(`${r.writingRound}차 ${r.studentName}: 성공`) } catch (e) { outcomes.push(`${r.writingRound}차 ${r.studentName}: 제외/실패 (${String(e)})`) } }
    if (outcomes.length) setRecords(await getAgencyWorkbookListAsync(role))
    const eligibleRecords = selectedRecords.filter((record) => {
      if (action === "ai") return record.status === "작성전" && record.aiUsed < 2
      if (action === "send") return record.status === "작성완료"
      if (action === "parent") return record.status === "전송완료" && !record.parentSent && record.parentContactRegistered !== false
      return record.flowers === 0
    })
    const updatedRecords = eligibleRecords.map((record) => {
      if (action === "ai") return { ...record, aiUsed: Math.min(2, record.aiUsed + 1), feedbackText: record.feedbackText || `『${record.bookTitle}』의 중요한 내용을 잘 정리했어요. 기억에 남는 장면을 자신의 생각과 연결한 점이 좋습니다. 다음에는 장면의 근거를 한 가지 더 덧붙여 보세요.` }
      if (action === "send") return { ...record, status: "전송완료" as const }
      if (action === "parent") return { ...record, parentSent: true }
      return { ...record, flowers: selectedFlower ?? 0 }
    })
    if (updatedRecords.length) applyRecordUpdates(updatedRecords)
    const excludedCount = selectedRecords.length - eligibleRecords.length
    const labels = { ai: "AI 피드백 생성", send: "학생 전송", parent: "학부모 발송", flower: `섬초롱꽃 ${selectedFlower ?? 0}개 지급` }
    setNotice(`${outcomes.join(" / ")} ${updatedRecords.length}건의 기존 데이터 ${labels[action]}을 완료했습니다.${excludedCount ? ` 조건에 맞지 않는 ${excludedCount}건은 제외했습니다.` : ""}`)
    setActionDialog(null)
    setSelectedFlower(null)
    setSelectedIds([])
  }

  const bulkClass = "h-9 gap-2 border-slate-200 bg-white px-4 text-[13px] font-normal text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:bg-white disabled:text-slate-300"
  const selectedRecords = records.filter((record) => selectedIds.includes(record.id))
  const selectedFlowerEligibleCount = selectedRecords.filter((record) => record.flowers === 0 && (!record.reviewId || record.status !== "작성전")).length
  const activeFilterCount = [level, writingFilter, status, aiRemaining, reportFilter, flower].filter((value) => value !== "all").length + (query ? 1 : 0)

  return (
    <div className="w-full space-y-4 pb-2 text-slate-700">
      <SummaryCards records={records} />

      <section className="border border-blue-100 bg-[#edf7ff] text-sm leading-7 text-blue-600">
        <button type="button" aria-expanded={guideOpen} aria-controls="agency-workbook-guide" onClick={() => setGuideOpen(open => !open)} className="flex w-full cursor-pointer items-center justify-between px-6 py-3 text-left font-semibold focus-visible:outline-2 focus-visible:outline-blue-600">
          <span>온라인 독후감 이용 안내</span><span className="flex items-center gap-1 font-normal">{guideOpen ? "접기" : "펼치기"}<ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", guideOpen && "rotate-180")} /></span>
        </button>
        <div id="agency-workbook-guide" hidden={!guideOpen} className="mx-6 mb-3 border-t border-blue-100">
          <section>
            <ol className="list-decimal divide-y divide-blue-100 pl-7 text-sm leading-5 text-blue-600">
              <li className="py-2"><strong>1차 제출:</strong> 학생이 글을 제출하면 목록에 <strong>피드백 작성 전</strong>으로 표시됩니다.</li>
              <li className="py-2"><strong>1차 피드백:</strong> 작성글 확인 → AI 피드백 생성(선택) → 내용 확인·수정 → <strong>[2차 작성 요청]</strong> 또는 <strong>[1차 완료]</strong> 선택 → 저장 → 학생에게 전송 순서로 처리합니다.</li>
              <li className="py-2"><strong>학생 확인:</strong> <strong>[1차 완료]</strong>를 선택한 글은 학생이 피드백을 확인하면 활동이 끝나고, <strong>[2차 작성 요청]</strong>을 선택한 글은 학생이 피드백을 확인한 뒤 2차 작성을 시작합니다.</li>
              <li className="py-2"><strong>2차 피드백:</strong> 학생의 2차 제출 → 피드백 작성·저장 → 학생에게 전송 → 학생 확인 후 활동이 최종 완료됩니다.</li>
            </ol>
            <p className="border-t border-blue-100 py-2 text-sm leading-5 text-blue-600">AI 피드백은 차수별 최대 2회까지 생성할 수 있습니다. 학생 전송 후에는 수정·재전송할 수 없으며, 학부모 발송은 차수별 1회만 가능합니다.</p>
          </section>
        </div>
      </section>

      {filtersOpen && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><SlidersHorizontal className="size-4" /></span>
              <h2 className="font-bold text-slate-800">목록 필터</h2>
              {activeFilterCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">{activeFilterCount}개 적용</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={reset} disabled={activeFilterCount === 0 && !keyword} className="h-8 px-3 text-xs text-slate-500 hover:text-blue-700"><RefreshCw className="mr-1.5 size-3.5" />초기화</Button>
              <button type="button" onClick={() => setFiltersOpen(false)} className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-blue-700">접기 <ChevronDown className="size-4 rotate-180" /></button>
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <FilterMenu label="책읽기 레벨" value={level} onValueChange={setLevel} options={[{ value: "all", label: "전체" }, ...[1, 2, 3, 4, 5, 6].map((item) => ({ value: String(item), label: `${item}레벨` }))]} />
              <FilterMenu label="차수" value={writingFilter} onValueChange={setWritingFilter} options={writingFilterOptions} />
              <FilterMenu label="피드백 상태" value={status} onValueChange={setStatus} options={[{ value: "all", label: "전체" }, { value: "작성전", label: "피드백 작성 전" }, { value: "작성완료", label: "피드백 작성 완료" }, { value: "전송완료", label: "피드백 전송 완료" }]} />
              <FilterMenu label="AI 잔여 횟수" value={aiRemaining} onValueChange={setAiRemaining} options={[{ value: "all", label: "전체" }, { value: "0", label: "0회 남음" }, { value: "1", label: "1회 남음" }, { value: "2", label: "2회 남음" }]} />
              <FilterMenu label="평가 보고서" value={reportFilter} onValueChange={setReportFilter} options={reportFilterOptions} />
              <FilterMenu label="섬초롱꽃" value={flower} onValueChange={setFlower} options={[{ value: "all", label: "전체" }, { value: "0", label: "미지급" }, ...[5, 10, 15, 20].map((amount) => ({ value: String(amount), label: `${amount}개 지급` }))]} />
              <form className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setQuery(keyword) }}>
                <div className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="학생명 또는 도서명으로 검색" className="h-9 rounded-full border-slate-200 bg-slate-50 pl-10 text-sm shadow-none focus-visible:bg-white" />
                </div>
                <Button type="submit" className="h-9 rounded-full bg-blue-600 px-5 hover:bg-blue-700">검색</Button>
              </form>
            </div>
          </div>
        </section>
      )}
      {!filtersOpen && <div className="flex justify-end"><button type="button" onClick={() => setFiltersOpen(true)} className="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700"><SlidersHorizontal className="size-4" />필터 펼치기{activeFilterCount > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{activeFilterCount}</span>}<ChevronDown className="size-4" /></button></div>}

      {notice && <div role="status" className="border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>}

      <section id="agency-review-table" className="min-h-[700px] bg-white px-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <h2 className="text-lg font-semibold text-slate-800">온라인 독후감 목록</h2>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" disabled={!selectedIds.length} onClick={() => setActionDialog({ kind: "bulk", action: "ai" })} className={bulkClass}><Bot className="size-4" />일괄 AI 피드백 생성 ({selectedIds.length})</Button>
            <Button variant="outline" disabled={!selectedIds.length} onClick={() => setActionDialog({ kind: "bulk", action: "send" })} className={bulkClass}><Send className="size-4" />일괄 학생 전송</Button>
            <Button variant="outline" disabled={!selectedIds.length} onClick={() => setActionDialog({ kind: "bulk", action: "parent" })} className={bulkClass}><Mail className="size-4" />일괄 학부모 발송</Button>
            <Button variant="outline" disabled={!selectedFlowerEligibleCount} onClick={() => { setSelectedFlower(null); setActionDialog({ kind: "bulk", action: "flower" }) }} className={bulkClass}><Flower2 className="size-4" />일괄 섬초롱꽃 지급 ({selectedFlowerEligibleCount})</Button>
            <button type="button" aria-label="목록 검색" onClick={() => setQuery(keyword)} className="grid size-9 place-items-center rounded-full bg-blue-600 text-white"><Search className="size-4" /></button>
            <button type="button" aria-label="목록 새로고침" onClick={() => setRefreshKey(k => k + 1)} className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><RefreshCw className="size-4" /></button>
            <ReviewListTools tableId="agency-review-table" columns={["선택","고유번호","학생 이름","레벨","도서명","학생 제출일","피드백 작성일","차수","2차 작성 여부","피드백 상태","학부모 발송 여부","피드백 전송","학부모 발송","평가 보고서","섬초롱꽃","피드백 작성 (AI 잔여횟수)"]} />
          </div>
        </div>

        <div className="min-h-[610px] overflow-auto border border-slate-200">
          <Table className="min-w-[1640px] whitespace-nowrap text-[11px] 2xl:text-[13px]">
            <TableHeader className="bg-[#fafafa]">
              <TableRow className="h-14 hover:bg-transparent">
                <TableHead className="text-center"><Checkbox aria-label="모든 항목 선택" checked={allSelected} onCheckedChange={(checked) => setSelectedIds(checked ? pageRecords.map((record) => record.id) : [])} /></TableHead>
                <TableHead className="text-center"><button type="button" onClick={() => toggleSort("id")} className="font-semibold">고유번호 <span className="text-slate-300">◆</span></button></TableHead>
                <TableHead className="text-center font-semibold">학생 이름</TableHead>
                <TableHead className="text-center font-semibold">레벨</TableHead>
                <TableHead className="text-center font-semibold">도서명</TableHead>
                <TableHead className="text-center"><button type="button" onClick={() => toggleSort("submittedAt")} className="font-semibold">학생 제출일 <span className="text-slate-300">◆</span></button></TableHead>
                <TableHead className="text-center font-semibold">피드백 작성일</TableHead>
                <TableHead className="text-center font-semibold">차수</TableHead>
                <TableHead className="text-center font-semibold">2차 작성 여부</TableHead>
                <TableHead className="text-center font-semibold">피드백 상태</TableHead>
                <TableHead className="text-center font-semibold">학부모 발송 여부</TableHead>
                <TableHead className="text-center font-semibold">피드백 전송</TableHead>
                <TableHead className="text-center font-semibold">학부모 발송</TableHead>
                <TableHead className="text-center font-semibold">평가 보고서</TableHead>
                <TableHead className="text-center font-semibold">섬초롱꽃</TableHead>
                <TableHead className="text-center font-semibold">
                  피드백 작성<br />(AI 잔여횟수)
                  <HeaderHint label="AI 피드백 생성 횟수 안내">온라인 독후감별 최대 2회까지 생성할 수 있으며, 생성에 성공한 경우에만 1회 차감됩니다.</HeaderHint>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRecords.map((record) => (
                <TableRow key={record.id} className="h-[46px] text-slate-700 hover:bg-slate-50" data-state={selectedIds.includes(record.id) ? "selected" : undefined}>
                  <TableCell className="text-center"><Checkbox aria-label={`${record.studentName} 학생 선택`} checked={selectedIds.includes(record.id)} onCheckedChange={(checked) => setSelectedIds((current) => checked ? [...current, record.id] : current.filter((id) => id !== record.id))} /></TableCell>
                  <TableCell className="whitespace-nowrap text-center tabular-nums">{record.displayNumber ?? record.id.padStart(5, "0")}</TableCell>
                  <TableCell className="text-center">{record.studentName}</TableCell>
                  <TableCell className="text-center">{record.level}</TableCell>
                  <TableCell className="truncate text-center" title={record.bookTitle}>{record.bookTitle}</TableCell>
                  <TableCell className="text-center">{record.submittedAt}</TableCell>
                  <TableCell className="text-center">{record.feedbackAt ?? ""}</TableCell>
                  <TableCell className="text-center font-semibold text-slate-600">{writingInfo(record)}</TableCell>
                  <TableCell className="text-center">{secondDecisionInfo(record)}</TableCell>
                  <TableCell className="text-center">{statusText[record.status]}</TableCell>
                  <TableCell className="text-center">{record.parentSent ? "발송완료" : "미발송"}</TableCell>
                  <TableCell className="text-center">{record.status === "전송완료" ? <Check className="mx-auto size-4 text-emerald-500" aria-label="학생 전송 완료" /> : <button type="button" aria-label={`${record.studentName} 학생에게 전송`} disabled={record.status !== "작성완료"} onClick={() => setActionDialog({ kind: "single-send", record })} className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"><Send className="size-4" /></button>}</TableCell>
                  <TableCell className="text-center">{record.parentSent ? <Check className="mx-auto size-4 text-emerald-500" aria-label="학부모 발송 완료" /> : <button type="button" aria-label={`${record.studentName} 학부모 발송`} title={record.parentContactRegistered === false ? "학부모 연락처가 등록되어 있지 않습니다." : undefined} disabled={record.status !== "전송완료" || record.parentContactRegistered === false} onClick={() => setActionDialog({ kind: "parent", record })} className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"><Mail className="size-4" /></button>}</TableCell>
                  <TableCell className="text-center"><ReportCell record={record} role={role} /></TableCell>
                  <TableCell className="text-center">{record.flowers ? <span>🌻&nbsp; {record.flowers}개</span> : "-"}</TableCell>
                  <TableCell className="text-center"><FeedbackAction record={record} role={role} /></TableCell>
                </TableRow>
              ))}
              {!filteredRecords.length && <TableRow><TableCell colSpan={16} className="h-40 text-center text-slate-400">조건에 맞는 온라인 독후감이 없습니다.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <div className="flex h-12 items-center justify-between px-1 text-[13px] text-slate-600">
          <div className="flex items-center gap-4"><span>총 {filteredRecords.length}건</span><span className="flex items-center gap-3 border-l border-slate-200 pl-4"><label>페이지당 항목 수 <select aria-label="페이지당 항목 수" className="rounded border p-1" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>{[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}</select></label></span></div>
          <div className="flex items-center gap-3"><Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>이전</Button><span>{currentPage} / {pageCount}</span><Button variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage(p => p + 1)}>다음</Button></div>
        </div>
      </section>

      {actionDialog?.kind === "single-send" && <AlertDialog title="학생 전송" message={<p>{actionDialog.record.studentName} 학생에게 피드백을 전송할까요? 전송 후에는 수정할 수 없습니다.</p>} onClose={() => setActionDialog(null)} onConfirm={() => void sendSingleFeedback(actionDialog.record)} />}
      {actionDialog?.kind === "parent" && <AlertDialog title="학부모 발송" message={<p>{actionDialog.record.studentName} 학부모에게 발송하시겠습니까?</p>} onClose={() => setActionDialog(null)} onConfirm={confirmSingleParentSend} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "ai" && <AlertDialog title="AI 피드백 생성 실행" message={<><p>선택한 <strong>{selectedIds.length}</strong>개의 독후감에 AI 피드백 생성을 실행하시겠어요?</p><p>각 독후감의 AI 피드백 생성 가능 횟수에서 성공한 경우에만 1회씩 차감됩니다.</p><p>항목별보기는 총평과 항목별 피드백을, 이어보기는 총평만 생성합니다. 평가 보고서 제공 독후감은 평가 점수와 보고서용 총평도 생성합니다.</p><p>생성된 내용은 상세 화면에서 확인·수정한 후 저장해 주세요.</p></>} onClose={() => setActionDialog(null)} onConfirm={confirmBulkAction} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "send" && <AlertDialog title="일괄 학생 전송" message={<p>선택한 {selectedIds.length}개의 피드백을 학생에게 전송하시겠습니까?</p>} onClose={() => setActionDialog(null)} onConfirm={confirmBulkAction} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "parent" && <AlertDialog title="일괄 학부모 발송" message={<p>선택한 {selectedIds.length}개의 항목에 대해 학부모에게 발송하시겠습니까?</p>} onClose={() => setActionDialog(null)} onConfirm={confirmBulkAction} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "flower" && <FlowerDialog count={selectedIds.length} selectedFlower={selectedFlower} onSelect={setSelectedFlower} onClose={() => { setActionDialog(null); setSelectedFlower(null) }} onConfirm={confirmBulkAction} />}
    </div>
  )
}
