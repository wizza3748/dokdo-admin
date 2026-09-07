"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import {
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bold,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ImagePlus,
  Italic,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  Smartphone,
  Strikethrough,
  Underline,
  X,
} from "lucide-react"

import { StudentHeader } from "@/components/student/student-header"
import {
  getStudentAgencyWorkbookRecordId,
  syncStudentSubmittedAgencyWorkbooks,
  upsertStudentSubmittedAgencyWorkbook,
} from "@/lib/online-workbooks"
import { cn } from "@/lib/utils"
import {
  getWorkbookById,
  getWorkbookRuntime,
  saveWorkbookRuntime,
  type StudentWorkbook,
  type WorkbookRuntimeState,
  type WorkbookTemplate,
} from "@/lib/student-workbooks"

type ViewMode = "select" | "write" | "rewrite" | "result"
type ModalMode = "preview" | "start" | "outline" | "switch" | "save" | "content-review" | "content-empty" | "submit" | "feedback" | null

export function StudentWorkbookFlow({ id }: { id: string }) {
  const router = useRouter()
  const workbook = getWorkbookById(id)
  const [runtime, setRuntime] = React.useState<WorkbookRuntimeState | null>(null)
  const [view, setView] = React.useState<ViewMode>("select")
  const [selectedId, setSelectedId] = React.useState("")
  const [questionIndex, setQuestionIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<string[]>([])
  const [savedAnswers, setSavedAnswers] = React.useState<string[]>([])
  const [pendingQuestionIndex, setPendingQuestionIndex] = React.useState<number | null>(null)
  const [modal, setModal] = React.useState<ModalMode>(null)
  const [guideOpen, setGuideOpen] = React.useState(true)
  const [toast, setToast] = React.useState("")

  React.useEffect(() => {
    if (!workbook) return
    const current = getWorkbookRuntime(workbook)
    setRuntime(current)
    setSelectedId(current.selectedTemplateId ?? workbook.templates[0].id)
    setAnswers(current.answers)
    setSavedAnswers(current.answers)
    setView(current.status === "before" ? "select" : current.status === "writing" ? "write" : "result")
    void syncStudentSubmittedAgencyWorkbooks()
  }, [workbook])

  if (!workbook) return <NotFound />
  if (!runtime) return <div className="min-h-screen bg-[#f5f7f9]"><StudentHeader section="온라인 워크북" /></div>

  const template = workbook.templates.find((item) => item.id === selectedId) ?? workbook.templates[0]
  const dirty = answers.join("\n") !== savedAnswers.join("\n")

  const persist = (next: Partial<WorkbookRuntimeState>, message?: string) => {
    const merged = { ...runtime, ...next }
    setRuntime(merged)
    saveWorkbookRuntime(workbook.id, next)
    if (message) {
      setToast(message)
      window.setTimeout(() => setToast(""), 1700)
    }
  }

  const startWriting = () => {
    const initialAnswers = template.questions.map(() => "")
    setAnswers(initialAnswers)
    setSavedAnswers(initialAnswers)
    persist({ status: "writing", selectedTemplateId: template.id, answers: initialAnswers })
    setView("write")
    setQuestionIndex(0)
    setModal(null)
  }

  const saveAnswers = () => {
    setSavedAnswers(answers)
    persist({ status: "writing", selectedTemplateId: template.id, answers }, "저장되었어요.")
  }

  const completeQuestionMove = (next: number, currentAnswers = answers) => {
    if (next >= template.questions.length) {
      if (currentAnswers.every((answer) => !answer.trim())) {
        setModal("content-empty")
        return
      }
      setView("rewrite")
      return
    }
    setQuestionIndex(next)
  }

  const moveQuestion = (next: number) => {
    if (next === questionIndex) return
    if (next >= template.questions.length) {
      if (answers.every((answer) => !answer.trim())) {
        setModal("content-empty")
        return
      }
      setModal("content-review")
      return
    }
    if (dirty) {
      setPendingQuestionIndex(next)
      setModal("save")
      return
    }
    completeQuestionMove(next, answers)
  }

  const saveAndMoveQuestion = () => {
    if (pendingQuestionIndex === null) return
    const next = pendingQuestionIndex
    setSavedAnswers(answers)
    persist({ status: "writing", selectedTemplateId: template.id, answers })
    setPendingQuestionIndex(null)
    setModal(null)
    completeQuestionMove(next, answers)
  }

  const discardAndMoveQuestion = () => {
    if (pendingQuestionIndex === null) return
    const next = pendingQuestionIndex
    setAnswers(savedAnswers)
    setPendingQuestionIndex(null)
    setModal(null)
    completeQuestionMove(next, savedAnswers)
  }

  const closeSaveConfirm = () => {
    setPendingQuestionIndex(null)
    setModal(null)
  }

  const confirmContentReview = () => {
    setSavedAnswers(answers)
    persist({ status: "writing", selectedTemplateId: template.id, answers })
    setModal(null)
    setView("rewrite")
  }

  const confirmSubmit = async () => {
    setSavedAnswers(answers)
    persist({ status: "completed", selectedTemplateId: template.id, answers }, "제출이 완료되었어요.")
    const submittedAt = new Date()
    const submittedDate = `${submittedAt.getFullYear()}-${String(submittedAt.getMonth() + 1).padStart(2, "0")}-${String(submittedAt.getDate()).padStart(2, "0")}`
    await upsertStudentSubmittedAgencyWorkbook({
      id: getStudentAgencyWorkbookRecordId(workbook.id),
      sourceWorkbookId: workbook.id,
      institution: "독도학원",
      studentName: "진독도",
      level: workbook.level,
      bookTitle: workbook.bookTitle,
      templateName: template.title,
      submittedAt: submittedDate,
      feedbackAt: null,
      status: "작성전",
      aiUsed: 0,
      flowers: 0,
      anomaly: false,
      parentSent: false,
      questions: template.questions.map((question, index) => ({
        title: question.title,
        answer: answers[index] ?? "",
      })),
    })
    setModal(null)
    setView("result")
  }

  const openFeedback = () => setModal("feedback")

  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#202326] [&_button:not(:disabled)]:cursor-pointer">
      <StudentHeader section="온라인 워크북" />
      {view === "select" ? (
        <SelectionTitle title={workbook.bookTitle} />
      ) : (
        <WorkbookTopBars
          workbook={workbook}
          template={template}
          view={view}
          open={guideOpen}
          onToggle={() => setGuideOpen((current) => !current)}
        />
      )}

      {view === "select" && (
        <SelectionScreen
          workbook={workbook}
          template={template}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPreview={() => setModal("preview")}
          onStart={() => setModal("start")}
        />
      )}
      {view === "write" && (
        <WritingScreen
          template={template}
          answers={answers}
          questionIndex={questionIndex}
          setQuestionIndex={moveQuestion}
          setAnswers={setAnswers}
          dirty={dirty}
          onPrevious={() => moveQuestion(questionIndex - 1)}
          onNext={() => moveQuestion(questionIndex + 1)}
          onSave={saveAnswers}
          onSwitch={() => setModal("switch")}
        />
      )}
      {view === "rewrite" && (
        <RewriteScreen
          template={template}
          answers={answers}
          setAnswers={setAnswers}
          dirty={dirty}
          onPrevious={() => setView("write")}
          onSave={saveAnswers}
          onSubmit={() => setModal("submit")}
        />
      )}
      {view === "result" && (
        <ResultScreen
          workbook={workbook}
          template={template}
          answers={answers}
          hasFeedback={runtime.status === "feedback"}
          onFeedback={openFeedback}
        />
      )}

      {modal === "preview" && <PreviewModal template={template} onClose={() => setModal(null)} />}
      {modal === "start" && <StartConfirmModal onClose={() => setModal(null)} onConfirm={() => setModal("outline")} />}
      {modal === "outline" && <OutlineModal template={template} onClose={() => setModal(null)} onStart={startWriting} />}
      {modal === "switch" && (
        <ConfirmModal
          title="워크북 교체 확인"
          description={<>작성 중인 워크북을 교체할까요?<br />지금까지 작성한 내용은 모두 삭제됩니다.</>}
          confirmLabel="교체하기"
          onClose={() => setModal(null)}
          onConfirm={() => {
            const first = workbook.templates[0]
            const empty = first.questions.map(() => "")
            persist({ status: "before", selectedTemplateId: first.id, answers: empty })
            setSelectedId(first.id)
            setAnswers(empty)
            setSavedAnswers(empty)
            setView("select")
            setModal(null)
          }}
        />
      )}
      {modal === "save" && (
        <ConfirmModal
          title="저장 확인"
          description="작성한 내용이 저장되지 않았어요! 저장하고 이동할까요?"
          cancelLabel="아니오"
          confirmLabel="네"
          onClose={closeSaveConfirm}
          onCancel={discardAndMoveQuestion}
          onConfirm={saveAndMoveQuestion}
        />
      )}
      {modal === "content-review" && (
        <ConfirmModal
          title="작성 내용 확인"
          description={<>지금까지 작성한 내용을 모두 확인해볼까요?<br />고쳐쓰기 단계로 가면 온라인 워크북을 교체할 수 없어요.</>}
          confirmLabel="확인하기"
          onClose={() => setModal(null)}
          onConfirm={confirmContentReview}
        />
      )}
      {modal === "content-empty" && (
        <ConfirmModal
          title="내용 확인"
          description="아직 작성한 내용이 없어요. 내용을 작성한 뒤 확인해 보세요."
          confirmLabel="확인"
          single
          onClose={() => setModal(null)}
          onConfirm={() => setModal(null)}
        />
      )}
      {modal === "submit" && (
        <ConfirmModal
          title="저장 확인"
          description="작성한 내용을 제출할까요? 제출하면 다시 수정할 수 없어요."
          confirmLabel="제출하기"
          onClose={() => setModal(null)}
          onConfirm={confirmSubmit}
        />
      )}
      {modal === "feedback" && workbook.feedback && (
        <FeedbackModal
          workbook={workbook}
          onClose={() => {
            setModal(null)
            if (!runtime.feedbackSeen) persist({ feedbackSeen: true })
          }}
        />
      )}

      {view !== "write" && view !== "rewrite" && (
        <button
          type="button"
          onClick={() => router.push("/student/exploration-record")}
          className="fixed bottom-6 left-7 z-20 grid size-14 place-items-center rounded-full border-4 border-white bg-white text-[#0797dc] shadow-[0_5px_24px_rgba(0,0,0,.18)]"
          aria-label="탐험 기록으로 돌아가기"
        >
          <span className="text-2xl">⌂</span>
        </button>
      )}
      {toast && <div role="status" className="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[#28333b] px-6 py-3 font-bold text-white shadow-xl">{toast}</div>}
    </div>
  )
}

function SelectionTitle({ title }: { title: string }) {
  return <div className="h-16 border-b border-[#dde4e8] bg-white"><div className="mx-auto flex h-full max-w-[930px] items-center px-1 text-[15px] font-black">{title}</div></div>
}

function WorkbookTopBars({ workbook, template, view, open, onToggle }: { workbook: StudentWorkbook; template: WorkbookTemplate; view: ViewMode; open: boolean; onToggle: () => void }) {
  const isResult = view === "result"
  const instruction = isResult ? "※ 워크북 활동을 마무리하고, 완성된 글을 확인해 보세요." : template.id === "quiz" ? "※ 안내에 따라 퀴즈를 작성해 보세요." : "※ 안내에 따라 워크북을 작성해 보세요."
  return (
    <>
      <div className="h-16 border-b border-[#dde4e8] bg-white"><div className="mx-auto flex h-full max-w-[930px] items-center gap-3 text-[15px] font-black"><span>{isResult ? "온라인 워크북" : workbook.bookTitle}</span><ChevronRight className="size-4 fill-[#59636a]" /><span className="font-medium">{isResult ? "나의 글 완성!" : template.title}</span></div></div>
      <div className="border-b border-[#dde4e8] bg-white"><div className="mx-auto flex min-h-16 max-w-[930px] items-center justify-between"><p className="text-[15px]">{instruction}</p><button type="button" onClick={onToggle} className="grid size-9 place-items-center rounded-lg bg-[#e9eef1] text-[#168fd2]" aria-label="안내 열기/닫기">{open ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}</button></div>{!open && <div className="h-0" />}</div>
    </>
  )
}

function SelectionScreen({ workbook, template, selectedId, onSelect, onPreview, onStart }: { workbook: StudentWorkbook; template: WorkbookTemplate; selectedId: string; onSelect: (id: string) => void; onPreview: () => void; onStart: () => void }) {
  return (
    <main className="mx-auto grid max-w-[930px] gap-6 px-0 py-10 lg:grid-cols-[240px_1fr]">
      <BookPanel workbook={workbook} />
      <div className="space-y-4">
        <section className="min-h-[200px] rounded-xl bg-[#2f9de0] px-8 py-7 text-white">
          <h1 className="flex items-center gap-1 text-[25px] font-black">{template.title}{template.recommended && <BadgeCheck className="size-8 fill-[#ffad28] stroke-[#ffd45b]" />}</h1>
          <p className="mt-1 text-[15px] leading-6">{template.description}</p>
          <p className="mt-2 text-[15px]">총 {template.questions.length}개 질문 항목</p>
          <div className="mt-3 flex gap-2"><button type="button" onClick={onPreview} className="rounded-lg border border-white px-4 py-2.5 font-black">미리 보기</button><button type="button" onClick={onStart} className="rounded-lg bg-white px-5 py-2.5 font-black text-[#147fbd]">시작하기</button></div>
        </section>
        <section className="rounded-xl border-2 border-[#e1e7ea] bg-[#f9fbfc] p-6">
          <p className="mb-5 text-[14px] text-[#667078]">※ 작성할 워크북을 선택해 주세요. 한 번 선택한 워크북은 변경할 수 없습니다.</p>
          <ul className="grid grid-cols-3 gap-4">
            {workbook.templates.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onSelect(item.id)} className={cn("relative flex h-[140px] w-full flex-col overflow-hidden rounded-xl border-2 p-4 text-left transition", selectedId === item.id ? "border-[#239cde] bg-[#cce8f8] text-[#198ed0]" : "border-[#e0e6e9] bg-[#fbfcfd] text-[#4b5359]") }>
                  {item.recommended && <BadgeCheck className="absolute -right-1 -top-2 size-8 fill-[#ffad28] stroke-[#ffd45b]" />}
                  <strong className="pr-2 text-[20px] leading-7">{item.title}</strong>
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

function BookPanel({ workbook }: { workbook: StudentWorkbook }) {
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

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-[#69737a]">{label}</dt><dd className="mt-1 text-[16px] font-black leading-6">{value}</dd></div>
}

function WritingScreen({ template, answers, questionIndex, setQuestionIndex, setAnswers, dirty, onPrevious, onNext, onSave, onSwitch }: { template: WorkbookTemplate; answers: string[]; questionIndex: number; setQuestionIndex: (value: number) => void; setAnswers: React.Dispatch<React.SetStateAction<string[]>>; dirty: boolean; onPrevious: () => void; onNext: () => void; onSave: () => void; onSwitch: () => void }) {
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

function QuestionSteps({ questions, current, onSelect }: { questions: WorkbookTemplate["questions"]; current: number; onSelect: (index: number) => void }) {
  return <div className="flex gap-2">{questions.map((_, index) => <button type="button" key={index} onClick={() => onSelect(index)} className={cn("grid size-8 cursor-pointer place-items-center rounded-full bg-[#e7ecef] text-[16px] font-black text-[#90999f]", index === current && "bg-[#087fc8] text-white")}>{index + 1}</button>)}</div>
}

function Editor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="mt-2 overflow-hidden border border-[#cbd4d9] bg-white">
      <div className="flex h-10 items-center gap-1 border-b border-[#d5dde1] bg-[#f7f9fa] px-3 text-[#48545e]">
        <ToolbarButton label="굵게"><Bold className="size-4" /></ToolbarButton><ToolbarButton label="기울임"><Italic className="size-4" /></ToolbarButton><ToolbarButton label="밑줄"><Underline className="size-4" /></ToolbarButton><ToolbarButton label="취소선"><Strikethrough className="size-4" /></ToolbarButton><ToolbarButton label="정렬"><AlignLeft className="size-4" /></ToolbarButton><ToolbarButton label="이미지 삽입"><ImagePlus className="size-4" /></ToolbarButton>
      </div>
      <textarea aria-label="워크북 답변" value={value} onChange={(event) => onChange(event.target.value)} placeholder="여기에 답변을 작성해주세요." className="min-h-[245px] w-full resize-y px-4 py-3 text-[15px] leading-7 outline-none placeholder:italic placeholder:text-[#8b9297]" />
    </div>
  )
}

function ToolbarButton({ label, children }: { label: string; children: React.ReactNode }) {
  return <button type="button" aria-label={label} className="grid size-8 place-items-center rounded hover:bg-white">{children}</button>
}

function WritingFooter({ questionIndex, dirty, onPrevious, onNext, onSave, onSwitch }: { questionIndex: number; dirty: boolean; onPrevious: () => void; onNext: () => void; onSave: () => void; onSwitch: () => void }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 h-[68px] bg-[#4a5e77]">
      <div className="mx-auto flex h-full max-w-[930px] items-center justify-between">
        <div className="flex gap-2"><button type="button" disabled={questionIndex === 0} onClick={onPrevious} className="flex h-11 items-center gap-2 rounded bg-[#34475f] px-5 font-black text-white disabled:opacity-45"><ArrowLeft className="size-4" />이전</button><button type="button" className="flex h-11 items-center gap-2 rounded bg-[#4cc9b8] px-5 font-black text-white"><Smartphone className="size-4" />전자책 보기</button><button type="button" onClick={onSwitch} className="flex h-11 items-center gap-2 rounded bg-[#fa5e8d] px-5 font-black text-white"><RefreshCw className="size-4" />워크북 교체</button></div>
        <div className="flex gap-2"><button type="button" disabled={!dirty} onClick={onSave} className="flex h-11 items-center gap-2 rounded bg-[#8f86ef] px-5 font-black text-white disabled:opacity-60"><Save className="size-4" />저장하기</button><button type="button" onClick={onNext} className="flex h-11 items-center gap-2 rounded bg-[#249ce0] px-7 font-black text-white">다음<ArrowRight className="size-4" /></button></div>
      </div>
    </footer>
  )
}

function RewriteScreen({ template, answers, setAnswers, dirty, onPrevious, onSave, onSubmit }: { template: WorkbookTemplate; answers: string[]; setAnswers: React.Dispatch<React.SetStateAction<string[]>>; dirty: boolean; onPrevious: () => void; onSave: () => void; onSubmit: () => void }) {
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

function ResultScreen({ workbook, template, answers, hasFeedback, onFeedback }: { workbook: StudentWorkbook; template: WorkbookTemplate; answers: string[]; hasFeedback: boolean; onFeedback: () => void }) {
  return (
    <main className="mx-auto grid max-w-[930px] gap-6 py-10 lg:grid-cols-[240px_1fr]">
      <BookPanel workbook={workbook} />
      <div>
        <section className="rounded-xl border border-[#dce3e7] bg-white px-8 py-6">
          <h1 className="text-[28px] font-black">{template.title}</h1>
          <div className="mt-4 space-y-6">{template.questions.map((question, index) => <div key={question.title}><h2 className="text-[16px] font-black">{index + 1}.{question.title}</h2><p className="mt-2 whitespace-pre-wrap border-b-2 border-dotted border-[#d9e1e5] pb-2 text-[16px] leading-7">{answers[index] || "작성한 내용이 없습니다."}</p></div>)}</div>
        </section>
        {hasFeedback && <div className="mt-2 flex justify-center"><button type="button" onClick={onFeedback} className="flex items-center gap-2 rounded-lg bg-[#fa5d91] px-6 py-3 font-black text-white"><MessageCircle className="size-4" />피드백 보기</button></div>}
      </div>
    </main>
  )
}

function ModalShell({ children, width = "560px" }: { children: React.ReactNode; width?: string }) {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4"><section role="dialog" aria-modal="true" style={{ width }} className="max-h-[90vh] max-w-full overflow-auto rounded-[22px] bg-white shadow-2xl">{children}</section></div>
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return <header className="relative border-b-2 border-dashed border-[#dde1e3] px-5 py-3 text-center"><h2 className="text-[24px] font-black">{title}</h2>{subtitle && <p className="mt-0.5 text-[14px] text-[#269bdc]">{subtitle}</p>}<button type="button" onClick={onClose} aria-label="닫기" className="absolute right-4 top-4 text-[#444b50]"><X className="size-7" /></button></header>
}

function StartConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return <ModalShell><ModalHeader title="워크북 선택 확인" onClose={onClose} /><div className="grid min-h-[205px] place-items-center px-7 text-center text-[20px] leading-8"><p>이 워크북으로 시작할까요?<br /><strong className="font-medium">고쳐쓰기 전까지는 다른 워크북으로 바꿀 수 있어요.</strong></p></div><YellowFooter><button type="button" onClick={onClose}>취소</button><button type="button" onClick={onConfirm}>시작하기</button></YellowFooter></ModalShell>
}

function OutlineModal({ template, onClose, onStart }: { template: WorkbookTemplate; onClose: () => void; onStart: () => void }) {
  return <ModalShell><ModalHeader title={template.title} onClose={onClose} /><div className="px-6 pb-5 pt-4"><p className="text-center text-[18px]">워크북에서 작성할 내용을 미리 확인해 보세요.</p><ol className="mt-4 space-y-3 rounded-lg border-2 border-[#e2e7ea] bg-[#f9fbfc] p-5">{template.questions.map((question, index) => <li key={question.title} className="flex items-center gap-3 text-[17px]"><span className="grid size-6 place-items-center rounded-full bg-[#e7ecef] text-sm font-black text-[#8c969c]">{index + 1}</span>{question.title}</li>)}</ol></div><YellowFooter single><button type="button" onClick={onStart}>작성 시작</button></YellowFooter></ModalShell>
}

function PreviewModal({ template, onClose }: { template: WorkbookTemplate; onClose: () => void }) {
  const [index, setIndex] = React.useState(0)
  const question = template.questions[index]
  return <ModalShell width="810px"><ModalHeader title={template.title} subtitle="이 워크북은 미리보기 전용입니다. 작성은 선택 후 시작할 수 있어요." onClose={onClose} /><div className="px-4 py-4"><div className="flex items-center justify-between"><h3 className="flex items-center gap-3 text-[19px] font-black"><span className="grid size-8 place-items-center rounded-full bg-[#087fc8] text-white">{index + 1}</span>{question.title}</h3><QuestionSteps questions={template.questions} current={index} onSelect={setIndex} /></div><p className="mt-3 text-[15px] leading-6">{question.description}</p>{question.example && <div className="mt-3 rounded-lg border border-[#dfd9ca] bg-[#f8f5ec] px-4 py-4 text-[14px] leading-6"><strong className="mr-2">예시</strong>{question.example}</div>}<div className="pointer-events-none opacity-90"><Editor value="" onChange={() => undefined} /></div><p className="mt-2 text-center text-[#2a9fdf]">미리보기 모드에서는 입력이 비활성화되어 있습니다.</p></div></ModalShell>
}

function ConfirmModal({ title, description, cancelLabel = "취소", confirmLabel, single = false, onClose, onCancel = onClose, onConfirm }: { title: string; description: React.ReactNode; cancelLabel?: string; confirmLabel: string; single?: boolean; onClose: () => void; onCancel?: () => void; onConfirm: () => void }) {
  return <ModalShell><ModalHeader title={title} onClose={onClose} /><div className="grid min-h-[190px] place-items-center px-7 text-center text-[19px] leading-8"><p>{description}</p></div><YellowFooter single={single}>{!single && <button type="button" onClick={onCancel}>{cancelLabel}</button>}<button type="button" onClick={onConfirm}>{confirmLabel}</button></YellowFooter></ModalShell>
}

function YellowFooter({ children, single = false }: { children: React.ReactNode; single?: boolean }) {
  return <footer className={cn("grid h-16 bg-[#ffd924] text-[20px] font-black [&>button+button]:border-l [&>button+button]:border-[#e8be15]", single ? "grid-cols-1" : "grid-cols-2")}>{children}</footer>
}

function FeedbackModal({ workbook, onClose }: { workbook: StudentWorkbook; onClose: () => void }) {
  const feedback = workbook.feedback
  if (!feedback) return null
  return <ModalShell><ModalHeader title="선생님의 피드백이 도착했어요!" onClose={onClose} /><div className="p-4"><section className="rounded-lg bg-[#f7f7f7] px-6 py-4 text-center"><h3 className="text-[21px] font-black">섬초롱꽃을 받았어요!</h3><p className="mt-2 text-[16px] leading-6">선생님이 온라인 워크북 피드백 보상으로<br />섬초롱꽃 {feedback.reward}개를 보내주셨어요.</p><div className="mt-2 flex items-center justify-center"><Image src="/student-assets/flower-reward.svg" alt="섬초롱꽃" width={58} height={58} /><strong className="-ml-2 rounded-full bg-[#082a52] px-2 py-1 text-[20px] text-white">+ {feedback.reward}</strong></div></section><section className="mt-4 rounded-lg border border-[#ddd7c8] bg-[#faf8f0] px-7 py-5"><p className="text-[16px] leading-7">{feedback.content}</p><p className="mt-3 text-right text-[15px] text-[#1599df]">{feedback.date}</p></section></div><YellowFooter single><button type="button" onClick={onClose}>닫기</button></YellowFooter></ModalShell>
}

function NotFound() {
  return <div className="grid min-h-screen place-items-center bg-[#f5f7f9]"><div className="text-center"><BookOpen className="mx-auto size-12 text-[#188fd0]" /><h1 className="mt-4 text-xl font-black">워크북을 찾을 수 없습니다.</h1><Link href="/student/exploration-record" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#239cdf] px-5 py-3 font-black text-white"><ChevronLeft className="size-4" />탐험 기록으로 돌아가기</Link></div></div>
}
