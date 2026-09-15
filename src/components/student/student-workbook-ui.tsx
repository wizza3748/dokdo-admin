"use client"
import Image from "next/image"
import Link from "next/link"
import * as React from "react"
import { AlignLeft, ArrowLeft, ArrowRight, BadgeCheck, Bold, BookOpen, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FileText, ImagePlus, Italic, MessageCircle, RefreshCw, Save, Search, Smartphone, Strikethrough, Underline, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudentWorkbook, WorkbookTemplate } from "@/lib/student-workbooks"
type ViewMode = "select" | "write" | "rewrite" | "result"

function ReportBadge() {
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#b9d8eb] bg-white px-2 py-1 text-xs font-bold text-[#147fbd] shadow-sm"><FileText aria-hidden="true" className="size-3.5 shrink-0" />평가 보고서 제공</span>
}

export function SelectionTitle({ title }: { title: string }) {
  return <div className="h-16 border-b border-[#dde4e8] bg-white"><div className="mx-auto flex h-full max-w-[930px] items-center px-1 text-[15px] font-black">{title}</div></div>
}

export function WorkbookTopBars({ workbook, template, view, open, onToggle, hideGuide = false, documentLabel = "온라인 독후감", resultTemplateBreadcrumb = false, wide = false }: { workbook: StudentWorkbook; template: WorkbookTemplate; view: ViewMode; open: boolean; onToggle: () => void; hideGuide?: boolean; documentLabel?: string; resultTemplateBreadcrumb?: boolean; wide?: boolean }) {
  const isResult = view === "result"
  const instruction = isResult
    ? template.guides?.complete ?? "※ 온라인 독후감 활동을 마무리하고, 완성된 글을 확인해 보세요."
    : view === "rewrite"
      ? template.guides?.rewrite ?? "※ 지금까지 쓴 내용을 읽으며 고칠 부분이 있는지 살펴보세요."
      : template.guides?.writing ?? (template.id === "quiz" ? "※ 안내에 따라 퀴즈를 작성해 보세요." : "※ 안내에 따라 온라인 독후감을 작성해 보세요.")
  return (
    <>
      <div className="h-16 border-b border-[#dde4e8] bg-white"><div className={cn("mx-auto flex h-full items-center gap-3 px-4 text-[15px] font-black", wide ? "max-w-[1200px]" : "max-w-[930px]")}><span>{isResult && !resultTemplateBreadcrumb ? documentLabel : workbook.bookTitle}</span><ChevronRight className="size-4 fill-[#59636a]" /><span className="font-medium">{isResult && !resultTemplateBreadcrumb ? "나의 글 완성!" : template.title}</span></div></div>
      {!hideGuide && <div className="border-b border-[#dde4e8] bg-white"><div className={cn("mx-auto flex min-h-16 items-center justify-between px-4", wide ? "max-w-[1200px]" : "max-w-[930px]")}><p className="text-[15px]">{instruction}</p><button type="button" onClick={onToggle} className="grid size-9 place-items-center rounded-lg bg-[#e9eef1] text-[#168fd2]" aria-label="안내 열기/닫기">{open ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}</button></div>{!open && <div className="h-0" />}</div>}
    </>
  )
}

export function SelectionScreen({ workbook, template, selectedId, onSelect, onPreview, onStart, showReportGuide = false, compactTop = false }: { workbook: StudentWorkbook; template: WorkbookTemplate; selectedId: string; onSelect: (id: string) => void; onPreview: () => void; onStart: () => void; showReportGuide?: boolean; compactTop?: boolean }) {
  return (
    <main className={cn("mx-auto grid max-w-[930px] gap-6 px-0 pb-10 lg:grid-cols-[240px_1fr]", compactTop ? "pt-4" : "pt-10")}>
      <BookPanel workbook={workbook} />
      <div className="space-y-4">
        <section className="min-h-[200px] rounded-xl bg-[#2f9de0] px-8 py-7 text-white">
          <h1 className="flex items-center gap-1 text-[25px] font-black">{template.title}{template.recommended && <BadgeCheck className="size-8 fill-[#ffad28] stroke-[#ffd45b]" />}</h1>
          <p className="mt-1 text-[15px] leading-6">{template.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3"><p className="text-[15px]">총 {template.questions.length}개 질문 항목</p>{template.reportEnabled && <ReportBadge />}</div>
          <div className="mt-3 flex gap-2"><button type="button" onClick={onPreview} className="rounded-lg border border-white px-4 py-2.5 font-black">미리 보기</button><button type="button" onClick={onStart} className="rounded-lg bg-white px-5 py-2.5 font-black text-[#147fbd]">시작하기</button></div>
        </section>
        <section className="rounded-xl border-2 border-[#e1e7ea] bg-[#f9fbfc] p-6">
          <p className={cn("text-[14px] text-[#667078]", showReportGuide ? "mb-1" : "mb-5")}>※ 작성할 독후감을 선택해 주세요. 고쳐쓰기 전까지는 다른 독후감으로 바꿀 수 있어요.</p>
          {showReportGuide && <p className="mb-5 text-[14px] text-[#667078]">※ 평가 보고서 제공 표시가 있는 템플릿은 피드백 완료 후 평가 보고서를 확인할 수 있어요.</p>}
          <ul className="grid grid-cols-3 gap-4">
            {workbook.templates.map((item) => (
              <li key={item.id} className="relative">
                {item.recommended && <BadgeCheck aria-label="추천" className="pointer-events-none absolute -right-1 -top-2 z-20 size-8 fill-[#ffad28] stroke-[#ffd45b]" />}
                <button type="button" onClick={() => onSelect(item.id)} className={cn("relative flex h-[140px] w-full flex-col overflow-hidden rounded-xl border-2 p-4 text-left transition", selectedId === item.id ? "border-[#239cde] bg-[#cce8f8] text-[#198ed0]" : "border-[#e0e6e9] bg-[#fbfcfd] text-[#4b5359]") }>
                  <strong className="pr-2 text-[20px] leading-7">{item.title}</strong>{item.reportEnabled && <span className="absolute bottom-3 left-2 z-10"><ReportBadge /></span>}
                  <span className="absolute -bottom-2 right-2 grid size-16 place-items-center rounded-xl bg-[#e6ecef] text-white"><BookOpen className="size-9" /></span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}

export function BookPanel({ workbook }: { workbook: StudentWorkbook }) {
  return (
    <aside>
      <div className="relative h-[320px] w-[240px] overflow-hidden rounded-xl border border-[#bfc8cd] bg-white shadow-sm">
        <Image
          src={workbook.coverSrc}
          alt={`${workbook.bookTitle} 표지`}
          fill
          sizes="240px"
          className="object-cover"
          priority
          unoptimized={workbook.coverSrc.startsWith("http")}
        />
        <span className="absolute left-3 top-3 rounded-lg border-2 border-white bg-[#219ced] px-3 py-2 text-lg font-black text-white">Lv.{workbook.level}</span>
        <button type="button" className="absolute bottom-3 left-3 right-3 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#4bc9b8] font-black text-white"><Smartphone className="size-4" />전자책 보기</button>
      </div>
      <dl className="mt-5 space-y-3">
        <Meta label="도서명" value={workbook.bookTitle} />
        <Meta label="지은이" value={workbook.author} />
        <Meta label="읽은 날짜" value={`2026년 ${workbook.month}월 ${workbook.day}일 ${workbook.weekday}`} />
      </dl>
    </aside>
  )
}

export function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-[#69737a]">{label}</dt><dd className="mt-1 text-[16px] font-black leading-6">{value}</dd></div>
}

export function WritingScreen({ template, answers, questionIndex, setQuestionIndex, setAnswers, dirty, onPrevious, onNext, onSave, onSwitch }: { template: WorkbookTemplate; answers: string[]; questionIndex: number; setQuestionIndex: (value: number) => void; setAnswers: React.Dispatch<React.SetStateAction<string[]>>; dirty: boolean; onPrevious: () => void; onNext: () => void; onSave: () => void; onSwitch: () => void }) {
  const question = template.questions[questionIndex]
  return (
    <>
      <main className="mx-auto max-w-[930px] px-0 pb-28 pt-10">
        <section>
          <div className="flex items-center justify-between gap-4">
            <h1 className="flex items-center gap-3 text-[21px] font-black"><span className="grid size-9 place-items-center rounded-full bg-[#087fc8] text-lg text-white">{questionIndex + 1}</span>{question.title}</h1>
            <QuestionSteps questions={template.questions} current={questionIndex} onSelect={setQuestionIndex} />
          </div>
          <p className="mt-3 text-[15px] leading-6">{question.description}</p>
          {question.example && <div className="mt-3 rounded-lg border border-[#dfd9ca] bg-[#f8f5ec] px-4 py-4 text-[14px] leading-6"><strong className="mr-2">예시</strong>{question.example}</div>}
          <Editor value={answers[questionIndex] ?? ""} onChange={(value) => setAnswers((current) => current.map((answer, index) => index === questionIndex ? value : answer))} />
        </section>
      </main>
      <WritingFooter questionIndex={questionIndex} dirty={dirty} onPrevious={onPrevious} onNext={onNext} onSave={onSave} onSwitch={onSwitch} />
    </>
  )
}

export function QuestionSteps({ questions, current, onSelect }: { questions: WorkbookTemplate["questions"]; current: number; onSelect: (index: number) => void }) {
  return <div className="flex gap-2">{questions.map((_, index) => <button type="button" key={index} onClick={() => onSelect(index)} className={cn("grid size-8 cursor-pointer place-items-center rounded-full bg-[#e7ecef] text-[16px] font-black text-[#90999f]", index === current && "bg-[#087fc8] text-white")}>{index + 1}</button>)}</div>
}

export function Editor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="mt-2 overflow-hidden border border-[#cbd4d9] bg-white">
      <div className="flex h-10 items-center gap-1 border-b border-[#d5dde1] bg-[#f7f9fa] px-3 text-[#48545e]">
        <ToolbarButton label="굵게"><Bold className="size-4" /></ToolbarButton><ToolbarButton label="기울임"><Italic className="size-4" /></ToolbarButton><ToolbarButton label="밑줄"><Underline className="size-4" /></ToolbarButton><ToolbarButton label="취소선"><Strikethrough className="size-4" /></ToolbarButton><ToolbarButton label="정렬"><AlignLeft className="size-4" /></ToolbarButton><ToolbarButton label="이미지 삽입"><ImagePlus className="size-4" /></ToolbarButton>
      </div>
      <textarea aria-label="독후감 답변" value={value} onChange={(event) => onChange(event.target.value)} placeholder="여기에 답변을 작성해주세요." className="min-h-[245px] w-full resize-y px-4 py-3 text-[15px] leading-7 outline-none placeholder:italic placeholder:text-[#8b9297]" />
    </div>
  )
}

export function ToolbarButton({ label, children }: { label: string; children: React.ReactNode }) {
  return <button type="button" aria-label={label} className="grid size-8 place-items-center rounded hover:bg-white">{children}</button>
}

export function WritingFooter({ questionIndex, dirty, onPrevious, onNext, onSave, onSwitch }: { questionIndex: number; dirty: boolean; onPrevious: () => void; onNext: () => void; onSave: () => void; onSwitch: () => void }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 h-[68px] bg-[#4a5e77]">
      <div className="mx-auto flex h-full max-w-[930px] items-center justify-between">
        <div className="flex gap-2"><button type="button" disabled={questionIndex === 0} onClick={onPrevious} className="flex h-11 items-center gap-2 rounded bg-[#34475f] px-5 font-black text-white disabled:opacity-45"><ArrowLeft className="size-4" />이전</button><button type="button" className="flex h-11 items-center gap-2 rounded bg-[#4cc9b8] px-5 font-black text-white"><Smartphone className="size-4" />전자책 보기</button><button type="button" onClick={onSwitch} className="flex h-11 items-center gap-2 rounded bg-[#fa5e8d] px-5 font-black text-white"><RefreshCw className="size-4" />독후감 교체</button></div>
        <div className="flex gap-2"><button type="button" disabled={!dirty} onClick={onSave} className="flex h-11 items-center gap-2 rounded bg-[#8f86ef] px-5 font-black text-white disabled:opacity-60"><Save className="size-4" />저장하기</button><button type="button" onClick={onNext} className="flex h-11 items-center gap-2 rounded bg-[#249ce0] px-7 font-black text-white">다음<ArrowRight className="size-4" /></button></div>
      </div>
    </footer>
  )
}

export function RewriteScreen({ template, answers, setAnswers, dirty, onPrevious, onSave, onSubmit }: { template: WorkbookTemplate; answers: string[]; setAnswers: React.Dispatch<React.SetStateAction<string[]>>; dirty: boolean; onPrevious: () => void; onSave: () => void; onSubmit: () => void }) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)

  return (
    <>
      <main className="mx-auto max-w-[930px] pb-28 pt-4">
        <h1 className="flex items-center gap-2 text-[20px] font-black"><span className="grid size-8 place-items-center rounded-full bg-[#087fc8] text-white"><Search className="size-5 stroke-[3]" /></span>고쳐쓰기</h1>
        <section className="mt-2 rounded-lg border border-[#dce3e7] bg-white px-8 pb-8 pt-5">
          <h2 className="text-[27px] font-black">{template.title}</h2>
          <div className="mt-2 space-y-2">
            {template.questions.map((question, index) => {
              const answer = answers[index] ?? ""
              const editing = editingIndex === index

              if (editing) {
                return (
                  <section key={question.title} className="px-1 pb-4 pt-2">
                    <h3 className="text-[16px] font-black">{index + 1}.{question.title}</h3>
                    <Editor value={answer} onChange={(value) => setAnswers((current) => current.map((item, answerIndex) => answerIndex === index ? value : item))} />
                  </section>
                )
              }

              if (!answer.trim()) {
                return (
                  <section key={question.title} className="px-1 pb-3 pt-2">
                    <h3 className="text-[16px] font-black">{index + 1}.{question.title}</h3>
                    <button type="button" onClick={() => setEditingIndex(index)} className="mt-2 grid min-h-24 w-full place-items-center rounded-lg border-2 border-dashed border-[#dce5ea] text-[16px] text-[#a2a7aa] transition hover:border-[#249ce0] hover:bg-[#eef8fe]">클릭하여 작성하세요.</button>
                  </section>
                )
              }

              return (
                <button type="button" key={question.title} onClick={() => setEditingIndex(index)} className="group relative block w-full rounded-lg border-2 border-transparent px-3 py-2 text-left transition hover:border-[#249ce0] hover:bg-[#eaf6fd]">
                  <span className="absolute right-2 top-2 rounded-full bg-[#249ce0] px-3 py-1 text-[11px] font-black text-white opacity-0 transition group-hover:opacity-100">클릭하여 편집하기</span>
                  <strong className="block pr-28 text-[16px]">{index + 1}.{question.title}</strong>
                  <span className="mt-2 block whitespace-pre-wrap border-b-2 border-dotted border-[#d8e1e6] pb-1 text-[16px] leading-7">{answer}</span>
                </button>
              )
            })}
          </div>
        </section>
      </main>
      <footer className="fixed inset-x-0 bottom-0 z-40 h-[68px] bg-[#4a5e77]"><div className="mx-auto flex h-full max-w-[930px] items-center justify-between"><button type="button" onClick={onPrevious} className="flex h-11 items-center gap-2 rounded bg-[#34475f] px-5 font-black text-white"><ArrowLeft className="size-4" />이전</button><div className="flex gap-2"><button type="button" disabled={!dirty} onClick={onSave} className="flex h-11 items-center gap-2 rounded bg-[#8f86ef] px-5 font-black text-white disabled:opacity-60"><Save className="size-4" />저장하기</button><button type="button" onClick={onSubmit} className="h-11 rounded bg-[#249ce0] px-7 font-black text-white">제출하기</button></div></div></footer>
    </>
  )
}

export function ResultScreen({ workbook, template, answers, hasFeedback, feedbackOpen, onFeedback, listAction }: { workbook: StudentWorkbook; template: WorkbookTemplate; answers: string[]; hasFeedback: boolean; feedbackOpen: boolean; onFeedback: () => void; listAction?: React.ReactNode }) {
  const feedback = workbook.feedback
  return (
    <main className="mx-auto max-w-[1200px] py-10">
      {listAction}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <BookPanel workbook={workbook} />
      <div>
        {hasFeedback && feedback && <div className="mb-3 flex justify-end"><button type="button" aria-pressed={feedbackOpen} onClick={onFeedback} className={cn("flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-black transition", feedbackOpen ? "border-[#ed4d83] bg-[#ed4d83] text-white" : "border-[#f0b8ca] bg-[#fff6f8] text-[#d93670] hover:bg-[#ffedf3]")}><MessageCircle className="size-4" />피드백 보기</button></div>}
        <div className={cn(feedbackOpen && "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]")}><section className="rounded-xl border border-[#dce3e7] bg-white px-8 py-6">
          <h1 className="text-[28px] font-black">{template.title}</h1>
          <div className="mt-4 space-y-6">{template.questions.map((question, index) => <div key={question.title}><h2 className="text-[16px] font-black">{index + 1}.{question.title}</h2><p className="mt-2 whitespace-pre-wrap border-b-2 border-dotted border-[#d9e1e5] pb-2 text-[16px] leading-7">{answers[index] || "작성한 내용이 없습니다."}</p></div>)}</div>
        </section>{feedbackOpen && feedback && <aside className="overflow-hidden rounded-xl border border-[#f0c3d2] bg-white shadow-[0_8px_24px_rgba(202,60,109,.10)]"><header className="border-b border-[#f3cfda] bg-[#fff3f7] px-4 pb-3 pt-2"><div className="flex h-7 justify-end"><button type="button" aria-label="피드백 닫기" onClick={onFeedback} className="grid size-7 place-items-center text-[#936575] hover:text-[#d93670]"><X className="size-4" /></button></div><div className="-mt-1 flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-[#ed4d83] text-white"><MessageCircle className="size-4" /></span><div><p className="text-[14px] font-black">피드백 보기</p><p className="mt-0.5 text-[11px] text-[#8b6673]">선생님이 보내준 피드백을 확인해 보세요.</p></div></div></header><div className="px-4 pb-4">{feedback.reward > 0 && <div className="flex items-center gap-2 border-b border-[#eadce1] py-3 text-[12px] font-semibold text-[#6f5360]"><Image src="/student-assets/flower-reward.svg" alt="" width={26} height={26} /><span>선생님이 섬초롱꽃 <strong className="text-[#d93670]">{feedback.reward}개</strong>를 보내주셨어요.</span></div>}<section className="py-4"><div className="flex items-center justify-between gap-3"><h2 className="text-[14px] font-black">총평</h2><time className="text-[11px] text-[#8a747c]">{feedback.date}</time></div><p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[#3f4146]">{feedback.content}</p></section></div></aside>}</div>
      </div>
      </div>
    </main>
  )
}

export function ModalShell({ children, width = "560px", fixedFrame = false }: { children: React.ReactNode; width?: string; fixedFrame?: boolean }) {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4"><section role="dialog" aria-modal="true" style={{ width }} className={cn("max-h-[90dvh] max-w-full rounded-[22px] bg-white shadow-2xl", fixedFrame ? "flex flex-col overflow-hidden" : "overflow-auto")}>{children}</section></div>
}

export function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return <header className="relative shrink-0 border-b-2 border-dashed border-[#dde1e3] px-5 py-3 text-center"><h2 className="text-[24px] font-black">{title}</h2>{subtitle && <p className="mt-0.5 text-[14px] text-[#269bdc]">{subtitle}</p>}<button type="button" onClick={onClose} aria-label="닫기" className="absolute right-4 top-4 text-[#444b50]"><X className="size-7" /></button></header>
}

export function StartConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return <ModalShell><ModalHeader title="독후감 선택 확인" onClose={onClose} /><div className="grid min-h-[205px] place-items-center px-7 text-center text-[20px] leading-8"><p>이 독후감으로 시작할까요?<br /><strong className="font-medium">고쳐쓰기 전까지는 다른 독후감으로 바꿀 수 있어요.</strong></p></div><YellowFooter><button type="button" onClick={onClose}>취소</button><button type="button" onClick={onConfirm}>시작하기</button></YellowFooter></ModalShell>
}

export function OutlineModal({ template, onClose, onStart }: { template: WorkbookTemplate; onClose: () => void; onStart: () => void }) {
  return <ModalShell><ModalHeader title={template.title} onClose={onClose} /><div className="px-6 pb-5 pt-4"><p className="text-center text-[18px]">독후감에 작성할 내용을 미리 확인해 보세요.</p><ol className="mt-4 space-y-3 rounded-lg border-2 border-[#e2e7ea] bg-[#f9fbfc] p-5">{template.questions.map((question, index) => <li key={question.title} className="flex items-center gap-3 text-[17px]"><span className="grid size-6 place-items-center rounded-full bg-[#e7ecef] text-sm font-black text-[#8c969c]">{index + 1}</span>{question.title}</li>)}</ol></div><YellowFooter single><button type="button" onClick={onStart}>작성 시작</button></YellowFooter></ModalShell>
}

export function PreviewModal({ template, onClose }: { template: WorkbookTemplate; onClose: () => void }) {
  const [index, setIndex] = React.useState(0)
  const question = template.questions[index]
  return <ModalShell width="810px"><ModalHeader title={template.title} subtitle="이 독후감은 미리보기 전용입니다. 작성은 선택 후 시작할 수 있어요." onClose={onClose} /><div className="px-4 py-4"><div className="flex items-center justify-between"><h3 className="flex items-center gap-3 text-[19px] font-black"><span className="grid size-8 place-items-center rounded-full bg-[#087fc8] text-white">{index + 1}</span>{question.title}</h3><QuestionSteps questions={template.questions} current={index} onSelect={setIndex} /></div><p className="mt-3 text-[15px] leading-6">{question.description}</p>{question.example && <div className="mt-3 rounded-lg border border-[#dfd9ca] bg-[#f8f5ec] px-4 py-4 text-[14px] leading-6"><strong className="mr-2">예시</strong>{question.example}</div>}<div className="pointer-events-none opacity-90"><Editor value="" onChange={() => undefined} /></div><p className="mt-2 text-center text-[#2a9fdf]">미리보기 모드에서는 입력이 비활성화되어 있습니다.</p></div></ModalShell>
}

export function ConfirmModal({ title, description, cancelLabel = "취소", confirmLabel, single = false, busy = false, onClose, onCancel = onClose, onConfirm }: { title: string; description: React.ReactNode; cancelLabel?: string; confirmLabel: string; single?: boolean; busy?: boolean; onClose: () => void; onCancel?: () => void; onConfirm: () => void }) {
  return <ModalShell><ModalHeader title={title} onClose={() => { if (!busy) onClose() }} /><div className="grid min-h-[190px] place-items-center px-7 text-center text-[19px] leading-8"><p>{description}</p></div><YellowFooter single={single}>{!single && <button type="button" disabled={busy} onClick={onCancel}>{cancelLabel}</button>}<button type="button" disabled={busy} onClick={onConfirm}>{confirmLabel}</button></YellowFooter></ModalShell>
}

export function YellowFooter({ children, single = false }: { children: React.ReactNode; single?: boolean }) {
  return <footer className={cn("grid h-16 shrink-0 bg-[#ffd924] text-[20px] font-black [&>button+button]:border-l [&>button+button]:border-[#e8be15]", single ? "grid-cols-1" : "grid-cols-2")}>{children}</footer>
}

export function NotFound() {
  return <div className="grid min-h-screen place-items-center bg-[#f5f7f9]"><div className="text-center"><BookOpen className="mx-auto size-12 text-[#188fd0]" /><h1 className="mt-4 text-xl font-black">독후감을 찾을 수 없습니다.</h1><Link href="/student/exploration-record" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#239cdf] px-5 py-3 font-black text-white"><ChevronLeft className="size-4" />탐험 기록으로 돌아가기</Link></div></div>
}
