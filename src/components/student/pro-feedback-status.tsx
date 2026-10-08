"use client"
import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { CalendarDays, CheckCircle2, Clock3, LockKeyhole, Sparkles } from "lucide-react"
import { commandPro } from "@/lib/pro-client"
import type { ReviewDatabase } from "@/lib/review-domain"
import { cutoffLabel, dateLabel, kstDate } from "@/lib/pro-calendar"
import { ConfirmModal } from "./student-workbook-ui"

export function ProFeedbackUsage({ db }: { db: ReviewDatabase }) {
  const view = db.studentPro
  if (!view) return null
  const u = view.usage
  const guidance = !view.active ? "프로 이용이 종료되었어요." : u.used >= u.limit ? "이번 달 피드백을 모두 받았어요. 다음 달에 다시 시작해요. 독후감은 계속 작성할 수 있어요." : u.available <= 0 ? "이번 주 피드백받을 글이 모두 정해졌어요. 독후감은 계속 작성할 수 있어요." : `${cutoffLabel(view.cutoff)}까지 피드백받을 글을 골라 주세요. 남은 자리는 최근에 제출한 글부터 자동으로 골라요.`
  return <section aria-label="피드백 이용 현황" className="my-4 overflow-hidden rounded-xl border border-[#bfdded] bg-white text-sm leading-6">
    <div className="bg-[#edf7fd] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-bold text-[#0077cb]"><Sparkles className="size-4"/>프로 · 이번 주 선생님 피드백</h2>{u.rollover > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#0077cb]">이월 {u.rollover}권 포함</span>}</div>
      <p className="mt-1 text-xs text-[#647d8d]">{view.period}</p>
      {view.assigned ? <>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[#244d6b]"><strong className="text-2xl font-extrabold text-[#0077cb]">{u.total}권</strong> 중 <strong>{u.selected}권</strong> 선정<span className="mx-1 text-[#a8bfcd]">·</span>남은 <strong className="text-2xl font-extrabold text-[#0077cb]">{u.available}권</strong></p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#647d8d]"><span>이번 달 피드백 <strong className="text-[#244d6b]">{u.used}/{u.limit}권 이용</strong></span>{u.pending > 0 && <span>피드백을 기다리는 글 {u.pending}권</span>}</div>
      </> : <p className="mt-3 text-[#244d6b]">담당 선생님 배정 중이에요. 독후감은 먼저 작성할 수 있어요.</p>}
    </div>
    {view.assigned && <div className="space-y-3 p-4">
      <dl className="space-y-1.5 text-xs"><div className="flex flex-wrap items-baseline gap-x-3"><dt className="flex items-center gap-1 text-[#647d8d]"><Clock3 className="size-3.5 self-center"/>제출·신청 마감</dt><dd className="font-bold text-[#244d6b]">{cutoffLabel(view.cutoff)}</dd></div><div className="flex flex-wrap items-baseline gap-x-3"><dt className="flex items-center gap-1 text-[#647d8d]"><CalendarDays className="size-3.5 self-center"/>피드백 예정</dt><dd className="font-bold text-[#244d6b]">{dateLabel(view.due)}</dd></div></dl>
      <p className="border-t border-[#e7eef2] pt-3 text-xs leading-5 text-[#657580]">{guidance}</p>
      {view.cases.some(c => c.secondDeadline && !c.closed && !c.secondSubmitted) && <p className="text-xs leading-5 text-[#0077cb]">진행 중인 2차 글은 추가 신청 없이 이어서 작성할 수 있어요.</p>}
    </div>}
  </section>
}

export function ProFeedbackAction({ db, reviewId, round, submitted, compact = false }: { db: ReviewDatabase; reviewId: string; round: number; submitted: boolean; compact?: boolean }) {
  const [confirm, setConfirm] = React.useState<"apply" | "cancel" | null>(null)
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState("")
  const view = db.studentPro, c = view?.cases.find(c => c.reviewId === reviewId)
  if (!view) return null
  if (!c) return submitted && !view.assigned ? <p className="text-xs text-[#657580]">담당 선생님 배정 중</p> : null
  const execute = async () => {
    if (!confirm || busy) return
    setBusy(true)
    try { await commandPro({ type: confirm, reviewId }, "student"); setConfirm(null) }
    catch (e) { setError(e instanceof Error ? e.message : "처리에 실패했어요.") }
    finally { setBusy(false) }
  }
  const badge = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold leading-4"
  return <div className={`relative z-20 ${compact ? "max-w-64 text-xs" : "my-3 text-sm"}`}>
    {c.secondDeadline && <p className="mb-2 rounded-lg bg-[#edf7fd] px-3 py-2 text-xs leading-5 text-[#147fbd]">{c.expired ? "2차 제출 기한이 종료되었어요. 저장한 초안은 읽기만 할 수 있어요." : `2차 제출 기한: ${dateLabel(c.secondDeadline)} · 추가 차감 없음`}</p>}
    {round === 1 && submitted && !c.firstSent && <div className={`space-y-2 rounded-lg p-2.5 ${c.selected ? "border border-[#b6d9ed] bg-[#f3f9fd]" : c.autoExpected ? "border border-dashed border-[#87bee0] bg-[#f8fcfe]" : ""}`}>
      {c.selected ? <>
        <span className={`${badge} ${c.locked ? "bg-[#e6edf1] text-[#577181]" : "bg-[#e0f2ff] text-[#0077cb]"}`}>{c.locked ? <LockKeyhole className="size-3"/> : <CheckCircle2 className="size-3"/>}{c.locked ? "피드백 진행 중" : c.selection === "학생 신청" ? "신청한 글" : "피드백 대상"}</span>
        <p className="text-xs leading-5 text-[#647d8d]">{c.reason}{!c.locked && <span className="block">{c.period}</span>}</p>
      </> : <>
        {c.autoExpected ? <span className={`${badge} bg-[#edf7fd] text-[#147fbd]`}><Clock3 className="size-3"/>자동 선정 예정</span> : c.reason && <p className="text-xs leading-5 text-[#657580]">{c.reason}</p>}
        <button type="button" disabled={!c.canApply || busy} className="inline-flex h-9 items-center justify-center rounded-md border border-[#0077cb] bg-[#0077cb] px-3 text-sm font-bold text-white disabled:border-[#dce3e7] disabled:bg-[#f4f7f9] disabled:text-[#8b979e]" onClick={() => setConfirm("apply")}>피드백 신청</button>
      </>}
      {c.canCancel && <button type="button" className="inline-flex h-8 items-center rounded-md border border-[#c8dbe7] bg-white px-3 text-xs font-bold text-[#52758a]" onClick={() => setConfirm("cancel")}>신청 취소</button>}
    </div>}
    {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    {confirm && createPortal(<ConfirmModal title={confirm === "apply" ? "피드백 신청" : "신청 취소"} description={confirm === "apply" ? "이 글로 선생님 피드백을 신청할까요? 이용 권수는 1차 피드백을 받을 때 사용돼요." : "신청을 취소할까요? 취소한 글도 마감 시 자동 선정될 수 있어요."} confirmLabel={confirm === "apply" ? "신청하기" : "신청 취소"} busy={busy} onClose={() => !busy && setConfirm(null)} onConfirm={() => void execute()}/>, document.body)}
  </div>
}

export function ProSubmissionPrompt({ db, reviewId }: { db: ReviewDatabase; reviewId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false), [busy, setBusy] = React.useState(false), [error, setError] = React.useState("")
  React.useEffect(() => {
    const key = `pro-submit-prompt:${reviewId}`
    if (sessionStorage.getItem(key)) { sessionStorage.removeItem(key); setOpen(true) }
  }, [reviewId])
  const view = db.studentPro, c = view?.cases.find(c => c.reviewId === reviewId)
  if (!open || !view) return null
  const title = db.reviews.find(r => r.id === reviewId)?.bookTitle
  return createPortal(<ConfirmModal title="독후감을 제출했어요" confirmLabel="이 글로 신청" cancelLabel="다른 글 고를게요" busy={busy} confirmDisabled={!c?.canApply} onClose={() => setOpen(false)} onCancel={() => {
    setOpen(false); router.push(`/student/exploration-record?tab=workbook&month=${kstDate(view.now).slice(0, 7)}`)
  }} onConfirm={async () => {
    if (!c?.canApply || busy) return
    setBusy(true)
    try { await commandPro({ type: "apply", reviewId }, "student"); setOpen(false) }
    catch (e) { setError(String(e)) }
    finally { setBusy(false) }
  }} description={<span className="block space-y-4 p-2 text-left text-sm leading-6">
    <span className="block text-[#657580]">『{title}』</span>
    <strong className="block text-base text-[#244d6b]">{c?.canApply ? "이 글로 선생님 피드백을 받을까요?" : c?.reason || "담당 선생님 배정 중이에요."}</strong>
    <span className="block rounded-lg bg-[#edf7fd] p-3 text-[#147fbd]"><strong>제출·신청 마감 {cutoffLabel(c?.cutoff ?? view.cutoff)}</strong><span className="mt-1 block">{c?.autoExpected ? "현재는 이 글이 자동 선정될 예정이에요." : "남은 자리는 최근에 제출한 글부터 자동으로 골라요."}</span></span>
    <span className="block text-[#657580]">이번 주 남은 <strong className="text-[#0077cb]">{view.usage.available}권</strong><br/>피드백 예정 {dateLabel(c?.due ?? view.due)}</span>
    {error && <span role="alert" className="block text-red-600">{error}</span>}
  </span>}/>, document.body)
}
