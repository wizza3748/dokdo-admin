"use client"
import * as React from "react"
import Image from "next/image"
import { createPortal } from "react-dom"
import { ReviewIcon, type ReviewIconName } from "./review-design-icons"
import type { ReviewDatabase } from "@/lib/review-domain"
import { getWorkbookForReview } from "@/lib/student-workbooks"
import { proRemainingText, proRolloverText, proStudentDate, studentProCopy } from "@/lib/student-pro-presentation"
import ui from "./pro-feedback.module.css"

export type FeedbackAction = "apply" | "cancel" | "change"
function FeedbackDialog({ title, descriptionId, busy = false, onClose, children, footer, bodyClassName = "" }: {
  title: string; descriptionId?: string; busy?: boolean; onClose: () => void;
  children: React.ReactNode; footer: React.ReactNode; bodyClassName?: string;
}) {
  const dialog = React.useRef<HTMLDialogElement>(null)
  const titleId = React.useId()
  React.useEffect(() => {
    const element = dialog.current!
    const focus = document.activeElement as HTMLElement | null
    element.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { element.close(); document.body.style.overflow = previousOverflow; focus?.focus() }
  }, [])
  return createPortal(<dialog ref={dialog} className={ui.dialog} aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy} onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <header className={ui.modalHeader}><h2 id={titleId}>{title}</h2><button type="button" className={ui.close} aria-label="닫기" disabled={busy} onClick={onClose}><ReviewIcon name="close" size={24}/></button></header>
    <div className={`${ui.modalBody} ${bodyClassName}`}>{children}</div>
    <footer className={ui.modalFooter}>{footer}</footer>
  </dialog>, document.body)
}

export function ProFeedbackHelpModal({ view, onClose }: { view: NonNullable<ReviewDatabase["studentPro"]>; onClose: () => void }) {
  const u = view.usage
  const guides: {icon: ReviewIconName; title: string; description: string}[] = [
    { icon: "send", title: studentProCopy.requestTitle, description: studentProCopy.request },
    { icon: "calendarCheck", title: studentProCopy.selectionTitle, description: studentProCopy.selection },
    { icon: "rotate", title: studentProCopy.changeTitle, description: studentProCopy.change },
    { icon: "edit", title: studentProCopy.usageTitle, description: studentProCopy.usage },
  ]
  return <FeedbackDialog title={studentProCopy.summaryTitle} onClose={onClose} bodyClassName={ui.helpBody} footer={<button type="button" onClick={onClose}>확인</button>}>
    <div className={ui.usage}>
      <div className={ui.usageHeading}><h3>{Number(u.month.slice(5))}월 피드백 이용</h3><p aria-label={`${u.limit}권 중 ${u.used}권 사용`}><strong>{u.used}</strong> / {u.limit}권 사용</p></div>
      <div className={ui.usageSegments} role="meter" aria-label="월 피드백 이용" aria-valuenow={u.used} aria-valuemin={0} aria-valuemax={Math.max(u.limit,u.used)}>{Array.from({length:Math.max(1,u.limit)},(_,index)=><span key={index} data-used={index<u.used}/>)}</div>
    </div>
    <ul className={ui.helpGuides}>{guides.map(({icon,title,description})=><li key={title}><span className={ui.guideIcon} aria-hidden="true"><ReviewIcon name={icon} size={18}/></span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ul>
    {u.used >= u.limit && view.cases.some(c => c.secondDeadline && !c.closed && !c.secondSubmitted) && <p className={ui.description}>요청받은 2차 글은 정해진 기한까지 제출할 수 있어요.</p>}
    {u.used >= u.limit && view.cases.some(c => c.secondDeadline && !c.closed && c.secondSubmitted) && <p className={ui.description}>제출한 2차 글은 선생님의 피드백을 기다려 주세요.</p>}
  </FeedbackDialog>
}

export function ProFeedbackModal({ db, reviewId, action, busy, candidates, onClose, onConfirm }: {
  db: ReviewDatabase; reviewId: string; action: FeedbackAction; busy: boolean; candidates: string[];
  onClose: () => void; onConfirm: (previousReviewId?: string) => void;
}) {
  const descriptionId = React.useId()
  // Snapshot the candidates at entry; final authority remains the server, not this modal.
  const [selected, setSelected] = React.useState(candidates.length === 1 ? candidates[0] : "")
  const view = db.studentPro!
  const common = db.reviews.find(r => r.id === reviewId)!
  const c = view.cases.find(item => item.reviewId === reviewId)
  const rollover = proRolloverText(view.usage)
  const singleChange = action === "change" && candidates.length === 1
  const previous = singleChange ? db.reviews.find(r => r.id === selected) : undefined
  const previousRecord = singleChange ? db.records.find(r => r.reviewId === selected && r.round === 1) : undefined
  return <FeedbackDialog title={action === "change" ? "피드백 신청 바꾸기" : action === "apply" ? "피드백 신청" : "피드백 신청 취소"} descriptionId={descriptionId} busy={busy} onClose={onClose} bodyClassName={action === "change" && !singleChange ? ui.changeBody : ui.confirmBody} footer={<><button type="button" disabled={busy} onClick={onClose}>{action === "cancel" ? "유지하기" : "돌아가기"}</button><button type="button" disabled={busy || (action === "change" && !selected)} onClick={() => onConfirm(selected || undefined)}>{action === "change" ? "바꾸기" : action === "apply" ? "신청하기" : "신청 취소"}</button></>}>
      {singleChange ? <>
        <div className={ui.changeFlow}>
          <div className={ui.changeBook}><span>신청 취소</span><strong className={ui.modalTag}>{previous?.bookTitle}</strong>{previousRecord?.submittedAt && <small>{proStudentDate(previousRecord.submittedAt, view.now)} 제출</small>}</div>
          <ReviewIcon name="down" size={16} className={ui.changeArrow}/>
          <div className={ui.changeBook}><span>새로 신청</span><strong className={ui.modalTag}>{common.bookTitle}</strong></div>
        </div>
        <p id={descriptionId}>신청한 독후감 대신 이 글로 피드백을 받을까요?</p>
      </> : action === "change" ? <>
        <div className={ui.newBook}>새로 신청 <strong className={ui.modalTag}>{common.bookTitle}</strong></div>
        <p id={descriptionId} className={ui.changeQuestion}>{candidates.length === 1 ? "신청한 독후감 대신 이 글로 피드백을 받을까요?" : "어느 독후감의 신청을 취소할까요?"}</p>
        <div role="radiogroup" aria-label="취소할 기존 신청" className={ui.candidates}>{candidates.map(id => {
          const old = db.reviews.find(r => r.id === id)
          const record = db.records.find(r => r.reviewId === id && r.round === 1)
          if (!old || !record) return null
          return <button key={id} type="button" role="radio" aria-checked={selected === id} disabled={busy} className={ui.candidate} onClick={() => setSelected(id)} onKeyDown={event => {
            if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key) || busy) return
            event.preventDefault()
            const offset = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1
            const next = (candidates.indexOf(id) + offset + candidates.length) % candidates.length
            setSelected(candidates[next]); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
          }}><Image src={getWorkbookForReview(old).coverSrc} alt="" width={36} height={50}/><span className={ui.candidateText}><strong>{old.bookTitle}</strong><small>{record.submittedAt ? `${proStudentDate(record.submittedAt, view.now)} 제출` : "제출 완료"}</small></span>{selected === id && <em>신청 취소</em>}</button>
        })}</div>
      </> : <>
        <div className={ui.modalTags}><strong className={ui.modalTag}>《{common.bookTitle}》</strong></div>
        <p id={descriptionId}>{action === "apply" ? "이 독후감으로 피드백을 신청할까요?" : "이 독후감의 피드백 신청을 취소할까요?"}</p>
        <div className={ui.modalMetaGroup}>
          {action === "apply" && <p className={ui.modalMeta}><ReviewIcon name="document" size={14}/><span className={ui.remaining}>{proRemainingText(view.usage.available)}{rollover && <span className={ui.rollover}>{rollover}</span>}</span></p>}
          <p className={ui.modalMeta}><ReviewIcon name={action === "apply" ? "calendar" : "info"} size={14}/><span>{action === "apply" ? `피드백 예정일은 ${proStudentDate(c?.due ?? view.due, view.now)}이에요.` : studentProCopy.cancelNotice}</span></p>
        </div>
      </>}
  </FeedbackDialog>
}
