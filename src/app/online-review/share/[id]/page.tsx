"use client"
import * as React from "react"
import { useReviews } from "@/lib/review-client"
import { ReviewResult } from "@/components/student/student-review-flow"

export default function SharedReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const hook = useReviews("external", id)
  const [round, setRound] = React.useState<number | null>(null)
  const shared = hook.db.records.find(r => r.id === id)
  const common = hook.db.reviews.find(r => r.id === shared?.reviewId)
  const records = hook.db.records.filter(r => r.reviewId === common?.id)
  const record = records.find(r => r.round === round) ?? shared
  if (!hook.loaded) return <p className="p-8">독후감 불러오는 중…</p>
  if (!common || !record) return <p role="alert" className="p-8">공유된 독후감을 조회할 수 없습니다.</p>
  return <div className="min-h-screen bg-slate-50"><header className="border-b bg-white p-5 text-center font-bold">온라인 독후감 · {common.studentName}</header><ReviewResult common={common} record={record} records={records} hook={hook} setRound={setRound} external /></div>
}
