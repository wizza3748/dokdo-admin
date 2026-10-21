"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { StudentTestRow } from "@/lib/student-test-store"
import type { StudentTestCaseId } from "@/lib/student-test-scenarios"
import { studentTestScreenHref, type StudentTestScreen } from "@/lib/student-test-context"
import { Button } from "@/components/ui/button"
import { AgencyConfirmDialog } from "@/components/ui/agency-confirm-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { panel } from "./pro-common"

type CommonRow = { id: string; name: string; purpose: string; href: string; current?: string; books?: string[] }
type Catalog = { available: boolean; day: string; now: string; rows: StudentTestRow[]; common: CommonRow[] }
type Action = "reset" | "teacher-start" | "cutoff"
const groups: { id: string; name: string; cases: StudentTestCaseId[] }[] = [
  { id: "before", name: "신청 전", cases: ["empty", "draft", "apply-one", "apply-many"] },
  { id: "apply", name: "신청·변경", cases: ["change-one", "change-many", "partial", "locked"] },
  { id: "feedback", name: "피드백·2차", cases: ["arrival", "second-request", "second-draft", "second-sent"] },
  { id: "exceptions", name: "마감·예외", cases: ["expired-empty", "expired-draft", "reject-first", "reject-second", "unassigned", "closed-next", "month-boundary"] },
]
const time = (at: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(at))
const sharedChecks: Record<string, { name: string; path: string; expect: string }> = {
  "pro-demo-1": { name: "선생님 지정 · 피드백 대기", path: "목록 → 신청한 글의 나의 글 완성", expect: "선생님 지정 글의 피드백 대기 표시. 학생 취소·변경 불가." },
  "pro-demo-2": { name: "자동 선정 · 피드백 대기", path: "목록 → 선정된 글의 나의 글 완성", expect: "자동 선정 글의 피드백 대기 표시. 학생 취소·변경 불가." },
  "pro-demo-3": { name: "월 한도 도달 (조정 한도 1권)", path: "미선정 글의 나의 글 완성 → 피드백 신청 영역", expect: "이번 달 피드백 이용 권수를 모두 썼어요. 신청·변경 불가." },
  "pro-demo-4": { name: "피드백 예정일 경과", path: "목록 → 피드백 작성 중인 글의 나의 글 완성", expect: "피드백 작성 중 유지, 예정일 경과 안내." },
  "pro-demo-6": { name: "피드백 작성 중 · 전송 전", path: "목록 → 작성 중인 글의 나의 글 완성", expect: "피드백 작성 중. 신청 취소·변경 불가." },
  "pro-demo-second": { name: "2차 제출 후 피드백 대기", path: "목록 → 2차 제출한 글", expect: "2차 글 제출 완료·선생님 피드백 대기. 추가 권수 차감 없음." },
  "pro-demo-5": { name: "1차 피드백 · 2차 작성 요청", path: "목록 [피드백 확인하기] → [2차 글 시작하기]", expect: "1차 피드백과 2차 제출 기한 확인. 2차 작성 시 추가 권수 차감 없음." },
  "pro-demo-complete": { name: "피드백 도착 · 활동 완료", path: "목록 [피드백 확인하기] → 피드백 확인", expect: "전송된 피드백 확인 및 읽음 반영. 신청 버튼 없음." },
  "pro-demo-attention": { name: "2주 미제출", path: "온라인 독후감 목록 → [책 읽으러 가기]", expect: "신청할 글이 없으면 독후감 제출 안내. 남은 권수와 이월 표시 확인." },
  "pro-demo-hq-check": { name: "3주 미제출", path: "온라인 독후감 목록 → [책 읽으러 가기]", expect: "신청할 글이 없으면 독후감 제출 안내. 남은 권수와 이월 표시 확인." },
  "pro-demo-8": { name: "프로 이용 종료", path: "온라인 독후감 목록 → 기존 글 확인", expect: "기존 글·피드백 조회 가능. 프로 신청 영역 숨김." },
  "pro-demo-9": { name: "일반 외부 학생", path: "온라인 독후감 목록 → 해당 글", expect: "일반 독후감 작성·피드백 조회. 프로 신청 영역 숨김." },
  "normal": { name: "일반 기관 학생", path: "온라인 독후감 목록 → 해당 글", expect: "일반 독후감 작성·피드백 조회. 프로 신청 영역 숨김." },
}
const tableClass = "w-full min-w-[960px] table-fixed text-left text-sm [&_th]:bg-slate-50 [&_th]:px-4 [&_th]:py-3 [&_th]:font-medium [&_th]:text-slate-500 [&_td]:border-t [&_td]:border-slate-200 [&_td]:px-4 [&_td]:py-4 [&_td]:align-top"

async function call(action: string, token?: string) {
  const response = await fetch("/api/mock/student-front-tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, token }) })
  const value = await response.json()
  if (!response.ok) throw new Error(value.message)
}
function Open({ href, label = "학생 화면 열기" }: { href: string; label?: string }) {
  return <Button asChild variant="outline" size="sm"><Link href={href} target="_blank" rel="noopener noreferrer">{label}<ExternalLink aria-hidden="true"/></Link></Button>
}
/** Display only: preserve the existing status and quota calculations. */
function CurrentState({ summary, books = [] }: { summary: string; books?: string[] }) {
  const [message, usage] = summary.split(" / ")
  const counts = new Map<string, number>()
  const shortStatus: Record<string, string> = { "지금은 피드백을 신청할 수 있는 권수가 없어요.": "신청 권수 없음", "아직 피드백을 신청할 수 없어요. 선생님에게 물어보세요.": "기관 배정 전" }
  books.forEach(book => { const full = book.slice(book.indexOf(": ") + 2), status = shortStatus[full] ?? full; counts.set(status, (counts.get(status) ?? 0) + 1) })
  return <div className="space-y-1.5 text-slate-700">
    <p>{message}</p>
    {usage && <p className="text-xs text-slate-500">{usage.replace(" · 이월 잔여 0권", "")}</p>}
    {counts.size > 0 && <p className="text-xs text-slate-500">{Array.from(counts, ([status, count]) => `${status} ${count}편`).join(" / ")}</p>}
  </div>
}

export function StudentFrontTest() {
  const [catalog, setCatalog] = React.useState<Catalog | null>(null)
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [confirm, setConfirm] = React.useState<{ row: StudentTestRow; action: Action } | null>(null)
  const [controlError, setControlError] = React.useState("")
  const [screen, setScreen] = React.useState<StudentTestScreen>("normal")
  const refreshInFlight = React.useRef<Promise<void> | null>(null)
  const refresh = React.useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current
    const job = (async () => { try {
      const read = async (): Promise<Catalog> => {
        const response = await fetch("/api/mock/student-front-tests", { cache: "no-store" }), value = await response.json()
        if (!response.ok) throw new Error(value.message)
        return value
      }
      let value = await read()
      if (value.available) {
        const prepare = async () => { await call("prepare"); value = await read() }
        // Coordinate first-time cookie creation across tabs as well as repeated focus/mount events.
        if (navigator.locks) await navigator.locks.request("dokdo-student-test-prepare", prepare)
        else await prepare()
      }
      setCatalog(value); setError("")
    } catch (e) { setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.") } })()
    refreshInFlight.current = job
    try { await job } finally { if (refreshInFlight.current === job) refreshInFlight.current = null }
  }, [])
  React.useEffect(() => { void refresh(); const focus = () => { void refresh() }; window.addEventListener("focus", focus); return () => window.removeEventListener("focus", focus) }, [refresh])
  const requestControl = (row: StudentTestRow, action: Action) => { setControlError(""); setConfirm({ row, action }) }
  const control = async () => {
    if (!confirm) return
    setBusy(true)
    try { await call(confirm.action, confirm.row.token); await refreshInFlight.current; await refresh(); setConfirm(null) }
    catch (e) { setControlError(e instanceof Error ? e.message : "처리 실패") }
    finally { setBusy(false) }
  }
  return <div className="space-y-5 p-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-slate-900">학생프론트 테스트</h1>
      <div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()}>현재 상태 새로고침</Button><Button asChild variant="outline"><Link href="/agency/pro-management">주간 관리 현황</Link></Button></div>
    </header>
    <div className="space-y-2 text-sm text-slate-600">
      <p>{catalog?.available && <strong className="mr-3 text-slate-800">오늘 {catalog.day} · 한국 시간</strong>}확인할 케이스를 고르고 학생 화면을 여세요. 같은 브라우저에서 같은 날 테스트한 결과는 유지됩니다.</p>
      <details className="text-xs text-slate-500">
        <summary className="w-fit cursor-pointer">날짜·데이터 및 화면 검증 안내</summary>
        <div className="mt-2 space-y-1">
          <p>전용 예시는 공용 데이터 및 다른 브라우저의 테스트와 분리됩니다. 같은 브라우저 프로필의 탭끼리는 결과를 공유하며, 쿠키를 삭제하거나 다른 브라우저로 접속하면 별도 예시를 준비합니다. 날짜가 바뀌어 목록에 재진입하면 오늘 예시를 준비하며, 전날 열린 화면은 별도로 유지합니다. 이전 결과의 장기 보관 기능은 제공하지 않습니다.</p>
          <p>기본 기관 피드백 요일은 월요일이며 기존 주차·마감 정책을 적용합니다. 오늘 성립하지 않는 케이스는 지정일을 표시합니다.</p>
          {catalog?.available && <label className="flex items-center gap-2">화면 상태 검증
            <select aria-label="화면 상태 검증" value={screen} className="rounded border border-slate-300 bg-white px-2 py-1" onChange={e => setScreen(e.target.value as StudentTestScreen)}>
              <option value="normal">정상</option><option value="loading">조회 중 (화면만)</option><option value="error">조회 실패 (화면만)</option>
            </select>
          </label>}
          <p>상태를 선택한 뒤 전용 예시의 학생 화면을 여세요. 저장 데이터는 바뀌지 않으며 [정상]을 선택해 다시 열면 정상 화면으로 돌아옵니다. 기존 공용 예시에는 적용하지 않습니다.</p>
        </div>
      </details>
    </div>
    {error && <div role="alert" className={panel}>{error}<Button variant="outline" className="ml-3" onClick={() => void refresh()}>다시 시도</Button></div>}
    {!catalog ? !error && <p role="status">학생 예시를 준비하는 중…</p> : <Tabs defaultValue={catalog.available ? "before" : "common"} className={`${panel} gap-4`}>
      <div className="overflow-x-auto overflow-y-hidden"><TabsList aria-label="테스트 케이스 분류">{catalog.available && groups.map(group => <TabsTrigger key={group.id} value={group.id}>{group.name} <span className="text-xs text-slate-500">{catalog.rows.filter(row => group.cases.includes(row.id)).length}</span></TabsTrigger>)}<TabsTrigger value="common">기존 공용 <span className="text-xs text-slate-500">{catalog.common.length}</span></TabsTrigger></TabsList></div>
      {groups.map(group => <TabsContent key={group.id} value={group.id}>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className={tableClass}>
            <thead><tr><th className="w-[22%]">케이스</th><th className="w-[25%]">현재 상태</th><th className="w-[36%]">확인할 동작 → 기대 결과</th><th className="w-[17%]">실행</th></tr></thead>
            <tbody>{catalog.rows.filter(row => group.cases.includes(row.id)).map(row => <tr key={row.token}>
              <td>
                <strong className="text-slate-900">{row.name}</strong>
                <p className="mt-1 text-slate-600">{row.student}</p>
                <p className="mt-2"><span className={`inline-flex rounded px-2 py-0.5 text-xs ${row.changed ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-500"}`}>{row.changed ? "테스트 후" : "초기 예시"}</span></p>
                {row.designated && <p className="mt-2 text-xs text-amber-800">지정일 · {time(row.now)} (한국 시간)</p>}
                <details className="mt-2 text-xs text-slate-500">
                  <summary className="w-fit cursor-pointer">초기 상태·날짜 상세</summary>
                  <div className="mt-2 space-y-1 leading-relaxed">
                    <p>초기: {row.initial.summary}</p>
                    <p>{row.dateReason}</p><p>최초 준비 {time(row.baseAt)}</p>
                    <p>현재 기준 {time(row.now)} (한국 시간)</p><p>신청 마감 {time(row.current.cutoff)}</p><p>피드백 예정 {time(row.current.due)}</p>
                    {row.current.secondDeadline && <p>2차 제출 기한 {time(row.current.secondDeadline)}</p>}
                    <p className="pt-1 font-medium">현재 글별 상태</p>{row.current.books.length ? row.current.books.map(book => <p key={book}>{book}</p>) : <p>작성한 글 없음</p>}
                  </div>
                </details>
              </td>
              <td><CurrentState summary={row.current.summary} books={row.current.books}/></td>
              <td>
                <p className="font-medium leading-relaxed text-slate-800">{row.path}</p>
                <p className="mt-2 leading-relaxed text-slate-600"><span className="mr-1 text-xs text-slate-500">기대</span>{row.expect}</p>
                {["change-one", "change-many"].includes(row.id) && <details className="mt-2 text-xs text-slate-500">
                  <summary className="w-fit cursor-pointer">처리 중 상태 변경 검증</summary>
                  <p className="my-2 leading-relaxed">학생 화면에서 변경·취소 모달을 연 뒤 아래 동작을 실행하고 확정하세요. 실패 안내와 기존 신청·권수 유지를 확인합니다.</p>
                  <p className="my-2 leading-relaxed">마감 진행으로 주차가 바뀌면 가용 권수는 기존 정책에 따라 재계산됩니다. 실패한 요청이 신청을 해제하거나 권수를 반환해서는 안 됩니다.</p>
                  <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => requestControl(row, "teacher-start")}>선생님 작성 시작</Button><Button variant="outline" size="sm" onClick={() => requestControl(row, "cutoff")}>신청 마감 진행</Button></div>
                </details>}
              </td>
              <td><div className="flex flex-col items-start gap-2"><Open href={studentTestScreenHref(row.href, screen)}/>{row.detailHref && <Link className="text-xs text-slate-600 underline underline-offset-4" href={studentTestScreenHref(row.detailHref, screen)} target="_blank" rel="noopener noreferrer">해당 글 바로 열기</Link>}<button type="button" className="mt-2 text-xs text-slate-500 underline underline-offset-4 hover:text-slate-800" onClick={() => requestControl(row, "reset")}>이 예시만 초기화</button></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      </TabsContent>)}
      <TabsContent value="common" className="space-y-3">
        <p className="text-sm text-slate-500">기존 공용 데이터입니다. 자동 갱신·초기화하지 않습니다. 현재 상태가 기대와 다르면 반복 동작은 전용 예시를 사용하세요.</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200"><table className={tableClass}>
          <thead><tr><th className="w-[22%]">학생 · 확인 항목</th><th className="w-[25%]">현재 상태</th><th className="w-[36%]">확인할 동작 → 기대 결과</th><th className="w-[17%]">실행</th></tr></thead><tbody>{catalog.common.map(row => <tr key={row.id}>
            <td><strong>{row.name}</strong><p className="mt-1 text-slate-600">{sharedChecks[row.id]?.name ?? row.purpose}</p></td>
            <td><CurrentState summary={row.current ?? "일반 학생 · 프로 신청 대상 아님"} books={row.books}/></td>
            <td>{sharedChecks[row.id] ? <><p className="font-medium text-slate-800">{sharedChecks[row.id].path}</p><p className="mt-2 text-slate-600"><span className="mr-1 text-xs text-slate-500">기대</span>{sharedChecks[row.id].expect}</p></> : <><p className="font-medium text-slate-800">온라인 독후감 목록 → 해당 글</p><p className="mt-2 text-slate-600"><span className="mr-1 text-xs text-slate-500">확인</span>{row.purpose}</p></>}{!!row.books?.length && <details className="mt-2 text-xs text-slate-500"><summary className="w-fit cursor-pointer">글별 상태</summary>{row.books.map(book => <p key={book} className="mt-1">{book}</p>)}</details>}</td>
            <td><Open href={row.href}/></td>
          </tr>)}</tbody>
        </table></div>
      </TabsContent>
    </Tabs>}
    {confirm && <AgencyConfirmDialog title={confirm.action === "reset" ? "이 예시만 초기화" : confirm.action === "cutoff" ? "신청 마감 진행" : "선생님 작성 시작"} confirmLabel="실행" busy={busy} onClose={() => setConfirm(null)} onConfirm={() => void control()}>
      <p className="font-medium">{confirm.row.name}</p>
      <p>{confirm.action === "reset" ? "이 예시만 처음 상태로 되돌립니다. 기존 탭은 목록에서 다시 열어 주세요. 다른 예시와 공용 데이터는 유지됩니다." : confirm.action === "cutoff" ? "이 예시의 시각만 신청 마감으로 진행합니다. 학생 화면에서 변경·취소 모달을 먼저 열어 두세요." : "이 예시의 기존 신청에 선생님 피드백을 저장하여 작성 시작 상태로 만듭니다. 학생 화면에서 변경·취소 모달을 먼저 열어 두세요."}</p>
      {controlError && <p role="alert" className="mt-2 text-red-700">{controlError}</p>}
    </AgencyConfirmDialog>}
  </div>
}
