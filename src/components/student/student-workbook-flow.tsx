"use client"

import { useRouter } from "next/navigation"
import * as React from "react"
import { ArrowLeft } from "lucide-react"
import { SelectionTitle, WorkbookTopBars, SelectionScreen, WritingScreen, RewriteScreen, ResultScreen, PreviewModal, StartConfirmModal, OutlineModal, ConfirmModal, NotFound } from "./student-workbook-ui"

import { StudentHeader } from "@/components/student/student-header"
import { StudentReviewFlow } from "@/components/student/student-review-flow"
import { readReviews } from "@/lib/review-client"
import {
  getStudentAgencyWorkbookRecordId,
  syncStudentSubmittedAgencyWorkbooks,
  upsertStudentSubmittedAgencyWorkbook,
} from "@/lib/online-workbooks"
import {
  getWorkbookById,
  getWorkbookForReview,
  getWorkbookRuntime,
  saveWorkbookRuntime,
  type WorkbookRuntimeState,
} from "@/lib/student-workbooks"

type ViewMode = "select" | "write" | "rewrite" | "result"
type ModalMode = "preview" | "start" | "outline" | "switch" | "save" | "content-review" | "content-empty" | "submit" | "feedback" | null

export function StudentWorkbookFlow({ id }: { id: string }) {
  const [modern, setModern] = React.useState<boolean | null>(null)
  const [resolvedWorkbook, setResolvedWorkbook] = React.useState<ReturnType<typeof getWorkbookById>>()
  const workbook = getWorkbookById(id) ?? resolvedWorkbook
  React.useEffect(() => {
    let active = true
    void readReviews().then(db => {
      if (!active) return
      const common = db.reviews.find(r => r.sourceWorkbookId === id)
      if (common && !workbook) setResolvedWorkbook(getWorkbookForReview(common))
      setModern(!!common || (!!workbook && getWorkbookRuntime(workbook).status === "before"))
    }).catch(() => { if (active) setModern(!!workbook && getWorkbookRuntime(workbook).status === "before") })
    return () => { active = false }
  }, [id, workbook])
  if (modern === null) return <p className="p-8">온라인 독후감 불러오는 중…</p>
  return modern && workbook ? <StudentReviewFlow workbook={workbook} /> : <LegacyStudentWorkbookFlow id={id} />
}

function LegacyStudentWorkbookFlow({ id }: { id: string }) {
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
  if (!runtime) return <div className="min-h-screen bg-[#f5f7f9]"><StudentHeader section="온라인 독후감" /></div>

  const template = workbook.templates.find((item) => item.id === selectedId) ?? workbook.templates[0]
  const dirty = answers.join("\n") !== savedAnswers.join("\n")
  const goToList = () => router.push(`/student/exploration-record?tab=workbook&month=${workbook.year}-${String(workbook.month).padStart(2, "0")}`)
  const listAction = <button type="button" onClick={goToList} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#147fbd] hover:underline focus-visible:outline-2 focus-visible:outline-[#249ce0]"><ArrowLeft aria-hidden="true" className="size-4" />온라인 독후감 목록</button>

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

  const toggleFeedback = () => {
    const opening = modal !== "feedback"
    setModal(opening ? "feedback" : null)
    if (opening && !runtime.feedbackSeen) persist({ feedbackSeen: true })
  }

  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#202326] [&_button:not(:disabled)]:cursor-pointer">
      <StudentHeader section="온라인 독후감" />
      {view === "select" ? (
        <SelectionTitle title={workbook.bookTitle} />
      ) : (
        <WorkbookTopBars
          workbook={workbook}
          template={template}
          view={view}
          open={guideOpen}
          onToggle={() => setGuideOpen((current) => !current)}
          documentLabel="온라인 독후감"
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
          listAction={listAction}
          workbook={workbook}
          template={template}
          answers={answers}
          hasFeedback={runtime.status === "feedback"}
          feedbackOpen={modal === "feedback"}
          onFeedback={toggleFeedback}
        />
      )}

      {modal === "preview" && <PreviewModal template={template} onClose={() => setModal(null)} />}
      {modal === "start" && <StartConfirmModal onClose={() => setModal(null)} onConfirm={() => setModal("outline")} />}
      {modal === "outline" && <OutlineModal template={template} onClose={() => setModal(null)} onStart={startWriting} />}
      {modal === "switch" && (
        <ConfirmModal
          title="독후감 교체 확인"
          description={<>작성 중인 독후감을 교체할까요?<br />지금까지 작성한 내용은 모두 삭제됩니다.</>}
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
          description={<>지금까지 작성한 내용을 모두 확인해볼까요?<br />고쳐쓰기 단계로 가면 온라인 독후감을 교체할 수 없어요.</>}
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
