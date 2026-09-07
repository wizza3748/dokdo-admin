"use client"

import * as React from "react"
import Link from "next/link"
import {
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Columns3,
  Expand,
  Flower2,
  Mail,
  Pencil,
  RefreshCw,
  Search,
  Send,
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
import { cn } from "@/lib/utils"

type SortKey = "id" | "submittedAt"

const statusText: Record<FeedbackStatus, string> = {
  작성전: "피드백 작성 전",
  작성완료: "피드백 작성 완료",
  전송완료: "피드백 전송 완료",
}

const summary = [
  { status: "작성전" as const, title: "피드백 작성전", description: "학생이 워크북을 제출한 상태", color: "text-slate-700" },
  { status: "작성완료" as const, title: "피드백 작성완료", description: "피드백이 저장된 상태 (전송 전)", color: "text-blue-500" },
  { status: "전송완료" as const, title: "피드백 전송완료", description: "피드백이 학생에게 전송 완료", color: "text-emerald-500" },
]

type BulkAction = "ai" | "send" | "parent" | "flower"
type ActionDialog = { kind: "bulk"; action: BulkAction } | { kind: "parent"; record: OnlineWorkbook } | null

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
      <div role="dialog" aria-modal="true" aria-label={`선택한 ${count}개 워크북에 섬초롱꽃을 지급할까요?`} className="w-full max-w-[750px] rounded-xl bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><h2 className="text-xl font-bold text-slate-700">선택한 {count}개 워크북에 섬초롱꽃을 지급할까요?</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기"><X className="size-5 text-slate-400" /></Button></div>
        <p className="mt-6 text-sm text-slate-600">선별된 섬초롱꽃 미지급 워크북에만 적용됩니다.</p>
        <p className="mt-1 text-sm text-slate-600">지급된 섬초롱꽃은 되돌릴 수 없습니다. 지급 개수를 확인해 주세요.</p>
        <p className="mt-6 text-sm font-bold text-slate-700">지급 개수</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{flowerCriteria.map((item) => <button key={item.amount} type="button" role="radio" aria-checked={selectedFlower === item.amount} onClick={() => onSelect(item.amount)} className={cn("rounded-lg border px-4 py-3 text-center text-sm transition-colors", selectedFlower === item.amount ? "border-blue-500 bg-blue-50 font-semibold text-blue-700" : "border-slate-200 text-slate-600 hover:border-blue-300")}><span>🌻　{item.amount}개</span></button>)}</div>
        <div className="mt-7 space-y-3 rounded-xl bg-[#eef6ff] p-5"><p className="font-bold text-slate-700">권장 기준 안내</p>{flowerCriteria.map((item) => <p key={item.amount} className="text-sm leading-6 text-slate-600">{item.medal} <strong>{item.amount}개:</strong> {item.description}</p>)}</div>
        <div className="mt-7 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>취소</Button><Button disabled={!selectedFlower} onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">확인</Button></div>
      </div>
    </div>
  )
}

function CompactSelect({ value, onValueChange, placeholder, options }: {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 min-w-0 flex-1 rounded-md border-slate-200 bg-white px-3 text-[13px] shadow-none">
        <SelectValue placeholder={placeholder} />
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

export function AgencyWorkbookList() {
  const [records, setRecords] = React.useState(AGENCY_ONLINE_WORKBOOKS)
  const [level, setLevel] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [aiRemaining, setAiRemaining] = React.useState("all")
  const [flower, setFlower] = React.useState("")
  const [keyword, setKeyword] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [sort, setSort] = React.useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "id", direction: "desc" })
  const [filtersOpen, setFiltersOpen] = React.useState(true)
  const [notice, setNotice] = React.useState("")
  const [actionDialog, setActionDialog] = React.useState<ActionDialog>(null)
  const [selectedFlower, setSelectedFlower] = React.useState<number | null>(null)

  React.useEffect(() => {
    let active = true
    const syncRecords = async () => {
      const nextRecords = await getAgencyWorkbookListAsync()
      if (active) setRecords(nextRecords)
    }
    void syncRecords()
    const unsubscribe = subscribeStudentSubmittedAgencyWorkbooks(() => void syncRecords())
    const interval = window.setInterval(() => void syncRecords(), 1500)
    return () => {
      active = false
      unsubscribe()
      window.clearInterval(interval)
    }
  }, [])

  React.useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(""), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const filteredRecords = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return records
      .filter((record) => level === "all" || record.level === Number(level))
      .filter((record) => status === "all" || record.status === status)
      .filter((record) => aiRemaining === "all" || 2 - record.aiUsed === Number(aiRemaining))
      .filter((record) => !flower || record.flowers === Number(flower))
      .filter((record) => !normalizedQuery || `${record.studentName} ${record.bookTitle}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const result = String(a[sort.key]).localeCompare(String(b[sort.key]), "ko", { numeric: true })
        return sort.direction === "asc" ? result : -result
      })
  }, [records, level, status, aiRemaining, flower, query, sort])

  const allSelected = filteredRecords.length > 0 && filteredRecords.every((record) => selectedIds.includes(record.id))
  const toggleSort = (key: SortKey) => setSort((current) => current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" })

  const reset = () => {
    setLevel("all")
    setStatus("all")
    setAiRemaining("all")
    setFlower("")
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

  const sendSingleFeedback = (record: OnlineWorkbook) => {
    if (record.status !== "작성완료") return
    const nextRecord = { ...record, status: "전송완료" as const }
    applyRecordUpdates([nextRecord])
    setNotice(`${record.studentName} 학생에게 피드백을 전송했습니다.`)
  }

  const confirmSingleParentSend = () => {
    if (!actionDialog || actionDialog.kind !== "parent") return
    const { record } = actionDialog
    if (record.status !== "전송완료" || record.parentSent || record.parentContactRegistered === false) return
    applyRecordUpdates([{ ...record, parentSent: true }])
    setNotice(`${record.studentName} 학생의 학부모에게 발송했습니다.`)
    setActionDialog(null)
  }

  const confirmBulkAction = () => {
    if (!actionDialog || actionDialog.kind !== "bulk") return
    const selectedRecords = records.filter((record) => selectedIds.includes(record.id))
    const { action } = actionDialog
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
    const labels = { ai: "AI 피드백 생성", send: "피드백 전송", parent: "학부모 발송", flower: `섬초롱꽃 ${selectedFlower ?? 0}개 지급` }
    setNotice(`${updatedRecords.length}건의 ${labels[action]}을 완료했습니다.${excludedCount ? ` 조건에 맞지 않는 ${excludedCount}건은 제외했습니다.` : ""}`)
    setActionDialog(null)
    setSelectedFlower(null)
    setSelectedIds([])
  }

  const labelClass = "w-[88px] shrink-0 text-right text-sm font-semibold text-slate-700"
  const bulkClass = "h-9 gap-2 border-slate-200 bg-white px-4 text-[13px] font-normal text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:bg-white disabled:text-slate-300"
  const selectedRecords = records.filter((record) => selectedIds.includes(record.id))
  const selectedFlowerEligibleCount = selectedRecords.filter((record) => record.flowers === 0).length

  return (
    <div className="w-full space-y-4 pb-2 text-slate-700">
      <SummaryCards records={records} />

      <section className="min-h-[150px] border border-blue-100 bg-[#edf7ff] px-6 py-5 text-sm leading-7 text-blue-600">
        <ul className="list-disc pl-4">
          <li>피드백 작성전인 워크북을 우선적으로 처리해 주세요.</li>
          <li>일괄 AI 피드백 생성 후에도 상태는 피드백 작성전으로 유지되니, 내용을 확인 후 저장해 주세요.</li>
          <li>AI 자동 작성 기능은 워크북당 최대 2회까지 사용 가능해요.</li>
          <li>피드백 저장 후, 꼭 학생에게 전송해 주세요.</li>
          <li>학부모 발송은 1회만 가능하니 신중히 진행해 주세요.</li>
        </ul>
      </section>

      {filtersOpen && (
        <section className="grid gap-x-10 gap-y-3 bg-white px-8 py-6 lg:grid-cols-3">
          <div className="flex items-center gap-3"><span className={labelClass}>책읽기 레벨</span><CompactSelect value={level} onValueChange={setLevel} placeholder="레벨 선택" options={[{ value: "all", label: "레벨 선택" }, ...[1, 2, 3, 4, 5, 6].map((item) => ({ value: String(item), label: `${item}레벨` }))]} /></div>
          <div className="flex items-center gap-3"><span className={labelClass}>피드백 상태</span><CompactSelect value={status} onValueChange={setStatus} placeholder="선택" options={[{ value: "all", label: "전체" }, { value: "작성전", label: "피드백 작성 전" }, { value: "작성완료", label: "피드백 작성 완료" }, { value: "전송완료", label: "피드백 전송 완료" }]} /></div>
          <div className="flex items-center gap-3"><span className={labelClass}>AI 잔여 횟수</span><CompactSelect value={aiRemaining} onValueChange={setAiRemaining} placeholder="선택" options={[{ value: "all", label: "선택" }, { value: "0", label: "0회" }, { value: "1", label: "1회" }, { value: "2", label: "2회" }]} /></div>
          <div className="flex items-center gap-3"><span className={labelClass}>섬초롱꽃</span><CompactSelect value={flower} onValueChange={setFlower} placeholder="선택" options={[{ value: "0", label: "미지급" }, ...[5, 10, 15, 20].map((amount) => ({ value: String(amount), label: `${amount}개` }))]} /></div>
          <div className="flex items-center gap-3"><span className={labelClass}>검색</span><Input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setQuery(keyword)} placeholder="학생명 또는 도서명 검색" className="h-9 flex-1 border-slate-200 text-[13px] shadow-none" /></div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={reset} className="h-9 border-slate-200 px-5 font-normal">초기화</Button>
            <Button onClick={() => setQuery(keyword)} className="h-9 bg-blue-600 px-5 hover:bg-blue-700">검색</Button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="flex h-9 items-center gap-1 text-sm text-blue-600">접기 <ChevronDown className="size-4 rotate-180" /></button>
          </div>
        </section>
      )}
      {!filtersOpen && <div className="flex justify-end"><button type="button" onClick={() => setFiltersOpen(true)} className="flex items-center gap-1 text-sm text-blue-600">필터 펼치기 <ChevronDown className="size-4" /></button></div>}

      {notice && <div role="status" className="border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>}

      <section className="min-h-[700px] bg-white px-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <h2 className="text-lg font-semibold text-slate-800">학생 목록</h2>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" disabled={!selectedIds.length} onClick={() => setActionDialog({ kind: "bulk", action: "ai" })} className={bulkClass}><Bot className="size-4" />일괄 AI 피드백 생성 ({selectedIds.length})</Button>
            <Button variant="outline" disabled={!selectedIds.length} onClick={() => setActionDialog({ kind: "bulk", action: "send" })} className={bulkClass}><Send className="size-4" />일괄 피드백 전송</Button>
            <Button variant="outline" disabled={!selectedIds.length} onClick={() => setActionDialog({ kind: "bulk", action: "parent" })} className={bulkClass}><Mail className="size-4" />일괄 학부모 발송</Button>
            <Button variant="outline" disabled={!selectedFlowerEligibleCount} onClick={() => { setSelectedFlower(null); setActionDialog({ kind: "bulk", action: "flower" }) }} className={bulkClass}><Flower2 className="size-4" />일괄 섬초롱꽃 지급 ({selectedFlowerEligibleCount})</Button>
            <button type="button" aria-label="목록 검색" onClick={() => setQuery(keyword)} className="grid size-9 place-items-center rounded-full bg-blue-600 text-white"><Search className="size-4" /></button>
            <button type="button" aria-label="목록 새로고침" onClick={reset} className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><RefreshCw className="size-4" /></button>
            <button type="button" aria-label="전체 화면" className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><Expand className="size-4" /></button>
            <button type="button" aria-label="열 설정" className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500"><Columns3 className="size-4" /></button>
          </div>
        </div>

        <div className="min-h-[610px] overflow-hidden border border-slate-200">
          <Table className="table-fixed text-[11px] 2xl:text-[13px]">
            <colgroup>
              {[3, 6, 7, 4, 15, 9, 9, 9, 9, 7, 7, 6, 9].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
            </colgroup>
            <TableHeader className="bg-[#fafafa]">
              <TableRow className="h-14 hover:bg-transparent">
                <TableHead className="text-center"><Checkbox aria-label="모든 항목 선택" checked={allSelected} onCheckedChange={(checked) => setSelectedIds(checked ? filteredRecords.map((record) => record.id) : [])} /></TableHead>
                <TableHead className="text-center"><button type="button" onClick={() => toggleSort("id")} className="font-semibold">고유번호 <span className="text-slate-300">◆</span></button></TableHead>
                <TableHead className="text-center font-semibold">학생 이름</TableHead>
                <TableHead className="text-center font-semibold">레벨</TableHead>
                <TableHead className="text-center font-semibold">도서명</TableHead>
                <TableHead className="text-center"><button type="button" onClick={() => toggleSort("submittedAt")} className="font-semibold">학생 제출일 <span className="text-slate-300">◆</span></button></TableHead>
                <TableHead className="text-center font-semibold">피드백 작성일</TableHead>
                <TableHead className="text-center font-semibold">피드백 상태</TableHead>
                <TableHead className="text-center font-semibold">학부모 발송 여부</TableHead>
                <TableHead className="text-center font-semibold">피드백 전송 <CircleHelp className="inline size-3 text-slate-500" /></TableHead>
                <TableHead className="text-center font-semibold">학부모 발송 <CircleHelp className="inline size-3 text-slate-500" /></TableHead>
                <TableHead className="text-center font-semibold">섬초롱꽃</TableHead>
                <TableHead className="text-center font-semibold">피드백 작성<br />(AI 잔여횟수) <CircleHelp className="inline size-3 text-slate-500" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id} className="h-[46px] text-slate-700 hover:bg-slate-50" data-state={selectedIds.includes(record.id) ? "selected" : undefined}>
                  <TableCell className="text-center"><Checkbox aria-label={`${record.studentName} 학생 선택`} checked={selectedIds.includes(record.id)} onCheckedChange={(checked) => setSelectedIds((current) => checked ? [...current, record.id] : current.filter((id) => id !== record.id))} /></TableCell>
                  <TableCell className="text-center">{record.id}</TableCell>
                  <TableCell className="text-center">{record.studentName}</TableCell>
                  <TableCell className="text-center">{record.level}</TableCell>
                  <TableCell className="truncate text-center" title={record.bookTitle}>{record.bookTitle}</TableCell>
                  <TableCell className="text-center">{record.submittedAt}</TableCell>
                  <TableCell className="text-center">{record.feedbackAt ?? ""}</TableCell>
                  <TableCell className="text-center">{statusText[record.status]}</TableCell>
                  <TableCell className="text-center">{record.parentSent ? "발송완료" : "미발송"}</TableCell>
                  <TableCell className="text-center">{record.status === "전송완료" ? <Check className="mx-auto size-4 text-emerald-500" aria-label="피드백 전송 완료" /> : <button type="button" aria-label={`${record.studentName} 피드백 전송`} disabled={record.status !== "작성완료"} onClick={() => sendSingleFeedback(record)} className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"><Send className="size-4" /></button>}</TableCell>
                  <TableCell className="text-center">{record.parentSent ? <Check className="mx-auto size-4 text-emerald-500" aria-label="학부모 발송 완료" /> : <button type="button" aria-label={`${record.studentName} 학부모 발송`} title={record.parentContactRegistered === false ? "학부모 연락처가 등록되어 있지 않습니다." : undefined} disabled={record.status !== "전송완료" || record.parentContactRegistered === false} onClick={() => setActionDialog({ kind: "parent", record })} className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"><Mail className="size-4" /></button>}</TableCell>
                  <TableCell className="text-center">{record.flowers ? <span>🌻&nbsp; {record.flowers}개</span> : "-"}</TableCell>
                  <TableCell className="text-center"><Link href={`/agency/online-workbooks/${record.id}`} className="inline-flex items-center gap-3 text-blue-600 hover:underline"><Pencil className="size-4" />({record.aiUsed}/2)</Link></TableCell>
                </TableRow>
              ))}
              {!filteredRecords.length && <TableRow><TableCell colSpan={13} className="h-40 text-center text-slate-400">조건에 맞는 학생이 없습니다.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <div className="flex h-12 items-center justify-between px-1 text-[13px] text-slate-600">
          <div className="flex items-center gap-4"><span>총 {filteredRecords.length} 레코드</span><span className="flex items-center gap-3 border-l border-slate-200 pl-4">50 항목/페이지 <ChevronDown className="size-4 text-slate-300" /></span></div>
          <div className="flex items-center gap-3 text-slate-400"><span>│‹</span><span>≪</span><span>‹</span><span className="grid size-7 place-items-center rounded bg-blue-600 text-white">1</span><span>›</span><span>≫</span><span>›│</span></div>
        </div>
      </section>

      {actionDialog?.kind === "parent" && <AlertDialog title="학부모 발송" message={<p>{actionDialog.record.studentName} 학부모에게 발송하시겠습니까?</p>} onClose={() => setActionDialog(null)} onConfirm={confirmSingleParentSend} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "ai" && <AlertDialog title="AI 자동 작성 실행" message={<><p>선택한 <strong>{selectedIds.length}</strong>개의 워크북에 AI 자동 작성을 실행하시겠어요?</p><p>각 워크북의 AI 자동 작성 가능 횟수에서 1회씩 차감됩니다.</p><p>생성된 내용은 상세 화면에서 확인 후 수정해 주세요.</p></>} onClose={() => setActionDialog(null)} onConfirm={confirmBulkAction} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "send" && <AlertDialog title="일괄 피드백 전송" message={<p>선택한 {selectedIds.length}개의 항목에 대해 피드백을 전송하시겠습니까?</p>} onClose={() => setActionDialog(null)} onConfirm={confirmBulkAction} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "parent" && <AlertDialog title="일괄 학부모 발송" message={<p>선택한 {selectedIds.length}개의 항목에 대해 학부모에게 발송하시겠습니까?</p>} onClose={() => setActionDialog(null)} onConfirm={confirmBulkAction} />}

      {actionDialog?.kind === "bulk" && actionDialog.action === "flower" && <FlowerDialog count={selectedIds.length} selectedFlower={selectedFlower} onSelect={setSelectedFlower} onClose={() => { setActionDialog(null); setSelectedFlower(null) }} onConfirm={confirmBulkAction} />}
    </div>
  )
}
