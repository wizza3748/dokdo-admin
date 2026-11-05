"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addDays, kstDate, managementMonth, monthWeeks, weekLabel, weekStart } from "@/lib/pro-calendar"
import { ADMIN_PRO_WEEKLY_TITLE } from "@/lib/admin-navigation"
import { sortWeeklyInstitutions, weeklyDateTime, weeklyEnd, weeklyNumber, weeklyPage, type AdminWeeklySummary, type WeeklySort, type WeeklyStudent } from "@/lib/admin-pro-weekly"
import { panel, field, ProBadge } from "./pro-common"
import { ProHelp } from "./pro-help"
import shared from "./pro-management.module.css"
import styles from "./admin-weekly.module.css"

type Section = "assigned" | "ended" | "academies"
type Status = "loading" | "retrying" | "ready" | "error"
const sections: Section[] = ["assigned", "ended", "academies"]
const help = {
  assigned: ["조회한 주에 프로 관리 대상으로 새로 배정된 학생입니다.", "같은 주에 관리가 종료된 학생도 포함됩니다.", "관리가 이어지는 학원 변경은 신규 배정으로 세지 않습니다."],
  ended: ["조회한 주에 프로 이용이 종료되거나 매칭 학원 연결이 해제된 학생입니다.", "관리가 이어지는 학원 변경은 관리 종료로 세지 않습니다."],
  current: ["매칭 학원에 배정되어 관리 중인 프로 학생 수입니다.", "피드백을 진행한 횟수와 관계없이 집계합니다.", "지난 주차는 해당 주 일요일 종료 시점의 인원입니다.", "이번 주는 현재 조회 시각의 인원이며, 일요일 종료 시점에 확정됩니다.", "학원이 변경된 학생은 집계 기준 시점의 학원에만 포함됩니다."],
  average: ["조회한 주가 속한 관리월의 확정 주차별 관리 인원 평균입니다.", "확정된 관리 인원이 0명인 주차는 계산에 포함합니다."],
}
const columns: { key: WeeklySort; title: string }[] = [
  { key: "name", title: "매칭 학원" }, { key: "previous", title: "이전 주 관리 인원" }, { key: "current", title: "조회 주 관리 인원" },
  { key: "assigned", title: "신규 배정" }, { key: "ended", title: "관리 종료" }, { key: "average", title: "월평균 관리 인원" },
]

export function AdminWeeklyManagement({ initialNow }: { initialNow: string }) {
  const [week, setWeek] = React.useState(() => weekStart(initialNow))
  const [data, setData] = React.useState<AdminWeeklySummary | null>(null)
  const [status, setStatus] = React.useState<Record<Section, Status>>({ assigned: "loading", ended: "loading", academies: "loading" })
  const [sort, setSort] = React.useState<{ key: WeeklySort; direction: "asc" | "desc" }>({ key: "current", direction: "desc" })
  const [page, setPage] = React.useState(1), [size, setSize] = React.useState(20)
  const [openedHelp, setOpenedHelp] = React.useState<string | null>(null)
  const assignedScroll = React.useRef<HTMLDivElement>(null), endedScroll = React.useRef<HTMLDivElement>(null)
  const requestId = React.useRef(0)
  const busy = React.useRef(new Set<Section>())

  const load = React.useCallback(async (selected: string, section?: Section, signal?: AbortSignal) => {
    const requested = section ? [section] : sections, generation = requestId.current
    if (section && busy.current.has(section)) return
    requested.forEach(key => busy.current.add(key))
    setStatus(previous => ({ ...previous, ...Object.fromEntries(requested.map(key => [key, section ? "retrying" : "loading"])) }))
    try {
      const response = await fetch(`/api/mock/admin-pro-weekly?week=${encodeURIComponent(selected)}`, { cache: "no-store", signal })
      if (!response.ok) throw new Error("조회 실패")
      const next = await response.json() as AdminWeeklySummary
      if (generation !== requestId.current || signal?.aborted) return
      setData(previous => section && previous ? { ...previous, [section]: next[section], asOf: next.asOf, current: next.current, currentWeek: next.currentWeek, confirmedWeeks: next.confirmedWeeks, monthInProgress: next.monthInProgress } : next)
      setStatus(previous => ({ ...previous, ...Object.fromEntries(requested.map(key => [key, "ready"])) }))
    } catch {
      if (generation !== requestId.current || signal?.aborted) return
      setStatus(previous => ({ ...previous, ...Object.fromEntries(requested.map(key => [key, "error"])) }))
    } finally { if (generation === requestId.current) requested.forEach(key => busy.current.delete(key)) }
  }, [])

  React.useEffect(() => {
    requestId.current += 1
    busy.current.clear()
    const controller = new AbortController()
    void load(week, undefined, controller.signal)
    return () => { controller.abort(); requestId.current += 1 }
  }, [week, load])

  const currentWeek = data?.currentWeek ?? weekStart(initialNow), current = week === currentWeek
  const month = managementMonth(week), [year, monthNumber] = month.split("-")
  const snapshot = data?.week === week ? data : null
  const sorted = sortWeeklyInstitutions(snapshot?.academies ?? [], sort.key, sort.direction)
  const pagination = weeklyPage(sorted, page, size), loadingAcademies = status.academies === "loading" || status.academies === "retrying"
  const moveWeek = (offset: number) => {
    requestId.current += 1
    setWeek(addDays(week, offset)); setPage(1); setOpenedHelp(null)
    setStatus({ assigned: "loading", ended: "loading", academies: "loading" })
    assignedScroll.current?.scrollTo({ top: 0 }); endedScroll.current?.scrollTo({ top: 0 })
  }
  const averageHelp = [
    ...help.average,
    ...(snapshot ? [`전체 ${snapshot.totalWeeks}주 중 확정 ${snapshot.confirmedWeeks}주 반영`, ...(snapshot.confirmedWeeks === 0 ? ["확정된 주차가 없습니다."] : [])] : [`전체 ${monthWeeks(month).length}주 · 확정 주차 수를 불러오는 중입니다.`]),
  ]
  const info = (key: keyof typeof help, label: string) => <ProHelp label={`${label} 안내`} lines={key === "average" ? averageHelp : help[key]} open={openedHelp === key} onOpenChange={open => setOpenedHelp(open ? key : null)} constrainToViewport/>
  const messageRow = (section: Section, count: number, cols: number, empty: string) => {
    if (status[section] === "ready" && count) return null
    return <tr><td colSpan={cols}><div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
      {status[section] === "loading" || status[section] === "retrying" ? <><span role="status" className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin"/>불러오는 중…</span>{status[section] === "retrying" && <Button variant="outline" size="sm" disabled>다시 조회</Button>}</> : status[section] === "error" ? <><p role="alert">현황을 불러오지 못했습니다. 다시 조회해 주세요.</p><Button variant="outline" size="sm" onClick={() => void load(week, section)}>다시 조회</Button></> : <p>{empty}</p>}
    </div></td></tr>
  }
  const studentLink = (row: WeeklyStudent) => <Link className="text-blue-600 underline underline-offset-2 hover:text-blue-800" href={`/admin/b2c/students/${encodeURIComponent(row.id)}`}>{row.name}</Link>
  const institutionLink = (id: string, name: string) => <Link className="text-blue-600 underline underline-offset-2 hover:text-blue-800" href={`/admin/institutions/${encodeURIComponent(id)}`}>{name}</Link>
  const studentList = (section: "assigned" | "ended") => {
    const title = section === "assigned" ? "신규 배정" : "관리 종료", rows = snapshot?.[section] ?? []
    return <section aria-label={title} className={panel}>
      <div className="mb-4 flex items-center gap-2"><h2 className="text-base font-bold text-slate-900">{title}</h2>{info(section, title)}{status[section] === "ready" && <span className="ml-1 text-sm text-slate-500">{weeklyNumber(rows.length)}</span>}</div>
      <div ref={section === "assigned" ? assignedScroll : endedScroll} className={`${shared.tableWrap} ${styles.tableScroll} ${styles.studentScroll}`} tabIndex={0} role="region" aria-label={`${title} 학생 목록`}>
        <table className={`${shared.table} ${styles.students}`}><colgroup><col style={{ width: "23%" }}/><col style={{ width: "31%" }}/>{section === "ended" && <col style={{ width: "25%" }}/>}<col/></colgroup>
          <thead><tr><th scope="col">학생명</th><th scope="col">매칭 학원</th>{section === "ended" && <th scope="col">종료 사유</th>}<th scope="col">{section === "assigned" ? "배정 일시" : "종료일"}</th></tr></thead>
          <tbody>{status[section] === "ready" && rows.map(row => <tr key={row.id}><td>{studentLink(row)}</td><td>{institutionLink(row.institutionId, row.institutionName)}</td>{section === "ended" && <td>{row.reason}</td>}<td className="whitespace-nowrap tabular-nums">{section === "assigned" ? weeklyDateTime(row.at) : kstDate(row.at)}</td></tr>)}{messageRow(section, rows.length, section === "assigned" ? 3 : 4, `해당 주에 ${section === "assigned" ? "신규 배정된" : "관리가 종료된"} 학생이 없습니다.`)}</tbody>
        </table>
      </div>
    </section>
  }

  return <div className={`${shared.page} space-y-5`}>
    <h1 className="text-xl font-bold text-slate-900">{ADMIN_PRO_WEEKLY_TITLE}</h1>
    <section aria-label="조회 주차" className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="icon-sm" aria-label="이전 주" onClick={() => moveWeek(-7)}><ChevronLeft/></Button><div className="flex flex-wrap items-baseline gap-x-3"><h2 className="text-base font-bold text-slate-900">{weekLabel(week)}</h2><p className="text-xs text-slate-500">{kstDate(week)} ~ {kstDate(addDays(week, 6))}</p></div><Button variant="outline" size="icon-sm" aria-label="다음 주" disabled={current} onClick={() => moveWeek(7)}><ChevronRight/></Button>{current && <span className="ml-1 text-xs font-semibold text-blue-600">이번 주</span>}</div>
      <div className="flex flex-wrap items-center gap-2"><ProBadge tone={current ? "blue" : "slate"}>{current ? "집계 중" : "집계 확정"}</ProBadge><span className="text-xs text-slate-500">{weeklyDateTime(snapshot?.asOf ?? (current ? initialNow : weeklyEnd(week)))} 기준</span></div>
    </section>
    <div className={styles.studentLists}>{studentList("assigned")}{studentList("ended")}</div>
    <section aria-label="학원별 관리 인원" className={panel}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3"><h2 className="text-base font-bold text-slate-900">학원별 관리 인원</h2>{status.academies === "ready" && <span className="text-sm text-slate-500">{sorted.length.toLocaleString("ko-KR")}개 학원</span>}</div>
        <div className="flex items-center gap-2 text-sm"><strong className="font-semibold">{year}년 {Number(monthNumber)}월 평균</strong>{(snapshot?.monthInProgress ?? managementMonth(initialNow) === month) && <ProBadge tone="blue">집계 중</ProBadge>}</div>
      </div>
      <div className={`${shared.tableWrap} ${styles.tableScroll}`} tabIndex={0} role="region" aria-label="학원별 관리 인원 목록">
        <table className={`${shared.table} ${styles.academies}`}><colgroup><col className={styles.academyName}/>{columns.slice(1).map(col => <col key={col.key}/>)}</colgroup><thead><tr>{columns.map(col => <th scope="col" key={col.key} aria-sort={sort.key === col.key ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><span className="inline-flex items-center gap-1.5"><button type="button" className="inline-flex items-center gap-1 text-left disabled:opacity-50" disabled={loadingAcademies} aria-label={`${col.title} 정렬`} onClick={() => { setSort({ key: col.key, direction: sort.key === col.key && sort.direction === "asc" ? "desc" : "asc" }); setPage(1) }}>{col.title}{sort.key === col.key ? sort.direction === "asc" ? <ArrowUp className="size-3.5 shrink-0"/> : <ArrowDown className="size-3.5 shrink-0"/> : <ArrowUpDown className="size-3.5 shrink-0 text-slate-400"/>}</button>{(col.key === "current" || col.key === "average") && info(col.key, col.title)}</span></th>)}</tr></thead>
          <tbody>{status.academies === "ready" && pagination.rows.map(row => <tr key={row.id}><td>{institutionLink(row.id, row.name)}</td>{columns.slice(1).map(col => {
            const value = row[col.key] as number | null
            return <td key={col.key} className="tabular-nums"><span>{weeklyNumber(value)}</span>{value === null && !(col.key === "average" && snapshot?.confirmedWeeks === 0) && <p className="mt-1 text-xs text-slate-500">집계 자료가 없습니다.</p>}</td>
          })}</tr>)}{messageRow("academies", sorted.length, 6, "조회할 학원의 관리 이력이 없습니다.")}</tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <div className="flex items-center gap-3"><label className="flex items-center gap-2">표시 건수<select className={field} aria-label="표시 건수" value={size} disabled={loadingAcademies} onChange={event => { setSize(Number(event.target.value)); setPage(1) }}>{[20, 50, 100].map(n => <option key={n} value={n}>{n}건</option>)}</select></label><span>{pagination.from.toLocaleString("ko-KR")}–{pagination.to.toLocaleString("ko-KR")} / 전체 {sorted.length.toLocaleString("ko-KR")}건</span></div>
        <nav aria-label="학원 목록 페이지" className="flex items-center gap-1"><Button variant="outline" size="icon-sm" aria-label="이전 페이지" disabled={loadingAcademies || pagination.current === 1} onClick={() => setPage(page - 1)}><ChevronLeft/></Button>{Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => Math.min(Math.max(1, pagination.current - 2), Math.max(1, pagination.pages - 4)) + i).map(n => <Button key={n} variant={pagination.current === n ? "default" : "outline"} size="icon-sm" aria-label={`${n}페이지`} aria-current={pagination.current === n ? "page" : undefined} disabled={loadingAcademies} onClick={() => setPage(n)}>{n}</Button>)}<Button variant="outline" size="icon-sm" aria-label="다음 페이지" disabled={loadingAcademies || pagination.current === pagination.pages} onClick={() => setPage(page + 1)}><ChevronRight/></Button></nav>
      </div>
    </section>
  </div>
}
