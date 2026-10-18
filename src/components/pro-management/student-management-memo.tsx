"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import type { ProMember } from "@/lib/pro-types"
import type { useProManagement } from "./pro-common"
import styles from "./pro-management.module.css"

export function StudentManagementMemo({ hook, member }: { hook: ReturnType<typeof useProManagement>; member: ProMember }) {
  const [draft, setDraft] = React.useState<{ text: string; revision: string | null } | null>(null)
  const saved = member.managementMemo
  const text = draft?.text ?? saved?.text ?? ""
  const changed = draft !== null && text !== (saved?.text ?? "")
  const save = async () => {
    if (!draft || !changed || hook.busy || hook.readOnly) return
    if (await hook.runPro({ type: "management-memo", studentId: member.id, text: draft.text, expectedRevision: draft.revision })) setDraft(null)
  }
  return <section className={styles.studentSection} aria-label="관리 메모">
    <div className={styles.studentSectionHeader}><h2 id="management-memo-label">관리 메모</h2>{!hook.readOnly && <Button size="sm" disabled={hook.busy || !changed} onClick={() => void save()}>저장</Button>}</div>
    <div className={styles.managementMemoBody}>
      <textarea aria-labelledby="management-memo-label" rows={5} readOnly={hook.readOnly} disabled={hook.busy}
        className="min-h-36 w-full resize-y rounded-md border border-slate-300 bg-white p-3 text-sm leading-6 outline-blue-600 disabled:opacity-70"
        value={text} onChange={event => setDraft(previous => ({ text: event.target.value, revision: previous ? previous.revision : saved?.revision ?? null }))}
        placeholder="학생 관리에 필요한 내용을 입력하세요."/>
    </div>
  </section>
}
