"use client"
import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp } from "lucide-react"
import { commandPro } from "@/lib/pro-client"
import { notifyReviewChange, readReviews } from "@/lib/review-client"
import type { ReviewDatabase } from "@/lib/review-domain"
import { kstDate, weekStart } from "@/lib/pro-calendar"
import { proBookPresentation, proRequestFailure, proStudentDate, proStudentDeadline, proSummaryText } from "@/lib/student-pro-presentation"
import { ConfirmModal } from "./student-workbook-ui"

export function ProFeedbackUsage({ db, loaded = true, error = "" }: { db: ReviewDatabase; loaded?: boolean; error?: string }) {
  const [expanded, setExpanded] = React.useState(false)
  const detailsId = React.useId()
  const view = db.studentPro
  if (!view) return null
  const u = view.usage, ready = loaded && !error && view.assigned
  return <section aria-label="이번 주 피드백" className="mb-4 min-w-0 overflow-hidden rounded-xl border border-[#bfdded] bg-white text-sm leading-6 text-[#244d6b]">
    <div className="bg-[#edf7fd] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-[#0077cb]">이번 주 피드백</h2>{ready && <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(v => !v)} className="flex shrink-0 items-center gap-1 rounded px-1 py-1 font-semibold text-[#356780] focus-visible:outline-2 focus-visible:outline-[#0077cb]">{expanded ? "접기" : "자세히"}{expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>}</div>
      <p role="status" className="mt-2 text-lg font-bold leading-7 text-[#244d6b]">{proSummaryText(view, loaded, error)}</p>
      {ready && <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[#356780]"><p>신청 마감 <strong className="font-semibold">{proStudentDeadline(view.cutoff, view.now)}</strong></p><p>피드백 예정 <strong className="font-semibold">{proStudentDate(view.due, view.now)}</strong></p></div>}
    </div>
    {ready && expanded && <div id={detailsId} className="border-t border-[#c7dce8] bg-white p-4 sm:p-5">
      <h3 className="text-base font-bold">{Number(u.month.slice(5))}월 이용 내역</h3>
      <dl className="mt-3 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><dt>받은 피드백</dt><dd>{u.limit}권 중 <strong className="text-xl font-bold text-[#0077cb]">{u.used}권</strong></dd></div>
        {u.pending > 0 && <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><dt>첫 피드백 기다리는 글</dt><dd className="font-semibold">{u.pending}권</dd></div>}
      </dl>
      <div className="mt-5 border-t border-[#e3ebf0] pt-5">
        <h3 className="text-base font-bold">이용 안내</h3>
        <dl className="mt-3 space-y-4 text-[#526d7e]">
          <div><dt className="font-semibold text-[#244d6b]">신청하지 않으면?</dt><dd className="mt-1">마감 때 최근에 제출한 독후감부터 남은 권수만큼 피드백 받을 글을 골라요.</dd></div>
          <div><dt className="font-semibold text-[#244d6b]">같은 글로 두 번 받으면?</dt><dd className="mt-1">같은 독후감은 피드백을 두 번 받아도 1권으로 세요.</dd></div>
        </dl>
        {u.used >= u.limit && view.cases.some(c => c.secondDeadline && !c.closed && !c.secondSubmitted) && <p className="mt-4">요청받은 2차 글은 정해진 기한까지 제출할 수 있어요.</p>}
      </div>
    </div>}
  </section>
}

export function ProFeedbackStatus({ db, reviewId }: { db: ReviewDatabase; reviewId: string }) {
  const state = db.studentPro && proBookPresentation(db.studentPro, reviewId)
  if (!state) return null
  const color = state.tone === "teal" ? "bg-[#e7f7f5] text-[#127a6a]" : state.tone === "blue" ? "bg-[#e0f2ff] text-[#0077cb]" : "bg-[#f0f3f5] text-[#526773]"
  return <span className={`rounded-md px-2.5 py-1.5 text-xs font-bold leading-5 ${color}`}>{state.listStatus}</span>
}

export function ProSecondDeadline({ db, reviewId }: { db: ReviewDatabase; reviewId: string }) {
  const view = db.studentPro, c = view?.cases.find(c => c.reviewId === reviewId)
  if (!view || !c?.secondDeadline || (c.closed && !c.expired)) return null
  return <p className="my-3 rounded-lg bg-[#edf7fd] px-3 py-2 text-sm leading-6 text-[#147fbd]">{c.secondSubmitted ? "2차 글을 제출했어요. 선생님의 피드백을 기다려 주세요." : c.expired ? "2차 글 제출 기한이 끝났어요. 1차 글과 선생님의 피드백은 계속 볼 수 있어요." : `2차 글은 ${proStudentDeadline(c.secondDeadline, view.now)}까지 제출해 주세요.`}</p>
}

export function ProFeedbackAction({ db, reviewId, round, submitted }: { db: ReviewDatabase; reviewId: string; round: number; submitted: boolean }) {
  const [confirm, setConfirm] = React.useState<"apply" | "cancel" | null>(null)
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const pending = React.useRef(false)
  React.useEffect(() => { if (!success) return; const timeout = window.setTimeout(() => setSuccess(""), 4000); return () => window.clearTimeout(timeout) }, [success])
  const view = db.studentPro, c = view?.cases.find(c => c.reviewId === reviewId)
  const state = view && proBookPresentation(view, reviewId)
  if (!view || !state || round !== 1 || !submitted) return null
  const bookTitle = db.reviews.find(r => r.id === reviewId)?.bookTitle ?? ""
  const execute = async () => {
    if (!confirm || pending.current) return
    pending.current = true; setBusy(true); setError("")
    try { await commandPro({ type: confirm, reviewId }, "student"); setSuccess(confirm === "apply" ? "피드백을 신청했어요." : "신청을 취소했어요."); setConfirm(null) }
    catch (e) {
      const latest = await readReviews("student").catch(() => null)
      setError(proRequestFailure(latest?.studentPro, reviewId, confirm, e instanceof Error ? e.message : "처리에 실패했어요."))
      setConfirm(null); notifyReviewChange()
    }
    finally { pending.current = false; setBusy(false) }
  }
  return <section aria-label="이 글의 피드백 신청" className="min-w-0 rounded-xl border border-[#bfdded] bg-[#edf7fd] p-4 text-sm leading-6 text-[#244d6b] sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 space-y-2"><h2 className="text-base font-bold text-[#0077cb]">{state.status}</h2>
        {state.action === "apply" && state.enabled && <p className="font-semibold">{view.usage.available}권 더 신청할 수 있어요.</p>}
        {view.assigned && c && <div className="flex flex-wrap gap-x-5 gap-y-1"><p>신청 마감 <strong className="font-semibold">{proStudentDeadline(c.cutoff, view.now)}</strong></p><p>피드백 예정 <strong className="font-semibold">{proStudentDate(c.due, view.now)}</strong></p></div>}
        {state.guide && <p>{state.guide}</p>}
      </div>
      {state.action && <button type="button" disabled={!state.enabled || busy} className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border px-4 py-2 font-bold disabled:border-[#cbd6dd] disabled:bg-[#e8eef2] disabled:text-[#667985] ${state.action === "cancel" ? "border-[#aac9dc] bg-white text-[#356780]" : "border-[#0077cb] bg-[#0077cb] text-white"}`} onClick={() => { setError(""); setSuccess(""); setConfirm(state.action ?? null) }}>{state.action === "cancel" ? "신청 취소" : "피드백 신청"}</button>}
    </div>
    {error && <p role="alert" className="mt-3 text-[#b3261e]">{error}</p>}
    {success && <p role="status" className="mt-3 font-semibold text-[#127a6a]">{success}</p>}
    {confirm && createPortal(<ConfirmModal compact title={confirm === "apply" ? "피드백 신청" : "피드백 신청 취소"} cancelLabel={confirm === "apply" ? "돌아가기" : "유지하기"} confirmLabel={confirm === "apply" ? "신청하기" : "신청 취소"} busy={busy} onClose={() => setConfirm(null)} onConfirm={() => void execute()} description={<span className="block space-y-3 break-words">
      <strong className="block text-[#244d6b]">《{bookTitle}》</strong>
      <span className="block">{confirm === "apply" ? "이 독후감으로 피드백을 신청할까요?" : "이 독후감의 피드백 신청을 취소할까요?"}</span>
      <span className="block text-sm leading-6 text-[#526d7e]">{confirm === "apply" ? `피드백 예정일은 ${proStudentDate(c?.due ?? view.due, view.now)}이에요.` : "마감까지 다른 글을 신청하지 않으면 이 글이 다시 선정될 수 있어요."}</span>
    </span>}/>, document.body)}
  </section>
}

export function ProSubmissionPrompt({ db, reviewId }: { db: ReviewDatabase; reviewId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false), [busy, setBusy] = React.useState(false), [error, setError] = React.useState("")
  const pending = React.useRef(false)
  React.useEffect(() => {
    const key = `pro-submit-prompt:${reviewId}`
    if (sessionStorage.getItem(key)) { sessionStorage.removeItem(key); setOpen(true) }
  }, [reviewId])
  const view = db.studentPro, c = view?.cases.find(c => c.reviewId === reviewId)
  if (!open || !view) return null
  const title = db.reviews.find(r => r.id === reviewId)?.bookTitle
  const state = proBookPresentation(view, reviewId)
  const selectedTitles = view.cases.filter(item => item.selected && item.week === weekStart(view.now)).map(item => db.reviews.find(r => r.id === item.reviewId)?.bookTitle).filter(Boolean)
  return createPortal(<ConfirmModal compact title="독후감을 제출했어요" confirmLabel="이 글로 신청" cancelLabel="다른 글 고를게요" busy={busy} confirmDisabled={!c?.canApply || !view.assigned} onClose={() => setOpen(false)} onCancel={() => {
    setOpen(false); router.push(`/student/exploration-record?tab=workbook&month=${kstDate(view.now).slice(0, 7)}`)
  }} onConfirm={async () => {
    if (!c?.canApply || pending.current) return
    pending.current = true; setBusy(true)
    try { await commandPro({ type: "apply", reviewId }, "student"); setOpen(false) }
    catch (e) { setError(e instanceof Error ? e.message : "처리에 실패했어요."); notifyReviewChange() }
    finally { pending.current = false; setBusy(false) }
  }} description={<span className="block space-y-3 text-left text-sm leading-6">
    <strong className="block text-base text-[#244d6b]">《{title}》</strong>
    <strong className="block text-base">{c?.canApply ? "이 글로 선생님 피드백을 받을까요?" : state?.guide ?? state?.status ?? c?.reason}</strong>
    {c?.canApply && <><span className="block">이번 주 남은 권수 {view.usage.available}권</span><span className="block">{proStudentDeadline(c.cutoff, view.now)}까지 다른 글을 고르지 않으면 최근에 제출한 글부터 자동으로 골라요.</span>{c.autoExpected && <span className="block">현재는 이 글이 자동 선정될 예정이에요.</span>}</>}
    {!c?.canApply && view.usage.available <= 0 && selectedTitles.length > 0 && <span className="block">신청·선정한 글: {selectedTitles.join(", ")}</span>}
    {view.assigned && <span className="block">피드백 예정 {proStudentDate(c?.due ?? view.due, view.now)}</span>}
    {error && <span role="alert" className="block text-red-600">{error}</span>}
  </span>}/>, document.body)
}
