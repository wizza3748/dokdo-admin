"use client"

import * as React from "react"
import { reviewWritingMode, type ReviewCommon, type ReviewRecord } from "@/lib/review-domain"
import { WORKBOOK_TEMPLATES } from "@/lib/workbook-templates"
import { ReviewText } from "./review-ui"

export function TeacherStudentWriting({ common, record }: { common: ReviewCommon; record: ReviewRecord }) {
  const [tab, setTab] = React.useState<"final" | "items">("final")
  const prefix = React.useId()
  const configured = WORKBOOK_TEMPLATES.find(t => String(t.id) === common.template.id)
  const continuous = reviewWritingMode(common.template, configured?.rewriteMode) === "continuous"
  const finalBody = record.finalBody || record.body
  const tabs = [{ id: "final", label: "최종 작성 내용" }, { id: "items", label: "질문 항목별 작성 내용" }] as const
  const itemContent = (joined: boolean) => <div className={joined ? "space-y-4" : "space-y-6"}>{common.template.items.map((item, index) => <section key={item.id} className={joined ? "rounded-sm bg-[#f8f9fa] p-4" : undefined}>
    <h4 className="mb-3 text-sm font-normal">{index + 1}. {item.title}</h4>
    <div className={joined ? undefined : "rounded-sm bg-[#f8f9fa] px-4 py-4"}><ReviewText value={record.answers[item.id] || "작성한 내용이 없습니다."} /></div>
  </section>)}</div>

  return <section aria-label="학생 작성 온라인 독후감" className="min-w-0 rounded-lg border border-[#e3e3e3] bg-white p-6 shadow-sm">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm"><h2>학생 작성 온라인 독후감 · {record.round}차</h2><span className="text-[#8c8c8c]">보기모드: {continuous ? "이어보기" : "항목별보기"}</span></div>
    <h3 className="mb-6 text-center text-lg font-semibold">{common.template.title}</h3>
    {continuous ? <>
      <div role="tablist" aria-label="학생 작성 내용 보기" className="mb-8 flex gap-8 border-b border-[#e3e3e3]">
        {tabs.map((entry, index) => <button key={entry.id} id={`${prefix}-${entry.id}-tab`} role="tab" type="button" aria-selected={tab === entry.id} aria-controls={`${prefix}-${entry.id}-panel`} tabIndex={tab === entry.id ? 0 : -1} onClick={() => setTab(entry.id)} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
          event.preventDefault()
          const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index
          setTab(tabs[next].id)
          document.getElementById(`${prefix}-${tabs[next].id}-tab`)?.focus({ preventScroll: true })
        }} className={`-mb-px border-b-2 pb-3 text-sm focus-visible:outline-2 focus-visible:outline-[#1890ff] ${tab === entry.id ? "border-[#1890ff] text-[#1890ff]" : "border-transparent text-[#454545]"}`}>{entry.label}</button>)}
      </div>
      <div id={`${prefix}-final-panel`} role="tabpanel" aria-labelledby={`${prefix}-final-tab`} hidden={tab !== "final"} className="min-h-60 pt-4"><ReviewText value={finalBody} /></div>
      <div id={`${prefix}-items-panel`} role="tabpanel" aria-labelledby={`${prefix}-items-tab`} hidden={tab !== "items"}>{itemContent(true)}</div>
    </> : itemContent(false)}
  </section>
}
