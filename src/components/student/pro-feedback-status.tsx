"use client"
import * as React from "react"
import Link from "next/link"
import { commandPro } from "@/lib/pro-client"
import type { ReviewDatabase } from "@/lib/review-domain"
import { cutoffLabel, dateLabel } from "@/lib/pro-calendar"
import { ConfirmModal } from "./student-workbook-ui"
export function ProFeedbackUsage({ db }: { db: ReviewDatabase }) {
  const view = db.studentPro
  if (!view) return null
  const u = view.usage
  return <section aria-label="피드백 이용 현황" className="my-4 rounded-xl border border-[#b9deef] bg-white p-4 text-sm leading-6"><h2 className="font-bold text-[#087dc1]">{view.period}</h2>{!view.assigned ? <p>담당 선생님 배정 중이에요. 독후감은 먼저 작성할 수 있어요.</p> : <><p className="mt-2 font-bold">이번 주 피드백 {u.total}권 중 {u.selected}권 선정, 남은 {u.available}권</p>{u.rollover > 0 && <p>이월 {u.rollover}권 포함</p>}<p>이번 달 피드백 {u.used}/{u.limit}권 이용</p>{u.pending > 0 && <p>피드백을 기다리는 글 {u.pending}권</p>}<p className="mt-2">제출·신청 마감 {cutoffLabel(view.cutoff)} · 피드백 예정 {dateLabel(view.due)}</p><p className="text-[#657580]">{!view.active ? "프로 이용이 종료되었어요." : u.used >= u.limit ? "이번 달 피드백을 모두 받았어요. 다음 달에 다시 시작해요. 독후감은 계속 작성할 수 있어요." : u.available <= 0 ? "이번 주 피드백받을 글이 모두 정해졌어요. 독후감은 계속 작성할 수 있어요." : `${cutoffLabel(view.cutoff)}까지 피드백받을 글을 골라 주세요. 남은 자리는 최근에 제출한 글부터 자동으로 골라요.`}</p>{view.cases.some(c => c.secondDeadline && !c.closed && !c.secondSubmitted) && <p>진행 중인 2차 글은 추가 신청 없이 이어서 작성할 수 있어요.</p>}</>}</section>
}
export function ProFeedbackAction({ db, reviewId, round, submitted, compact = false }: { db: ReviewDatabase; reviewId: string; round: number; submitted: boolean; compact?: boolean }) {
  const [confirm, setConfirm] = React.useState<"apply" | "cancel" | null>(null), [busy, setBusy] = React.useState(false), [error, setError] = React.useState("")
  const view = db.studentPro, c = view?.cases.find(c => c.reviewId === reviewId)
  if (!view) return null
  if (!c) return submitted && !view.assigned ? <p className="text-xs text-slate-500">담당 선생님 배정 중</p> : null
  const execute = async () => { if (!confirm || busy) return; setBusy(true); try { await commandPro({ type: confirm, reviewId }, "student"); setConfirm(null) } catch (e) { setError(e instanceof Error ? e.message : "처리에 실패했어요.") } finally { setBusy(false) } }
  return <div className={`relative z-20 ${compact ? "max-w-64 text-xs" : "my-3 text-sm"}`}>
    {c.secondDeadline && <p className="mb-2 text-[#147fbd]">{c.expired ? "2차 제출 기한이 종료되었어요. 저장한 초안은 읽기만 할 수 있어요." : `2차 제출 기한: ${dateLabel(c.secondDeadline)} · 추가 차감 없음`}</p>}
    {round === 1 && submitted && !c.firstSent && <><p className="mb-1 text-slate-500">{c.autoExpected ? "자동 선정 예정" : c.reason}</p>{c.selected ? <span className="font-semibold text-[#147fbd]">피드백 대상 · {c.period}</span> : <button type="button" disabled={!c.canApply || busy} className="rounded-md border border-[#0077cb] bg-[#0077cb] px-3 py-2 font-bold text-white disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500" onClick={() => setConfirm("apply")}>피드백 신청</button>}{c.canCancel && <button className="ml-2 rounded-md border border-slate-300 bg-white px-3 py-2" onClick={() => setConfirm("cancel")}>신청 취소</button>}</>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {confirm && <ConfirmModal title={confirm === "apply" ? "피드백 신청" : "신청 취소"} description={confirm === "apply" ? "이 글로 선생님 피드백을 신청할까요? 이용 권수는 1차 피드백을 받을 때 사용돼요." : "신청을 취소할까요? 취소한 글도 마감 시 자동 선정될 수 있어요."} confirmLabel={confirm === "apply" ? "신청하기" : "신청 취소"} busy={busy} onClose={() => !busy && setConfirm(null)} onConfirm={() => void execute()}/>}
  </div>
}
export function ProSubmissionPrompt({ db, reviewId }: { db: ReviewDatabase; reviewId: string }) {
  const [open, setOpen] = React.useState(false), [busy, setBusy] = React.useState(false), [error, setError] = React.useState("")
  React.useEffect(() => { const key = `pro-submit-prompt:${reviewId}`; if (sessionStorage.getItem(key)) { sessionStorage.removeItem(key); setOpen(true) } }, [reviewId])
  const view = db.studentPro, c = view?.cases.find(c => c.reviewId === reviewId)
  if (!open || !view) return null
  const title = db.reviews.find(r => r.id === reviewId)?.bookTitle
  return <ConfirmModal title="독후감을 제출했어요" confirmLabel="이 글로 신청" busy={busy} confirmDisabled={!c?.canApply} onClose={() => setOpen(false)} onConfirm={async () => { if (!c?.canApply || busy) return; setBusy(true); try { await commandPro({ type: "apply", reviewId }, "student"); setOpen(false) } catch (e) { setError(String(e)) } finally { setBusy(false) } }} description={<span className="block text-base leading-7">{title}<br/>{c?.canApply ? `이 글로 선생님 피드백을 받을까요? 이번 주 남은 ${view.usage.available}권` : c?.reason || "담당 선생님 배정 중이에요."}<br/>{c?.autoExpected && "현재는 이 글이 자동 선정될 예정이에요."}<br/>피드백 예정 {dateLabel(view.due)}<br/><Link className="text-blue-600 underline" href="/student/exploration-record?tab=workbook">다른 글 고를게요</Link>{error && <span role="alert">{error}</span>}</span>}/>
}
