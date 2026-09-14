"use client"
import * as React from "react"
import { AlignLeft, Bold, ImagePlus, Info, Italic, Strikethrough, Underline, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ReviewCommon, ReviewRecord } from "@/lib/review-domain"

import { safeReviewHtml } from "@/lib/review-html"
export { safeReviewHtml } from "@/lib/review-html"
export function ReviewText({ value }: { value: string }) { return <div className="whitespace-pre-wrap break-words text-sm leading-7 [&_img]:my-3 [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: safeReviewHtml(value) }} /> }
export function ReviewEditor({ value, onChange, label, readOnly = false, student = false, compact = false, academy = false, fillHeight = false }: { value: string; onChange: (value: string) => void; label: string; readOnly?: boolean; student?: boolean; compact?: boolean; academy?: boolean; fillHeight?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => { if (ref.current && ref.current.innerHTML !== value && document.activeElement !== ref.current) ref.current.innerHTML = safeReviewHtml(value) }, [value])
  if (student) return <div className={cn("mt-2 overflow-hidden border border-[#cbd4d9] bg-white", fillHeight && "flex min-h-0 flex-1 flex-col")}><div className="flex h-10 shrink-0 items-center gap-1 border-b border-[#d5dde1] bg-[#f7f9fa] px-3 text-[#48545e]">{[["bold", "굵게", Bold], ["italic", "기울임", Italic], ["underline", "밑줄", Underline], ["strikeThrough", "취소선", Strikethrough], ["justifyLeft", "정렬", AlignLeft]].map(([command, title, Icon]) => { const ToolIcon = Icon as typeof Bold; return <button key={String(command)} type="button" disabled={readOnly} aria-label={String(title)} className="grid size-8 place-items-center rounded hover:bg-white" onMouseDown={e => e.preventDefault()} onClick={() => { ref.current?.focus(); document.execCommand(String(command)); onChange(ref.current?.innerHTML ?? "") }}><ToolIcon className="size-4" /></button> })}<ReviewImageButton editor={ref} onChange={onChange} readOnly={readOnly} label={label} /></div><div ref={ref} role="textbox" aria-label={label} aria-multiline contentEditable={!readOnly} suppressContentEditableWarning onInput={() => onChange(ref.current?.innerHTML ?? "")} onPaste={e => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")) }} className={cn("min-h-[245px] w-full resize-y overflow-auto whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-7 outline-none [&_img]:max-w-full", fillHeight && "min-h-0 flex-1 resize-none")} /></div>
  return <div className={cn("overflow-hidden border bg-white", academy ? "rounded-none border-[#d9d9d9]" : "rounded-lg border-slate-200")}><div className={cn("flex gap-1 border-b", academy ? "h-10 items-center border-[#e8e8e8] bg-white px-2" : "bg-slate-50 p-2")}>{[["bold", "B"], ["italic", "I"], ["underline", "U"]].map(([command, title]) => <Button key={command} variant="ghost" size="sm" disabled={readOnly} aria-label={`${label} ${command}`} onMouseDown={e => e.preventDefault()} onClick={() => { ref.current?.focus(); document.execCommand(command); onChange(ref.current?.innerHTML ?? "") }}>{title}</Button>)}<ReviewImageButton editor={ref} onChange={onChange} readOnly={readOnly} label={label} /></div><div ref={ref} role="textbox" aria-label={label} aria-multiline aria-readonly={readOnly} title="오른쪽 아래 모서리를 드래그해 높이를 조절할 수 있습니다." contentEditable={!readOnly} suppressContentEditableWarning onInput={() => onChange(ref.current?.innerHTML ?? "")} onPaste={e => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")) }} className={cn("resize-y overflow-auto whitespace-pre-wrap break-words p-4 text-sm leading-7 outline-none [&_img]:max-w-full", compact ? "min-h-24" : "min-h-48")} /></div>
}
export function ReviewDialog({ title, children, onClose, onConfirm, confirmLabel = "확인", disabled = false }: { title: string; children: React.ReactNode; onClose: () => void; onConfirm?: () => void; confirmLabel?: string; disabled?: boolean }) {
  React.useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler) }, [onClose])
  return <div className="fixed inset-0 z-[150] grid place-items-center bg-black/60 p-3"><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[92dvh] w-full max-w-xl overflow-auto rounded-2xl bg-white shadow-xl"><header className="flex items-center justify-between border-b border-dashed p-5"><h2 className="text-xl font-bold">{title}</h2><Button variant="ghost" size="icon" aria-label="닫기" onClick={onClose}><X /></Button></header><div className="p-6 text-sm leading-7">{children}</div><footer className="flex justify-end gap-2 border-t p-4"><Button variant="outline" onClick={onClose}>{onConfirm ? "취소" : "닫기"}</Button>{onConfirm && <Button disabled={disabled} onClick={onConfirm}>{confirmLabel}</Button>}</footer></section></div>
}
export function ReviewPanel({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[140] bg-black/35"><aside role="dialog" aria-modal="true" aria-label={title} className="absolute inset-y-0 right-0 w-full overflow-y-auto bg-white p-5 shadow-xl lg:w-[560px]"><header className="sticky top-0 flex items-center justify-between bg-white pb-4"><h2 className="text-xl font-bold">{title}</h2><Button variant="outline" onClick={onClose}>닫기</Button></header>{children}</aside></div>
}
export function ItemReference({ common, record, compactAnswers = false, compact = false, showAnswers = true }: { common: ReviewCommon; record: ReviewRecord; compactAnswers?: boolean; compact?: boolean; showAnswers?: boolean }) {
  const [openGuideId, setOpenGuideId] = React.useState<string | null>(null)
  if (compact) return <div className="divide-y divide-[#dce3e7]">{common.template.items.map((item, index) => {
    const hasGuidance = Boolean(item.description.trim() || item.example?.trim())
    return <section key={item.id} className="py-4 first:pt-3 last:pb-4"><div className="flex items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#e5f4fc] text-xs font-black text-[#087fc8]">{index + 1}</span><h3 className="min-w-0 flex-1 text-[14px] font-black leading-5 text-[#243a47]">{item.title}</h3>{hasGuidance && <Popover open={openGuideId === item.id} onOpenChange={open => setOpenGuideId(open ? item.id : null)}><PopoverTrigger asChild><button type="button" aria-label={`${index + 1}번 ${item.title} 질문 항목 안내 보기`} className="grid size-7 shrink-0 place-items-center rounded-full text-[#168fd1] transition hover:bg-[#eaf6fd] focus-visible:outline-2 focus-visible:outline-[#168fd1]"><Info className="size-[18px]" /></button></PopoverTrigger><PopoverContent side="bottom" align="end" className="z-[170] w-80 space-y-3 text-[13px] leading-5">{item.description.trim() && <div><strong className="text-[#263747]">질문 항목 안내</strong><p className="mt-1 whitespace-pre-wrap text-[#596773]">{item.description}</p></div>}{item.example && <div className={cn(item.description.trim() && "border-t border-[#e1e6e9] pt-3")}><strong className="text-[#263747]">예시</strong><p className="mt-1 whitespace-pre-wrap text-[#596773]">{item.example}</p></div>}</PopoverContent></Popover>}</div>{showAnswers && (record.answers[item.id] ? <div className="mt-2 pl-8 [&>div]:text-[14px] [&>div]:leading-6 [&_p]:my-0"><ReviewText value={record.answers[item.id]} /></div> : <p className="mt-2 pl-8 text-[13px] leading-5 text-[#8a99a2]">작성한 내용이 없습니다.</p>)}</section>
  })}</div>
  return <div className="space-y-5">{common.template.items.map(item => <section key={item.id} className="rounded-lg border p-4"><h3 className="font-bold">{item.title}</h3>{showAnswers && record.answers[item.id] && <div className={cn("mt-1", compactAnswers && "[&>div]:text-[15px] [&>div]:leading-6 [&_p]:my-0")}><ReviewText value={record.answers[item.id]} /></div>}<p className="mt-3 whitespace-pre-wrap text-sm text-slate-500">안내: {item.description}</p>{item.example && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">예시: {item.example}</p>}</section>)}</div>
}
export function FeedbackReference({ common, record, accordionItems = false, showItemGuidance = true, showReward = true, showScore = true }: { common: ReviewCommon; record: ReviewRecord; accordionItems?: boolean; showItemGuidance?: boolean; showReward?: boolean; showScore?: boolean }) {
  return <div className="space-y-5"><h3 className="font-bold">총평 · {record.savedAt?.slice(0, 10)}</h3><ReviewText value={record.feedback} />{record.itemFeedback.filter(i => i.visible).map(feedback => {
    const item = common.template.items.find(i => i.id === feedback.itemId)
    const studentAnswer = !record.rewriteEdited && record.answers[feedback.itemId]
    const guidance = showItemGuidance && <details className="mt-3 text-sm text-slate-500"><summary>질문 항목 안내·예시</summary><p>{item?.description}</p><p>{item?.example}</p></details>
    const content = accordionItems
      ? <>{studentAnswer && <div className="mb-3"><p className="mb-1 text-xs font-bold text-slate-500">학생 작성 내용</p><ReviewText value={studentAnswer} /></div>}<div><p className="mb-1 text-xs font-bold text-slate-500">선생님 피드백</p><ReviewText value={feedback.text} /></div>{guidance}</>
      : <>{studentAnswer && <ReviewText value={studentAnswer} />}<ReviewText value={feedback.text} />{guidance}</>
    return accordionItems
      ? <details key={feedback.itemId} className="group overflow-hidden rounded-lg border bg-white"><summary className="cursor-pointer list-none px-4 py-3 font-bold marker:content-none after:float-right after:text-slate-400 after:content-['＋'] group-open:after:content-['－']">{item?.title}</summary><div className="border-t px-4 py-4">{content}</div></details>
      : <section key={feedback.itemId} className="rounded-lg border p-4"><h4 className="font-bold">{item?.title}</h4><div className="mt-3">{content}</div></section>
  })}{showReward && <p>섬초롱꽃: {record.flowers}개</p>}{showScore && common.reportEnabled && record.report && <p>{record.round}차 점수: {Number(record.report.score.toFixed(1))}점</p>}</div>
}
function ReviewImageButton({ editor, onChange, readOnly, label }: { editor: React.RefObject<HTMLDivElement | null>; onChange: (html: string) => void; readOnly: boolean; label: string }) {
  const input = React.useRef<HTMLInputElement>(null)
  const selection = React.useRef<Range | null>(null)
  const [error, setError] = React.useState("")
  return <><input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => {
    const file = e.target.files?.[0]; e.target.value = ""
    if (!file || readOnly) return
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) { setError("PNG·JPG·WEBP·GIF 이미지를 선택해 주세요."); return }
    const reader = new FileReader()
    reader.onerror = () => setError("이미지를 불러오지 못했습니다.")
    reader.onload = () => {
      if (!editor.current) return
      editor.current.focus()
      const current = window.getSelection()
      if (selection.current && editor.current.contains(selection.current.commonAncestorContainer)) { current?.removeAllRanges(); current?.addRange(selection.current) }
      else { const range = document.createRange(); range.selectNodeContents(editor.current); range.collapse(false); current?.removeAllRanges(); current?.addRange(range) }
      document.execCommand("insertHTML", false, safeReviewHtml(`<img src="${String(reader.result)}" />`))
      onChange(editor.current.innerHTML); setError("")
    }
    reader.readAsDataURL(file)
  }} /><button type="button" disabled={readOnly} aria-label={`${label} 이미지 삽입`} className="grid size-8 place-items-center rounded hover:bg-white disabled:opacity-50" onMouseDown={e => e.preventDefault()} onClick={() => { const current = window.getSelection(); selection.current = current?.rangeCount ? current.getRangeAt(0).cloneRange() : null; input.current?.click() }}><ImagePlus className="size-4" /></button>{error && <span role="alert" className="text-xs text-red-600">{error}</span>}</>
}
