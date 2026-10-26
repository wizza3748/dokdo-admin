"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Pencil } from "lucide-react"
import type { OnlineWorkbook } from "@/lib/online-workbooks"
import { commandPro } from "@/lib/pro-client"
import { proDesignationPreview, type ProDesignationPreview } from "@/lib/pro-domain"
import { readReviews } from "@/lib/review-client"
import { reviewDesignationCopy } from "@/lib/review-list-presentation"
import { cn } from "@/lib/utils"
import { ReviewDialog } from "./review-ui"
import { ReviewDesignationDetails } from "./review-designation-details"

export function FeedbackAction({ record, role, returnTo }: { record: OnlineWorkbook; role: "agency" | "class"; returnTo: string }) {
  const router = useRouter()
  const [dialog, setDialog] = React.useState<ProDesignationPreview | null>(null)
  const [busy, setBusy] = React.useState(false)
  const pending = React.useRef(false)
  const trigger = React.useRef<HTMLButtonElement>(null)
  const action = record.status === "작성전" ? "작성" : record.status === "작성완료" ? "수정" : "보기"
  const returnParams = new URLSearchParams(returnTo.split("?")[1])
  const studentTest = returnParams.get("studentTest")
  const href = `/agency/online-workbooks/${record.id}?role=${role}${returnParams.get("demoAgency") === "other-agency" ? "&demoAgency=other-agency" : ""}${studentTest ? `&studentTest=${encodeURIComponent(studentTest)}` : ""}&returnTo=${encodeURIComponent(returnTo)}`
  const label = `${record.studentName} 피드백 ${action}, AI 사용 ${record.aiUsed}/2회`
  const className = "inline-flex items-center gap-2 font-medium text-blue-600 hover:underline"
  const contents = <><Pencil className={cn("size-4", record.status !== "전송완료" ? "text-blue-600" : "text-slate-400")} /><span className="tabular-nums">({record.aiUsed}/2)</span></>
  const close = React.useCallback(() => { if (!pending.current) { setDialog(null); trigger.current?.focus() } }, [])
  const enter = async () => {
    if (pending.current) return
    pending.current = true; setBusy(true)
    try {
      const db = await readReviews(role, undefined, { fresh: true })
      const c = db.pro?.cases.find(item => item.reviewId === record.reviewId)
      if (c?.selectedAt) { router.push(href); return }
      setDialog(role !== "agency" ? { issue: "기관관리자만 피드백 대상을 지정할 수 있습니다." } : proDesignationPreview(db, record.reviewId ?? ""))
    } catch { setDialog({ issue: "지정 가능 여부를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." }) }
    finally { pending.current = false; setBusy(false) }
  }
  const designate = async () => {
    if (pending.current || !record.reviewId || dialog?.issue) return
    pending.current = true; setBusy(true)
    try {
      await commandPro({ type: "designate", reviewId: record.reviewId }, role)
      setDialog(null); router.push(href)
    } catch (error) { setDialog({ issue: error instanceof Error ? error.message : "대상 지정에 실패했습니다. 다시 시도해 주세요." }) }
    finally { pending.current = false; setBusy(false) }
  }
  // Selection-path '-' is still a selected target. Ordinary and selected records keep their existing link.
  if (!record.pro || record.pro.selected) return <Link href={href} aria-label={label} className={className}>{contents}</Link>
  return <>
    <button ref={trigger} type="button" disabled={busy} aria-label={label} className={className} onClick={() => void enter()}>{contents}</button>
    {dialog && createPortal(<ReviewDialog triggerRef={trigger} title={dialog.issue ? reviewDesignationCopy.blockedTitle : reviewDesignationCopy.title} busy={busy} closeLabel={dialog.issue ? "확인" : "취소"} onClose={close} onConfirm={dialog.issue ? undefined : () => void designate()} confirmLabel="지정하고 작성">
      <ReviewDesignationDetails preview={dialog} />
    </ReviewDialog>, document.body)}
  </>
}
