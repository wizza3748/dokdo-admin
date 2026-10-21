"use client"
import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ReviewIcon } from "./review-design-icons"
import { commandPro } from "@/lib/pro-client"
import { notifyReviewChange, readReviews } from "@/lib/review-client"
import type { ReviewDatabase } from "@/lib/review-domain"
import { getWorkbookForReview } from "@/lib/student-workbooks"
import { canRequestProFeedback, consumeProSubmissionPrompt, proBookPresentation, proListGuidance, proRemainingText, proRequestFailure, proRolloverText, proScheduleVisible, proSecondDeadlineText, proSelectedCases, proStudentDate, proStudentDeadline, proSummaryRemainingText, proSummaryText, studentProCopy } from "@/lib/student-pro-presentation"
import { ProFeedbackHelpModal, ProFeedbackModal, type FeedbackAction } from "./pro-feedback-modal"
import { useStudentToast } from "./student-toast"
import ui from "./pro-feedback.module.css"

function ProFeedbackSchedule({ view, reviewId }: { view: NonNullable<ReviewDatabase["studentPro"]>; reviewId?: string }) {
  if (!proScheduleVisible(view, reviewId)) return null
  const c = view.cases.find(item => item.reviewId === reviewId), cutoff = c?.cutoff ?? view.cutoff
  return <div className={ui.schedule}>
    {!c?.selected && <p><ReviewIcon name="clock" size={16}/>{view.now >= cutoff ? "신청 마감됨" : "신청 마감"} <strong>{proStudentDeadline(cutoff, view.now)}</strong></p>}
    <p><ReviewIcon name="calendar" size={16}/>피드백 예정 <strong>{proStudentDate(c?.due ?? view.due, view.now)}</strong></p>
  </div>
}

export function ProFeedbackUsage({ db, loaded = true, error = "" }: { db: ReviewDatabase; loaded?: boolean; error?: string }) {
  const [helpOpen, setHelpOpen] = React.useState(false)
  const view = db.studentPro
  if (!view?.active) return null
  const u = view.usage, ready = loaded && !error && view.assigned
  const guidance = ready ? proListGuidance(db) : null
  const rollover = proRolloverText(u)
  const selected = ready ? proSelectedCases(view).flatMap(c => { const review = db.reviews.find(r => r.id === c.reviewId); return review ? [review] : [] }) : []
  return <section aria-label={studentProCopy.summaryTitle} className={ui.summary}>
    <div className={ui.summaryInner}>
      {selected.length ? <div className={ui.covers} aria-hidden="true">{selected.slice(0,2).map(r => <Image key={r.id} className={ui.cover} src={getWorkbookForReview(r).coverSrc} alt="" width={56} height={80}/>)}</div> : <span className={ui.emptyCover} aria-hidden="true"/>}
      <div className={ui.content}>
        <div className={ui.eyebrow}><h2>{studentProCopy.summaryTitle}</h2>{ready && <ProFeedbackSchedule view={view}/>}</div>
        <p role="status" className={ui.headline}>{guidance?.message ?? proSummaryText(view, loaded, error)}</p>
        {selected.length > 0 && <div className={ui.tags}>{selected.map(r => <Link key={r.id} className={ui.tag} href={`/student/online-workbook/${r.sourceWorkbookId}?round=1`}>{r.bookTitle}</Link>)}</div>}
        {guidance && <p className={ui.description}>{guidance.description}</p>}
        {ready && <div className={ui.balance}><p className={ui.remaining}>{proSummaryRemainingText(view)}{rollover && <span className={ui.rollover}>{rollover}</span>}</p></div>}
      </div>
      {ready && <div className={ui.summaryActions} data-has-action={Boolean(guidance)}>
        {guidance && <Link href={guidance.href} className={ui.primary}>{guidance.label}</Link>}
        <button type="button" className={ui.help} aria-label="자세히" title="자세히" aria-haspopup="dialog" onClick={() => setHelpOpen(true)}><ReviewIcon name="question" size={20}/></button>
      </div>}
    </div>
    {ready && helpOpen && <ProFeedbackHelpModal view={view} onClose={() => setHelpOpen(false)}/>}
  </section>
}

export function ProFeedbackStatus({ db, reviewId }: { db: ReviewDatabase; reviewId: string }) {
  const state = db.studentPro && proBookPresentation(db.studentPro, reviewId)
  if (!state?.listStatus) return null
  return <span className={ui.badge} data-tone={state.tone} data-writing={state.status === "피드백 작성 중"}>{state.status === "피드백 작성 중" ? <ReviewIcon name="pen" size={16}/> : state.listStatus === studentProCopy.waiting ? <ReviewIcon name="clock" size={16}/> : null}{state.listStatus}</span>
}

export function ProSecondDeadline({ db, reviewId }: { db: ReviewDatabase; reviewId: string }) {
  const view = db.studentPro, c = view?.cases.find(c => c.reviewId === reviewId)
  if (!view || !c?.secondDeadline || (c.closed && !c.expired)) return null
  return <p className={ui.deadline}><ReviewIcon name="calendar" size={16}/>{c.secondSubmitted ? "2차 글을 제출했어요. 선생님의 피드백을 기다려 주세요." : c.expired ? "2차 글 제출 기한이 끝났어요. 1차 글과 선생님의 피드백은 계속 볼 수 있어요." : proSecondDeadlineText(c.secondDeadline, view.now)}</p>
}

export function ProFeedbackAction({ db, reviewId, round, submitted, variant = "detail" }: { db: ReviewDatabase; reviewId: string; round: number; submitted: boolean; variant?: "list" | "detail" }) {
  const showToast = useStudentToast()
  const [confirm, setConfirm] = React.useState<FeedbackAction | null>(null)
  const [candidates, setCandidates] = React.useState<string[]>([])
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
  if (!view || round !== 1 || !submitted || (!state && !error && !confirm) || (!view.active && !c?.selected)) return null
  const rollover = proRolloverText(view.usage), listCanApply = canRequestProFeedback(view, record)
  if (variant === "list" && !listCanApply && !error && !confirm) return null
  const bookTitle = db.reviews.find(r => r.id === reviewId)?.bookTitle ?? ""
  const execute = async (previousReviewId?: string) => {
    if (!confirm || pending.current || (confirm === "change" && !previousReviewId)) return
    pending.current = true; setBusy(true); setError("")
    try {
      await commandPro(confirm === "change" ? {type:"change",reviewId,previousReviewId:previousReviewId!} : {type:confirm,reviewId}, "student")
      showToast(confirm === "change" ? "신청을 바꿨어요." : confirm === "apply" ? "피드백을 신청했어요." : "신청을 취소했어요."); setConfirm(null)
    } catch (e) {
      const latest = await readReviews("student", undefined, {fresh:true}).catch(() => null)
      setError(proRequestFailure(latest?.studentPro, reviewId, confirm, e instanceof Error ? e.message : "처리에 실패했어요.",previousReviewId))
      setConfirm(null); notifyReviewChange()
    } finally { pending.current = false; setBusy(false) }
  }
  const actionButton = state?.action && (variant === "detail" || listCanApply) && <button type="button" disabled={!state.enabled || busy} className={`${ui.primary} ${state.action === "cancel" ? ui.cancel : ""}`} onClick={() => {setError("");setCandidates(c?.changeCandidates ?? []);setConfirm(state.action ?? null)}}>{variant === "list" && <ReviewIcon name="send" size={16}/>} {state.action === "change" ? "이 글로 바꾸기" : state.action === "cancel" ? "신청 취소" : "피드백 신청"}</button>
  return <section aria-label={variant === "detail" ? "이 글의 선생님 피드백" : `${bookTitle} 피드백 신청`} className={variant === "list" ? ui.listAction : ui.detail}>
    {variant === "list" ? actionButton : state && <div className={ui.detailInner}>
      <span className={ui.symbol} data-variant={c?.locked ? "teacher" : c?.selected ? "selected" : state.enabled && state.action === "apply" ? "apply" : "unavailable"} aria-hidden="true"><ReviewIcon name={c?.locked ? "pen" : c?.selected ? "check" : state.enabled && state.action === "apply" ? "send" : "hourglass"} size={18}/></span>
      <div className={ui.content}>
        <div className={ui.eyebrow}><h2>이 글의 선생님 피드백</h2><ProFeedbackSchedule view={view} reviewId={reviewId}/></div>
        <p className={ui.headline}>{state.status}</p>
        {state.guide && <p className={ui.description}>{state.guide}</p>}
        {state.action === "apply" && state.enabled && <p className={ui.remaining}>{proRemainingText(view.usage.available)}{rollover && <span className={ui.rollover}>{rollover}</span>}</p>}
        {c?.selected && c.due < view.now && <p className={ui.description}>예정일이 지났어요. 선생님의 피드백을 기다려 주세요.</p>}
        {state.action === "cancel" && state.enabled && <p className={ui.description}>{studentProCopy.change}</p>}
      </div>{actionButton}
    </div>}
    {error && <p role="alert" className={ui.error}>{error}</p>}
    {confirm && <ProFeedbackModal db={db} reviewId={reviewId} action={confirm} busy={busy} candidates={candidates} onClose={() => {if (!pending.current) setConfirm(null)}} onConfirm={id => void execute(id)}/>}
  </section>
}
