"use client"

import * as React from "react"
import { subscribeReviewRefresh } from "@/lib/review-refresh"
import { PRO_SEND_CONFIRM, PRO_BULK_SEND_CONFIRM } from "@/lib/pro-domain"
import { ExternalBadge, ProBadge } from "@/components/pro-management/pro-common"
import { ProHelp } from "@/components/pro-management/pro-help"
import { ReviewListTools } from "./review-list-tools"
import { FeedbackAction } from "./review-feedback-action"
import { FeedbackScheduleStatus } from "./review-schedule-status"
import Link from "next/link"
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  FileText,
  Flower2,
  Mail,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { AgencyConfirmDialog } from "@/components/ui/agency-confirm-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  getAgencyWorkbookListAsync,
  upsertStudentSubmittedAgencyWorkbook,
  type FeedbackStatus,
  type OnlineWorkbook,
} from "@/lib/online-workbooks"
import { eligibleReviewListAction, performReviewListAction, reviewListActionExclusion } from "@/lib/review-list-adapter"
import { feedbackScheduleBlockReason, matchesReviewSchedule, reviewScheduleFilter, reviewScheduleFilterOptions, type ReviewScheduleFilter } from "@/lib/review-schedule-presentation"
import { agencyStudentTestToken } from "@/lib/student-test-context"
import { cn } from "@/lib/utils"
import { safeAgencyReturn, useReviewListPosition } from "@/lib/review-navigation"
import { workbookClassification } from "@/lib/workbook-classification"
import { agencyReviewColumns, legacyAgencyReviewColumns, matchesReviewAudience, matchesReviewSelection, reviewAudienceFromParams, reviewAudienceHelp, reviewAudienceLabels, reviewFiltersOpen, reviewSelectionFilter, reviewSelectionFilterOptions, reviewSelectionHelp, reviewStatusForSelection, reviewStatusLocked, type ReviewAudience, type ReviewSelectionFilter } from "@/lib/review-list-presentation"

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

function progressInfo(record: OnlineWorkbook) {
  const classification = workbookClassification(record)
  if (classification.writing === "2차") return "2차 작성 완료"
  if (classification.writing === "1차") return classification.decision === "2차 작성 요청" ? "2차 작성 요청" : "1차 작성 완료"
  return "-"
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
  const studentTest = role === "agency" ? agencyStudentTestToken() : ""
  return (
    <Link
      target="_blank"
      href={`/online-review/report/${record.id}?role=${role}${studentTest ? `&studentTest=${encodeURIComponent(studentTest)}` : ""}`}
      aria-label={label}
      title={label}
      className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50"
    >
      <FileText className="size-4" />
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

function AlertDialog({ title, message, onClose, onConfirm, confirmLabel = "확인", busy = false }: { title: string; message: React.ReactNode; onClose: () => void; onConfirm: () => void; confirmLabel?: string; busy?: boolean }) {
  return <AgencyConfirmDialog title={title} onClose={onClose} onConfirm={onConfirm} confirmLabel={confirmLabel} busy={busy}>{message}</AgencyConfirmDialog>
}

function FlowerDialog({ count, selectedFlower, onSelect, onClose, onConfirm, busy = false }: { count: number; selectedFlower: number | null; onSelect: (amount: number) => void; onClose: () => void; onConfirm: () => void; busy?: boolean }) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/45 p-4">
      <div role="dialog" aria-modal="true" aria-label={`선택한 ${count}개 온라인 독후감에 섬초롱꽃을 지급할까요?`} className="w-full max-w-[750px] rounded-xl bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><h2 className="text-xl font-bold text-slate-700">선택한 {count}개 온라인 독후감에 섬초롱꽃을 지급할까요?</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기"><X className="size-5 text-slate-400" /></Button></div>
        <p className="mt-6 text-sm text-slate-600">선별된 섬초롱꽃 미지급 온라인 독후감에만 적용됩니다.</p>
        <p className="mt-1 text-sm text-slate-600">지급된 섬초롱꽃은 되돌릴 수 없습니다. 지급 개수를 확인해 주세요.</p>
        <p className="mt-6 text-sm font-bold text-slate-700">지급 개수</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{flowerCriteria.map((item) => <button key={item.amount} type="button" role="radio" aria-checked={selectedFlower === item.amount} onClick={() => onSelect(item.amount)} className={cn("rounded-lg border px-4 py-3 text-center text-sm transition-colors", selectedFlower === item.amount ? "border-blue-500 bg-blue-50 font-semibold text-blue-700" : "border-slate-200 text-slate-600 hover:border-blue-300")}><span>🌻　{item.amount}개</span></button>)}</div>
        <div className="mt-7 space-y-3 rounded-xl bg-[#eef6ff] p-5"><p className="font-bold text-slate-700">권장 기준 안내</p>{flowerCriteria.map((item) => <p key={item.amount} className="text-sm leading-6 text-slate-600">{item.medal} <strong>{item.amount}개:</strong> {item.description}</p>)}</div>
        <div className="mt-7 flex justify-end gap-2"><Button disabled={busy} variant="outline" onClick={onClose}>취소</Button><Button disabled={!selectedFlower || busy} onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">확인</Button></div>
      </div>
    </div>
  )
}

function FilterMenu({ label, value, onValueChange, options, className, disabled = false }: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: readonly FilterOption[]
  className?: string
  disabled?: boolean
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}><span className="shrink-0 whitespace-nowrap text-[13px] font-medium text-slate-600">{label}</span><Select value={value} disabled={disabled} onValueChange={nextValue => { if (options.some(option => option.value === nextValue)) onValueChange(nextValue) }}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-9 w-full min-w-0 gap-3 rounded-md border-slate-200 bg-white px-3 text-[13px] shadow-none hover:border-blue-300",
          value !== "all" && "border-blue-300 bg-blue-50 text-blue-700"
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
    </Select></div>
  )
}

function SummaryCards({ records, status, onSelect, disabled = false }: { records: OnlineWorkbook[]; status: string; onSelect: (status: FeedbackStatus) => void; disabled?: boolean }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {summary.map((item) => (
        <button key={item.status} type="button" disabled={disabled} title={disabled ? "피드백 대상으로 선정된 글만 상태를 선택할 수 있습니다." : undefined} aria-pressed={status === item.status} onClick={() => onSelect(item.status)} className={cn("flex h-[104px] cursor-pointer items-center justify-between rounded-[10px] border bg-white px-7 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors enabled:hover:border-blue-300 disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600", status === item.status ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200")}>
          <span>
            <span className="block text-lg font-semibold text-slate-700">{item.title}</span>
            <span className={cn("mt-1 block text-sm", item.color)}>{item.description}</span>
          </span>
          <span className="shrink-0 text-[32px] font-bold leading-none text-slate-700">
            {records.filter((record) => record.status === item.status).length}
            <span className="ml-1 text-sm font-normal">건</span>
          </span>
        </button>
      ))}
    </section>
  )
}

export function AgencyWorkbookList({ role = "agency" }: { role?: "agency" | "class" }) {
  const [records, setRecords] = React.useState<OnlineWorkbook[]>([])
  const [audience, setAudience] = React.useState<ReviewAudience>("all")
  const [selectionFilter, setSelectionFilter] = React.useState<ReviewSelectionFilter>("all")
  const [scheduleFilter, setScheduleFilter] = React.useState<ReviewScheduleFilter>("all")
  const statusLocked = reviewStatusLocked(selectionFilter)
  const [studentId, setStudentId] = React.useState("")
  const showPro = audience === "pro"
  const columns = agencyReviewColumns(showPro)

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
  const [notice, setNotice] = React.useState("")
  const [actionDialog, setActionDialog] = React.useState<ActionDialog>(null)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(50)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [selectedFlower, setSelectedFlower] = React.useState<number | null>(null)
  const [restored, setRestored] = React.useState(false), [loaded, setLoaded] = React.useState(false), [filterOpen, setFilterOpen] = React.useState(true)
  const [originReturn, setOriginReturn] = React.useState(""), [busy, setBusy] = React.useState(false)
  const [demoAgency, setDemoAgency] = React.useState("")
  const filterPreferenceKey = `dokdo-review-search-${role}-filters`
  const pendingAction = React.useRef(false), previousFilters = React.useRef<string | null>(null)
  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setDemoAgency(p.get("demoAgency") === "other-agency" ? "other-agency" : "")
    const nextAudience = reviewAudienceFromParams(p)
    const nextSelection = reviewSelectionFilter(p.get("selection"), nextAudience)
    setAudience(nextAudience); setSelectionFilter(nextSelection); setStudentId(p.get("studentId") ?? "")
    setScheduleFilter(reviewScheduleFilter(p.get("schedule"), nextAudience, nextSelection))
    setWritingFilter(p.get("writing") ?? "all"); setReportFilter(p.get("report") ?? "all"); setLevel(p.get("level") ?? "all")
    setStatus(reviewStatusForSelection(p.get("status") ?? "all", nextSelection)); setAiRemaining(p.get("ai") ?? "all"); setFlower(p.get("flower") ?? "all")
    setKeyword(p.get("q") ?? ""); setQuery(p.get("q") ?? ""); setPage(Math.max(1, Number(p.get("page")) || 1))
    setPageSize([10,20,50,100].includes(Number(p.get("size"))) ? Number(p.get("size")) : 50)
    setSort({ key: p.get("sort") === "id" ? "id" : "submittedAt", direction: p.get("direction") === "asc" ? "asc" : "desc" })
    let savedFilterState: string | null = null
    try { savedFilterState = window.localStorage.getItem(`dokdo-review-search-${role}-filters`) } catch { /* Storage is optional. */ }
    setFilterOpen(reviewFiltersOpen(p, savedFilterState)); setOriginReturn(safeAgencyReturn(p.get("returnTo"), "")); setRestored(true)
  }, [role])
  const toggleFilters = () => {
    const nextOpen = !filterOpen
    setFilterOpen(nextOpen)
    try { window.localStorage.setItem(filterPreferenceKey, nextOpen ? "open" : "closed") } catch { /* Keep the current view usable without storage. */ }
  }
  const listParams = new URLSearchParams({ role, audience, studentId, writing: writingFilter, report: reportFilter, level, status, ai: aiRemaining, flower, q: query, page: String(page), size: String(pageSize), sort: sort.key, direction: sort.direction, filters: filterOpen ? "open" : "closed" })
  if (showPro) { listParams.set("selection", selectionFilter); listParams.set("schedule", scheduleFilter) }
  if (originReturn) listParams.set("returnTo", originReturn)
  if (demoAgency) listParams.set("demoAgency", demoAgency)
  const studentTest = agencyStudentTestToken()
  if (studentTest) listParams.set("studentTest", studentTest)
  const listUrl = `/agency/online-workbooks?${listParams}`
  const listPosition = useReviewListPosition(loaded && restored, listUrl)
  React.useEffect(() => { if (restored) window.history.replaceState(null, "", listUrl) }, [listUrl, restored])

  React.useEffect(() => {
    let active = true
    let sequence = 0
    const syncRecords = async () => {
      const request = ++sequence
      try { const nextRecords = await getAgencyWorkbookListAsync(role); if (active && request === sequence) { setRecords(nextRecords); setLoaded(true) } }
      catch { if (active && request === sequence) setNotice("목록을 불러오지 못했습니다. 새로고침해 주세요.") }
    }
    const unsubscribe = subscribeReviewRefresh(syncRecords)
    return () => {
      active = false
      unsubscribe()
    }
  }, [role, refreshKey])

  React.useEffect(() => {
    if (!restored) return
    const value = JSON.stringify([writingFilter, reportFilter, level, status, selectionFilter, scheduleFilter, aiRemaining, flower, query, pageSize, audience, studentId])
    if (previousFilters.current !== null && previousFilters.current !== value) { setPage(1); setSelectedIds([]) }
    previousFilters.current = value
  }, [restored, writingFilter, reportFilter, level, status, selectionFilter, scheduleFilter, aiRemaining, flower, query, pageSize, audience, studentId])

  const audienceRecords = React.useMemo(() => records.filter(record => matchesReviewAudience(record, audience) && (!studentId || record.studentId === studentId)), [records, audience, studentId])

  const filteredRecords = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return audienceRecords
      .filter(record => matchesReviewSelection(record, selectionFilter))
      .filter(record => matchesReviewSchedule(record, scheduleFilter))
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
      .filter((record) => status === "all" || (!record.pro || record.pro.selected) && record.status === status)
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
  }, [audienceRecords, level, status, selectionFilter, scheduleFilter, aiRemaining, flower, query, sort, writingFilter, reportFilter])

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const allSelected = pageRecords.length > 0 && pageRecords.every((record) => selectedIds.includes(record.id))
  const toggleSort = (key: SortKey) => setSort((current) => current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" })

  const reset = () => {
    setAudience("all"); setStudentId(""); setPage(1)
    setSelectionFilter("all")
    setScheduleFilter("all")
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
    if (pendingAction.current || !eligibleReviewListAction(record, "send")) return
    pendingAction.current = true; setBusy(true)
    try {
    setActionDialog(null)
    if (record.reviewId) { try { await performReviewListAction(record.id, "send", 0, role); setRecords(await getAgencyWorkbookListAsync(role)); setNotice("피드백을 전송했습니다.") } catch (e) { setNotice(String(e)) } return }
    if (record.status !== "작성완료") return
    const nextRecord = { ...record, status: "전송완료" as const }
    applyRecordUpdates([nextRecord])
    setNotice(`${record.studentName} 학생에게 피드백을 전송했습니다.`)
    } finally { pendingAction.current = false; setBusy(false) }
  }

  const confirmSingleParentSend = async () => {
    if (!actionDialog || actionDialog.kind !== "parent" || pendingAction.current) return
    const { record } = actionDialog
    if (record.status !== "전송완료" || record.parentSent || record.parentContactRegistered === false) return
    pendingAction.current = true; setBusy(true)
    try {
    if (record.reviewId) { try { await performReviewListAction(record.id, "parent", 0, role); setRecords(await getAgencyWorkbookListAsync(role)) } catch (e) { setNotice(String(e)); return } } else applyRecordUpdates([{ ...record, parentSent: true }])
    setNotice(`${record.studentName} 학생의 학부모에게 발송했습니다.`)
    setActionDialog(null)
    } finally { pendingAction.current = false; setBusy(false) }
  }

  const confirmBulkAction = async () => {
    if (!actionDialog || actionDialog.kind !== "bulk" || pendingAction.current) return
    pendingAction.current = true; setBusy(true)
    try {
    const allRecords = records.filter((record) => selectedIds.includes(record.id))
    const selectedRecords = allRecords.filter(r => !r.reviewId)
    const { action } = actionDialog
    const outcomes: string[] = allRecords.filter(r => r.reviewId && !eligibleReviewListAction(r, action)).map(r => `${r.studentName} · ${r.bookTitle}: 제외 (${reviewListActionExclusion(r, action)})`)
    for (const r of allRecords.filter(r => r.reviewId && eligibleReviewListAction(r, action))) { try { await performReviewListAction(r.id, action, selectedFlower ?? 0, role); outcomes.push(`${r.writingRound}차 ${r.studentName}: 성공`) } catch (e) { outcomes.push(`${r.writingRound}차 ${r.studentName}: 제외/실패 (${String(e)})`) } }
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
    setNotice(`${outcomes.join(" / ")}${updatedRecords.length ? ` / 기존 ${updatedRecords.length}건 ${labels[action]} 완료` : ""}${excludedCount ? ` 조건에 맞지 않는 ${excludedCount}건은 제외했습니다.` : ""}`)
    setActionDialog(null)
    setSelectedFlower(null)
    setSelectedIds([])
    } catch (e) { setNotice(e instanceof Error ? e.message : "처리에 실패했습니다. 상태를 새로고침해 주세요.") }
    finally { pendingAction.current = false; setBusy(false) }
  }

  const bulkClass = "h-9 gap-2 border-slate-200 bg-white px-4 text-[13px] font-normal text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:bg-white disabled:text-slate-300"
  const selectedRecords = records.filter((record) => selectedIds.includes(record.id))
  const eligibleCount = (action: BulkAction) => selectedRecords.filter(record => eligibleReviewListAction(record, action)).length
  const selectedFlowerEligibleCount = eligibleCount("flower")

  return (
    <div ref={listPosition} className="w-full space-y-4 pb-2 text-slate-700">
      <SummaryCards records={audienceRecords.filter(r => !r.pro || r.pro.selected)} status={status} onSelect={setStatus} disabled={statusLocked} />

      <details open className="rounded border border-[#bae7ff] bg-[#e6f7ff] px-6 py-4 text-[13px] leading-[22px] text-[#1890ff]"><summary className="mb-2 cursor-pointer font-semibold">온라인 독후감 관리 안내</summary>
        <ul className="list-disc pl-4"><li>피드백 작성전인 온라인 독후감을 우선적으로 처리해 주세요.</li><li>일괄 AI 피드백 생성 후에도 상태는 피드백 작성전으로 유지되니, 내용을 확인 후 저장해 주세요.</li><li>AI 피드백 생성은 차수별 최대 2회까지 사용 가능해요.</li><li>피드백 저장 후, 꼭 학생에게 전송해 주세요.</li><li>학부모 발송은 1회만 가능하니 신중히 진행해 주세요.</li></ul>
        {audienceRecords.some(record => record.external) && <p className="mt-3 font-semibold text-blue-800">프로 학생은 피드백 대상으로 선정된 글만 집계합니다.</p>}
      </details>
      <section aria-label="검색 조건" className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <form onSubmit={event => { event.preventDefault(); setQuery(keyword) }}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div role="group" aria-label="조회 대상" className="flex flex-wrap items-center gap-2">
              <span className="mr-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600">조회 대상<ProHelp label="조회 대상 안내" lines={reviewAudienceHelp}/></span>
              {(Object.keys(reviewAudienceLabels) as ReviewAudience[]).map(value => <button key={value} type="button" aria-pressed={audience === value} onClick={() => { setAudience(value); setSelectionFilter(reviewSelectionFilter(selectionFilter, value)); setScheduleFilter("all"); setStudentId("") }} className={cn("h-9 cursor-pointer rounded-full border px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600", audience === value ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>{reviewAudienceLabels[value]}</button>)}
              {studentId && <button type="button" onClick={() => setStudentId("")} aria-label="학생 조건 해제" className="flex h-9 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs">{records.find(r => r.studentId === studentId)?.studentName ?? studentId}<X className="size-3"/></button>}
            </div>
            <FilterMenu label="피드백 상태" className="w-full sm:w-[260px]" value={status} onValueChange={setStatus} disabled={statusLocked} options={[{value:"all",label:"전체"},{value:"작성전",label:"피드백 작성 전"},{value:"작성완료",label:"피드백 작성 완료"},{value:"전송완료",label:"피드백 전송 완료"}]} />
            {showPro && <FilterMenu label="피드백 대상" className="w-full sm:w-[280px]" value={selectionFilter} onValueChange={value => { const next = reviewSelectionFilter(value, audience); setSelectionFilter(next); setStatus(reviewStatusForSelection(status, next)); setScheduleFilter(reviewScheduleFilter(scheduleFilter, audience, next)) }} options={reviewSelectionFilterOptions} />}
            {showPro && <FilterMenu label="예약 상태" className="w-full sm:w-[260px]" value={scheduleFilter} onValueChange={value => setScheduleFilter(reviewScheduleFilter(value, audience, selectionFilter))} disabled={statusLocked} options={reviewScheduleFilterOptions} />}
            {showPro && <Button asChild variant="outline" className="ml-auto h-9 border-blue-300 bg-blue-50 text-[13px] text-blue-700 shadow-none hover:bg-blue-100 hover:text-blue-700"><Link href={originReturn || `/agency/pro-management${studentTest ? `?studentTest=${encodeURIComponent(studentTest)}` : ""}`}>주간 관리 현황</Link></Button>}
          </div>
          {filterOpen && <div id="review-search-details" className="mt-4 grid gap-x-5 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
              <FilterMenu label="책읽기 레벨" value={level} onValueChange={setLevel} options={[{value:"all",label:"전체"},...[1,2,3,4,5,6].map(i=>({value:String(i),label:`${i}레벨`}))]} />
              <FilterMenu label="차수" value={writingFilter} onValueChange={setWritingFilter} options={writingFilterOptions} />
              <FilterMenu label="AI 잔여 횟수" value={aiRemaining} onValueChange={setAiRemaining} options={[{value:"all",label:"전체"},{value:"0",label:"0회 남음"},{value:"1",label:"1회 남음"},{value:"2",label:"2회 남음"}]} />
              <FilterMenu label="평가 보고서" value={reportFilter} onValueChange={setReportFilter} options={reportFilterOptions} />
              <FilterMenu label="섬초롱꽃" value={flower} onValueChange={setFlower} options={[{value:"all",label:"전체"},{value:"0",label:"미지급"},...[5,10,15,20].map(i=>({value:String(i),label:`${i}개 지급`}))]} />
          </div>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
              {filterOpen && <div className="flex w-full min-w-0 items-center gap-2.5 sm:max-w-md"><label htmlFor="review-search" className="shrink-0 text-[13px] font-medium text-slate-600">검색</label><Input id="review-search" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="학생명 또는 도서명 검색" className="h-9 rounded-md border-slate-200 text-[13px] shadow-none" /></div>}
              <div className="ml-auto flex items-center gap-1.5">
                <Button type="button" variant="ghost" onClick={reset} className="h-9 text-[13px] text-slate-600"><RefreshCw size={14}/>초기화</Button>
                <Button type="submit" className="h-9 bg-blue-600 px-5 text-[13px] text-white hover:bg-blue-700"><Search size={14}/>검색</Button>
                <Button type="button" variant="ghost" aria-expanded={filterOpen} aria-controls={filterOpen ? "review-search-details" : undefined} onClick={toggleFilters} className="h-9 text-[13px] text-slate-600">{filterOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}{filterOpen ? "접기" : "펼치기"}</Button>
              </div>
          </div>
        </form>
      </section>
      {notice && <div role="status" className="border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>}

      <section id="agency-review-table" className="min-h-[700px] bg-white px-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <h2 className="text-lg font-semibold text-slate-800">온라인 독후감 목록 <span className="text-sm font-normal">{filteredRecords.length}건</span></h2>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" disabled={busy || !eligibleCount("ai")} title={selectedRecords.some(record => record.feedbackSchedule) ? feedbackScheduleBlockReason : undefined} onClick={() => setActionDialog({ kind: "bulk", action: "ai" })} className={bulkClass}><Bot className="size-4" />일괄 AI 피드백 생성 ({eligibleCount("ai")})</Button>
            <Button variant="outline" disabled={busy || !eligibleCount("send")} title={selectedRecords.some(record => record.feedbackSchedule) ? feedbackScheduleBlockReason : undefined} onClick={() => setActionDialog({ kind: "bulk", action: "send" })} className={bulkClass}><Send className="size-4" />일괄 학생 전송 ({eligibleCount("send")})</Button>
            <Button variant="outline" disabled={busy || !eligibleCount("parent")} onClick={() => setActionDialog({ kind: "bulk", action: "parent" })} className={bulkClass}><Mail className="size-4" />일괄 학부모 발송 ({eligibleCount("parent")})</Button>
            <Button variant="outline" disabled={busy || !selectedFlowerEligibleCount} onClick={() => { setSelectedFlower(null); setActionDialog({ kind: "bulk", action: "flower" }) }} className={bulkClass}><Flower2 className="size-4" />일괄 섬초롱꽃 지급 ({selectedFlowerEligibleCount})</Button>
            <button type="button" aria-label="목록 검색" onClick={() => setQuery(keyword)} className="grid size-9 place-items-center rounded-full bg-blue-600 text-white"><Search className="size-4" /></button>
            <button type="button" aria-label="목록 새로고침" onClick={() => setRefreshKey(k => k + 1)} className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><RefreshCw className="size-4" /></button>
            <ReviewListTools tableId="agency-review-table" columns={columns} legacyColumns={legacyAgencyReviewColumns} />
          </div>
        </div>

        <div className="min-h-[610px] overflow-auto border border-slate-200">
          <Table className={cn("whitespace-nowrap text-[11px] 2xl:text-[13px]", showPro ? "min-w-[1640px]" : "min-w-[1340px]")}>
            <TableHeader className="bg-[#fafafa]">
              <TableRow className="h-14 hover:bg-transparent">
                <TableHead className="text-center"><Checkbox aria-label="모든 항목 선택" checked={allSelected} onCheckedChange={(checked) => setSelectedIds(checked ? pageRecords.map((record) => record.id) : [])} /></TableHead>
                <TableHead className="text-center"><button type="button" onClick={() => toggleSort("id")} className="font-semibold">고유번호 <span className="text-slate-300">◆</span></button></TableHead>
                <TableHead className="text-center font-semibold">학생 이름</TableHead>
                <TableHead className="text-center font-semibold">레벨</TableHead>
                <TableHead className="text-center font-semibold">도서명</TableHead>
                <TableHead className="text-center"><button type="button" onClick={() => toggleSort("submittedAt")} className="font-semibold">학생 제출일 <span className="text-slate-300">◆</span></button></TableHead>
                {showPro && <>
                  <TableHead className="text-center font-semibold text-blue-700">관리 주차</TableHead>
                  <TableHead className="text-center font-semibold text-blue-700"><span className="inline-flex items-center gap-1">피드백 대상 <ProHelp label="피드백 대상 안내" lines={reviewSelectionHelp} /></span></TableHead>
                  <TableHead className="text-center font-semibold text-blue-700">처리 기한</TableHead>
                </>}
                <TableHead className="text-center font-semibold">피드백 작성일</TableHead>
                <TableHead className="text-center font-semibold">차수</TableHead>
                <TableHead className="text-center font-semibold">진행 상황</TableHead>
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
                  <TableCell className="text-center">{record.studentName}{record.external && <ExternalBadge/>}</TableCell>
                  <TableCell className="text-center">{record.level}</TableCell>
                  <TableCell className="truncate text-center" title={record.bookTitle}>{record.bookTitle}</TableCell>
                  <TableCell className="text-center">{record.submittedAt}</TableCell>
                  {showPro && <>
                    <TableCell className="text-center">{record.pro?.period ?? "-"}</TableCell>
                    <TableCell className="text-center">{record.pro?.selection ?? "-"}</TableCell>
                    <TableCell className="text-center">{record.pro?.due ?? "-"}{record.pro?.overdue && <span className="ml-1.5"><ProBadge tone="red">지연</ProBadge></span>}</TableCell>
                  </>}
                  <TableCell className="text-center">{record.feedbackAt ?? ""}</TableCell>
                  <TableCell className="text-center font-semibold text-slate-600">{writingInfo(record)}</TableCell>
                  <TableCell className="text-center">{progressInfo(record)}</TableCell>
                  <TableCell className="text-center">{record.pro && !record.pro.selected ? "-" : statusText[record.status]}<FeedbackScheduleStatus schedule={record.feedbackSchedule} showScheduledAt={false} className="mt-1 justify-center"/></TableCell>
                  <TableCell className="text-center">{record.pro ? record.pro.selected ? record.pro.parentLabel : "-" : record.parentSent ? "발송완료" : "미발송"}</TableCell>
                  <TableCell className="text-center">{record.pro && !record.pro.selected ? "-" : record.status === "전송완료" ? <Check className="mx-auto size-4 text-emerald-500" aria-label="학생 전송 완료" /> : <button type="button" aria-label={`${record.studentName} 학생에게 전송`} title={record.feedbackSchedule ? feedbackScheduleBlockReason : undefined} disabled={!eligibleReviewListAction(record, "send")} onClick={() => setActionDialog({ kind: "single-send", record })} className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"><Send className="size-4" /></button>}</TableCell>
                  <TableCell className="text-center">{record.pro ? record.pro.selected ? "자동 발송" : "-" : record.parentSent ? <Check className="mx-auto size-4 text-emerald-500" aria-label="학부모 발송 완료" /> : <button type="button" aria-label={`${record.studentName} 학부모 발송`} title={record.parentContactRegistered === false ? "학부모 연락처가 등록되어 있지 않습니다." : undefined} disabled={record.status !== "전송완료" || record.parentContactRegistered === false} onClick={() => setActionDialog({ kind: "parent", record })} className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"><Mail className="size-4" /></button>}</TableCell>
                  <TableCell className="text-center"><ReportCell record={record} role={role} /></TableCell>
                  <TableCell className="text-center">{record.flowers ? <span>🌻&nbsp; {record.flowers}개</span> : "-"}</TableCell>
                  <TableCell className="text-center"><FeedbackAction record={record} role={role} returnTo={listUrl} /></TableCell>
                </TableRow>
              ))}
              {!filteredRecords.length && <TableRow><TableCell colSpan={columns.length} className="h-40 text-center text-slate-400">조건에 맞는 온라인 독후감이 없습니다.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <div className="flex h-12 items-center justify-between px-1 text-[13px] text-slate-600">
          <div className="flex items-center gap-4"><span>총 {filteredRecords.length}건</span><span className="flex items-center gap-3 border-l border-slate-200 pl-4"><label>페이지당 항목 수 <select aria-label="페이지당 항목 수" className="rounded border p-1" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>{[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}</select></label></span></div>
          <div className="flex items-center gap-3"><Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>이전</Button><span>{currentPage} / {pageCount}</span><Button variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage(p => p + 1)}>다음</Button></div>
        </div>
      </section>

      {actionDialog?.kind === "single-send" && <AlertDialog busy={busy} title="학생 전송" confirmLabel="전송하기" message={<p>{actionDialog.record.pro && actionDialog.record.writingRound === 1 && actionDialog.record.secondDecision === "complete" ? PRO_SEND_CONFIRM : `${actionDialog.record.studentName} 학생에게 피드백을 전송할까요? 전송 후에는 수정할 수 없습니다.`}</p>} onClose={() => { if (!busy) setActionDialog(null) }} onConfirm={() => void sendSingleFeedback(actionDialog.record)} />}
      {actionDialog?.kind === "parent" && <AlertDialog busy={busy} title="학부모 발송" message={<p>{actionDialog.record.studentName} 학부모에게 발송하시겠습니까?</p>} onClose={() => { if (!busy) setActionDialog(null) }} onConfirm={confirmSingleParentSend} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "ai" && <AlertDialog busy={busy} title="AI 피드백 생성 실행" message={<><p>선택한 <strong>{selectedIds.length}</strong>개의 독후감에 AI 피드백 생성을 실행하시겠어요?</p><p>각 독후감의 AI 피드백 생성 가능 횟수에서 성공한 경우에만 1회씩 차감됩니다.</p><p>항목별보기는 총평과 항목별 피드백을, 이어보기는 총평만 생성합니다. 평가 보고서 제공 독후감은 평가 점수와 보고서용 총평도 생성합니다.</p><p>생성된 내용은 상세 화면에서 확인·수정한 후 저장해 주세요.</p></>} onClose={() => { if (!busy) setActionDialog(null) }} onConfirm={confirmBulkAction} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "send" && <AlertDialog busy={busy} title="일괄 학생 전송" confirmLabel="전송하기" message={<><p>선택 {selectedIds.length}건 중 전송 가능한 {eligibleCount("send")}건을 학생에게 전송하시겠습니까? {selectedIds.length - eligibleCount("send")}건은 조건에 맞지 않아 제외됩니다.</p>{selectedRecords.some(r => r.pro?.selected && r.status === "작성완료" && r.writingRound === 1 && r.secondDecision === "complete") && <p className="mt-3">{PRO_BULK_SEND_CONFIRM}</p>}</>} onClose={() => { if (!busy) setActionDialog(null) }} onConfirm={confirmBulkAction} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "parent" && <AlertDialog busy={busy} title="일괄 학부모 발송" message={<p>선택한 {selectedIds.length}개의 항목에 대해 학부모에게 발송하시겠습니까?</p>} onClose={() => { if (!busy) setActionDialog(null) }} onConfirm={confirmBulkAction} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "flower" && <FlowerDialog busy={busy} count={selectedIds.length} selectedFlower={selectedFlower} onSelect={setSelectedFlower} onClose={() => { if (!busy) { setActionDialog(null); setSelectedFlower(null) } }} onConfirm={confirmBulkAction} />}
    </div>
  )
}
