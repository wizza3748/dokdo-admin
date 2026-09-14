"use client"
import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ClipboardCheck, Copy, ExternalLink, FileCheck2, FileText, GitCompareArrows, LockKeyhole, MessageCircle, PanelRightOpen, RefreshCw, Save, Search, Smartphone, X } from "lucide-react"
import { BookPanel, StartConfirmModal, ConfirmModal, OutlineModal, PreviewModal, SelectionScreen, SelectionTitle, WorkbookTopBars } from "./student-workbook-ui"
import { getWorkbookForReview, type WorkbookTemplate } from "@/lib/student-workbooks"
import { StudentHeader } from "@/components/student/student-header"
import { useReviews } from "@/lib/review-client"
import { getConfiguredTemplates, subscribeTemplateSettings } from "@/lib/workbook-template-settings"
import { cn } from "@/lib/utils"
import { DEFAULT_GUIDES } from "@/lib/workbook-templates"
import { canChangeReviewTemplate, plainReviewText, reviewActivityDate, studentReviewProgressLabel, reviewWritingMode, type ReviewCommon, type ReviewRecord, type ReviewTemplate } from "@/lib/review-domain"
import type { StudentWorkbook } from "@/lib/student-workbooks"
import { ItemReference, ReviewEditor, ReviewText } from "@/components/online-workbooks/review-ui"

type ReviewHook = ReturnType<typeof useReviews>

const studentWritingLineStyle: React.CSSProperties = {
  backgroundImage: "radial-gradient(circle, #cbdbe4 1px, transparent 1.2px)",
  backgroundPosition: "0 13px",
  backgroundSize: "6px 28px",
}

function StudentResultText({ value }: { value: string }) {
  return <div className="min-h-7 pb-px text-[16px] font-normal leading-7" style={studentWritingLineStyle}><div className="[&>div]:text-[16px] [&>div]:font-normal [&>div]:leading-7"><ReviewText value={value || "작성한 내용이 없습니다."} /></div></div>
}

function parseRewriteGuide(value: string) {
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const intro: string[] = []
  const items: string[] = []
  let title = ""
  let current: string[] = []
  const flush = () => {
    if (current.length) items.push(current.join(" "))
    current = []
  }
  for (const line of lines) {
    if (line.startsWith("📝") && !title) {
      title = line.replace(/^📝\s*/, "")
      continue
    }
    if (line.startsWith("✅")) {
      flush()
      current = [line.replace(/^✅\s*/, "")]
      continue
    }
    if (current.length) current.push(line)
    else intro.push(line)
  }
  flush()
  return { title: title || "고쳐쓰기 체크리스트", intro, items }
}

function RewriteReferenceHeader({ title, description, icon, closeLabel, onClose, tone = "blue" }: { title: string; description: string; icon: React.ReactNode; closeLabel: string; onClose: () => void; tone?: "blue" | "pink" }) {
  const pink = tone === "pink"
  return <header className={cn("border-b px-4 pb-3 pt-2", pink ? "border-[#f3cfda] bg-[#fff3f7]" : "border-[#dce8ef] bg-[#eef8fd]")}>
    <div className="flex h-7 justify-end"><button type="button" onClick={onClose} aria-label={closeLabel} className={cn("grid size-7 shrink-0 place-items-center rounded-lg transition hover:bg-white focus-visible:outline-2", pink ? "text-[#936575] hover:text-[#d93670] focus-visible:outline-[#e44c7f]" : "text-[#607782] hover:text-[#168fd1] focus-visible:outline-[#168fd1]")}><X className="size-4" /></button></div>
    <div className="-mt-1 flex min-w-0 items-center gap-2.5"><span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-white", pink ? "bg-[#ed4d83]" : "bg-[#168fd1]")}>{icon}</span><div className="min-w-0 flex-1"><p className="whitespace-nowrap text-[14px] font-black leading-5 text-[#2e3035]">{title}</p><p className={cn("mt-0.5 whitespace-nowrap text-[11px] leading-4", pink ? "text-[#8b6673]" : "text-[#627985]")}>{description}</p></div></div>
  </header>
}

function RewriteReferenceShell({ title, description, icon, closeLabel, onClose, contentClassName, maxHeight, children, tone = "blue" }: { title: string; description: string; icon: React.ReactNode; closeLabel: string; onClose: () => void; contentClassName: string; maxHeight: number | null; children: React.ReactNode; tone?: "blue" | "pink" }) {
  return <aside style={{ maxHeight: maxHeight ? `${maxHeight}px` : "65vh" }} className={cn("sticky top-5 flex min-h-0 overflow-hidden rounded-xl border bg-white", tone === "pink" ? "border-[#f0c3d2] shadow-[0_8px_24px_rgba(202,60,109,.10)]" : "border-[#c8dce8] shadow-[0_8px_24px_rgba(42,75,94,.08)]")}>
    <div className="flex h-full min-h-0 w-full flex-col"><RewriteReferenceHeader title={title} description={description} icon={icon} closeLabel={closeLabel} onClose={onClose} tone={tone} /><div className={cn("min-h-0 flex-1 overflow-y-auto", contentClassName)}>{children}</div></div>
  </aside>
}

function RewriteGuide({ value, checked, maxHeight, onToggle, onClose }: { value: string; checked: Set<number>; maxHeight: number | null; onToggle: (index: number) => void; onClose: () => void }) {
  const guide = React.useMemo(() => parseRewriteGuide(value), [value])
  return <RewriteReferenceShell title={guide.title} description="완료한 항목을 직접 체크해 보세요." icon={<ClipboardCheck className="size-4.5" />} closeLabel="고쳐쓰기 체크리스트 닫기" onClose={onClose} contentClassName="px-4 py-3" maxHeight={maxHeight}>
      {guide.intro.length > 0 && <div className="mb-3 space-y-1 rounded-lg bg-[#f6f8fa] px-3 py-2 text-[13px] leading-5 text-[#536672]">{guide.intro.map((line, index) => <p key={index}>{line}</p>)}</div>}
      <div className="space-y-1.5">{guide.items.map((item, index) => {
        const done = checked.has(index)
        return <button key={`${index}-${item}`} type="button" role="checkbox" aria-checked={done} onClick={() => onToggle(index)} className={cn("flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-[#168fd1]", done ? "bg-[#edf8f3] text-[#74827b]" : "hover:bg-[#f5f9fb]") }><span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded border-2 transition", done ? "border-[#27a66f] bg-[#27a66f] text-white" : "border-[#9eb2bd] bg-white text-transparent")}><Check className="size-3.5 stroke-[3]" /></span><span className={cn("text-[13px] leading-5", done && "line-through decoration-[#9bad9f]")}>{item}</span></button>
      })}</div>
  </RewriteReferenceShell>
}

function RewriteItemReference({ common, record, maxHeight, onClose }: { common: ReviewCommon; record: ReviewRecord; maxHeight: number | null; onClose: () => void }) {
  const guidanceOnly = reviewWritingMode(common.template) === "items"
  return <RewriteReferenceShell title={guidanceOnly ? "질문 항목 안내 보기" : "질문 항목별 작성글 보기"} description={guidanceOnly ? "질문 항목별 안내와 예시를 확인해 보세요." : "작성한 내용과 질문 항목 안내를 함께 확인해 보세요."} icon={<FileText className="size-4.5" />} closeLabel={guidanceOnly ? "질문 항목 안내 닫기" : "질문 항목별 작성글 닫기"} onClose={onClose} contentClassName="px-4" maxHeight={maxHeight}><ItemReference common={common} record={record} compactAnswers compact showAnswers={!guidanceOnly} /></RewriteReferenceShell>
}

function FirstDraftRail({ common, record, maxHeight, onClose }: { common: ReviewCommon; record: ReviewRecord; maxHeight: number | null; onClose: () => void }) {
  return <RewriteReferenceShell title="1차 작성글 보기" description="제출한 1차 작성글을 확인해 보세요." icon={<FileText className="size-4.5" />} closeLabel="1차 작성글 닫기" onClose={onClose} contentClassName="px-4 py-4" maxHeight={maxHeight} tone="pink">
    <h3 className="border-b border-[#eadce1] pb-3 text-[16px] font-black text-[#2e3035]">{common.template.title}</h3>
    <div className="pt-4 text-[#3f4146] [&_h2]:text-[14px] [&_h2]:leading-6 [&_div]:text-[13px] [&_div]:leading-6"><StudentResultContent common={common} record={record} /></div>
  </RewriteReferenceShell>
}

function WritingQuestionReference({ item, index, maxHeight, onClose }: { item: ReviewTemplate["items"][number]; index: number; maxHeight: number | null; onClose: () => void }) {
  const description = item.description.trim()
  const example = item.example?.trim()
  return <RewriteReferenceShell title={`${index + 1}. ${item.title}`} description="질문 항목 안내와 예시를 확인해 보세요." icon={<FileText className="size-4.5" />} closeLabel={`${index + 1}번 질문 항목 안내 닫기`} onClose={onClose} contentClassName="px-4 pb-4" maxHeight={maxHeight}>
    {description && <section className="py-4"><h3 className="text-[14px] font-black text-[#263747]">질문 항목 안내</h3><p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[#536672]">{description}</p></section>}
    {example && <section className={cn("py-4", description && "border-t border-[#dce3e7]")}><h3 className="text-[14px] font-black text-[#263747]">예시</h3><p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[#536672]">{example}</p></section>}
  </RewriteReferenceShell>
}

function StudentResultContent({ common, record }: { common: ReviewCommon; record: ReviewRecord }) {
  if (reviewWritingMode(common.template) === "continuous") return <StudentResultText value={record.finalBody} />

  return <div className="space-y-6">{common.template.items.map((item, index) => <section key={item.id}>
    <h2 className="text-[16px] font-black leading-7">{index + 1}.{item.title}</h2>
    <div className="mt-1"><StudentResultText value={record.answers[item.id] ?? ""} /></div>
  </section>)}</div>
}

export function StudentReviewFlow({ workbook }: { workbook: StudentWorkbook }) {
  const hook = useReviews()
  const common = hook.db.reviews.find(r => r.sourceWorkbookId === workbook.id)
  const [selected, setSelected] = React.useState(workbook.templates[0]?.id ?? "")
  const [round, setRound] = React.useState(0)
  const [preview, setPreview] = React.useState(false)
  const [starting, setStarting] = React.useState(false)
  const [outline, setOutline] = React.useState(false)
  const [guideOpen, setGuideOpen] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [fromRecords, setFromRecords] = React.useState(false)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRound(Number(params.get("round")) || 0)
    setFromRecords(params.get("from") === "records")
  }, [])
  const [settings, setSettings] = React.useState(getConfiguredTemplates)
  React.useEffect(() => { const refresh = () => setSettings(getConfiguredTemplates()); refresh(); return subscribeTemplateSettings(refresh) }, [])
  const templates: ReviewTemplate[] = workbook.templates.map(t => {
    const configured = settings.find(s => String(s.id) === t.id) ?? settings.find(s => s.studentTitle === t.title && s.levels.includes(workbook.level))
    // Book/round mappings may contain a selected subset or book-specific questions.
    // HQ settings supply report policy, not a replacement for those mapped items.
    return { id: t.id, title: configured?.studentTitle ?? t.title, rewriteMode: configured?.rewriteMode, reportEnabled: configured?.reportEnabled ?? false, rewriteGuide: configured?.guides.rewrite ?? DEFAULT_GUIDES.rewrite, items: t.questions.map((q, i) => ({ ...q, id: String("id" in q ? q.id : i + 1) })) }
  })
  const template = templates.find(t => t.id === selected) ?? templates[0]
  const displayTemplates: WorkbookTemplate[] = templates.map((t, i) => {
    const configured = settings.find(s => String(s.id) === t.id)
    return { ...workbook.templates[i], description: configured?.description || workbook.templates[i].description, guides: configured?.guides ?? workbook.templates[i].guides, title: t.title, reportEnabled: t.reportEnabled, questions: t.items }
  })
  const displayTemplate = displayTemplates.find(t => t.id === selected) ?? displayTemplates[0]
  const displayWorkbook = { ...workbook, templates: displayTemplates }
  if (!hook.loaded) return <p className="p-8">온라인 독후감 불러오는 중…</p>
  const records = hook.db.records.filter(r => r.reviewId === common?.id)
  const record = records.find(r => r.round === round) ?? records.at(-1)
  const selecting = !common || !!record?.templateSelectionPending
  const start = async () => {
    if (busy || !template) return
    setBusy(true)
    const result = common && record ? await hook.run({ type: "switch-template", recordId: record.id, template }) : await hook.run({ type: "create", common: { id: `review-${crypto.randomUUID()}`, sourceWorkbookId: workbook.id, studentId: "26142", studentName: "진독도", institutionId: "dokdo", institution: "독도학원", classId: "class-1", bookTitle: workbook.bookTitle, level: workbook.level, month: `${workbook.year}-${String(workbook.month).padStart(2, "0")}`, template } })
    if (result) { setStarting(false); setOutline(false) }
    setBusy(false)
  }
  const activeTemplate: WorkbookTemplate = common ? { id: common.template.id, title: common.template.title, description: displayTemplate.description, guides: displayTemplate.guides, questions: common.template.items } : displayTemplate
  const resultView = record?.writingStatus !== "writing"
  const topBars = () => <WorkbookTopBars workbook={workbook} template={activeTemplate} view={record?.writingStatus === "writing" ? record.stage === "rewrite" ? "rewrite" : "write" : "result"} open={guideOpen} onToggle={() => setGuideOpen(v => !v)} hideGuide={record?.writingStatus === "writing" || resultView} documentLabel="온라인 독후감" resultTemplateBreadcrumb={resultView} wide={resultView || record?.writingStatus === "writing"} />
  const listHref = `/student/exploration-record?tab=workbook&month=${common ? reviewActivityDate(common).monthKey : `${workbook.year}-${String(workbook.month).padStart(2, "0")}`}`
  return <div className="min-h-screen bg-[#f5f7f9] text-[#202326] [&_button:not(:disabled)]:cursor-pointer"><StudentHeader section="온라인 독후감" />
    {selecting ? <SelectionTitle title={workbook.bookTitle} /> : topBars()}
    {hook.error && <p role="alert" className="mx-auto max-w-[930px] py-3 text-red-600">{hook.error}</p>}
    {selecting ? <><div className="mx-auto max-w-[930px] px-4 pt-6">{fromRecords && <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#147fbd] hover:underline" href={listHref}><ArrowLeft className="size-4" />온라인 독후감 목록</Link>}</div><SelectionScreen workbook={displayWorkbook} template={displayTemplate} selectedId={selected} onSelect={setSelected} onPreview={() => setPreview(true)} onStart={() => setStarting(true)} showReportGuide compactTop={fromRecords} /></> : record && (record.writingStatus === "writing" ? <ReviewWriting key={`${record.id}:${record.stage}`} common={common} record={record} first={records.find(r => r.round === 1)!} hook={hook} writingGuide={activeTemplate.guides?.writing ?? DEFAULT_GUIDES.writing} /> : <ReviewResult common={common} record={record} records={records} hook={hook} setRound={setRound} />)}
    {preview && <PreviewModal template={displayTemplate} onClose={() => setPreview(false)} />}
    {starting && <StartConfirmModal onClose={() => setStarting(false)} onConfirm={() => { setStarting(false); setOutline(true) }} />}
    {outline && <OutlineModal template={displayTemplate} onClose={() => setOutline(false)} onStart={() => { if (!busy) void start() }} />}
    {selecting && !fromRecords && <Link href={listHref} className="fixed bottom-6 left-7 z-20 grid size-14 place-items-center rounded-full border-4 border-white bg-white text-[#0797dc] shadow-[0_5px_24px_rgba(0,0,0,.18)]" aria-label="탐험 기록으로 돌아가기"><span className="text-2xl">⌂</span></Link>}
  </div>
}

function ReviewWriting({ common, record, first, hook, writingGuide }: { common: ReviewCommon; record: ReviewRecord; first: ReviewRecord; hook: ReviewHook; writingGuide: string }) {
  const rewrite = record.stage === "rewrite"
  const itemRewrite = rewrite && reviewWritingMode(common.template) === "items"
  const hasRewriteGuide = Boolean(common.template.rewriteGuide.trim())
  const hasItemGuidance = common.template.items.some(item => Boolean(item.description.trim() || item.example?.trim()))
  const [switching, setSwitching] = React.useState(false)
  const [answers, setAnswers] = React.useState(record.answers)
  const [body, setBody] = React.useState(record.body)
  const [index, setIndex] = React.useState(record.itemIndex)
  const [writingReferenceView, setWritingReferenceView] = React.useState<"question" | "first" | "feedback" | null>(() => {
    const initialItem = common.template.items[record.itemIndex] ?? common.template.items[0]
    return initialItem && (initialItem.description.trim() || initialItem.example?.trim()) ? "question" : null
  })
  const [modal, setModal] = React.useState<"save" | "rewrite" | "submit" | "previous-blocked" | null>(null)
  const [pendingMove, setPendingMove] = React.useState<number | "rewrite" | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [editing, setEditing] = React.useState(false)
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [referenceView, setReferenceView] = React.useState<"guide" | "items" | "first" | "feedback" | null>(() => hasRewriteGuide ? "guide" : (!itemRewrite || hasItemGuidance ? "items" : null))
  const [checkedGuideItems, setCheckedGuideItems] = React.useState<Set<number>>(() => new Set(record.rewriteChecklist ?? []))
  const messageTimerRef = React.useRef<number | null>(null)
  const workspaceRef = React.useRef<HTMLDivElement>(null)
  const [workspaceMaxHeight, setWorkspaceMaxHeight] = React.useState<number | null>(null)
  const item = common.template.items[index] ?? common.template.items[0]
  const displayedWritingGuide = record.round === 2 ? "※ 1차 작성글과 선생님의 피드백을 참고해 작성해 보세요." : writingGuide
  const restoreWritingQuestionReference = () => setWritingReferenceView(item && (item.description.trim() || item.example?.trim()) ? "question" : null)
  const writingReferenceOpen = !rewrite && writingReferenceView !== null
  const checklistDirty = rewrite && JSON.stringify([...checkedGuideItems].sort((a, b) => a - b)) !== JSON.stringify([...(record.rewriteChecklist ?? [])].sort((a, b) => a - b))
  const contentDirty = rewrite
    ? (itemRewrite ? JSON.stringify(answers) !== JSON.stringify(record.answers) : body !== record.body)
    : JSON.stringify(answers) !== JSON.stringify(record.answers)
  const dirty = contentDirty || checklistDirty
  const hasRewriteContent = itemRewrite
    ? Object.values(answers).some(answer => plainReviewText(answer))
    : Boolean(plainReviewText(body))
  const previousBlocked = rewrite && (contentDirty || record.rewriteEdited || record.initialStage === "rewrite")
  React.useLayoutEffect(() => {
    if ((rewrite && !referenceView) || (!rewrite && !writingReferenceView)) {
      setWorkspaceMaxHeight(null)
      return
    }
    let frame = 0
    const updateMaxHeight = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (window.innerWidth < 1024) {
          setWorkspaceMaxHeight(null)
          return
        }
        const top = workspaceRef.current?.getBoundingClientRect().top ?? 0
        setWorkspaceMaxHeight(Math.max(180, window.innerHeight - top - 84))
      })
    }
    updateMaxHeight()
    window.addEventListener("resize", updateMaxHeight)
    window.visualViewport?.addEventListener("resize", updateMaxHeight)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", updateMaxHeight)
      window.visualViewport?.removeEventListener("resize", updateMaxHeight)
    }
  }, [referenceView, rewrite, writingReferenceView])
  React.useEffect(() => { const guard = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = "" } }; window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard) }, [dirty])
  React.useEffect(() => () => { if (messageTimerRef.current !== null) window.clearTimeout(messageTimerRef.current) }, [])
  const showMessage = (value: string) => {
    setMessage(value)
    if (messageTimerRef.current !== null) window.clearTimeout(messageTimerRef.current)
    messageTimerRef.current = window.setTimeout(() => {
      setMessage("")
      messageTimerRef.current = null
    }, 1000)
  }
  const save = async (stage = record.stage, nextIndex = index) => {
    const result = await hook.run({ type: "save-writing", recordId: record.id, stage, answers, body, itemIndex: nextIndex, rewriteChecklist: stage === "rewrite" ? [...checkedGuideItems].sort((a, b) => a - b) : undefined })
    if (result) {
      showMessage("저장되었어요.")
      if (stage === "rewrite") {
        setEditing(false)
        setEditingIndex(null)
      }
    }
    return result
  }
  const saveCurrent = async () => {
    if (busy) return
    setBusy(true)
    try { await save() }
    finally { setBusy(false) }
  }
  const enterRewrite = async () => {
    const result = await hook.run({ type: "enter-rewrite", recordId: record.id })
    return Boolean(result)
  }
  const selectQuestion = (target: number) => {
    const targetItem = common.template.items[target]
    setIndex(target)
    setWritingReferenceView(targetItem && (targetItem.description.trim() || targetItem.example?.trim()) ? "question" : null)
  }
  const moveWithoutSaving = async (target: number | "rewrite") => {
    setAnswers(record.answers)
    setBody(record.body)
    if (target === "rewrite") await enterRewrite()
    else selectQuestion(target)
  }
  const requestMove = (target: number | "rewrite") => {
    if (target === index) {
      if (!rewrite) {
        const selectedItem = common.template.items[target]
        if (selectedItem && (selectedItem.description.trim() || selectedItem.example?.trim())) setWritingReferenceView("question")
      }
      return
    }
    if (dirty) {
      setPendingMove(target)
      setModal("save")
      return
    }
    if (target === "rewrite") setModal("rewrite")
    else selectQuestion(target)
  }
  const next = () => requestMove(index === common.template.items.length - 1 ? "rewrite" : index + 1)
  const previous = async () => {
    if (!rewrite) {
      requestMove(Math.max(0, index - 1))
      return
    }
    if (previousBlocked) {
      setModal("previous-blocked")
      return
    }
    setBusy(true)
    try {
      if (checklistDirty && !await save()) return
      await hook.run({ type: "save-writing", recordId: record.id, stage: "items", answers, body, itemIndex: Math.max(0, common.template.items.length - 1) })
    } finally { setBusy(false) }
  }
  const saveAndMove = async () => {
    if (pendingMove === null) return
    const target = pendingMove
    setBusy(true)
    if (await save("items", target === "rewrite" ? index : target)) {
      if (target === "rewrite") await enterRewrite()
      else selectQuestion(target)
    }
    setPendingMove(null)
    setModal(null)
    setBusy(false)
  }
  const discardAndMove = async () => {
    if (pendingMove === null) return
    const target = pendingMove
    setBusy(true)
    await moveWithoutSaving(target)
    setPendingMove(null)
    setModal(null)
    setBusy(false)
  }
  const closeSaveConfirm = () => {
    setPendingMove(null)
    setModal(null)
  }
  const confirm = async () => {
    setBusy(true)
    if (modal === "rewrite") await enterRewrite()
    else if (modal === "submit" && (!dirty || await save())) await hook.run({ type: "submit", recordId: record.id })
    setModal(null)
    setBusy(false)
  }
  return <>
    <main className="mx-auto max-w-[1200px] px-4 pb-28 pt-4">
      {!rewrite ? <>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><h1 className="flex items-center gap-2 text-[22px] font-black"><span className="grid size-7 place-items-center rounded-lg border border-[#b8d9eb] bg-[#edf8fe] text-[#168fd1]"><FileText className="size-4" /></span>차례대로 쓰기</h1><div className="min-w-0 max-w-full overflow-x-auto pb-1 lg:max-w-[900px]"><div role="group" aria-label="질문 항목 선택 및 참고 보기" className="flex min-w-max items-center justify-end gap-2">{common.template.items.map((question, questionIndex) => <button key={question.id} type="button" aria-label={`${questionIndex + 1}번 ${question.title}`} aria-pressed={questionIndex === index} title={question.title} onClick={() => requestMove(questionIndex)} className={cn("grid size-9 shrink-0 place-items-center rounded-full border text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168fd1]", questionIndex === index ? "border-[#168fd1] bg-[#168fd1] text-white shadow-[0_3px_10px_rgba(22,143,209,.2)]" : "border-[#d6e0e5] bg-[#e9eef1] text-[#87949b] hover:border-[#9dcee9] hover:bg-white hover:text-[#147fbd]")}>{questionIndex + 1}</button>)}{record.round === 2 && <><button type="button" aria-pressed={writingReferenceView === "first"} onClick={() => writingReferenceView === "first" ? restoreWritingQuestionReference() : setWritingReferenceView("first")} className={cn("ml-1 inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed4d83]", writingReferenceView === "first" ? "border-[#ed4d83] bg-[#ed4d83] text-white shadow-[0_3px_10px_rgba(210,47,104,.20)]" : "border-[#f0b8ca] bg-[#fff6f8] text-[#d93670] hover:border-[#e87199] hover:bg-[#ffedf3]")}><FileText className="size-4" />1차 작성글</button><button type="button" aria-pressed={writingReferenceView === "feedback"} onClick={() => writingReferenceView === "feedback" ? restoreWritingQuestionReference() : setWritingReferenceView("feedback")} className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed4d83]", writingReferenceView === "feedback" ? "border-[#ed4d83] bg-[#ed4d83] text-white shadow-[0_3px_10px_rgba(210,47,104,.20)]" : "border-[#f0b8ca] bg-[#fff6f8] text-[#d93670] hover:border-[#e87199] hover:bg-[#ffedf3]")}><MessageCircle className="size-4" />1차 피드백</button></>}</div></div></div>
        <div role="note" className="mt-3 rounded-xl border border-[#b8d9eb] border-l-4 border-l-[#168fd1] bg-[#edf8fe] px-4 py-3 text-[14px] font-semibold leading-6 text-[#355c72] shadow-[0_3px_12px_rgba(41,128,177,.07)]"><p className="whitespace-pre-wrap">{displayedWritingGuide}</p></div>
        <div ref={workspaceRef} className={cn("mt-3", writingReferenceOpen && "grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]")}><section style={{ maxHeight: writingReferenceOpen && workspaceMaxHeight ? `${workspaceMaxHeight}px` : undefined }} className={cn("rounded-lg border border-[#dce3e7] bg-white px-5 pb-6 pt-5 sm:px-8 sm:pb-8", writingReferenceOpen && "flex min-h-0 flex-col overflow-hidden")}><h2 className="text-[21px] font-black leading-8"><span className="mr-2 text-[#168fd1]">{index + 1}.</span>{item.title}</h2><div className={cn("min-h-[293px]", writingReferenceOpen && "flex flex-1 flex-col")}><ReviewEditor student fillHeight={writingReferenceOpen} label={`질문 항목별 작성 내용 ${index + 1}번 ${item.title}`} value={answers[item.id] ?? ""} onChange={value => setAnswers(a => ({ ...a, [item.id]: value }))} /></div></section>{writingReferenceView === "question" && <WritingQuestionReference item={item} index={index} maxHeight={workspaceMaxHeight} onClose={() => setWritingReferenceView(null)} />}{writingReferenceView === "first" && <FirstDraftRail common={common} record={first} maxHeight={workspaceMaxHeight} onClose={restoreWritingQuestionReference} />}{writingReferenceView === "feedback" && <ResultFeedbackRail common={common} record={first} maxHeight={workspaceMaxHeight} onClose={restoreWritingQuestionReference} />}</div>
      </> :
        <><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="flex items-center gap-2 text-[22px] font-black"><span className="grid size-7 place-items-center rounded-lg border border-[#b8d9eb] bg-[#edf8fe] text-[#168fd1]"><Search className="size-4 stroke-[3]" /></span>고쳐쓰기</h1><div role="group" aria-label="고쳐쓰기 참고 보기" className="flex flex-wrap items-center justify-end gap-2">{hasRewriteGuide && <button type="button" aria-pressed={referenceView === "guide"} className={cn("inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168fd1]", referenceView === "guide" ? "border-[#168fd1] bg-[#168fd1] text-white shadow-[0_3px_10px_rgba(22,143,209,.2)]" : "border-[#9dcee9] bg-white text-[#147fbd] hover:border-[#239cde] hover:bg-[#eef8fd]")} onClick={() => setReferenceView(current => current === "guide" ? null : "guide")}><PanelRightOpen className="size-4" />고쳐쓰기 체크리스트 보기</button>}{(!itemRewrite || hasItemGuidance) && <button type="button" aria-pressed={referenceView === "items"} className={cn("inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168fd1]", referenceView === "items" ? "border-[#168fd1] bg-[#168fd1] text-white shadow-[0_3px_10px_rgba(22,143,209,.2)]" : "border-[#9dcee9] bg-white text-[#147fbd] hover:border-[#239cde] hover:bg-[#eef8fd]")} onClick={() => setReferenceView(current => current === "items" ? null : "items")}><FileText className="size-4" />{itemRewrite ? "질문 항목 안내 보기" : "질문 항목별 작성글 보기"}</button>}{record.round === 2 && <><button type="button" aria-pressed={referenceView === "first"} className={cn("inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed4d83]", referenceView === "first" ? "border-[#ed4d83] bg-[#ed4d83] text-white shadow-[0_3px_10px_rgba(210,47,104,.20)]" : "border-[#f0b8ca] bg-[#fff6f8] text-[#d93670] hover:border-[#e87199] hover:bg-[#ffedf3]")} onClick={() => setReferenceView(current => current === "first" ? null : "first")}><FileText className="size-4" />1차 작성글</button><button type="button" aria-pressed={referenceView === "feedback"} className={cn("inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed4d83]", referenceView === "feedback" ? "border-[#ed4d83] bg-[#ed4d83] text-white shadow-[0_3px_10px_rgba(210,47,104,.20)]" : "border-[#f0b8ca] bg-[#fff6f8] text-[#d93670] hover:border-[#e87199] hover:bg-[#ffedf3]")} onClick={() => setReferenceView(current => current === "feedback" ? null : "feedback")}><MessageCircle className="size-4" />1차 피드백</button></>}</div></div>
        {record.round === 2 && <section aria-label="2차 작성 참고 정보" className="mt-3 rounded-xl border border-[#c6e3f3] border-l-4 border-l-[#168fd1] bg-[#edf8fe] px-4 py-3 text-[14px] font-semibold leading-6 text-[#355c72] shadow-[0_3px_12px_rgba(41,128,177,.07)]"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex rounded-full bg-[#168fd1] px-3 py-0.5 text-xs font-black text-white">2차 작성중</span><p>1차 작성글과 선생님의 피드백을 참고해 고쳐 써 보세요.</p></div></section>}
        {(contentDirty || record.rewriteEdited) && <div role="note" className="mt-3 rounded-xl border border-[#b8d9eb] border-l-4 border-l-[#168fd1] bg-[#edf8fe] px-4 py-3 text-[14px] font-semibold leading-6 text-[#355c72] shadow-[0_3px_12px_rgba(41,128,177,.07)]"><p>고쳐쓰기에서 수정한 내용이 있어 차례대로 쓰기 화면으로 돌아갈 수 없어요.</p></div>}
        <div ref={workspaceRef} className={referenceView ? "mt-3 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]" : "mt-3"}><section style={{ maxHeight: referenceView && workspaceMaxHeight ? `${workspaceMaxHeight}px` : undefined }} className={cn("rounded-lg border border-[#dce3e7] bg-white px-8 pb-8 pt-5", referenceView && "flex min-h-0 flex-col overflow-hidden")}><h2 className="text-[27px] font-black">{common.template.title}</h2>{itemRewrite ? <div className={cn("mt-2 space-y-2", referenceView && "min-h-0 flex-1 overflow-y-auto pr-1")}>{common.template.items.map((rewriteItem, rewriteIndex) => {
          const answer = answers[rewriteItem.id] ?? ""
          if (editingIndex === rewriteIndex) return <section key={rewriteItem.id} className="px-1 pb-4 pt-2"><h3 className="text-[16px] font-black">{rewriteIndex + 1}.{rewriteItem.title}</h3><ReviewEditor student label={`고쳐쓰기 ${rewriteIndex + 1}번 항목`} value={answer} onChange={value => setAnswers(current => ({ ...current, [rewriteItem.id]: value }))} /></section>
          return <button type="button" key={rewriteItem.id} onClick={() => setEditingIndex(rewriteIndex)} className="group relative block w-full rounded-lg border-2 border-transparent px-3 py-2 text-left transition hover:border-[#249ce0] hover:bg-[#eaf6fd]"><span className="absolute right-2 top-2 rounded-full bg-[#249ce0] px-3 py-1 text-[11px] font-black text-white opacity-0 transition group-hover:opacity-100">클릭하여 편집하기</span><strong className="block pr-28 text-[16px]">{rewriteIndex + 1}.{rewriteItem.title}</strong><span className="mt-2 block min-h-9 border-b-2 border-dotted border-[#d8e1e6] pb-1 text-[16px] leading-7"><ReviewText value={answer || "클릭하여 작성하세요."} /></span></button>
        })}</div> : editing ? <ReviewEditor student fillHeight={Boolean(referenceView)} label="고쳐쓰기 본문" value={body} onChange={setBody} /> : <button type="button" onClick={() => setEditing(true)} className={cn("group relative mt-2 flex min-h-24 w-full flex-col items-stretch justify-start rounded-lg border-2 border-transparent px-3 py-2 text-left transition hover:border-[#249ce0] hover:bg-[#eaf6fd]", referenceView && "min-h-0 flex-1 overflow-y-auto")}><span className="absolute right-2 top-2 rounded-full bg-[#249ce0] px-3 py-1 text-[11px] font-black text-white opacity-0 transition group-hover:opacity-100">클릭하여 편집하기</span><ReviewText value={body || "클릭하여 작성하세요."} /></button>}</section>{referenceView === "guide" && <RewriteGuide value={common.template.rewriteGuide} checked={checkedGuideItems} maxHeight={workspaceMaxHeight} onToggle={checkedIndex => setCheckedGuideItems(current => { const next = new Set(current); if (next.has(checkedIndex)) next.delete(checkedIndex); else next.add(checkedIndex); return next })} onClose={() => setReferenceView(null)} />}{referenceView === "items" && <RewriteItemReference common={common} record={{ ...record, answers }} maxHeight={workspaceMaxHeight} onClose={() => setReferenceView(null)} />}{referenceView === "first" && <FirstDraftRail common={common} record={first} maxHeight={workspaceMaxHeight} onClose={() => setReferenceView(null)} />}{referenceView === "feedback" && <ResultFeedbackRail common={common} record={first} maxHeight={workspaceMaxHeight} onClose={() => setReferenceView(null)} />}</div></>}
    </main>
    <footer className="fixed inset-x-0 bottom-0 z-40 min-h-[68px] bg-[#4a5e77]"><div className="mx-auto flex min-h-[68px] max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-2"><div className="flex gap-2"><button type="button" disabled={busy || (!rewrite && index === 0)} aria-label={previousBlocked ? "이전 단계로 이동할 수 없는 이유 보기" : undefined} title={previousBlocked ? "이전 단계로 이동할 수 없어요" : undefined} onClick={() => { if (!busy) void previous() }} className={cn("flex h-11 items-center gap-2 rounded px-5 font-black text-white transition disabled:opacity-45", previousBlocked ? "border border-white/15 bg-[#65758a] text-white/65" : "bg-[#34475f]")}>{previousBlocked ? <LockKeyhole className="size-4" /> : <ArrowLeft className="size-4" />}이전</button>{!rewrite && <button type="button" className="flex h-11 items-center gap-2 rounded bg-[#4cc9b8] px-5 font-black text-white"><Smartphone className="size-4" />전자책 보기</button>}{canChangeReviewTemplate(record) && <button type="button" disabled={busy} onClick={() => setSwitching(true)} className="flex h-11 items-center gap-2 rounded bg-[#fa5d91] px-5 font-black text-white disabled:opacity-50"><RefreshCw className="size-4" />독후감 교체</button>}</div><div className="flex gap-2"><button type="button" disabled={busy || (!rewrite && !dirty)} onClick={() => void saveCurrent()} className="flex h-11 items-center gap-2 rounded bg-[#8f86ef] px-5 font-black text-white disabled:opacity-60"><Save className="size-4" />저장하기</button><button type="button" disabled={busy || (rewrite && !hasRewriteContent)} onClick={() => rewrite ? setModal("submit") : next()} className="flex h-11 items-center gap-2 rounded bg-[#249ce0] px-7 font-black text-white disabled:opacity-60">{rewrite ? "제출하기" : <>다음<ArrowRight className="size-4" /></>}</button></div></div></footer>
    {message && <div role="status" className="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[#28333b] px-6 py-3 font-bold text-white shadow-xl">{message}</div>}
    {modal === "previous-blocked" && <ConfirmModal title="이전 단계로 이동할 수 없어요" description="고쳐쓰기에서 수정한 내용이 있어 차례대로 쓰기 화면으로 돌아갈 수 없어요." confirmLabel="확인" single onClose={() => setModal(null)} onConfirm={() => setModal(null)} />}
    {modal === "save" && <ConfirmModal title="저장 확인" onClose={closeSaveConfirm} onCancel={() => { if (!busy) void discardAndMove() }} onConfirm={() => { if (!busy) void saveAndMove() }} cancelLabel="아니오" confirmLabel="네" description={<>{"작성한 내용이 저장되지 않았어요! 저장하고 이동할까요?"}{pendingMove === "rewrite" && <><br />고쳐쓰기 단계로 가면 온라인 독후감을 교체할 수 없어요.</>}</>} />}
    {(modal === "rewrite" || modal === "submit") && <ConfirmModal title={modal === "rewrite" ? "작성 내용 확인" : "저장 확인"} onClose={() => setModal(null)} onConfirm={() => { if (!busy) void confirm() }} confirmLabel={modal === "rewrite" ? "확인하기" : "제출하기"} description={modal === "rewrite" ? <>지금까지 작성한 내용을 모두 확인해볼까요?<br />고쳐쓰기 단계로 가면 온라인 독후감을 교체할 수 없어요.</> : record.round === 2 ? "2차 작성글을 제출할까요? 제출한 뒤에는 작성 내용을 수정할 수 없어요." : "작성한 내용을 제출할까요? 제출하면 다시 수정할 수 없어요."} />}
    {switching && <ConfirmModal title="독후감 교체 확인" description={<>작성 중인 독후감을 교체할까요?<br />지금까지 작성한 내용은 모두 삭제됩니다.</>} confirmLabel="교체하기" onClose={() => setSwitching(false)} onConfirm={async () => { if (busy) return; setBusy(true); await hook.run({ type: "switch-template", recordId: record.id }); setBusy(false) }} />}
  </>
}

function ResultFeedbackRail({ common, record, maxHeight, onClose }: { common: ReviewCommon; record: ReviewRecord; maxHeight: number | null; onClose: () => void }) {
  const showStudentAnswers = reviewWritingMode(common.template) === "continuous"
  const visibleFeedback = record.itemFeedback.filter(item => item.visible)
  return <RewriteReferenceShell title={`${record.round}차 피드백`} description="선생님의 총평과 질문 항목별 피드백을 확인해 보세요." icon={<MessageCircle className="size-4.5" />} closeLabel={`${record.round}차 피드백 닫기`} onClose={onClose} contentClassName="px-4 pb-4" maxHeight={maxHeight} tone="pink">
    {record.flowers > 0 && <div className="flex items-center gap-2 border-b border-[#eadce1] py-3 text-[12px] font-semibold leading-5 text-[#6f5360]"><Image src="/student-assets/flower-reward.svg" alt="" width={26} height={26} /><span>선생님이 섬초롱꽃 <strong className="font-black text-[#d93670]">{record.flowers}개</strong>를 보내주셨어요.</span></div>}
    <section className="py-4"><div className="flex items-center justify-between gap-3"><h3 className="text-[14px] font-black text-[#2d3035]">총평</h3><time className="text-[11px] text-[#8a747c]">{record.savedAt?.slice(0, 10)}</time></div><div className="mt-2 text-[#3f4146] [&>div]:text-[13px] [&>div]:leading-6"><ReviewText value={record.feedback} /></div></section>
    <section className="border-t border-[#eadce1] pt-4"><h3 className="pb-2 text-[14px] font-black text-[#2d3035]">질문 항목별 피드백</h3><div className="divide-y divide-[#eadfe3]">{visibleFeedback.map((feedback, index) => {
      const item = common.template.items.find(candidate => candidate.id === feedback.itemId)
      const studentAnswer = record.answers[feedback.itemId]
      return <details key={feedback.itemId} className="group py-1"><summary className="flex cursor-pointer list-none items-center gap-2 py-2.5 text-[13px] font-black text-[#34373b] marker:content-none"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#fff0f5] text-[11px] text-[#d93670]">{index + 1}</span><span className="min-w-0 flex-1">{item?.title}</span><span aria-hidden className="text-[#c54a73] before:content-['＋'] group-open:before:content-['－']" /></summary><div className="pb-3 pl-8 pr-1">{showStudentAnswers && studentAnswer && <div className="mb-3 rounded-lg bg-[#f7f8f9] px-3 py-2.5"><p className="mb-1 text-[11px] font-black text-[#7b858c]">질문 항목별 작성 내용</p><div className="text-[#4a4f53] [&>div]:text-[12px] [&>div]:leading-5"><ReviewText value={studentAnswer} /></div></div>}{showStudentAnswers && studentAnswer && <p className="mb-1 text-[11px] font-black text-[#d13b6e]">선생님 피드백</p>}<div className="text-[#3f4146] [&>div]:text-[13px] [&>div]:leading-6"><ReviewText value={feedback.text} /></div></div></details>
    })}{visibleFeedback.length === 0 && <p className="py-4 text-[12px] text-[#8a747c]">표시할 질문 항목별 피드백이 없습니다.</p>}</div></section>
  </RewriteReferenceShell>
}

export function ReviewResult({ common, record, records, hook, setRound, external = false }: { common: ReviewCommon; record: ReviewRecord; records: ReviewRecord[]; hook: ReviewHook; setRound: (round: number) => void; external?: boolean }) {
  const [feedbackRound, setFeedbackRound] = React.useState<1 | 2 | null>(null)
  const [compareOpen, setCompareOpen] = React.useState(false)
  const [copyMessage, setCopyMessage] = React.useState("")
  const workspaceRef = React.useRef<HTMLDivElement>(null)
  const [workspaceMaxHeight, setWorkspaceMaxHeight] = React.useState<number | null>(null)
  const first = records.find(r => r.round === 1)
  const second = records.find(r => r.round === 2)
  const submitted = records.filter(r => r.writingStatus === "submitted").sort((a, b) => a.round - b.round)
  const firstSubmitted = first?.writingStatus === "submitted"
  const secondSubmitted = second?.writingStatus === "submitted"
  const firstFeedback = first?.feedbackStatus === "전송완료"
  const secondFeedback = second?.feedbackStatus === "전송완료"
  const firstReport = common.reportEnabled && firstFeedback && first?.report
  const secondReport = common.reportEnabled && secondFeedback && second?.report
  const feedbackRecord = records.find(r => r.round === feedbackRound && r.feedbackStatus === "전송완료")
  const progressLabel = studentReviewProgressLabel(common.progress)
  const progressComplete = common.progress === "complete"
  const progressNeedsAction = common.progress === "first-sent" || common.progress === "second-available" || common.progress === "second-sent"
  const showListNavigation = !external
  const workbook = getWorkbookForReview(common)
  const resultTemplate = workbook.templates.find(template => String(template.id) === common.template.id)
  const completionGuide = resultTemplate?.guides?.complete?.trim() || "※ 온라인 독후감 활동을 마무리하고, 완성된 글을 확인해 보세요."
  const buttonBase = "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[13px] font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e44c7f]"
  const writingClass = (active = false) => cn(buttonBase, active ? "border-[#e8457b] bg-[#e8457b] text-white shadow-[0_3px_10px_rgba(210,47,104,.20)]" : "border-[#f0b8ca] bg-white text-[#cf396b] hover:bg-[#fff3f7]")
  const compareClass = (active = false) => cn(buttonBase, active ? "border-[#5c6470] bg-[#5c6470] text-white shadow-[0_3px_10px_rgba(62,69,79,.15)]" : "border-[#cfd6dc] bg-white text-[#4c5861] hover:bg-[#f5f7f8]")
  const feedbackClass = (active = false) => cn(buttonBase, active ? "border-[#ed4d83] bg-[#ed4d83] text-white shadow-[0_3px_10px_rgba(210,47,104,.20)]" : "border-[#f0b8ca] bg-[#fff6f8] text-[#d93670] hover:border-[#e87199] hover:bg-[#ffedf3]")
  const reportClass = cn(buttonBase, "border-[#cbd4dc] bg-[#f9fafb] text-[#44545f] hover:border-[#9dabb5] hover:bg-white")
  React.useEffect(() => { if (new URLSearchParams(window.location.search).get("compare") === "1" && submitted.length === 2) setCompareOpen(true) }, [submitted.length])
  React.useLayoutEffect(() => {
    if (!feedbackRecord) { setWorkspaceMaxHeight(null); return }
    let frame = 0
    const updateMaxHeight = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (window.innerWidth < 1024) {
          setWorkspaceMaxHeight(null)
          return
        }
        const top = workspaceRef.current?.getBoundingClientRect().top ?? 0
        setWorkspaceMaxHeight(Math.max(220, window.innerHeight - top - (showListNavigation ? 84 : 24)))
      })
    }
    updateMaxHeight()
    window.addEventListener("resize", updateMaxHeight)
    window.visualViewport?.addEventListener("resize", updateMaxHeight)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", updateMaxHeight)
      window.visualViewport?.removeEventListener("resize", updateMaxHeight)
    }
  }, [feedbackRecord, showListNavigation])
  const closeCompare = () => setCompareOpen(false)
  const selectWriting = (targetRound: number) => { setCompareOpen(false); setFeedbackRound(null); setRound(targetRound) }
  const toggleFeedback = (target: ReviewRecord) => {
    if (feedbackRound === target.round) { setFeedbackRound(null); return }
    setCompareOpen(false)
    setRound(target.round)
    setFeedbackRound(target.round)
    if (!external && !target.seenAt) void hook.run({ type: "seen", recordId: target.id })
  }
  const toggleCompare = () => { setFeedbackRound(null); setCompareOpen(current => !current) }
  const copyWriting = async () => {
    try { await navigator.clipboard.writeText(plainReviewText(record.finalBody)); setCopyMessage("작성글을 복사했어요.") }
    catch { setCopyMessage("복사 권한을 확인해 주세요.") }
  }
  return <>
    <main className={cn("mx-auto max-w-[1200px] px-4 pt-4", showListNavigation ? "pb-28" : "pb-10")}>
      <header className="flex flex-wrap items-start justify-between gap-3"><h1 className="flex items-center gap-2 text-[22px] font-black"><span className="grid size-7 place-items-center rounded-lg border border-[#f3bfd0] bg-[#fff1f6] text-[#df3f74]"><FileCheck2 className="size-4" /></span>나의 글 완성</h1><div role="group" aria-label="작성글, 피드백 및 보고서" className="flex max-w-[940px] flex-wrap items-center justify-end gap-2">
        <div className="flex gap-1.5">{firstSubmitted && <button type="button" aria-pressed={!compareOpen && record.round === 1} className={writingClass(!compareOpen && record.round === 1)} onClick={() => selectWriting(1)}>1차 작성글</button>}{secondSubmitted && <button type="button" aria-pressed={!compareOpen && record.round === 2} className={writingClass(!compareOpen && record.round === 2)} onClick={() => selectWriting(2)}>2차 작성글</button>}</div>
        {secondSubmitted && <button type="button" aria-pressed={compareOpen} className={compareClass(compareOpen)} onClick={toggleCompare}><GitCompareArrows className="size-4" />작성글 비교</button>}
        <div className="flex gap-1.5">{firstFeedback && first && <button type="button" aria-pressed={feedbackRound === 1} className={feedbackClass(feedbackRound === 1)} onClick={() => toggleFeedback(first)}><MessageCircle className="size-4" />1차 피드백 {!first.seenAt && !external && <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] text-[#d93670]">NEW</span>}</button>}{secondFeedback && second && <button type="button" aria-pressed={feedbackRound === 2} className={feedbackClass(feedbackRound === 2)} onClick={() => toggleFeedback(second)}><MessageCircle className="size-4" />2차 피드백 {!second.seenAt && !external && <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] text-[#d93670]">NEW</span>}</button>}</div>
        <div className="flex gap-1.5">{firstReport && first && <a className={reportClass} target="_blank" rel="noopener noreferrer" href={`/online-review/report/${first.id}?role=${external ? "external" : "student"}`}><FileText className="size-4" />1차 보고서<ArrowUpRight className="size-3.5" /></a>}{secondReport && second && <a className={reportClass} target="_blank" rel="noopener noreferrer" href={`/online-review/report/${second.id}?role=${external ? "external" : "student"}`}><FileText className="size-4" />2차 보고서<ArrowUpRight className="size-3.5" /></a>}</div>
      </div></header>
      <div role="note" className="mt-3 rounded-xl border border-[#f3bfd0] border-l-4 border-l-[#ed4d83] bg-[#fff5f8] px-4 py-3 text-[14px] font-semibold leading-6 text-[#6d4655] shadow-[0_3px_12px_rgba(210,47,104,.06)]"><p>{completionGuide}</p></div>
      {compareOpen ? <section aria-label="작성글 비교" className="mt-4 overflow-hidden rounded-xl border border-[#e1d5da] bg-white shadow-[0_6px_22px_rgba(80,54,64,.08)]"><header className="flex items-start justify-between gap-4 border-b border-[#f0d7df] bg-[#fff5f8] px-6 py-4"><div><h2 className="flex items-center gap-2 text-[19px] font-black"><GitCompareArrows className="size-5 text-[#d93670]" />작성글 비교</h2><p className="mt-1 text-[13px] text-[#80646e]">1차 작성글과 2차 작성글을 나란히 비교해 보세요.</p></div><button type="button" aria-label="작성글 비교 닫기" onClick={closeCompare} className="grid size-8 place-items-center rounded-lg text-[#8c6875] transition hover:bg-white hover:text-[#d93670]"><X className="size-4.5" /></button></header><div className="grid gap-5 bg-[#f8f7f8] p-5 lg:grid-cols-2">{submitted.map(item => <article key={item.id} className="overflow-hidden rounded-xl border border-[#e2dce0] bg-white"><header className="border-b border-[#eedde3] px-5 py-4"><span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-black", item.round === 1 ? "bg-[#fbe2ea] text-[#c83667]" : "bg-[#ed4d83] text-white")}>{item.round}차 작성글</span><h3 className="mt-2 text-lg font-black">{common.template.title}</h3></header><div className="px-5 py-5"><StudentResultContent common={common} record={item} /></div></article>)}</div></section> : <div className="mt-4 grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside>
            <BookPanel workbook={workbook} />
            <div className="mt-4">
              <p className="text-xs font-medium text-[#7a8790]">독후감 상태</p>
              <p
                aria-label={`독후감 상태: ${progressLabel}`}
                className={cn(
                  "mt-1.5 inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black",
                  progressComplete
                    ? "border-[#c8ead7] bg-[#eaf8f0] text-[#187247]"
                    : progressNeedsAction
                      ? "border-[#f3c5d5] bg-[#fff1f6] text-[#cb3568]"
                      : "border-[#dbe2e7] bg-[#f3f6f8] text-[#53616b]",
                )}
              >
                {progressComplete && <Check aria-hidden="true" className="size-3.5 stroke-[3]" />}
                {progressLabel}
              </p>
            </div>
          </aside>
          <div ref={workspaceRef} className={cn("min-w-0", feedbackRecord && "grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]")}>
            <section style={{ maxHeight: feedbackRecord && workspaceMaxHeight ? `${workspaceMaxHeight}px` : undefined }} className={cn("rounded-xl border border-[#dce3e7] bg-white", feedbackRecord && "flex min-h-0 flex-col overflow-hidden")}><header className="flex shrink-0 flex-wrap items-start justify-between gap-3 px-7 pb-3 pt-6"><h2 className="text-[27px] font-black">{common.template.title}</h2>{!external && <div role="group" aria-label="작성글 활용" className="flex flex-wrap justify-end gap-2"><button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e8c2cf] bg-white px-3 text-xs font-black text-[#c83a69] transition hover:bg-[#fff3f7]" onClick={() => void copyWriting()}><Copy className="size-4" />글 복사</button><a aria-label="독서로에서 이 책 찾기" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e8c2cf] bg-white px-3 text-xs font-black text-[#c83a69] transition hover:bg-[#fff3f7]" href="https://read365.edunet.net/Search" target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />독서로 이동</a></div>}</header><div className={cn("px-7 pb-7", feedbackRecord && "min-h-0 flex-1 overflow-y-auto")}><StudentResultContent common={common} record={record} /></div></section>
            {feedbackRecord && <ResultFeedbackRail common={common} record={feedbackRecord} maxHeight={workspaceMaxHeight} onClose={() => setFeedbackRound(null)} />}
          </div>
        </div>}
      {copyMessage && <p role="status" className={cn("fixed left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[#28333b] px-6 py-3 font-bold text-white shadow-xl", showListNavigation ? "bottom-24" : "bottom-6")}>{copyMessage}</p>}
    </main>
    {showListNavigation && <footer className="fixed inset-x-0 bottom-0 z-40 min-h-[68px] bg-[#4a5e77]"><div className="mx-auto flex min-h-[68px] max-w-[1200px] items-center px-4 py-2"><Link href={`/student/exploration-record?tab=workbook&month=${reviewActivityDate(common).monthKey}`} className="inline-flex h-11 items-center gap-2 rounded bg-[#34475f] px-5 font-black text-white"><ArrowLeft className="size-4" />온라인 독후감 목록</Link></div></footer>}
  </>
}
