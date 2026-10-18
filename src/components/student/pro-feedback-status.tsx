"use client"
import * as React from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { BookOpen, CalendarDays, ChevronDown, ChevronUp, MessageCircle } from "lucide-react"
import { commandPro } from "@/lib/pro-client"
import { notifyReviewChange, readReviews } from "@/lib/review-client"
import type { ReviewDatabase } from "@/lib/review-domain"
import { canRequestProFeedback, consumeProSubmissionPrompt, proBookPresentation, proListGuidance, proRemainingText, proRequestFailure, proRolloverText, proScheduleVisible, proSecondDeadlineText, proStudentDate, proStudentDeadline, proSummaryText, studentProCopy } from "@/lib/student-pro-presentation"
import { ConfirmModal } from "./student-workbook-ui"
import { useStudentToast } from "./student-toast"

function ProFeedbackSchedule({ view, reviewId }: { view: NonNullable<ReviewDatabase["studentPro"]>; reviewId?: string }) {
  if (!proScheduleVisible(view, reviewId)) return null
  const c = view.cases.find(item => item.reviewId === reviewId)
  const cutoff = c?.cutoff ?? view.cutoff
  return <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#b83267] sm:text-sm">
    {!c?.selected && <p className="inline-flex flex-wrap items-center gap-x-1.5"><CalendarDays size={15} className="shrink-0 text-[#f05d94]" aria-hidden="true"/>{view.now >= cutoff ? "신청 마감됨" : "신청 마감"}<strong className="font-semibold">{proStudentDeadline(cutoff, view.now)}</strong></p>}
    <p className="inline-flex flex-wrap items-center gap-x-1.5"><MessageCircle size={15} className="shrink-0 text-[#f05d94]" aria-hidden="true"/>피드백 예정<strong className="font-semibold">{proStudentDate(c?.due ?? view.due, view.now)}</strong></p>
  </div>
}

export function ProFeedbackUsage({ db, loaded = true, error = "" }: { db: ReviewDatabase; loaded?: boolean; error?: string }) {
  const [expanded, setExpanded] = React.useState(false)
  const detailsId = React.useId()
  const view = db.studentPro
  if (!view?.active) return null
  const u = view.usage, ready = loaded && !error && view.assigned
  const guidance = ready ? proListGuidance(db) : null
  const rollover = proRolloverText(u)
  return <section aria-label={studentProCopy.summaryTitle} className="mb-4 min-w-0 overflow-hidden rounded-2xl border border-[#bfdded] bg-white text-sm leading-[1.6] text-[#244d6b] shadow-[0_3px_12px_#244d6b06]">
    <div className="bg-linear-to-br from-[#e8f5ff] to-[#f5fbff] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-[#0077cb]"><MessageCircle size={18} aria-hidden="true"/>{studentProCopy.summaryTitle}</h2>
        {ready && <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(v => !v)} className="flex min-h-9 shrink-0 items-center gap-1 rounded-sm px-1 font-semibold text-[#356780] transition-colors hover:text-[#0077cb] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077cb]">{expanded ? "접기" : "자세히"}{expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button>}
      </div>
      <p role="status" className="mt-3 text-xl font-bold leading-snug tracking-tight text-[#174c73]">{guidance?.message ?? proSummaryText(view, loaded, error)}</p>
      {guidance && <p className="mt-2 break-keep text-[#526d7e]">{guidance.description}</p>}
      {ready && <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="whitespace-nowrap font-semibold">{proRemainingText(u.available)}{rollover && <span className="ml-1.5 text-xs font-normal text-[#526d7e]">{rollover}</span>}</p>
        {guidance && <Link href={guidance.href} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#0077cb] bg-[#0077cb] px-3 py-1.5 font-bold text-white transition-colors hover:bg-[#006bb7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077cb]">{guidance.label}</Link>}
      </div>}
      {ready && <ProFeedbackSchedule view={view}/>}
      {ready && view.active && !proScheduleVisible(view) && <p className="mt-2">이번 주 일정이 끝났어요. 신청한 글의 진행 상태는 아래에서 확인해 주세요.</p>}
    </div>
    {ready && expanded && <div id={detailsId} className="border-t border-[#c7dce8] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-[#f1f7fb] px-4 py-2.5">
        <h3 className="flex items-center gap-2 font-bold"><BookOpen size={17} className="text-[#5785a3]" aria-hidden="true"/>{Number(u.month.slice(5))}월 피드백 이용</h3>
        <p aria-label={`${u.limit}권 중 ${u.used}권 사용`} className="flex items-baseline gap-1.5 tabular-nums"><strong className="text-[28px] font-bold leading-tight text-[#0077cb]">{u.used}</strong><span className="text-base text-[#526d7e]">/ {u.limit}권 사용</span></p>
      </div>
      <div className="mt-4">
        <h3 className="font-bold">이용 안내</h3>
        <ul className="mt-2 list-disc space-y-2 pl-4 text-[#526d7e] marker:text-[#4b97c3]">
          {[
            [studentProCopy.requestTitle, studentProCopy.request],
            [studentProCopy.selectionTitle, studentProCopy.selection],
            [studentProCopy.changeTitle, studentProCopy.change],
            [studentProCopy.usageTitle, studentProCopy.usage],
          ].map(([title, description]) => <li key={title} className="pl-1"><strong className="font-semibold text-[#244d6b]">{title}</strong><span className="mx-1.5 text-[#a5bfce]" aria-hidden="true">·</span>{description}</li>)}
        </ul>
        {u.used >= u.limit && view.cases.some(c => c.secondDeadline && !c.closed && !c.secondSubmitted) && <p className="mt-3 rounded-lg bg-[#edf7fd] px-3 py-2">요청받은 2차 글은 정해진 기한까지 제출할 수 있어요.</p>}
        {u.used >= u.limit && view.cases.some(c => c.secondDeadline && !c.closed && c.secondSubmitted) && <p className="mt-3 rounded-lg bg-[#edf7fd] px-3 py-2">제출한 2차 글은 선생님의 피드백을 기다려 주세요.</p>}
      </div>
    </div>}
  </section>
}

export function ProFeedbackStatus({ db, reviewId }: { db: ReviewDatabase; reviewId: string }) {
  const state = db.studentPro && proBookPresentation(db.studentPro, reviewId)
  if (!state?.listStatus) return null
  const color = state.tone === "teal" ? "bg-[#e7f7f5] text-[#127a6a]" : state.tone === "blue" ? "bg-[#e0f2ff] text-[#0077cb]" : "bg-[#f0f3f5] text-[#526773]"
  return <span className={`rounded-md px-2.5 py-1.5 text-xs font-bold leading-5 ${color}`}>{state.listStatus}</span>
}

export function ProSecondDeadline({ db, reviewId }: { db: ReviewDatabase; reviewId: string }) {
  const view = db.studentPro, c = view?.cases.find(c => c.reviewId === reviewId)
  if (!view || !c?.secondDeadline || (c.closed && !c.expired)) return null
  return <p className="my-3 rounded-lg bg-[#edf7fd] px-3 py-2 text-sm leading-6 text-[#147fbd]">{c.secondSubmitted ? "2차 글을 제출했어요. 선생님의 피드백을 기다려 주세요." : c.expired ? "2차 글 제출 기한이 끝났어요. 1차 글과 선생님의 피드백은 계속 볼 수 있어요." : proSecondDeadlineText(c.secondDeadline, view.now)}</p>
}

function ProFeedbackModal({ view, reviewId, bookTitle, action, busy, onClose, onConfirm }: { view: NonNullable<ReviewDatabase["studentPro"]>; reviewId: string; bookTitle: string; action: "apply" | "cancel"; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const c = view.cases.find(item => item.reviewId === reviewId)
  const rollover = proRolloverText(view.usage)
  return createPortal(<ConfirmModal compact title={action === "apply" ? "피드백 신청" : "피드백 신청 취소"} cancelLabel={action === "apply" ? "돌아가기" : "유지하기"} confirmLabel={action === "apply" ? "신청하기" : "신청 취소"} busy={busy} onClose={onClose} onConfirm={onConfirm} description={<span className="block space-y-3 break-words">
    <strong className="block text-[#244d6b]">《{bookTitle}》</strong>
    <span className="block">{action === "apply" ? "이 독후감으로 피드백을 신청할까요?" : "이 독후감의 피드백 신청을 취소할까요?"}</span>
    {action === "apply" && <span className="block whitespace-nowrap font-semibold text-[#0077cb]">{proRemainingText(view.usage.available)}{rollover && <span className="ml-1.5 text-xs font-normal text-[#526d7e]">{rollover}</span>}</span>}
    <span className="block text-sm leading-6 text-[#526d7e]">{action === "apply" ? `피드백 예정일은 ${proStudentDate(c?.due ?? view.due, view.now)}이에요.` : studentProCopy.cancelNotice}</span>
  </span>}/>, document.body)
}

export function ProFeedbackAction({ db, reviewId, round, submitted, variant = "detail" }: { db: ReviewDatabase; reviewId: string; round: number; submitted: boolean; variant?: "list" | "detail" }) {
  const showToast = useStudentToast()
  const [confirm, setConfirm] = React.useState<"apply" | "cancel" | null>(null)
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState("")
  const pending = React.useRef(false)
  const view = db.studentPro, c = view?.cases.find(c => c.reviewId === reviewId)
  const state = view && proBookPresentation(view, reviewId)
  const record = db.records.find(r => r.reviewId === reviewId && r.round === round)
  React.useEffect(() => {
    if (variant !== "detail" || !submitted) return
    const prompt = consumeProSubmissionPrompt(sessionStorage, view, record)
    if (!prompt) return
    showToast(prompt.message)
    if (prompt.openApplication) setConfirm("apply")
  }, [variant, submitted, view, record, showToast])
  if (!view || !state || round !== 1 || !submitted) return null
  const rollover = proRolloverText(view.usage)
  const listCanApply = canRequestProFeedback(view, record)
  if (variant === "list" && !listCanApply && !error && !confirm) return null
  const bookTitle = db.reviews.find(r => r.id === reviewId)?.bookTitle ?? ""
  const execute = async () => {
    if (!confirm || pending.current) return
    pending.current = true; setBusy(true); setError("")
    try { await commandPro({ type: confirm, reviewId }, "student"); showToast(confirm === "apply" ? "피드백을 신청했어요." : "신청을 취소했어요."); setConfirm(null) }
    catch (e) {
      const latest = await readReviews("student", undefined, { fresh: true }).catch(() => null)
      setError(proRequestFailure(latest?.studentPro, reviewId, confirm, e instanceof Error ? e.message : "처리에 실패했어요."))
      setConfirm(null); notifyReviewChange()
    }
    finally { pending.current = false; setBusy(false) }
  }
  const actionButton = state.action && (variant === "detail" || listCanApply) && <button type="button" disabled={!state.enabled || busy} className={`relative z-20 inline-flex min-h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077cb] disabled:border-[#cbd6dd] disabled:bg-[#e8eef2] disabled:text-[#667985] ${state.action === "cancel" ? "border-[#cbd5dc] bg-white text-[#526773] enabled:hover:bg-[#f5f7f9]" : "border-[#0077cb] bg-[#0077cb] text-white enabled:hover:bg-[#006bb7]"}`} onClick={() => { setError(""); setConfirm(state.action ?? null) }}>{state.action === "cancel" ? "신청 취소" : "피드백 신청"}</button>
  return <section aria-label={variant === "detail" ? "이 글의 선생님 피드백" : `${bookTitle} 피드백 신청`} className={variant === "list" ? "relative z-20 min-w-0 text-sm" : "min-w-0 overflow-hidden rounded-2xl border border-[#bfdded] bg-white text-sm leading-[1.6] text-[#244d6b] shadow-[0_3px_12px_#244d6b06]"}>
    {variant === "list" ? actionButton : <div className="flex flex-col gap-4 bg-linear-to-br from-[#e8f5ff] to-[#f5fbff] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 font-bold text-[#0077cb]"><MessageCircle size={18} aria-hidden="true"/>선생님 피드백</h2>
        <p className="mt-3 text-xl font-bold leading-snug tracking-tight text-[#174c73]">{state.status}</p>
        {state.action === "apply" && state.enabled && <p className="mt-2 whitespace-nowrap font-semibold">{proRemainingText(view.usage.available)}{rollover && <span className="ml-1.5 text-xs font-normal text-[#526d7e]">{rollover}</span>}</p>}
        <ProFeedbackSchedule view={view} reviewId={reviewId}/>
        {(state.guide || (c?.selected && c.due < view.now) || state.action === "cancel") && <div className="mt-3 space-y-1 text-[#526d7e]">
          {state.guide && <p>{state.guide}</p>}
          {c?.selected && c.due < view.now && <p>예정일이 지났어요. 선생님의 피드백을 기다려 주세요.</p>}
          {state.action === "cancel" && state.enabled && <p>{studentProCopy.change}</p>}
        </div>}
      </div>
      {actionButton && <div className="self-start sm:self-center">{actionButton}</div>}
    </div>}
    {error && <p role="alert" className={variant === "list" ? "mt-2 max-w-56 text-[#b3261e]" : "px-5 py-3 text-[#b3261e]"}>{error}</p>}
    {confirm && <ProFeedbackModal view={view} reviewId={reviewId} bookTitle={bookTitle} action={confirm} busy={busy} onClose={() => setConfirm(null)} onConfirm={() => void execute()}/>}
  </section>
}
