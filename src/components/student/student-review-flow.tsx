"use client"
import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import ui from "./review-test-server.module.css"
import { SecondReviewStartModal } from "./second-review-start-modal"
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, BookOpen, FileText, Pencil, LockKeyhole, RefreshCw, Save, Smartphone } from "lucide-react"
import { BookPanel, StartConfirmModal, ConfirmModal, OutlineModal, PreviewModal, SelectionScreen, SelectionTitle } from "./student-workbook-ui"
import { getWorkbookForReview, type WorkbookTemplate } from "@/lib/student-workbooks"
import { StudentHeader } from "@/components/student/student-header"
import { useReviews } from "@/lib/review-client"
import { getConfiguredTemplates, subscribeTemplateSettings } from "@/lib/workbook-template-settings"
import { cn } from "@/lib/utils"
import { DEFAULT_GUIDES } from "@/lib/workbook-templates"
import { canChangeReviewTemplate, reviewFeedbackItems, plainReviewText, reviewActivityDate, studentReviewProgressLabel, reviewWritingMode, type ReviewCommon, type ReviewRecord, type ReviewTemplate } from "@/lib/review-domain"
import type { StudentWorkbook } from "@/lib/student-workbooks"
import { ReviewEditor, ReviewText } from "@/components/online-workbooks/review-ui"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Arrow as PopoverArrow } from "@radix-ui/react-popover"
import { REVIEW_MIN_SUBMISSION_LENGTH, REVIEW_SHORT_SUBMISSION_MESSAGE, reviewSubmissionLength } from "@/lib/review-domain"

type ReviewHook = ReturnType<typeof useReviews>


function StudentResultText({ value }: { value: string }) {
  return <div className={ui.ruledText}><ReviewText value={value || "작성한 내용이 없습니다."} /></div>
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

function StudentResultContent({ common, record, showFeedback = false }: { common: ReviewCommon; record: ReviewRecord; showFeedback?: boolean }) {
  if (reviewWritingMode(common.template) === "continuous") return <StudentResultText value={record.finalBody} />

  return <div className={ui.answers}>{common.template.items.map((item, index) => <section className={ui.answer} key={item.id}>
    <h2 className="text-[16px] font-black leading-7">{index + 1}. {item.title}</h2>
    <div className="mt-1"><StudentResultText value={record.answers[item.id] ?? ""} /></div>
    {showFeedback && record.feedbackStatus === "전송완료" && reviewFeedbackItems(common.template, record.itemFeedback).filter(f => f.itemId === item.id && f.visible && plainReviewText(f.text)).map(f => <details key={f.itemId} open className={ui.inlineFeedback}><summary>선생님</summary><ReviewText value={f.text} /></details>)}
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
  const listHref = `/student/exploration-record?tab=workbook&month=${common ? reviewActivityDate(common).monthKey : `${workbook.year}-${String(workbook.month).padStart(2, "0")}`}`
  return <div className={ui.root}><StudentHeader section="온라인 독후감" />
    {selecting && <SelectionTitle title={workbook.bookTitle} />}
    {hook.error && <p role="alert" className="mx-auto max-w-[930px] py-3 text-red-600">{hook.error}</p>}
    {selecting ? <><div className="mx-auto max-w-[930px] px-4 pt-6">{fromRecords && <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#147fbd] hover:underline" href={listHref}><ArrowLeft className="size-4" />온라인 독후감 목록</Link>}</div><SelectionScreen workbook={displayWorkbook} template={displayTemplate} selectedId={selected} onSelect={setSelected} onPreview={() => setPreview(true)} onStart={() => setStarting(true)} showReportGuide compactTop={fromRecords} /></> : record && (record.writingStatus === "writing" ? <ReviewWriting key={`${record.id}:${record.stage}`} common={common} record={record} first={records.find(r => r.round === 1)!} hook={hook} /> : <ReviewResult common={common} record={record} records={records} hook={hook} setRound={setRound} />)}
    {preview && <PreviewModal template={displayTemplate} onClose={() => setPreview(false)} />}
    {starting && <StartConfirmModal onClose={() => setStarting(false)} onConfirm={() => { setStarting(false); setOutline(true) }} />}
    {outline && <OutlineModal template={displayTemplate} onClose={() => setOutline(false)} onStart={() => { if (!busy) void start() }} />}
    {selecting && !fromRecords && <Link href={listHref} className="fixed bottom-6 left-7 z-20 grid size-14 place-items-center rounded-full border-4 border-white bg-white text-[#0797dc] shadow-[0_5px_24px_rgba(0,0,0,.18)]" aria-label="탐험 기록으로 돌아가기"><span className="text-2xl">⌂</span></Link>}
  </div>
}

function ReviewWriting({ common, record, first, hook }: { common: ReviewCommon; record: ReviewRecord; first: ReviewRecord; hook: ReviewHook }) {
  const rewrite = record.stage === "rewrite"
  const itemRewrite = rewrite && reviewWritingMode(common.template) === "items"
  const guide = parseRewriteGuide(common.template.rewriteGuide)
  const hasReference = rewrite || record.round === 2
  const [switching, setSwitching] = React.useState(false)
  const [answers, setAnswers] = React.useState(record.answers)
  const [body, setBody] = React.useState(record.body)
  const [index, setIndex] = React.useState(record.itemIndex)
  const [editingRewriteItem, setEditingRewriteItem] = React.useState<string | null>(null)
  const [modal, setModal] = React.useState<"save" | "rewrite" | "submit" | "short-submit" | "previous-blocked" | null>(null)
  const [pendingMove, setPendingMove] = React.useState<number | "rewrite" | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [referenceView, setReferenceView] = React.useState<"guide" | "first" | null>(() => record.round === 2 ? "guide" : null)
  const [referenceFeedback, setReferenceFeedback] = React.useState(true)
  const [checkedGuideItems, setCheckedGuideItems] = React.useState<Set<number>>(() => new Set(record.rewriteChecklist ?? []))
  const messageTimerRef = React.useRef<number | null>(null)
  const item = common.template.items[index] ?? common.template.items[0]
  const checklistDirty = rewrite && JSON.stringify([...checkedGuideItems].sort((a, b) => a - b)) !== JSON.stringify([...(record.rewriteChecklist ?? [])].sort((a, b) => a - b))
  const contentDirty = rewrite
    ? (itemRewrite ? JSON.stringify(answers) !== JSON.stringify(record.answers) : body !== record.body)
    : JSON.stringify(answers) !== JSON.stringify(record.answers)
  const dirty = contentDirty || checklistDirty
  const submissionTooShort = reviewSubmissionLength(common.template, answers, body) < REVIEW_MIN_SUBMISSION_LENGTH
  const previousBlocked = rewrite && (contentDirty || record.rewriteEdited || record.initialStage === "rewrite")
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
    setIndex(target)
  }
  const moveWithoutSaving = async (target: number | "rewrite") => {
    setAnswers(record.answers)
    setBody(record.body)
    if (target === "rewrite") await enterRewrite()
    else selectQuestion(target)
  }
  const requestMove = (target: number | "rewrite") => {
    if (target === index) {
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
    if (modal === "submit" && submissionTooShort) { setModal("short-submit"); return }
    setBusy(true)
    if (modal === "rewrite") await enterRewrite()
    else if (modal === "submit" && (!dirty || await save())) await hook.run({ type: "submit", recordId: record.id })
    setModal(null)
    setBusy(false)
  }
  return <>
    <div className={ui.writingWorkspace} data-reference={hasReference && referenceView !== null}>
    <header className={ui.stageHeader}>
      <ol>{["차례대로 쓰기", "고쳐쓰기", "나의 글 완성"].map((label, i) => <li key={label} data-active={i === (rewrite ? 1 : 0)} data-complete={rewrite && i === 0}><span>{rewrite && i === 0 ? <Check size={14} /> : i + 1}</span>{label}{i < 2 && <ChevronRight size={14} />}</li>)}{record.round === 2 && <li className={ui.roundBadge}>2차{record.initialStage === "rewrite" && <Popover><PopoverTrigger className={ui.roundInfo} aria-label="2차 고쳐쓰기 시작 안내">i</PopoverTrigger><PopoverContent className={ui.roundInfoContent} side="bottom" align="start" alignOffset={-42} sideOffset={8} aria-label="2차 고쳐쓰기 시작 안내">1차 고쳐쓰기에서 글을 고쳤기 때문에, 2차는 고쳐쓰기부터 시작해요. 차례대로 쓰기로는 돌아갈 수 없어요.<PopoverArrow className={ui.roundInfoArrow} width={12} height={7} /></PopoverContent></Popover>}</li>}</ol>
      <div className={ui.writingTitle}><h1>{common.bookTitle}<span><Pencil size={14} />{common.template.title}</span></h1>{hasReference && referenceView === null && <button type="button" className={ui.openChecklist} aria-expanded={false} aria-controls="writing-reference" onClick={() => setReferenceView("guide")}><ChevronLeft size={16} />체크리스트 보기</button>}</div>
    </header>
    <main className={ui.writing}>
      <aside className={ui.questions}><header>질문 <small>{common.template.items.filter(q => plainReviewText(answers[q.id])).length}/{common.template.items.length} 작성</small></header>
        {common.template.items.map((question, qi) => <section key={question.id} data-active={qi === index}><button type="button" onClick={() => rewrite ? setIndex(qi) : requestMove(qi)}><span>{plainReviewText(answers[question.id]) ? <Check size={15} /> : qi + 1}</span>{question.title}</button>{qi === index && <div><p>{question.description}</p>{question.example && <p className={ui.example}><strong>예시</strong>{question.example}</p>}</div>}</section>)}
      </aside>
      <section className={ui.editorCard}><header><h2>{rewrite ? common.template.title : <><span>{index + 1}</span>{item.title}</>}</h2>{!rewrite && <button type="button" disabled={busy || !dirty} onClick={() => void saveCurrent()}>저장</button>}</header>
        <div className={cn(ui.editorBody, itemRewrite && ui.itemRewriteBody)}>{!rewrite ? <ReviewEditor student label={`질문 항목별 작성 내용 ${index + 1}번 ${item.title}`} value={answers[item.id] ?? ""} onChange={value => setAnswers(a => ({ ...a, [item.id]: value }))} /> : itemRewrite ? common.template.items.map((q, qi) => <section key={q.id} className={ui.rewriteItem}>
          {editingRewriteItem === q.id ? <><h3>{qi + 1}. {q.title}</h3><ReviewEditor student label={`고쳐쓰기 ${qi + 1}번 항목`} value={answers[q.id] ?? ""} onChange={value => setAnswers(a => ({ ...a, [q.id]: value }))} /></> : <div role="button" tabIndex={0} className={ui.rewriteItemPreview} aria-label={`${qi + 1}번 ${q.title} 편집하기`} onClick={() => setEditingRewriteItem(q.id)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setEditingRewriteItem(q.id) } }}>
            <h3>{qi + 1}. {q.title}</h3><span className={ui.editItemHint} aria-hidden="true">클릭하여 편집하기</span>
            <div className={ui.rewriteItemText}>{answers[q.id]?.trim() ? <ReviewText value={answers[q.id]} /> : <p className={ui.emptyRewriteItem}>클릭하여 작성하세요.</p>}</div>
          </div>}
        </section>) : <ReviewEditor student label="고쳐쓰기 본문" value={body} onChange={setBody} />}
        </div>
      </section>
      {hasReference && referenceView !== null && <aside id="writing-reference" aria-label="작성 참고 자료" className={ui.reference}><nav><div role="tablist" aria-label="작성 참고 자료"><button id="writing-guide-tab" type="button" role="tab" aria-selected={referenceView === "guide"} aria-controls="writing-guide-panel" data-active={referenceView === "guide"} onClick={() => setReferenceView("guide")}>체크리스트 <span className={ui.checklistCount}>{guide.items.length}</span></button>{record.round === 2 && <button id="writing-first-tab" type="button" role="tab" aria-selected={referenceView === "first"} aria-controls="writing-first-panel" data-active={referenceView === "first"} onClick={() => setReferenceView("first")}>1차 기록</button>}</div><button type="button" aria-label="접기" onClick={() => setReferenceView(null)}>접기 <ChevronRight size={14} /></button></nav>
        {referenceView === "guide" && <div id="writing-guide-panel" role="tabpanel" aria-labelledby="writing-guide-tab" className={ui.checklist}><p>완료한 항목을 직접 체크해 보세요.</p>{guide.items.map((text, qi) => <label key={qi}><input type="checkbox" checked={checkedGuideItems.has(qi)} onChange={() => setCheckedGuideItems(current => { const n = new Set(current); if(n.has(qi)) n.delete(qi); else n.add(qi); return n })} /><span>{text}</span></label>)}</div>}
        {referenceView === "first" && <div id="writing-first-panel" role="tabpanel" aria-labelledby="writing-first-tab" className={ui.firstRecord}><div className={ui.firstRecordHeading}><small>{common.template.title} · 1차 제출글</small><FeedbackToggle checked={referenceFeedback} onChange={() => setReferenceFeedback(value => !value)} /></div><InlineReviewContent common={common} record={first} showFeedback={referenceFeedback} /><StudentResultContent common={common} record={first} showFeedback={referenceFeedback} /></div>}
      </aside>}
    </main>
    </div>
    <footer className="fixed inset-x-0 bottom-0 z-40 min-h-[68px] bg-[#485766]"><div className="mx-auto flex min-h-[68px] max-w-none flex-wrap items-center justify-between gap-2 px-4 py-2"><div className="flex gap-2"><button type="button" disabled={busy || (!rewrite && index === 0)} aria-label={previousBlocked ? "이전 단계로 이동할 수 없는 이유 보기" : undefined} title={previousBlocked ? "이전 단계로 이동할 수 없어요" : undefined} onClick={() => { if (!busy) void previous() }} className={cn("flex h-11 items-center gap-2 rounded px-5 font-black text-white transition disabled:opacity-45", previousBlocked ? "border border-white/15 bg-[#65758a] text-white/65" : "bg-[#34475f]")}>{previousBlocked ? <LockKeyhole className="size-4" /> : <ArrowLeft className="size-4" />}이전</button>{<button type="button" className="flex h-11 items-center gap-2 rounded bg-[#4cc9b8] px-5 font-black text-white"><Smartphone className="size-4" />전자책 보기</button>}{canChangeReviewTemplate(record) && <button type="button" disabled={busy} onClick={() => setSwitching(true)} className="flex h-11 items-center gap-2 rounded bg-[#fa5d91] px-5 font-black text-white disabled:opacity-50"><RefreshCw className="size-4" />독후감 교체</button>}</div><div className="flex gap-2">{rewrite && <button type="button" disabled={busy || (!rewrite && !dirty)} onClick={() => void saveCurrent()} className="flex h-11 items-center gap-2 rounded bg-[#8f86ef] px-5 font-black text-white disabled:opacity-60"><Save className="size-4" />저장하기</button>}<button type="button" disabled={busy} aria-disabled={busy || (rewrite && submissionTooShort)} onClick={() => rewrite ? setModal(submissionTooShort ? "short-submit" : "submit") : next()} className={cn("flex h-11 items-center gap-2 rounded bg-[#249ce0] px-7 font-black text-white disabled:opacity-60", rewrite && submissionTooShort && "opacity-45")}>{rewrite ? "제출하기" : <>다음<ArrowRight className="size-4" /></>}</button></div></div></footer>
    {message && <div role="status" className="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[#28333b] px-6 py-3 font-bold text-white shadow-xl">{message}</div>}
    {modal === "previous-blocked" && <ConfirmModal title="이전 단계로 이동할 수 없어요" description="고쳐쓰기에서 수정한 내용이 있어 차례대로 쓰기 화면으로 돌아갈 수 없어요." confirmLabel="확인" single onClose={() => setModal(null)} onConfirm={() => setModal(null)} />}
    {modal === "save" && <ConfirmModal title="저장 확인" onClose={closeSaveConfirm} onCancel={() => { if (!busy) void discardAndMove() }} onConfirm={() => { if (!busy) void saveAndMove() }} cancelLabel="아니오" confirmLabel="네" description={<>{"작성한 내용이 저장되지 않았어요! 저장하고 이동할까요?"}{pendingMove === "rewrite" && <><br />고쳐쓰기 단계로 가면 온라인 독후감을 교체할 수 없어요.</>}</>} />}
    {modal === "short-submit" && <ConfirmModal title="제출 안내" description={REVIEW_SHORT_SUBMISSION_MESSAGE} single confirmLabel="확인" onClose={() => setModal(null)} onConfirm={() => setModal(null)} />}
    {(modal === "rewrite" || modal === "submit") && <ConfirmModal title={modal === "rewrite" ? "작성 내용 확인" : "저장 확인"} onClose={() => setModal(null)} onConfirm={() => { if (!busy) void confirm() }} confirmLabel={modal === "rewrite" ? "확인하기" : "제출하기"} description={modal === "rewrite" ? <>지금까지 작성한 내용을 모두 확인해볼까요?<br />고쳐쓰기 단계로 가면 온라인 독후감을 교체할 수 없어요.</> : record.round === 2 ? "2차 작성글을 제출할까요? 제출한 뒤에는 작성 내용을 수정할 수 없어요." : "작성한 내용을 제출할까요? 제출하면 다시 수정할 수 없어요."} />}
    {switching && <ConfirmModal title="독후감 교체 확인" description={<>작성 중인 독후감을 교체할까요?<br />지금까지 작성한 내용은 모두 삭제됩니다.</>} confirmLabel="교체하기" onClose={() => setSwitching(false)} onConfirm={async () => { if (busy) return; setBusy(true); await hook.run({ type: "switch-template", recordId: record.id }); setBusy(false) }} />}
  </>
}

export function ReviewResult({ common, record, records, hook, setRound, external = false }: { common: ReviewCommon; record: ReviewRecord; records: ReviewRecord[]; hook: ReviewHook; setRound: (round: number) => void; external?: boolean }) {
  const [feedbackRound, setFeedbackRound] = React.useState<1 | 2 | null>(() => record.feedbackStatus === "전송완료" ? record.round : null)
  const [secondStart, setSecondStart] = React.useState(false)
  const feedbackEntry = React.useRef<string | null>(null)
  const seenRequests = React.useRef(new Set<string>())
  const [compareOpen, setCompareOpen] = React.useState(false)
  const [compareFeedback, setCompareFeedback] = React.useState(true)
  const [copyMessage, setCopyMessage] = React.useState("")
  const first = records.find(r => r.round === 1)
  const second = records.find(r => r.round === 2)
  const submitted = records.filter(r => r.writingStatus === "submitted").sort((a, b) => a.round - b.round)
  const firstSubmitted = first?.writingStatus === "submitted"
  const secondSubmitted = second?.writingStatus === "submitted"
  const firstFeedback = first?.feedbackStatus === "전송완료"
  const secondFeedback = second?.feedbackStatus === "전송완료"
  const canStartSecond = !external && firstSubmitted && firstFeedback && !!first?.seenAt && common.secondDecision === "request" && !second
  const firstReport = common.reportEnabled && firstFeedback && first?.report
  const secondReport = common.reportEnabled && secondFeedback && second?.report
  const progressLabel = record.feedbackStatus === "전송완료" ? "활동 완료" : studentReviewProgressLabel(common.progress)
  const showListNavigation = !external
  const workbook = getWorkbookForReview(common)
  const buttonBase = "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[13px] font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e44c7f]"
  const reportClass = cn(buttonBase, "border-[#cbd4dc] bg-[#f9fafb] text-[#44545f] hover:border-[#9dabb5] hover:bg-white")
  const openFeedback = React.useCallback((target: ReviewRecord) => {
    setCompareOpen(false)
    setRound(target.round)
    setFeedbackRound(target.round)
    if (!external && !target.seenAt && !seenRequests.current.has(target.id)) {
      seenRequests.current.add(target.id)
      void hook.run({ type: "seen", recordId: target.id }).then(next => {
        if (!next) seenRequests.current.delete(target.id)
      })
    }
  }, [external, hook, setRound])
  React.useEffect(() => {
    if (external || feedbackEntry.current === record.id) return
    const requested = new URLSearchParams(window.location.search).get("feedback")
    feedbackEntry.current = record.id
    const target = records.find(item => String(item.round) === requested && item.feedbackStatus === "전송완료")
    if (target) openFeedback(target)
    else if (record.feedbackStatus === "전송완료") openFeedback(record)
  }, [common.id, record, external, records, openFeedback])
  React.useEffect(() => { if (new URLSearchParams(window.location.search).get("compare") === "1" && submitted.length === 2) setCompareOpen(true) }, [submitted.length])
  const selectWriting = (targetRound: number) => { setCompareOpen(false); setFeedbackRound(records.find(r => r.round === targetRound && r.feedbackStatus === "전송완료")?.round ?? null); setRound(targetRound) }
  const toggleFeedback = (target: ReviewRecord) => {
    if (feedbackRound === target.round) { setFeedbackRound(null); return }
    openFeedback(target)
  }
  const toggleCompare = () => { setFeedbackRound(null); setCompareOpen(current => !current) }
  const copyWriting = async () => {
    try { await navigator.clipboard.writeText(plainReviewText(record.finalBody)); setCopyMessage("작성글을 복사했어요.") }
    catch { setCopyMessage("복사 권한을 확인해 주세요.") }
  }
  return <>
    <main className={ui.result}>
      <header className={ui.resultHeader}>
        {!external && <ol><li><Check size={14} />차례대로 쓰기<span>›</span></li><li><Check size={14} />고쳐쓰기<span>›</span></li><li data-active="true"><b>3</b>나의 글 완성</li></ol>}
        <div><h1>{common.bookTitle}<span><Pencil size={14} />{common.template.title}</span></h1><div className={ui.resultActions}>{firstReport && first && <a className={reportClass} target="_blank" rel="noopener noreferrer" href={`/online-review/report/${first.id}?role=${external ? "external" : "student"}`}><FileText size={14} />1차 보고서</a>}{secondReport && second && <a className={reportClass} target="_blank" rel="noopener noreferrer" href={`/online-review/report/${second.id}?role=${external ? "external" : "student"}`}><FileText size={14} />2차 보고서</a>}</div></div>
      </header>
      {secondSubmitted && <nav className={ui.resultTabs} role="tablist" aria-label="작성글 보기"><button type="button" role="tab" aria-selected={!compareOpen && record.round === 1} data-active={!compareOpen && record.round === 1} onClick={() => selectWriting(1)}>1차 작성글</button><button type="button" role="tab" aria-selected={!compareOpen && record.round === 2} data-active={!compareOpen && record.round === 2} onClick={() => selectWriting(2)}>2차 작성글</button><button type="button" role="tab" aria-selected={compareOpen} data-active={compareOpen} onClick={toggleCompare}>나란히 보기</button></nav>}
      {canStartSecond && <div className={ui.secondRequest}><p>선생님의 피드백을 참고해 2차 글을 작성해 보세요.</p><button type="button" onClick={() => setSecondStart(true)}>2차 글 시작하기 →</button></div>}
      {compareOpen ? <section className={ui.resultCard} aria-label="작성글 비교"><header><h2>{common.template.title}<small>1차 · 2차 나란히</small></h2><FeedbackToggle checked={compareFeedback} onChange={()=>setCompareFeedback(v=>!v)} /></header><div className={ui.compare}>{submitted.map(r => <article key={r.id}><h3>{r.round}차 작성글</h3><InlineReviewContent common={common} record={r} showFeedback={compareFeedback} /><StudentResultContent common={common} record={r} showFeedback={compareFeedback} /></article>)}</div></section> : <div className={ui.resultGrid}>
        <aside><BookPanel workbook={workbook} /><p className={ui.progress} aria-label={`독후감 상태: ${progressLabel}`}>{progressLabel}</p></aside>
        <article className={ui.resultCard}><header><h2>{common.template.title}</h2>{record.feedbackStatus === "전송완료" && <FeedbackToggle checked={feedbackRound === record.round} onChange={() => toggleFeedback(record)} />}</header><div className={ui.resultBody}><InlineReviewContent common={common} record={record} showFeedback={feedbackRound === record.round} /><StudentResultContent common={common} record={record} showFeedback={feedbackRound === record.round} /></div></article>
      </div>}
      {showListNavigation && <footer className={ui.resultFooter} data-compare={compareOpen}><Link href={`/student/exploration-record?tab=workbook&month=${reviewActivityDate(common).monthKey}`}><ArrowLeft size={18} />온라인 독후감 목록</Link><div><button type="button" onClick={() => void copyWriting()}><FileText size={18} />글 복사</button><a href="https://read365.edunet.net/Search" target="_blank" rel="noopener noreferrer"><BookOpen size={20} />독서로 이동</a></div></footer>}
      {copyMessage && <p role="status" className={cn("fixed left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[#28333b] px-6 py-3 font-bold text-white shadow-xl", showListNavigation ? "bottom-24" : "bottom-6")}>{copyMessage}</p>}
    </main>
    {secondStart && !external && first && <SecondReviewStartModal recordId={first.id} sourceWorkbookId={common.sourceWorkbookId} run={hook.run} onClose={() => setSecondStart(false)} onStarted={() => setRound(2)} />}


  </>
}


function FeedbackToggle({checked,onChange}:{checked:boolean;onChange:()=>void}) {
  return <label className={ui.feedbackToggle}><input type="checkbox" checked={checked} onChange={onChange} /><span aria-hidden="true" />선생님 피드백 보기</label>
}

function InlineReviewContent({ record, showFeedback }: { common: ReviewCommon; record: ReviewRecord; showFeedback: boolean }) {
  if (!showFeedback || record.feedbackStatus !== "전송완료") return null
  return <section className={ui.inlineFeedback}><strong>선생님 총평</strong><ReviewText value={record.feedback} />{record.flowers > 0 && <p className={ui.feedbackFlower}><Image src="/student-assets/flower-reward.svg" alt="" width={18} height={18} />섬초롱꽃 {record.flowers}개를 받았어요</p>}<time>{record.savedAt?.replace("T"," ").slice(0,19)}</time></section>
}
