"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Bot, CheckCircle2, Flower2, RotateCcw,
  Pencil, Save, Send, Sparkles, Undo2, X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  AGENCY_ONLINE_WORKBOOKS,
  getAgencyWorkbookAsync,
  rejectAgencyWorkbook,
  upsertStudentSubmittedAgencyWorkbook,
  type FeedbackStatus,
  type OnlineWorkbook,
} from "@/lib/online-workbooks"

const fallbackQuestions = [
  {
    title: "1. 핵심 용어 정리",
    prompt: "책에서 중요하다고 생각한 낱말이나 핵심 용어를 정리해 보세요.",
    tip: "용어의 뜻을 책의 내용과 연결해 간단히 설명해 보세요.",
    example: "예) 생태계: 생물과 환경이 서로 영향을 주고받는 관계",
    answer: "ㄴㄻㄴㄹㄴㅇㄹ",
  },
  {
    title: "2. 정보 정리",
    prompt: "책에서 알게 된 정보를 순서대로 정리해 보세요.",
    tip: "누가, 언제, 어디서, 무엇을, 어떻게 했는지 떠올려 보세요.",
    example: "예) 주인공은 숲에서 여러 동물의 생활 방식을 관찰했습니다.",
    answer: "",
  },
  {
    title: "3. 새롭게 알게 된 점",
    prompt: "책을 읽고 새롭게 알게 된 내용을 적어 보세요.",
    tip: "읽기 전에는 몰랐지만 책을 통해 알게 된 점을 써 보세요.",
    example: "예) 이름에는 지역의 환경과 사람들의 생활 모습이 담기기도 합니다.",
    answer: "",
  },
  {
    title: "4. 더 탐구하고 싶은 점",
    prompt: "책의 내용과 관련해 더 알아보고 싶은 점을 적어 보세요.",
    tip: "궁금한 내용을 질문 문장으로 만들어 보세요.",
    example: "예) 다른 지역에서는 같은 대상을 어떤 이름으로 부를까요?",
    answer: "",
  },
]

const flowerCriteria = [
  { amount: 5, medal: "🥉", description: "작성 내용이 단순하고, 구체적인 감상 표현이 부족한 글" },
  { amount: 10, medal: "🥈", description: "독서록 양식에 따라 충실히 작성했으나, 의견이나 생각이 부족한 글" },
  { amount: 15, medal: "🥇", description: "인상 깊은 내용을 구체적으로 쓰고, 경험이나 생각과 연결해 감상을 풍부하게 적은 글" },
  { amount: 20, medal: "🏆", description: "깊이 있는 분석, 창의적 해석과 독창적인 표현이 돋보이는 글" },
]

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-lg font-black text-slate-900">{title}</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기"><X className="size-4" /></Button></div>
        {children}
      </div>
    </div>
  )
}

function AiAlertModal({ title, children, onClose, onConfirm, cancelable = false }: { title: string; children: React.ReactNode; onClose: () => void; onConfirm: () => void; cancelable?: boolean }) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/45 p-4">
      <div role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-[520px] rounded-2xl bg-white px-7 py-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-amber-400 text-sm font-black text-white">!</span>
          <div className="min-w-0 flex-1"><h2 className="text-xl font-bold text-slate-700">{title}</h2><div className="mt-4 text-[15px] leading-7 text-slate-600">{children}</div></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">{cancelable && <Button variant="outline" onClick={onClose}>취소</Button>}<Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">확인</Button></div>
      </div>
    </div>
  )
}

type FeedbackQuestion = { title: string; description?: string; answer: string }

function buildItemFeedback(record: OnlineWorkbook, questions: FeedbackQuestion[]) {
  const details = questions.map((question, index) => {
    const title = question.title.replace(/^\d+\.\s*/, "")
    const evaluation = question.answer.trim()
      ? `🌟 ${title}에 대한 생각을 자신의 말로 구체적으로 적은 점이 좋아요.`
      : `🔧 ${question.description || `${title}에 관한 생각을 책의 내용과 연결해 한두 문장으로 적어 보세요.`}`
    return `${index + 1}. ${title}\n${evaluation}`
  }).join("\n\n")

  return `💌선생님의 편지\n\n1. 총평\n『${record.bookTitle}』을 읽고 감상문을 작성했군요. 질문에 맞춰 책의 내용을 떠올리려는 노력이 보여요. 작성하지 못한 부분은 책 속 장면을 다시 살펴보며 조금 더 구체적으로 표현해 보세요.\n\n2. 세부 내용\n${details}`
}

function buildContinuousFeedback(record: OnlineWorkbook, questions: FeedbackQuestion[]) {
  const answeredCount = questions.filter((question) => question.answer.trim()).length
  const completeness = answeredCount === questions.length
    ? "글의 처음부터 끝까지 자신의 생각을 빠짐없이 이어 쓴 점이 좋아요."
    : "비어 있는 부분을 보완해 글의 흐름이 자연스럽게 이어지도록 해 보세요."

  return `💌선생님의 편지\n\n1. 총평\n『${record.bookTitle}』을 읽고 자신의 생각을 한 편의 글로 정리했군요. 책에서 기억에 남는 내용을 중심으로 차분하게 글을 이어 가려는 모습이 보여요.\n\n2. 세부 내용\n① 글 전체 수준\n🌟 책의 중심 내용과 자신의 생각을 연결하려고 노력했어요.\n🔧 ${completeness}\n\n② 문단 수준\n🌟 문단마다 말하고 싶은 내용을 구분해 표현했어요.\n🔧 문단의 첫 문장에 중심 생각을 먼저 쓰면 내용이 더 분명해져요.\n\n③ 문장 수준\n🌟 자신의 느낌을 쉬운 문장으로 표현했어요.\n🔧 문장을 다시 읽으며 맞춤법과 문장 연결을 한 번 더 확인해 보세요.`
}

export function WorkbookDetail({ id }: { id: string }) {
  const router = useRouter()
  const [record, setRecord] = React.useState(() => AGENCY_ONLINE_WORKBOOKS.find((item) => item.id === id) ?? AGENCY_ONLINE_WORKBOOKS[0])
  const questions: FeedbackQuestion[] = record.questions?.length
    ? record.questions
    : fallbackQuestions.map((question) => ({ title: question.title, description: question.prompt, answer: question.answer }))
  const displayMode = record.displayMode ?? (record.templateName.includes("통합형") || record.templateName.includes("인물 독서록") ? "continuous" : "items")
  const [feedback, setFeedback] = React.useState(record.feedbackText ?? "")
  const [aiUsed, setAiUsed] = React.useState(record.aiUsed)
  const [status, setStatus] = React.useState<FeedbackStatus>(record.status)
  const [parentSent, setParentSent] = React.useState(record.parentSent)
  const [flowerAmount, setFlowerAmount] = React.useState(record.flowers)
  const [selectedFlower, setSelectedFlower] = React.useState<number | null>(null)
  const [saved, setSaved] = React.useState(record.status !== "작성전")
  const [modal, setModal] = React.useState<"reject" | "flower" | "parent" | "aiOverwrite" | "aiUnavailable" | null>(null)
  const [notice, setNotice] = React.useState("")

  React.useEffect(() => {
    let active = true
    void getAgencyWorkbookAsync(id).then((nextRecord) => {
      if (!active) return
      setRecord(nextRecord)
      setFeedback(nextRecord.feedbackText ?? "")
      setAiUsed(nextRecord.aiUsed)
      setStatus(nextRecord.status)
      setParentSent(nextRecord.parentSent)
      setFlowerAmount(nextRecord.flowers)
      setSelectedFlower(null)
      setSaved(nextRecord.status !== "작성전")
    })
    return () => { active = false }
  }, [id])

  React.useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(""), 2200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const feedbackValid = feedback.trim().length >= 10
  const statusLabel = status === "작성전" ? "피드백 작성전" : status === "작성완료" ? "피드백 작성완료" : "피드백 전송 완료"
  const feedbackLocked = status === "전송완료"
  const parentContactRegistered = record.parentContactRegistered !== false

  const persistRecord = (nextRecord: OnlineWorkbook) => {
    setRecord(nextRecord)
    void upsertStudentSubmittedAgencyWorkbook(nextRecord)
  }

  const generateSampleFeedback = () => {
    const nextAiUsed = Math.min(2, aiUsed + 1)
    const nextRecord = { ...record, aiUsed: nextAiUsed }
    setAiUsed(nextAiUsed)
    setRecord(nextRecord)
    setFeedback(displayMode === "continuous" ? buildContinuousFeedback(record, questions) : buildItemFeedback(record, questions))
    setSaved(false)
    setModal(null)
    setNotice("AI 피드백이 생성되었습니다. 내용을 확인하고 수정한 뒤 저장해 주세요.")
    void upsertStudentSubmittedAgencyWorkbook(nextRecord)
  }

  const handleAiFeedback = () => {
    if (aiUsed >= 2) {
      setModal("aiUnavailable")
      return
    }
    if (aiUsed === 1) {
      setModal("aiOverwrite")
      return
    }
    generateSampleFeedback()
  }

  const saveFeedback = () => {
    if (!feedbackValid || feedbackLocked) return
    const feedbackDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date())
    persistRecord({ ...record, feedbackText: feedback, feedbackAt: feedbackDate, status: "작성완료" })
    setSaved(true)
    setStatus("작성완료")
    setNotice("피드백이 저장되었습니다.")
  }

  const sendFeedback = () => {
    if (status !== "작성완료" || !saved) return
    persistRecord({ ...record, feedbackText: feedback, status: "전송완료" })
    setStatus("전송완료")
    setNotice("학생에게 피드백을 전송했습니다.")
  }

  const confirmParentSend = () => {
    if (status !== "전송완료" || parentSent || !parentContactRegistered) return
    persistRecord({ ...record, parentSent: true })
    setParentSent(true)
    setNotice("학부모 발송을 완료했습니다.")
    setModal(null)
  }

  const confirmFlower = () => {
    if (!selectedFlower || flowerAmount > 0) return
    persistRecord({ ...record, flowers: selectedFlower })
    setFlowerAmount(selectedFlower)
    setNotice(`섬초롱꽃 ${selectedFlower}개가 지급되었습니다.`)
    setSelectedFlower(null)
    setModal(null)
  }

  const confirmReject = () => {
    if (status !== "작성전") return
    setModal(null)
    void rejectAgencyWorkbook(record).then(() => router.push("/agency/online-workbooks"))
  }

  return (
    <div className="w-full space-y-4 pb-28">
      <section className="bg-white px-4 pb-4 pt-5">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" asChild className="-ml-1 -mt-1 text-blue-600"><Link href="/agency/online-workbooks" aria-label="목록으로 돌아가기"><ArrowLeft className="size-5" /></Link></Button>
          <div><h1 className="text-2xl font-semibold text-slate-800">온라인 워크북 피드백</h1><p className="mt-4 text-sm text-slate-500">학생이 제출한 워크북을 확인하고 피드백을 작성하세요.</p></div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-[10px] border border-slate-200">
          <table className="w-full table-fixed text-xs 2xl:text-sm">
            <thead className="bg-[#fafafa] text-left text-slate-600"><tr>{["학생명", "도서명(레벨)", "전자책", "길라잡이", "학생 제출일", "피드백 상태", "학부모 발송 여부", "섬초롱꽃"].map((label) => <th key={label} className="border-r border-slate-200 px-3 py-3 font-semibold last:border-r-0">{label}</th>)}</tr></thead>
            <tbody><tr className="border-t border-slate-200"><td className="border-r border-slate-200 px-3 py-3">{record.studentName}</td><td className="border-r border-slate-200 px-3 py-3">{record.bookTitle} ({record.level}레벨)</td><td className="border-r border-slate-200 px-3 py-3 text-center">▣</td><td className="border-r border-slate-200 px-3 py-3 text-center"><span className="inline-grid size-6 place-items-center rounded-full bg-blue-500 font-semibold text-white">1</span></td><td className="border-r border-slate-200 px-3 py-3">{record.submittedAt}</td><td className="border-r border-slate-200 px-3 py-3"><Badge className="bg-slate-500 font-normal hover:bg-slate-500">{statusLabel}</Badge></td><td className="border-r border-slate-200 px-3 py-3"><Badge className="bg-slate-500 font-normal hover:bg-slate-500">{parentSent ? "발송완료" : "미발송"}</Badge></td><td className="px-3 py-3">{flowerAmount ? `${flowerAmount}개` : "-"}</td></tr></tbody>
          </table>
        </div>
      </section>

      {notice && <div role="status" className="fixed bottom-6 right-6 z-[120] flex max-w-md items-center gap-2 rounded-lg bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-xl"><Sparkles className="size-4" />{notice}</div>}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-normal text-slate-600">학생 작성 워크북</h2><span className="text-sm text-slate-500">보기모드: {displayMode === "continuous" ? "이어보기" : "항목별보기"}</span></div>
          <h3 className="mb-6 text-center text-xl font-semibold text-slate-800">{record.templateName}</h3>
          <div className="space-y-7">
            {questions.map((question) => <section key={question.title}>
              <h4 className="font-semibold text-slate-700">{question.title}</h4>
              <div className={cn("mt-3 min-h-14 bg-slate-50 px-4 py-4 text-sm leading-6", question.answer ? "text-slate-700" : "text-slate-500")}>
                {question.answer || "작성된 내용이 없습니다."}
              </div>
            </section>)}
          </div>
        </Card>

        <Card className="h-fit gap-0 border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-20">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Pencil className="size-5 text-slate-600" /><h2 className="text-xl font-semibold text-slate-800">피드백 작성</h2></div><Button onClick={handleAiFeedback} className="gap-2 bg-violet-600 hover:bg-violet-700"><Bot className="size-4" />AI 자동 작성</Button></div>
          <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500"><p>학생에게 전달할 피드백을 작성해주세요. (최소 10자 이상)</p><p>AI 자동 작성 기능은 워크북당 최대 2회까지 사용 가능합니다.</p><p>AI는 실수를 할 수 있으니 반드시 확인 후 직접 첨삭해 주세요.</p><p>AI 자동 작성은 생성만으로 횟수가 차감되며, 저장하지 않고 나가면 기록이 남지 않습니다.</p></div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200"><div className="flex gap-1 border-b border-slate-200 bg-slate-50 p-2"><Button variant="ghost" size="sm" disabled={feedbackLocked} className="font-black">B</Button><Button variant="ghost" size="sm" disabled={feedbackLocked} className="italic">I</Button><Button variant="ghost" size="sm" disabled={feedbackLocked} className="underline">U</Button></div><Textarea value={feedback} readOnly={feedbackLocked} onChange={(event) => { setFeedback(event.target.value); setSaved(false) }} placeholder="학생에게 전달할 피드백을 작성해주세요..." className={cn("min-h-72 resize-y rounded-none border-0 shadow-none focus-visible:ring-0", feedbackLocked && "cursor-default bg-slate-50 text-slate-600")} /></div>
          <div className="mt-2 flex justify-between text-xs"><span className={feedbackValid ? "text-emerald-600" : "text-rose-500"}>{feedback.length}/10자 이상 입력</span><span className="text-slate-400">AI 사용 {aiUsed}/2회</span></div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/agency/online-workbooks")} className="gap-2 border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"><RotateCcw className="size-4" />취소</Button>
            {status === "작성전" && <Button variant="outline" onClick={() => setModal("reject")} className="gap-2 border-rose-300 bg-white text-rose-600 shadow-sm hover:bg-rose-50"><Undo2 className="size-4" />학생 반려</Button>}
            <Button variant="outline" onClick={() => { setSelectedFlower(null); setModal("flower") }} disabled={flowerAmount > 0} className="gap-2 border-amber-300 bg-white text-amber-700 shadow-sm hover:bg-amber-50 disabled:border-slate-200 disabled:text-slate-400"><Flower2 className="size-4" />섬초롱꽃 지급</Button>
            <Button onClick={saveFeedback} disabled={!feedbackValid || saved || feedbackLocked} className="gap-2 bg-slate-700 text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-400"><Save className="size-4" />저장</Button>
            <Button onClick={sendFeedback} disabled={!saved || status !== "작성완료"} className="gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:bg-[#8ba7ef]"><Send className="size-4" />피드백 전송</Button>
            <Button onClick={() => setModal("parent")} disabled={status !== "전송완료" || parentSent || !parentContactRegistered} className="gap-2 bg-[#79cfba] text-white shadow-sm hover:bg-[#65bea9] disabled:bg-[#8fd6c5]"><CheckCircle2 className="size-4" />학부모 발송</Button>
          </div>
        </Card>
      </div>

      {modal === "aiOverwrite" && <AiAlertModal title="AI 자동 작성" onClose={() => setModal(null)} onConfirm={generateSampleFeedback} cancelable><p>기존 작성된 내용을 새로 작성된 내용으로 덮어쓰시겠습니까? (남은 횟수: 1회)</p><p>※ 확인을 누르면 이전 내용은 되돌릴 수 없습니다. 필요하면 별도로 저장해 두세요.</p><p>AI 자동 작성은 생성만으로 횟수가 차감되며, 저장하지 않고 나가면 기록이 남지 않습니다.</p></AiAlertModal>}

      {modal === "aiUnavailable" && <AiAlertModal title="AI 자동 작성 불가" onClose={() => setModal(null)} onConfirm={() => setModal(null)}><p>AI 자동 작성 기능은 워크북당 최대 2회까지만 이용할 수 있습니다.</p><p>AI 자동 작성은 생성만으로 횟수가 차감되며, 저장하지 않고 나가면 기록이 남지 않습니다.</p></AiAlertModal>}

      {modal === "reject" && <Modal title="학생 워크북 반려" onClose={() => setModal(null)}><p className="text-sm leading-6 text-slate-600">반려 처리 시 제출 내용이 사라집니다. 학생이 제출한 워크북은 목록에서 사라지고, 학생은 다시 작성 가능한 상태로 돌아갑니다. 계속 진행하시겠어요?</p><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>취소</Button><Button variant="destructive" onClick={confirmReject}>반려하기</Button></div></Modal>}

      {modal === "flower" && <Modal title="섬초롱꽃을 지급할까요?" onClose={() => setModal(null)}><p className="text-sm text-slate-600">지급된 섬초롱꽃은 되돌릴 수 없습니다. 지급 개수를 확인해 주세요.</p><p className="mt-5 text-sm font-black text-slate-800">지급 개수</p><div className="mt-3 grid grid-cols-2 gap-2">{flowerCriteria.map((item) => <button key={item.amount} type="button" role="radio" aria-checked={selectedFlower === item.amount} onClick={() => setSelectedFlower(item.amount)} className={cn("rounded-lg border px-4 py-3 text-center transition-colors", selectedFlower === item.amount ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300")}><span className="font-semibold">🌻　{item.amount}개</span></button>)}</div><div className="mt-5 space-y-2 rounded-xl bg-[#eef6ff] p-4"><p className="text-sm font-black text-slate-800">권장 기준 안내</p>{flowerCriteria.map((item) => <p key={item.amount} className="text-xs leading-5 text-slate-600">{item.medal} <strong>{item.amount}개:</strong> {item.description}</p>)}</div><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>취소</Button><Button disabled={!selectedFlower} onClick={confirmFlower} className="bg-blue-600 hover:bg-blue-700">확인</Button></div></Modal>}

      {modal === "parent" && <AiAlertModal title="학부모 발송" onClose={() => setModal(null)} onConfirm={confirmParentSend} cancelable><p>{record.studentName} 학부모에게 발송하시겠습니까?</p></AiAlertModal>}
    </div>
  )
}
