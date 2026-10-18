"use client"

import * as React from "react"
import { proSecondDeadlineText, studentProCopy } from "@/lib/student-pro-presentation"
import { useRouter } from "next/navigation"
import type { useReviews } from "@/lib/review-client"
import { ConfirmModal } from "./student-workbook-ui"

/** Both entry points create the second draft only after the student confirms. */
export function SecondReviewStartModal({ recordId, sourceWorkbookId, run, onClose, onStarted, deadline, reference }: {
  deadline?: string
  reference?: string
  recordId: string
  sourceWorkbookId: string
  run: ReturnType<typeof useReviews>["run"]
  onClose: () => void
  onStarted?: () => void
}) {
  const router = useRouter()
  const pending = React.useRef(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  const confirm = async () => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError("")
    try {
      const next = await run({ type: "start-second", recordId })
      if (!next) {
        setError("2차 작성을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.")
        return
      }
      router.push(`/student/online-workbook/${sourceWorkbookId}?round=2`)
      onClose()
      onStarted?.()
    } catch {
      setError("2차 작성을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.")
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return <ConfirmModal title="2차 작성 시작" description={<>선생님의 피드백을 반영해 2차 작성을 시작할까요?<br />작성 중에는 저장하고 이어서 쓸 수 있어요.{deadline && <span className="mt-3 block text-base"><span className="block">{proSecondDeadlineText(deadline, reference ?? new Date().toISOString())}</span><span className="block">{studentProCopy.secondUsage}</span></span>}{error && <span role="alert" className="mt-3 block text-sm text-red-600">{error}</span>}</>} confirmLabel={busy ? "시작하는 중…" : "2차 작성하기"} busy={busy} onClose={() => { if (!pending.current) onClose() }} onConfirm={() => void confirm()} />
}
