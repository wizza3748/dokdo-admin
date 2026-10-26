"use client"

import * as React from "react"
import { Dialog } from "radix-ui"
import { Clock3, FileText, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { commandReview, notifyReviewChange, type ReviewRole } from "@/lib/review-client"
import { feedbackScheduleRevision, feedbackScheduleSnapshot, type FeedbackSchedule, type FeedbackScheduleSnapshot } from "@/lib/review-schedule"
import { feedbackScheduleDate } from "@/lib/review-schedule-presentation"
import { feedbackScheduleInput, feedbackScheduleNotices, invalidFeedbackScheduleTime } from "@/lib/review-schedule-form"
import type { ReviewCommon, ReviewRecord } from "@/lib/review-domain"
import { cn } from "@/lib/utils"
import { ReviewText } from "./review-ui"

const scheduleState = { waiting: "예약 대기", sending: "전송 중", sent: "전송 완료", failed: "전송 실패", cancelled: "예약 취소" }

function SavedFeedback({ common, snapshot }: { common: ReviewCommon; snapshot: FeedbackScheduleSnapshot }) {
  return <section aria-label="예약 전송할 피드백" className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 text-slate-600 [&_strong]:mb-1 [&_strong]:block [&_strong]:text-xs [&_strong]:font-semibold [&_strong]:text-slate-500 [&_div.whitespace-pre-wrap]:leading-6">
    <div><strong>[학생용] 총평</strong><ReviewText value={snapshot.feedback}/></div>
    {snapshot.itemFeedback.filter(item => item.visible).map(item => <div key={item.itemId} className="border-t border-slate-100 pt-3"><strong>{common.template.items.find(value => value.id === item.itemId)?.title ?? "항목별 피드백"}</strong><ReviewText value={item.text}/></div>)}
    {snapshot.reportFeedback && <div className="border-t border-slate-100 pt-3"><strong>[보고서용] 총평</strong><ReviewText value={snapshot.reportFeedback}/></div>}
    {snapshot.report && <p>평가 보고서: {snapshot.report.score}점</p>}
  </section>
}

/** Scoped to reservation forms; other review dialogs retain their existing design. */
function ScheduleDialogFrame({ title, descriptionId, current, busy, disabled, onClose, onConfirm, children }: {
  title: string; descriptionId: string; current: boolean; busy: boolean; disabled: boolean;
  onClose: () => void; onConfirm: () => void; children: React.ReactNode;
}) {
  const [trigger] = React.useState(() => typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const buttonClass = "h-10 min-w-[84px] rounded-lg px-5 text-sm font-medium shadow-none"
  return <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose() }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[150] bg-slate-950/45" />
    <Dialog.Content aria-describedby={descriptionId}
      onEscapeKeyDown={event => { if (busy) event.preventDefault() }}
      onInteractOutside={event => event.preventDefault()}
      onCloseAutoFocus={event => { event.preventDefault(); if (trigger?.isConnected && trigger !== document.body) trigger.focus({ preventScroll: true }) }}
      className="fixed left-1/2 top-1/2 z-[151] flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white text-slate-700 shadow-2xl outline-none">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#0068ed]"><Clock3 className="size-5" /></span>
        <Dialog.Title className="min-w-0 flex-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</Dialog.Title>
        <Button type="button" variant="ghost" size="icon" aria-label="닫기" disabled={busy} onClick={onClose} className="rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="size-5" /></Button>
      </header>
      <div className="min-h-0 space-y-5 overflow-y-auto p-4 text-sm leading-6 sm:p-6">{children}</div>
      <footer className="flex shrink-0 justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6">
        <Button type="button" variant="outline" className={cn(buttonClass, "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")} disabled={busy} onClick={onClose}>{current ? "닫기" : "취소"}</Button>
        <Button type="button" className={cn(buttonClass, current ? "border border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50" : "bg-[#0068ed] text-white hover:bg-[#005bd1]")} disabled={disabled || busy} onClick={onConfirm}>{busy ? "처리 중…" : current ? "예약 취소" : "예약하기"}</Button>
      </footer>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
}

/** Shared academy form styling; the send button and its existing confirmation remain untouched. */
export function ReviewScheduleDialog({ common, record, schedule, role, due, now, fixedClock, onClose, onRefresh, onSuccess }: {
  common: ReviewCommon; record: ReviewRecord; schedule?: FeedbackSchedule; role: ReviewRole; due?: string; now: string; fixedClock?: boolean;
  onClose: () => void; onRefresh: () => Promise<void>; onSuccess: (message: string) => void;
}) {
  // Keep exactly the saved content shown at registration time; stale confirmations fail on the server.
  const [initial] = React.useState(() => ({ snapshot: feedbackScheduleSnapshot(common, record), revision: feedbackScheduleRevision(common, record), scheduleId: schedule?.id, schedule }))
  const current = initial.scheduleId ? record.feedbackSchedules?.find(item => item.id === initial.scheduleId) ?? initial.schedule : undefined
  const snapshot = current?.snapshot ?? initial.snapshot
  const [date, setDate] = React.useState("")
  const [time, setTime] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const pending = React.useRef(false)
  const [realNow, setRealNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (fixedClock) return
    const timer = window.setInterval(() => setRealNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [fixedClock])
  const scheduledAt = feedbackScheduleInput(date, time)
  const invalidTime = invalidFeedbackScheduleTime(date, time, fixedClock ? Date.parse(now) : realNow)
  const notices = feedbackScheduleNotices(record.round, snapshot.secondDecision, current?.scheduledAt ?? scheduledAt, due)
  const guidanceId = React.useId(), timeErrorId = React.useId(), timezoneId = React.useId()
  const canCancel = current?.status === "waiting" || current?.status === "failed"
  const submit = async () => {
    if (pending.current || (!current && (!scheduledAt || invalidTime))) return
    pending.current = true; setBusy(true); setError("")
    try {
      await commandReview(current
        ? { type: "cancel-feedback-schedule", recordId: record.id, scheduleId: current.id }
        : { type: "schedule-feedback", recordId: record.id, scheduledAt: scheduledAt!, expectedRevision: initial.revision }, role)
      await onRefresh()
      onSuccess(current ? "피드백 전송 예약을 취소했습니다." : "피드백 전송을 예약했습니다.")
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "예약을 처리하지 못했습니다.")
      notifyReviewChange()
      await onRefresh()
    } finally { pending.current = false; setBusy(false) }
  }
  return <ScheduleDialogFrame title={current ? "피드백 예약 전송 확인" : "피드백 예약 전송"} descriptionId={guidanceId} current={!!current} busy={busy}
    onClose={onClose} disabled={current ? !canCancel : !scheduledAt || invalidTime} onConfirm={() => void submit()}>
      <section aria-label="예약 전송 안내" className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/80 p-4 text-blue-900">
        <Info aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-[#0068ed]" />
        <div className="min-w-0 space-y-2">
          <p id={guidanceId} className="font-semibold">{notices[0]}</p>
          {notices.length > 1 && <ul className="list-disc space-y-1 pl-4 text-[13px] leading-6 text-blue-900/80">{notices.slice(1).map(message => <li key={message}>{message}</li>)}</ul>}
          {!current && invalidTime && <p id={timeErrorId} role="alert" className="border-t border-blue-100 pt-2 font-medium text-rose-700">현재보다 늦은 날짜와 시간을 선택해 주세요.</p>}
        </div>
      </section>
      {error && <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700">{error}</p>}
      <dl aria-label="예약 대상 정보" className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-lg bg-slate-50 px-4 py-3 [&_dt]:text-slate-500 [&_dd]:break-words [&_dd]:font-medium [&_dd]:text-slate-800">
        <dt>학생명</dt><dd>{common.studentName}</dd>
        <dt>도서명</dt><dd>{common.bookTitle}</dd>
        <dt>차수</dt><dd>{record.round}차</dd>
        {record.round === 1 && <><dt>1차 처리 방식</dt><dd>{snapshot.secondDecision === "request" ? "2차 작성 요청" : "1차 완료"}</dd></>}
        {!current && <><dt>피드백 처리 기한</dt><dd>{due ? feedbackScheduleDate(due, true) : "-"}</dd></>}
      </dl>
      {current ? <>
        <section aria-label="예약 정보" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-800">예약 일시</h3><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", current.status === "failed" ? "bg-rose-50 text-rose-700" : current.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>{scheduleState[current.status]}</span></div>
          <p className="flex items-center gap-2 font-medium tabular-nums text-slate-900"><Clock3 aria-hidden="true" className="size-4 shrink-0 text-slate-400" />{feedbackScheduleDate(current.scheduledAt, true)}</p>
          <p className="text-xs text-slate-500">예약을 취소한 뒤 다시 등록해 주세요.</p>
          {current.status === "sending" && <p role="status" className="rounded-lg bg-blue-50 px-4 py-3 text-blue-700">피드백을 전송 중입니다. 완료 후 확인해 주세요.</p>}
          {current.status === "sent" && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-emerald-700">이미 전송된 피드백입니다.</p>}
          {current.status === "failed" && <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700">실패 사유: {current.failureReason}</p>}
        </section>
      </> : <>
        <section aria-label="예약 일시 선택" className="space-y-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-2 font-medium text-slate-800">예약 날짜 <span className="text-rose-600">*</span><Input type="date" aria-label="예약 날짜" aria-invalid={invalidTime} aria-describedby={invalidTime ? timeErrorId : timezoneId} className="h-11 rounded-lg border-slate-200 bg-white shadow-none" required value={date} disabled={busy} onChange={event => setDate(event.target.value)}/></label>
            <label className="space-y-2 font-medium text-slate-800">예약 시간 <span className="text-rose-600">*</span><Input type="time" aria-label="예약 시간" aria-invalid={invalidTime} aria-describedby={invalidTime ? timeErrorId : timezoneId} className="h-11 rounded-lg border-slate-200 bg-white shadow-none" step={60} required value={time} disabled={busy} onChange={event => setTime(event.target.value)}/></label>
          </div>
          <p id={timezoneId} className="text-xs text-slate-500">한국 시간</p>
        </section>
      </>}
      <div><h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-800"><FileText aria-hidden="true" className="size-4 text-slate-400" />{current ? "예약 전송할 피드백" : "저장된 피드백"}</h3><SavedFeedback common={common} snapshot={snapshot}/></div>
  </ScheduleDialogFrame>
}
