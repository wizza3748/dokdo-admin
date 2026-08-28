"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft, Bot, CheckCircle2, Flower2, RotateCcw,
  Pencil, Save, Send, Sparkles, Undo2, X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getAgencyWorkbook, type FeedbackStatus } from "@/lib/online-workbooks"

const questions = [
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

export function WorkbookDetail({ id }: { id: string }) {
  const record = getAgencyWorkbook(id)
  const [feedback, setFeedback] = React.useState("")
  const [aiUsed, setAiUsed] = React.useState(record.aiUsed)
  const [status, setStatus] = React.useState<FeedbackStatus>(record.status)
  const [parentSent, setParentSent] = React.useState(record.parentSent)
  const [flowerAmount, setFlowerAmount] = React.useState(record.flowers)
  const [selectedFlower, setSelectedFlower] = React.useState<number | null>(null)
  const [saved, setSaved] = React.useState(record.status !== "작성전")
  const [modal, setModal] = React.useState<"reject" | "flower" | "send" | "parent" | null>(null)
  const [notice, setNotice] = React.useState("")

  const feedbackValid = feedback.trim().length >= 10
  const statusLabel = status === "작성전" ? "피드백 작성전" : status === "작성완료" ? "피드백 작성완료" : "피드백 전송 완료"

  const generateAiFeedback = () => {
    if (aiUsed >= 2) return
    setAiUsed((current) => current + 1)
    setFeedback("핵심 내용을 차분하게 정리했고, 새롭게 알게 된 점을 자신의 생각과 연결한 부분이 좋습니다. 다음에는 구체적인 예를 한 가지 더 들어 보세요.")
    setSaved(false)
    setNotice("AI 피드백 목업을 생성했습니다. 내용을 확인하고 수정한 뒤 저장해 주세요.")
  }

  const saveFeedback = () => {
    if (!feedbackValid) return
    setSaved(true)
    setStatus("작성완료")
    setNotice("피드백을 목업 상태로 저장했습니다.")
  }

  const confirmAction = () => {
    if (modal === "send") {
      setStatus("전송완료")
      setNotice("학생에게 피드백을 전송한 목업 상태로 변경했습니다.")
    }
    if (modal === "parent") {
      setParentSent(true)
      setNotice("학부모 발송을 완료한 목업 상태로 변경했습니다.")
    }
    setModal(null)
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

      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><Sparkles className="size-4" />{notice}</div>}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-normal text-slate-600">학생 작성 워크북</h2><span className="text-sm text-slate-500">보기모드: 항목별보기</span></div>
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

        <Card className="h-fit border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-20">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Pencil className="size-5 text-slate-600" /><h2 className="text-xl font-semibold text-slate-800">피드백 작성</h2></div><Button onClick={generateAiFeedback} disabled={aiUsed >= 2} className="gap-2 bg-violet-600 hover:bg-violet-700"><Bot className="size-4" />AI 자동 작성</Button></div>
          <div className="mt-5 space-y-1 text-xs leading-5 text-slate-500"><p>학생에게 전달할 피드백을 작성해주세요. (최소 10자 이상)</p><p>AI 자동 작성 기능은 워크북당 최대 2회까지 사용 가능합니다.</p><p>AI는 실수를 할 수 있으니 반드시 확인 후 직접 첨삭해 주세요.</p><p>AI 자동 작성은 생성만으로 횟수가 차감됩니다.</p></div>
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200"><div className="flex gap-1 border-b border-slate-200 bg-slate-50 p-2"><Button variant="ghost" size="sm" className="font-black">B</Button><Button variant="ghost" size="sm" className="italic">I</Button><Button variant="ghost" size="sm" className="underline">U</Button></div><Textarea value={feedback} onChange={(event) => { setFeedback(event.target.value); setSaved(false) }} placeholder="학생에게 전달할 피드백을 작성해주세요..." className="min-h-72 resize-y rounded-none border-0 shadow-none focus-visible:ring-0" /></div>
          <div className="mt-2 flex justify-between text-xs"><span className={feedbackValid ? "text-emerald-600" : "text-rose-500"}>{feedback.length}/10자 이상 입력</span><span className="text-slate-400">AI 사용 {aiUsed}/2회</span></div>
          <div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => { setFeedback(""); setSaved(false); setNotice("") }} className="gap-2"><RotateCcw className="size-4" />취소</Button><Button variant="outline" onClick={() => setModal("reject")} className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50"><Undo2 className="size-4" />학생 반려</Button><Button variant="outline" onClick={() => setModal("flower")} className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"><Flower2 className="size-4" />섬초롱꽃 지급</Button><Button onClick={saveFeedback} disabled={!feedbackValid || saved || status === "전송완료"} className="gap-2"><Save className="size-4" />저장</Button><Button onClick={() => setModal("send")} disabled={!saved || status !== "작성완료"} className="gap-2 bg-blue-600 hover:bg-blue-700"><Send className="size-4" />피드백 전송</Button><Button onClick={() => setModal("parent")} disabled={status !== "전송완료" || parentSent} className="gap-2 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="size-4" />학부모 발송</Button></div>
        </Card>
      </div>

      {modal === "reject" && <Modal title="학생 워크북 반려" onClose={() => setModal(null)}><p className="text-sm leading-6 text-slate-600">반려 처리 시 제출 내용이 사라집니다. 학생이 제출한 워크북은 목록에서 사라지고, 학생은 다시 작성 가능한 상태로 돌아갑니다. 계속 진행하시겠어요?</p><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>취소</Button><Button variant="destructive" onClick={() => { setModal(null); setNotice("학생 워크북을 반려한 목업 상태입니다.") }}>반려하기</Button></div></Modal>}

      {modal === "flower" && <Modal title="섬초롱꽃을 지급할까요?" onClose={() => setModal(null)}><p className="text-sm text-slate-600">지급된 섬초롱꽃은 되돌릴 수 없습니다. 지급 개수를 확인해 주세요.</p><p className="mt-5 text-sm font-black text-slate-800">지급 개수</p><div className="mt-3 grid grid-cols-2 gap-2">{flowerCriteria.map((item) => <button key={item.amount} type="button" role="radio" aria-checked={selectedFlower === item.amount} onClick={() => setSelectedFlower(item.amount)} className={cn("rounded-xl border p-3 text-left transition-colors", selectedFlower === item.amount ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200" : "border-slate-200 hover:bg-slate-50")}><span className="font-black text-slate-800">🌻 {item.amount}개</span></button>)}</div><div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4"><p className="text-sm font-black text-slate-800">권장 기준 안내</p>{flowerCriteria.map((item) => <p key={item.amount} className="text-xs leading-5 text-slate-600">{item.medal} <strong>{item.amount}개:</strong> {item.description}</p>)}</div><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>취소</Button><Button disabled={!selectedFlower} onClick={() => { if (selectedFlower) setFlowerAmount(selectedFlower); setModal(null); setNotice(`섬초롱꽃 ${selectedFlower}개를 지급한 목업 상태입니다.`) }}>확인</Button></div></Modal>}

      {(modal === "send" || modal === "parent") && <Modal title={modal === "send" ? "피드백을 전송할까요?" : "학부모에게 발송할까요?"} onClose={() => setModal(null)}><p className="text-sm leading-6 text-slate-600">현재 작성한 내용을 확인했습니다. 이 작업은 로컬 프로토타입 상태에만 반영됩니다.</p><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>취소</Button><Button onClick={confirmAction}>확인</Button></div></Modal>}
    </div>
  )
}
