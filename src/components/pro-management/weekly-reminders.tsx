"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { ReviewDialog } from "@/components/online-workbooks/review-ui"
import { dateLabel, kstDate, weekLabel, weekStart } from "@/lib/pro-calendar"
import { reminderCopy, type weeklyStudent } from "@/lib/pro-selectors"
import { weeklyDate, weeklyReminderItems } from "@/lib/pro-weekly-presentation"
import { ProBadge, type useProManagement } from "./pro-common"

export function WeeklyReminders({ hook, row, week }: {
  hook: ReturnType<typeof useProManagement>; row: ReturnType<typeof weeklyStudent>; week: string;
}) {
  const [selection, setSelection] = React.useState<{ kind: "submission" | "revision"; sequence: 1 | 2 } | null>(null)
  const [copied, setCopied] = React.useState(false), [manual, setManual] = React.useState(false)
  const [copyMessage, setCopyMessage] = React.useState("")
  const trigger = React.useRef<HTMLButtonElement | null>(null)
  const pro = hook.db.pro!, items = weeklyReminderItems(hook.db, row, week)
  const selected = selection && items.find(item => item.kind === selection.kind && item.sequence === selection.sequence)
  const records = pro.reminders.filter(r => r.studentId === row.member.id && r.week === week && !r.cancelledAt)
  const record = selected?.record
  const isCurrentWeek = week === weekStart(pro.clock)
  const previousMissing = selection?.sequence === 2 && !records.some(r => r.kind === selection.kind && r.sequence === 1)
  const laterRecorded = selection?.sequence === 1 && records.some(r => r.kind === selection.kind && r.sequence === 2)
  const canCancel = record && kstDate(record.at) === kstDate(pro.clock) && !laterRecorded
  const text = selected ? reminderCopy(hook.db, row.member, selected.kind, week, record?.at) : ""
  const close = () => { setSelection(null); trigger.current?.focus() }
  const show = (item: typeof items[number], button: HTMLButtonElement) => {
    trigger.current = button; setSelection({ kind: item.kind, sequence: item.sequence })
    setCopied(false); setManual(false); setCopyMessage(""); hook.setMessage("")
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text); setCopied(true)
      setCopyMessage(record ? "안내 문구를 복사했습니다." : "복사했습니다. 카톡에 보낸 뒤 '보냈어요'를 눌러 주세요.")
    } catch {
      setCopied(false); setCopyMessage("복사하지 못했습니다. 문구를 직접 복사해 보내신 뒤 '이미 보낸 독려 기록'을 이용해 주세요.")
    }
  }
  return <>
    <div className="space-y-2">{(["submission", "revision"] as const).map(kind => {
      const group = items.filter(item => item.kind === kind)
      if (!group.length) return null
      return <div key={kind} role="group" aria-label={group[0].label} className="space-y-1">
        {(items.length > 2 || kind === "revision") && <p className="text-xs text-slate-600">{group[0].label}</p>}
        <div className="flex flex-wrap gap-1.5">{group.map(item => <button key={item.sequence} type="button"
          aria-label={`${row.member.name} ${item.label} ${item.buttonLabel}`} aria-haspopup="dialog"
          className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${item.record ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : item.late ? "border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"}`}
          onClick={event => show(item, event.currentTarget)}>{item.buttonLabel}</button>)}</div>
      </div>
    })}{!items.length && <span className="text-slate-400">-</span>}
    </div>
    {selected && selection && <ReviewDialog variant="form" title={`${row.member.name} · ${selected.label}`} onClose={close} busy={hook.busy}
      onConfirm={!hook.readOnly && !record ? async () => { if (await hook.runPro({ type: "reminder", studentId: row.member.id, week, ...selection })) close() } : undefined}
      confirmLabel={manual ? "발송 기록 저장" : "보냈어요"} disabled={!isCurrentWeek || previousMissing || !(copied || manual)}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2"><ProBadge tone={record ? "green" : "blue"}>{selected.sequence}회 {record ? "완료" : "예정"}</ProBadge><strong>예정일 {weeklyDate(selected.due)}</strong><span className="text-slate-500">{weekLabel(week)}</span></div>
        {row.member.assignedAt && weekStart(row.member.assignedAt) === week && <p className="text-slate-500">배정 주 제외: 이번 주는 제출 독려 대상에 포함하지 않습니다.</p>}
        {record ? <div className="rounded-lg bg-emerald-50 p-3 text-emerald-900"><p>발송 기록 {dateLabel(record.at)} · {record.actor}</p>{!manual && <p className="mt-1 text-xs">아래는 기록 시점의 데이터로 만든 안내 문구이며, 실제 카톡 발송 내용은 아닙니다.</p>}</div> : manual ? <p className="text-slate-600">이미 카톡으로 보낸 독려만 기록해 주세요.</p> : <p className="text-slate-600">문구를 복사해 카톡으로 직접 보낸 뒤 <strong>보냈어요</strong>를 눌러 주세요.</p>}
        {!manual && <div><p className="mb-2 font-semibold">안내 문구</p><textarea aria-label="제출 독려 문구" readOnly value={text} rows={11} className="block w-full resize-y rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm leading-6"/></div>}
        {!hook.readOnly && !manual && <Button variant="outline" disabled={hook.busy} onClick={copy}>문구 복사</Button>}
        {!record && (!isCurrentWeek ? <p className="text-amber-700">지난 주에는 새 발송 기록을 추가할 수 없습니다.</p> : previousMissing ? <p className="text-amber-700">같은 종류의 1회 발송부터 기록해 주세요.</p> : null)}
        {(copyMessage || hook.error || hook.messageKind === "error" && hook.message) && <p role="status" className="rounded bg-blue-50 p-3">{hook.error || (hook.messageKind === "error" ? hook.message : "") || copyMessage}</p>}
        <details className="border-t border-slate-200 pt-3"><summary className="cursor-pointer text-xs text-slate-600">발송 이력 · 기록 관리</summary><div className="mt-3 space-y-3">
          {records.length ? records.map(r => <p key={r.id}>{r.kind === "submission" ? "1차" : "2차"} 제출 독려 · {r.sequence}회 · {dateLabel(r.at)} · {r.actor}</p>) : <p className="text-slate-500">발송 기록이 없습니다.</p>}
          {!hook.readOnly && record && <><Button size="sm" variant="outline" disabled={hook.busy || !canCancel} onClick={() => { void hook.runPro({ type: "cancel-reminder", id: record.id }) }}>선택 기록 취소</Button><p className="text-xs text-slate-500">{laterRecorded ? "2회 기록을 먼저 취소해 주세요." : "기록한 한국 날짜 안에서만 취소할 수 있습니다."}</p></>}
          {!hook.readOnly && !record && <Button size="sm" variant="outline" disabled={hook.busy || !isCurrentWeek || previousMissing} onClick={() => { setManual(true); setCopyMessage("이미 카톡으로 보낸 독려만 기록해 주세요.") }}>이미 보낸 독려 기록</Button>}
        </div></details>
      </div>
    </ReviewDialog>}
  </>
}
