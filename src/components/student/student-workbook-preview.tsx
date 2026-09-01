"use client"

import * as React from "react"
import {
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  Bold,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ImagePlus,
  Italic,
  Strikethrough,
  Underline,
} from "lucide-react"

import { WORKBOOK_TEMPLATES } from "@/lib/workbook-templates"

const ROUND_PREVIEW_TEMPLATE_IDS: Record<number, number> = {
  230: 37,
}

export function StudentWorkbookPreview({ previewId }: { previewId: number }) {
  const templateId = ROUND_PREVIEW_TEMPLATE_IDS[previewId] ?? previewId
  const template = WORKBOOK_TEMPLATES.find((item) => item.id === templateId) ?? WORKBOOK_TEMPLATES[0]
  const [questionIndex, setQuestionIndex] = React.useState(0)
  const [guideOpen, setGuideOpen] = React.useState(true)
  const [answers, setAnswers] = React.useState(() => template.questions.map(() => ""))
  const question = template.questions[questionIndex]
  const writingGuide = template.id === 37
    ? "※ 안내에 따라 퀴즈를 작성해 보세요."
    : "※ 안내에 따라 독서 감상문을 작성해 보세요."

  const moveTo = (index: number) => {
    if (index >= 0 && index < template.questions.length) {
      setQuestionIndex(index)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7f9] pb-24 text-[#202326] [&_button:not(:disabled)]:cursor-pointer">
      <header className="h-16 border-b border-[#dde4e8] bg-white">
        <div className="mx-auto flex h-full max-w-[930px] items-center gap-2 px-4 text-[15px] lg:px-0">
          <ChevronRight className="size-4 fill-[#59636a] text-[#59636a]" />
          <strong className="font-medium">{template.studentTitle}</strong>
        </div>
      </header>

      <section className="border-b border-[#dde4e8] bg-white">
        <div className="mx-auto flex min-h-16 max-w-[930px] items-center justify-between px-4 lg:px-0">
          <p className="text-[15px]">{writingGuide}</p>
          <button
            type="button"
            onClick={() => setGuideOpen((open) => !open)}
            className="grid size-9 place-items-center rounded-lg bg-[#e9eef1] text-[#168fd2]"
            aria-label="안내 열기 또는 닫기"
          >
            {guideOpen ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
          </button>
        </div>
      </section>

      <main className="mx-auto max-w-[930px] px-4 pt-10 lg:px-0">
        <div className="flex items-start justify-between gap-5">
          <h1 className="flex min-w-0 items-center gap-3 text-[21px] font-black">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#087fc8] text-lg text-white">
              {questionIndex + 1}
            </span>
            {question.title}
          </h1>
          <nav className="flex shrink-0 items-center gap-2" aria-label="질문 단계">
            {template.questions.map((item, index) => (
              <button
                type="button"
                key={item.id}
                onClick={() => moveTo(index)}
                aria-label={`${index + 1}번 질문`}
                aria-current={questionIndex === index ? "step" : undefined}
                className={`grid size-9 place-items-center rounded-full text-base font-black transition ${
                  questionIndex === index
                    ? "bg-[#087fc8] text-white"
                    : "bg-[#e7ecef] text-[#a5adb2] hover:bg-[#dbe5ea]"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </nav>
        </div>

        <p className="mt-3 text-[15px] leading-6">{question.description}</p>

        {question.example && (
          <div className="mt-3 whitespace-pre-line rounded-lg border border-[#e2dccb] bg-[#f5f2e9] px-4 py-4 text-[15px] leading-6">
            <strong className="mr-2">예시</strong>
            {question.example}
          </div>
        )}

        <section className="mt-2 overflow-hidden border border-[#cbd4da] bg-white">
          <div className="flex h-11 items-center gap-5 border-b border-[#cbd4da] bg-[#f8fafb] px-4 text-[#475564]">
            <button type="button" aria-label="굵게"><Bold className="size-4" /></button>
            <button type="button" aria-label="기울임"><Italic className="size-4" /></button>
            <button type="button" aria-label="밑줄"><Underline className="size-4" /></button>
            <button type="button" aria-label="취소선"><Strikethrough className="size-4" /></button>
            <button type="button" aria-label="정렬"><AlignLeft className="size-4" /></button>
            <button type="button" aria-label="이미지 첨부"><ImagePlus className="size-4" /></button>
          </div>
          <textarea
            value={answers[questionIndex]}
            onChange={(event) => {
              setAnswers((current) => current.map((answer, index) => (
                index === questionIndex ? event.target.value : answer
              )))
            }}
            className="h-[240px] w-full resize-none bg-white px-4 py-4 text-[15px] leading-6 outline-none placeholder:italic placeholder:text-[#8d969c]"
            placeholder="여기에 답변을 작성해주세요."
            aria-label={`${questionIndex + 1}번 질문 답변`}
          />
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 h-20 bg-[#455b78]">
        <div className="mx-auto flex h-full max-w-[930px] items-center justify-between px-4 lg:px-0">
          <button
            type="button"
            onClick={() => moveTo(questionIndex - 1)}
            disabled={questionIndex === 0}
            className="flex h-11 min-w-32 items-center justify-center gap-2 rounded bg-[#354b68] px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ArrowLeft className="size-4" /> 이전
          </button>
          <button
            type="button"
            onClick={() => moveTo(questionIndex + 1)}
            disabled={questionIndex === template.questions.length - 1}
            className="flex h-11 min-w-32 items-center justify-center gap-2 rounded bg-[#249ddd] px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            다음 <ArrowRight className="size-4" />
          </button>
        </div>
      </footer>
    </div>
  )
}
