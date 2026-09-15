"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, Bot, CheckCircle2, ChevronDown, FileText, GripVertical, Info, PencilLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useReviews, type ReviewRole } from "@/lib/review-client"
import { reviewAiDialogCopy } from "@/lib/review-ai-dialog"
import { canAwardReview, canRejectReview, canSendReview, reviewFeedbackItems, reviewIncludesItemFeedback, plainReviewText, reportState, sampleReviewAi, scoreLabel, validAiScores, validItemFeedback, validScores, type ItemFeedback, type ReviewCommon, type ReviewRecord, type ReviewScores } from "@/lib/review-domain"
import { ReviewAssessment } from "./review-assessment"
import { TeacherReferencePanel } from "./teacher-reference-panel"
import { TeacherStudentWriting } from "./teacher-student-writing"
import { ItemReference, ReviewDialog, ReviewEditor, ReviewText } from "./review-ui"

export function ReviewTeacherDetail({ id, role = "agency" }: { id: string; role?: ReviewRole }) {
  const hook = useReviews(role)
  const alias = hook.db.reviews.find(c => c.legacyRecordId === id)
  const record = hook.db.records.find(r => r.id === id || (r.reviewId === alias?.id && r.round === 1))
  const common = hook.db.reviews.find(r => r.id === record?.reviewId)
  if (!hook.loaded) return <p className="p-6">불러오는 중…</p>
  if (!record || !common) return <p role="alert" className="p-6">조회할 수 없는 독후감입니다. {hook.error}</p>
  return <TeacherEditor key={record.id} common={common} record={record} hook={hook} role={role} />
}
function TeacherEditor({ common, record, hook, role }: { common: ReviewCommon; record: ReviewRecord; hook: ReturnType<typeof useReviews>; role: ReviewRole }) {
  const router = useRouter()
  const listUrl = role === "admin" ? "/admin/online-workbooks" : `/agency/online-workbooks?role=${role}`
  const leave = () => !locked && dirty ? setModal("leave") : router.push(listUrl)
  const [feedback, setFeedback] = React.useState(record.aiDraft?.feedback ?? record.feedback)
  const [feedbackOpen, setFeedbackOpen] = React.useState(true)
  const [reportFeedbackValue, setReportFeedback] = React.useState(record.aiDraft?.reportFeedback ?? record.reportFeedback ?? "")
  const reportFeedbackSource = record.aiDraft?.reportFeedback ?? record.reportFeedback ?? ""
  const previousReportFeedbackSource = React.useRef(reportFeedbackSource)
  React.useEffect(() => {
    const previousSource = previousReportFeedbackSource.current
    setReportFeedback(current => current === previousSource ? reportFeedbackSource : current)
    previousReportFeedbackSource.current = reportFeedbackSource
  }, [reportFeedbackSource])
  const [reportFeedbackOpen, setReportFeedbackOpen] = React.useState(false)
  const [items, setItems] = React.useState<ItemFeedback[]>(reviewFeedbackItems(common.template, record.aiDraft?.items ?? record.itemFeedback))
  const [scores, setScores] = React.useState<ReviewScores>(record.teacherScores ?? {})
  const [decision, setDecision] = React.useState(common.secondDecision ?? "")
  const [modal, setModal] = React.useState<"send" | "parent" | "flower" | "reject" | "leave" | null>(null)
  const [aiDialogOpen, setAiDialogOpen] = React.useState(false)
  const [firstReferenceOpen, setFirstReferenceOpen] = React.useState(false)
  const closeFirstReference = React.useCallback(() => setFirstReferenceOpen(false), [])
  const [itemFeedbackOpen, setItemFeedbackOpen] = React.useState(false)
  const [expandedItemIds, setExpandedItemIds] = React.useState<Set<string>>(() => new Set())
  const includeItemFeedback = reviewIncludesItemFeedback(common.template)
  const [assessmentOpen, setAssessmentOpen] = React.useState(false)
  const [amount, setAmount] = React.useState<number | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState("")
  const dragged = React.useRef<number | null>(null)
  const locked = role === "admin" || record.feedbackStatus === "전송완료" || record.writingStatus !== "submitted"
  const reportFeedback = locked ? reportFeedbackSource : reportFeedbackValue
  const aiDialog = reviewAiDialogCopy(record.aiUsed, common.reportEnabled, includeItemFeedback)
  const first = hook.db.records.find(r => r.reviewId === common.id && r.round === 1)!
  const dirty = feedback !== record.feedback || (common.reportEnabled && reportFeedback !== (record.reportFeedback ?? "")) || JSON.stringify(items) !== JSON.stringify(record.itemFeedback) || JSON.stringify(scores) !== JSON.stringify(record.teacherScores ?? {}) || (record.round === 1 && decision !== (common.secondDecision ?? ""))
  const valid = plainReviewText(feedback).length >= 10 && validItemFeedback(items) && (record.round === 2 || !!decision) && (!common.reportEnabled || (plainReviewText(reportFeedback).length >= 10 && validScores(common.level, scores, record) && validAiScores(common.level, record.aiScores, record)))
  React.useEffect(() => { const handler = (e: BeforeUnloadEvent) => { if (!locked && dirty) { e.preventDefault(); e.returnValue = "" } }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler) }, [dirty, locked])
  const generate = async () => {
    if (busy || locked || record.aiUsed >= 2) return
    setAiDialogOpen(false); setBusy(true)
    const requestId = crypto.randomUUID()
    const started = await hook.run({ type: "ai-start", recordId: record.id }, requestId)
    if (started) {
      const generated = sampleReviewAi(common, { ...record, itemFeedback: items, aiDraft: undefined })
      const candidate = { ...generated, items: generated.items.map(item => {
        const current = items.find(existing => existing.itemId === item.itemId)
        const visible = includeItemFeedback && (current?.visible ?? true)
        return { ...item, visible, text: visible ? item.text : (current?.text ?? "") }
      }) }
      const finished = await hook.run({ type: "ai-result", recordId: record.id, runId: requestId, result: candidate })
      const updated = finished?.records.find(r => r.id === record.id)
      if (updated?.aiHistory.at(-1)?.status === "success" && updated.aiDraft) {
        setFeedback(updated.aiDraft.feedback); setItems(updated.aiDraft.items)
        if (common.reportEnabled) { setReportFeedback(updated.aiDraft.reportFeedback ?? ""); setReportFeedbackOpen(true) }
        if (includeItemFeedback) {
          setItemFeedbackOpen(true)
          const firstItemId = items.find(item => item.visible)?.itemId ?? items[0]?.itemId
          if (firstItemId) setExpandedItemIds(current => new Set(current).add(firstItemId))
        }
        if (common.reportEnabled) setAssessmentOpen(true)
        setNotice(`AI가 생성한 ${includeItemFeedback ? "[학생용] 총평·항목별 피드백" : "[학생용] 총평"}${common.reportEnabled ? "과 평가 점수·[보고서용] 총평" : ""}을 확인한 뒤 저장해 주세요.`)
      }
      else if (updated?.aiHistory.at(-1)?.reason?.startsWith("채점 불가:")) setNotice(`AI ${updated.aiHistory.at(-1)!.reason} 사용 횟수는 차감되지 않았습니다. 다시 생성해 주세요.`)
      else setNotice("AI 생성 실패: 기존 입력과 점수, 성공 횟수를 유지했습니다.")
    }
    setBusy(false)
  }
  const save = async () => {
    setBusy(true)
    if (await hook.run({ type: "save-feedback", recordId: record.id, feedback, reportFeedback: common.reportEnabled ? reportFeedback : undefined, items, scores, decision: decision === "request" || decision === "complete" ? decision : undefined })) setNotice("피드백과 평가가 저장되었습니다.")
    setBusy(false)
  }
  const requestAi = () => {
    if (locked || busy) return
    setAiDialogOpen(true)
  }
  const confirm = async () => {
    if (!modal) return
    if (modal === "leave") { router.push(listUrl); return }
    setBusy(true)
    const result = modal === "flower" ? await hook.run({ type: "flower", recordId: record.id, amount: amount! }) : await hook.run({ type: modal, recordId: record.id })
    if (result) { setNotice("처리되었습니다."); setModal(null); if (modal === "reject") router.push(listUrl) }
    setBusy(false)
  }
  const controlClass = "h-8 rounded-[8px] px-[15px] text-sm font-normal shadow-none disabled:border-[#e4e4e7] disabled:bg-[#323639]/[0.04] disabled:text-[#323639]/25 disabled:opacity-100"
  const previewClass = controlClass + " border-[#1890ff] text-[#1890ff] hover:bg-[#e6f7ff] hover:text-[#1890ff]"
  const parentPreview = record.feedbackStatus === "전송완료" && record.parentContact && <Button asChild variant="outline" className={previewClass}><a href={`/online-review/share/${record.id}`} target="_blank" rel="noopener noreferrer">학부모 발송 미리보기</a></Button>
  const reportLink = common.reportEnabled && record.report && <a href={`/online-review/report/${record.id}?role=${role}`} target="_blank" rel="noopener noreferrer" aria-label={`${record.round}차 보고서 보기`} title={`${record.round}차 보고서 보기`} className="inline-grid size-7 place-items-center rounded text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-[#1890ff]"><FileText aria-hidden="true" className="size-4" /></a>
  const toggleExpandedItem = (itemId: string) => setExpandedItemIds(current => {
    const next = new Set(current)
    if (next.has(itemId)) next.delete(itemId)
    else next.add(itemId)
    return next
  })
  return <div className="flex min-h-0 flex-1 flex-col bg-[#f2f3f5] text-[#454545] [&_button:not(:disabled)]:cursor-pointer">
    <div className="min-h-0 flex-1 overflow-y-auto">
    <header className="bg-white px-5 py-5 lg:px-16">
      <div className="flex items-center gap-3"><button type="button" aria-label="온라인 독후감 목록으로 돌아가기" onClick={leave} className="grid size-7 place-items-center text-[#1890ff]"><ArrowLeft className="size-4" /></button><h1 className="text-xl font-semibold">온라인 독후감 피드백</h1></div>
      <p className="mb-4 mt-4 text-sm text-[#777]">학생이 제출한 독후감을 확인하고 피드백을 작성하세요.{role === "admin" && " 본사관리자는 조회만 가능합니다."}</p>
      <div className="overflow-hidden rounded-lg border border-[#e0e5e9]">
        <div className="overflow-x-auto">
          <table aria-label="학생 및 독후감 정보" className="w-full min-w-[1060px] border-collapse text-left text-sm [&_th]:border-r [&_th]:border-[#e8e8e8] [&_th]:bg-[#fafafa] [&_th]:px-2 [&_th]:py-3 [&_th]:font-medium [&_td]:border-r [&_td]:border-t [&_td]:border-[#e8e8e8] [&_td]:px-2 [&_td]:py-3">
            <thead><tr>{["학생명", "도서명(레벨)", "전자책", "길라잡이", "학생 제출일", "차수", "피드백 상태", "학부모 발송 여부", "평가 보고서", "섬초롱꽃"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody><tr><td>{common.studentName}</td><td>{common.bookTitle} ({common.level}레벨)</td><td className="text-center"><span title="이 작성글에는 전자책 열람 URL이 연결되어 있지 않습니다." className="inline-flex text-[#bfbfbf]"><BookOpen aria-label="전자책 연결 정보 없음" className="size-5" /></span></td><td className="text-center"><span title="길라잡이 연결 정보 없음">-</span></td><td>{record.submittedAt?.slice(0, 10) ?? "-"}</td><td className="whitespace-nowrap font-semibold text-[#0877b9]">{record.round}차</td><td><span className="whitespace-nowrap rounded bg-[#8c8c8c] px-2 py-1 text-xs text-white">피드백 {record.feedbackStatus}</span></td><td><span className="whitespace-nowrap rounded bg-[#8c8c8c] px-2 py-1 text-xs text-white">{record.parentSentAt ? "발송완료" : "미발송"}</span></td><td className="whitespace-nowrap">{common.reportEnabled ? (reportLink || reportState(common, record)) : <Popover><PopoverTrigger asChild><button type="button" className="inline-flex items-center gap-1 font-medium text-[#263747] hover:text-[#1890ff]">없음<Info className="size-3.5" /></button></PopoverTrigger><PopoverContent align="start" className="w-80 text-sm leading-6 text-[#596773]">학생이 선택한 독후감 템플릿은 평가 보고서를 제공하지 않습니다. 점수 평가 없이 {includeItemFeedback ? "[학생용] 총평과 항목별 피드백" : "[학생용] 총평"}을 작성해 주세요.</PopoverContent></Popover>}</td><td className="whitespace-nowrap">🌻 {record.flowers}개</td></tr></tbody>
          </table>
        </div>
      </div>
    </header>
    {(hook.error || notice) && <p role="status" className="mx-4 mt-6 rounded bg-blue-50 p-3">{hook.error || notice}</p>}
    <div className="my-6 grid items-stretch gap-4 px-0 lg:grid-cols-2 lg:px-6">
      <TeacherStudentWriting common={common} record={record} />
      <section className="min-w-0 space-y-4 rounded-lg border border-[#e3e3e3] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><PencilLine className="size-4" />피드백 작성</h2><div className="flex flex-wrap items-center justify-end gap-2">
          {record.round === 2 && <Button variant="outline" size="sm" aria-expanded={firstReferenceOpen} aria-controls="first-round-reference-panel" className="h-8 rounded border-[#1890ff] px-3 text-xs font-semibold text-[#1890ff] shadow-none hover:bg-[#e6f7ff] hover:text-[#1890ff]" onClick={() => setFirstReferenceOpen(true)}><BookOpen className="size-4" />1차 작성글·피드백 참고</Button>}
          <Button disabled={locked || busy} size="sm" className="h-8 rounded bg-[#722ed1] px-3 text-xs font-semibold text-white hover:bg-[#9254de]" onClick={requestAi}><Bot className="size-4" />AI 피드백 생성 (사용 {record.aiUsed}/2회)</Button></div></div>
        <section aria-label="피드백 작성 안내" className="rounded-lg border border-[#ded4ef] bg-[#fbfaff] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 font-semibold text-[#51317f]"><Bot className="size-4" />AI 피드백 생성 안내</div><div className="flex items-center gap-2"><div aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e8e1f3]"><span className="block h-full bg-[#722ed1]" style={{ width: `${Math.min(record.aiUsed, 2) * 50}%` }} /></div><span className="text-xs font-semibold text-[#6543a5]">사용 {record.aiUsed}/2회</span></div></div>
          <div className="mt-2 space-y-1 text-sm leading-5 text-[#5f6872]"><p>{includeItemFeedback ? "항목별보기 독후감은 [학생용] 총평과 학생 표시가 켜진 항목별 피드백을 생성합니다." : "이어보기 독후감은 [학생용] 총평만 생성하며, 항목별 피드백은 제공하지 않습니다."} [AI 피드백 생성]을 눌러 주세요.</p>{common.reportEnabled && <p>평가 점수와 [보고서용] 총평도 함께 생성합니다. 선생님 평가 점수는 직접 입력해 주세요.</p>}<p>생성된 내용은 확인·수정한 후 저장해 주세요. {includeItemFeedback ? "각 총평과 학생 표시가 켜진 항목별 피드백은 각각 10자 이상 입력해야 합니다." : "각 총평은 10자 이상 입력해야 합니다."}</p><p>차수별 최대 2회 생성할 수 있으며, 생성 성공 시 1회 차감됩니다. 최초 생성 확인 후에는 학생에게 반려할 수 없습니다.</p></div>
        </section>
        {record.round === 1 && <fieldset disabled={locked} className="min-w-0 rounded-lg border border-[#b9ddf5] bg-[#f3faff] px-4 py-3 text-sm">
          <legend className="sr-only">2차 작성 여부 (필수)</legend>
          <div className="flex flex-col gap-2">
            <div aria-hidden="true" className="text-base font-bold text-[#263747]"><span className="mr-1 text-[#ff4d4f]">*</span>2차 작성 여부</div>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <RadioGroup
              value={decision}
              onValueChange={setDecision}
              disabled={locked}
              aria-label="2차 작성 여부"
              aria-describedby={`second-decision-${record.id}-guide`}
              aria-required="true"
              className="flex max-w-full shrink-0 flex-wrap gap-x-6 gap-y-2"
            >
              <div className="flex min-h-10 items-center gap-2">
                <RadioGroupItem value="request" id={`second-decision-${record.id}-request`} className="size-5 border-2 border-[#788b9b] text-[#1890ff] shadow-none data-[state=checked]:border-[#1890ff] focus-visible:border-[#1890ff] focus-visible:ring-[#1890ff]/30 [&_svg]:size-2.5 [&_svg]:fill-[#1890ff]" />
                <Label htmlFor={`second-decision-${record.id}-request`} className={`min-h-10 cursor-pointer select-none text-sm ${decision === "request" ? "font-bold text-[#1890ff]" : "font-medium text-[#263747]"}`}>2차 작성 요청</Label>
              </div>
              <div className="flex min-h-10 items-center gap-2">
                <RadioGroupItem value="complete" id={`second-decision-${record.id}-complete`} className="size-5 border-2 border-[#788b9b] text-[#1890ff] shadow-none data-[state=checked]:border-[#1890ff] focus-visible:border-[#1890ff] focus-visible:ring-[#1890ff]/30 [&_svg]:size-2.5 [&_svg]:fill-[#1890ff]" />
                <Label htmlFor={`second-decision-${record.id}-complete`} className={`min-h-10 cursor-pointer select-none text-sm ${decision === "complete" ? "font-bold text-[#1890ff]" : "font-medium text-[#263747]"}`}>1차 완료</Label>
              </div>
            </RadioGroup>
            <p id={`second-decision-${record.id}-guide`} className="text-xs leading-5 text-[#697681]"><strong className="font-semibold">2차 작성 요청:</strong> 피드백 참고 후 다시 작성 / <strong className="font-semibold">1차 완료:</strong> 이번 피드백으로 활동 종료</p>
            </div>
          </div>
        </fieldset>}
        <details open={feedbackOpen} onToggle={event => setFeedbackOpen(event.currentTarget.open)} className="group/feedback-summary">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-md py-2 focus-visible:outline-2 focus-visible:outline-[#1890ff] [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2 font-bold"><ChevronDown aria-hidden className="size-4 shrink-0 -rotate-90 transition-transform group-open/feedback-summary:rotate-0" /><span><span className="mr-1 text-[#ff4d4f]">*</span>[학생용] 총평</span></span><span className={`text-xs font-medium ${plainReviewText(feedback).length >= 10 ? "text-[#27865a]" : "text-[#d4380d]"}`}>{plainReviewText(feedback).length}자 / 최소 10자</span></summary>
          <div className="mt-3">{locked ? <div className="rounded-lg border border-[#dfe4e8] bg-[#fafbfc] p-4"><ReviewText value={feedback || "등록된 총평이 없습니다."} /></div> : <ReviewEditor academy label="[학생용] 총평" value={feedback} onChange={setFeedback} />}</div>
        </details>
        {includeItemFeedback ? <section className="border-t border-[#e8e8e8] pt-5">
          <details open={itemFeedbackOpen} onToggle={event => setItemFeedbackOpen(event.currentTarget.open)} className="group/feedback">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-md py-2 focus-visible:outline-2 focus-visible:outline-[#1890ff] [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2 font-bold"><ChevronDown aria-hidden className="size-4 -rotate-90 transition-transform group-open/feedback:rotate-0" />[학생용] 항목별 피드백</span><span className="text-xs font-medium text-[#0877b9]">{items.filter(item => item.visible).length}개 중 {items.length}개 표시</span></summary>
          <section aria-label="[학생용] 항목별 피드백 작성" className="mt-2 overflow-hidden rounded-lg border border-[#dfe4e8] bg-white">
          {items.map((f, index) => {
            const item = common.template.items.find(i => i.id === f.itemId)!
            const feedbackLength = plainReviewText(f.text).length
            const expanded = expandedItemIds.has(f.itemId)
            return <section key={f.itemId} aria-label={`${item.title} 피드백 항목`} onDragOver={e => e.preventDefault()} onDrop={() => {
              if (locked || dragged.current === null) return
              const next = [...items]
              const [moved] = next.splice(dragged.current, 1)
              next.splice(index, 0, moved)
              setItems(next)
              dragged.current = null
            }} className={`border-b border-[#e8ecef] last:border-b-0 ${f.visible ? "bg-white" : "bg-[#fafbfc]"}`}>
              <header className="flex min-h-14 items-center gap-2 px-3 py-2">
                <button type="button" draggable={!locked} aria-label={`${item.title} 순서 변경`} disabled={locked} onDragStart={() => { dragged.current = index }} onDragEnd={() => { dragged.current = null }} className="grid size-7 shrink-0 cursor-grab place-items-center rounded text-[#9aa4ad] hover:bg-[#f2f5f7] active:cursor-grabbing disabled:cursor-default"><GripVertical className="size-4" /></button>
                <span className="grid size-6 shrink-0 place-items-center rounded bg-[#eaf6ff] text-xs font-semibold text-[#0877b9]">{index + 1}</span>
                <button type="button" aria-expanded={expanded} onClick={() => toggleExpandedItem(f.itemId)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-[#263747]">{item.title}</button>
                <Popover><PopoverTrigger asChild><button type="button" aria-label={`${item.title} 안내 및 예시`} className="grid size-7 shrink-0 place-items-center rounded text-[#1890ff] hover:bg-[#e6f7ff]"><Info className="size-4" /></button></PopoverTrigger><PopoverContent align="start" className="w-80 space-y-3 text-sm leading-6"><div><strong className="text-[#263747]">항목 안내</strong><p className="mt-1 whitespace-pre-wrap text-[#596773]">{item.description}</p></div>{item.example && <div className="border-t pt-3"><strong className="text-[#263747]">예시</strong><p className="mt-1 whitespace-pre-wrap text-[#596773]">{item.example}</p></div>}</PopoverContent></Popover>
                <span className={`hidden items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium sm:inline-flex ${feedbackLength >= 10 ? "bg-[#edf9f3] text-[#27865a]" : "bg-[#f1f3f5] text-[#697681]"}`}>{feedbackLength >= 10 ? <CheckCircle2 className="size-3.5" /> : null}{feedbackLength}자 / 최소 10자</span>
                <button type="button" role="switch" aria-checked={f.visible} aria-label={`${item.title} 학생 노출`} disabled={locked} onClick={() => setItems(current => current.map(x => x.itemId === f.itemId ? { ...x, visible: !x.visible } : x))} className="inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-1.5 text-xs font-medium text-[#52616e] hover:bg-[#f2f5f7]"><span className="hidden shrink-0 lg:inline">{f.visible ? "학생 표시" : "학생 제외"}</span><span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${f.visible ? "bg-[#1890ff]" : "bg-[#c8d0d6]"}`}><span className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${f.visible ? "translate-x-[18px]" : "translate-x-0.5"}`} /></span></button>
                <button type="button" aria-label={`${item.title} ${expanded ? "접기" : "펼치기"}`} aria-expanded={expanded} onClick={() => toggleExpandedItem(f.itemId)} className="grid size-7 shrink-0 place-items-center rounded text-[#697681] hover:bg-[#f2f5f7]"><ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>
              </header>
              {expanded && <div className="space-y-4 border-t border-[#e8ecef] bg-[#fcfdfe] p-4">
                {!record.rewriteEdited && <section className="rounded-md bg-[#f5f7f9] p-3"><h5 className="mb-1 text-xs font-semibold text-[#777]">학생 작성 내용</h5><ReviewText value={record.answers[item.id] || "작성한 내용이 없습니다."} /></section>}
                <div className={!f.visible ? "opacity-60" : undefined}><div className="mb-2 flex items-center justify-between"><h5 className="text-sm font-semibold text-[#0877b9]">선생님 피드백</h5>{!f.visible && <span className="text-xs text-[#777]">학생에게 전달되지 않습니다.</span>}</div>{locked ? <div className="rounded-md border border-[#dfe4e8] bg-white p-3"><ReviewText value={f.text || "등록된 피드백이 없습니다."} /></div> : <ReviewEditor academy compact label={`${item.title} 피드백`} value={f.text} readOnly={!f.visible} onChange={text => setItems(current => current.map(x => x.itemId === f.itemId ? { ...x, text } : x))} />}</div>
              </div>}
            </section>
          })}
          </section>
        </details>
        </section> : null}
    {common.reportEnabled ? <details open={assessmentOpen} onToggle={event => setAssessmentOpen(event.currentTarget.open)} className="group/assessment border-t border-[#e8e8e8] pt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-2 font-bold focus-visible:outline-2 focus-visible:outline-[#1890ff] [&::-webkit-details-marker]:hidden"><ChevronDown aria-hidden className="size-4 shrink-0 -rotate-90 transition-transform group-open/assessment:rotate-0" />[보고서용] {record.round}차 평가</summary>
      <div className="mt-3"><ReviewAssessment common={common} record={record} scores={scores} onChange={setScores} readOnly={locked} hideHeading /></div>
    </details> : null}
    {common.reportEnabled && <details open={reportFeedbackOpen} onToggle={event => setReportFeedbackOpen(event.currentTarget.open)} className="group/report-feedback border-t border-[#e8e8e8] pt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-2 font-bold focus-visible:outline-2 focus-visible:outline-[#1890ff] [&::-webkit-details-marker]:hidden"><ChevronDown aria-hidden className="size-4 shrink-0 -rotate-90 transition-transform group-open/report-feedback:rotate-0" />[보고서용] 총평</summary>
      <div className="mt-3 space-y-3"><div className="flex items-center justify-between gap-3"><p className="text-sm text-[#667581]">저장한 내용이 해당 차수 평가보고서의 총평에 반영됩니다.</p><span className={`whitespace-nowrap text-xs font-medium ${plainReviewText(reportFeedback).length >= 10 ? "text-[#27865a]" : "text-[#d4380d]"}`}>{plainReviewText(reportFeedback).length}자 / 최소 10자</span></div>{locked ? <div className="rounded-lg border border-[#dfe4e8] bg-[#fafbfc] p-4"><ReviewText value={reportFeedback || "등록된 보고서용 총평이 없습니다."} /></div> : <ReviewEditor academy label="[보고서용] 총평" value={reportFeedback} onChange={setReportFeedback} />}</div>
    </details>}
      </section>
    </div>
    </div>
    <footer aria-label="독후감 처리" className="relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#dfe5ea] bg-white px-5 py-4 shadow-[0_-4px_14px_rgba(38,55,71,0.08)] lg:px-16">
      <div className="flex flex-wrap items-center gap-2"><Button variant="outline" className={controlClass} onClick={leave}>{role === "admin" ? "목록" : "취소"}</Button>{role !== "admin" && canRejectReview(record) && <Button variant="outline" disabled={busy} className={controlClass + " border-[#ff3860] text-[#ff3860] hover:bg-[#fff1f3] hover:text-[#ff3860]"} onClick={() => setModal("reject")}>학생 반려</Button>}</div>
      {role !== "admin" ? <div className="flex flex-wrap items-center gap-2">
        <Button disabled={!canAwardReview(record) || busy} className={controlClass + " border-[#faad14] bg-[#faad14] text-white hover:bg-[#ffc53d]"} onClick={() => { setAmount(null); setModal("flower") }}>섬초롱꽃 지급</Button>
        <Button disabled={locked || !valid || !dirty || busy} className={controlClass + " bg-[#1890ff] text-white hover:bg-[#40a9ff]"} onClick={() => void save()}>저장</Button>
        <Button disabled={locked || dirty || !canSendReview(common, record) || busy} className={controlClass + " bg-[#1890ff] text-white hover:bg-[#40a9ff]"} onClick={() => setModal("send")}>학생에게 전송</Button>
        <div className="flex items-center gap-2">
          <Button disabled={record.feedbackStatus !== "전송완료" || !record.parentContact || !!record.parentSentAt || busy} className={controlClass + " border-[#faad14] bg-[#faad14] text-white hover:bg-[#ffc53d]"} onClick={() => setModal("parent")}>학부모 발송</Button>
          {parentPreview}
        </div>
      </div> : <div className="flex flex-wrap items-center gap-2">{parentPreview}</div>}
    </footer>
    {record.round === 2 && firstReferenceOpen && <TeacherReferencePanel onClose={closeFirstReference}><FirstRoundReference common={common} record={first} role={role} /></TeacherReferencePanel>}
    {aiDialogOpen && <ReviewDialog title={aiDialog.title} onClose={() => setAiDialogOpen(false)} onConfirm={aiDialog.confirmable ? () => void generate() : undefined} disabled={busy}><div className="space-y-2">{aiDialog.lines.map((line, index) => <p key={line} className={aiDialog.kind === "first" && index === 4 ? "border-t border-[#e8ecef] pt-3" : undefined}>{line}</p>)}</div></ReviewDialog>}
    {modal && <ReviewDialog title={({ send: "학생 전송", parent: "학부모 발송", flower: "섬초롱꽃을 지급할까요?", reject: "학생 반려", leave: "이동 확인" })[modal]} onClose={() => setModal(null)} onConfirm={() => void confirm()} disabled={busy || (modal === "flower" && !amount)}>{modal === "flower" ? <><p>지급된 섬초롱꽃은 되돌릴 수 없습니다. 지급 개수를 확인해 주세요.</p><div className="my-4 flex gap-2">{[5, 10, 15, 20].map(n => <Button key={n} variant={amount === n ? "default" : "outline"} onClick={() => setAmount(n)}>🌻 {n}개</Button>)}</div><div className="space-y-2 rounded-xl bg-blue-50 p-4"><strong>권장 기준 안내</strong><p>🥉 5개: 작성 내용이 단순하고, 구체적인 감상 표현이 부족한 글</p><p>🥈 10개: 독서록 양식에 따라 충실히 작성했으나, 의견이나 생각이 부족한 글</p><p>🥇 15개: 인상 깊은 내용을 구체적으로 쓰고, 경험이나 생각과 연결해 감상을 풍부하게 적은 글</p><p>🏆 20개: 주제에 대한 깊이 있는 분석, 창의적 해석과 독창적인 표현이 돋보이는 글</p></div></> : modal === "parent" ? `${common.studentName} 학부모에게 발송하시겠습니까?` : modal === "reject" ? "작성 내용은 유지하며 같은 차수를 작성중으로 돌립니다. 반려하시겠습니까?" : modal === "leave" ? "저장하지 않은 변경 내용을 버리고 목록으로 이동할까요?" : "학생에게 피드백을 전송할까요? 전송 후 수정하거나 반려할 수 없습니다."}</ReviewDialog>}
  </div>
}

function FirstRoundReference({ common, record, role }: { common: ReviewCommon; record: ReviewRecord; role: ReviewRole }) {
  const feedbackItems = reviewFeedbackItems(common.template, record.itemFeedback).filter(item => item.visible && plainReviewText(item.text).length > 0)
  const report = common.reportEnabled ? record.report : undefined
  return <div className="space-y-5">
      <section aria-label="1차 평가 및 지급 결과" className="rounded-lg border border-[#e8e8e8] bg-[#fafafa] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">1차 평가·지급 결과</h3>
          {report && <Button asChild variant="outline" className="h-8 rounded-md border-[#1890ff] px-4 text-xs font-normal text-[#1890ff] shadow-none hover:bg-[#e6f7ff] hover:text-[#1890ff]"><a target="_blank" rel="noopener noreferrer" href={`/online-review/report/${record.id}?role=${role}`}>1차 보고서 보기</a></Button>}
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {report && <>
            <div className="rounded-md border border-[#e8e8e8] bg-white p-3"><dt className="text-xs text-[#777]">AI 점수</dt><dd className="mt-1 text-lg font-semibold">{scoreLabel(report.ai)}<span className="ml-1 text-xs font-normal">점</span></dd></div>
            <div className="rounded-md border border-[#e8e8e8] bg-white p-3"><dt className="text-xs text-[#777]">선생님 점수</dt><dd className="mt-1 text-lg font-semibold">{scoreLabel(report.teacher)}<span className="ml-1 text-xs font-normal">점</span></dd></div>
            <div className="rounded-md border border-[#e8e8e8] bg-white p-3"><dt className="text-xs text-[#777]">1차 점수</dt><dd className="mt-1 text-lg font-semibold text-[#1890ff]">{scoreLabel(report.score)}<span className="ml-1 text-xs font-normal">점</span></dd></div>
          </>}
          <div className="rounded-md border border-[#e8e8e8] bg-white p-3"><dt className="text-xs text-[#777]">섬초롱꽃</dt><dd className="mt-1 text-lg font-semibold">{record.flowers > 0 ? <>{record.flowers}<span className="ml-1 text-xs font-normal">개 지급</span></> : "미지급"}</dd></div>
        </dl>
        {!report && <p className="mt-3 text-xs text-[#777]">평가 보고서: {reportState(common, record)}</p>}
      </section>
      <div className="space-y-5">
        <section aria-label="1차 작성글 참고" className="min-w-0 rounded-lg border border-[#e8e8e8]">
          <header className="border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3"><h3 className="text-sm font-semibold">1차 최종 작성글</h3></header>
          <div className="p-4"><ReviewText value={record.finalBody} /></div>
          <details className="border-t border-[#e8e8e8] p-4">
            <summary className="cursor-pointer text-sm font-medium text-[#1890ff]">1차 항목별 작성 내용·안내·예시</summary>
            <div className="mt-4"><ItemReference common={common} record={record} /></div>
          </details>
        </section>
        <section aria-label="1차 선생님 피드백 참고" className="min-w-0 rounded-lg border border-[#e8e8e8]">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3"><h3 className="text-sm font-semibold">1차 선생님 피드백</h3>{record.savedAt && <span className="text-xs text-[#777]">작성일 {record.savedAt.slice(0, 10)}</span>}</header>
          <div className="space-y-5 p-4">
            <section><h4 className="mb-2 text-sm font-semibold">총평</h4><ReviewText value={record.feedback} /></section>
            {feedbackItems.length > 0 && <section className="border-t border-[#e8e8e8] pt-4">
              <h4 className="mb-3 text-sm font-semibold">항목별 피드백</h4>
              {feedbackItems.length ? <div className="space-y-4">{feedbackItems.map(item => <section key={item.itemId} className="border-l-2 border-[#d6eaff] pl-3"><h5 className="mb-1 text-sm font-medium text-[#555]">{common.template.items.find(templateItem => templateItem.id === item.itemId)?.title ?? "항목"}</h5><ReviewText value={item.text} /></section>)}</div> : <p className="text-sm text-[#777]">등록된 항목별 피드백이 없습니다.</p>}
            </section>}
          </div>
        </section>
      </div>
  </div>
}
