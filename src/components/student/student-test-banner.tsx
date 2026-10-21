"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { setStudentTestScreen, studentTestScreen, studentTestToken, type StudentTestScreen } from "@/lib/student-test-context"
import type { StudentTestRow } from "@/lib/student-test-store"
import { subscribeReviewRefresh } from "@/lib/review-refresh"

const testTime = (at: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(at))

export function StudentTestBanner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const identity = `${searchParams.get("studentTest") ?? ""}:${searchParams.get("demoStudent") ?? ""}`
  const [row, setRow] = React.useState<StudentTestRow | null>(null)
  const [error, setError] = React.useState("")
  const [screen, setScreen] = React.useState<StudentTestScreen>("normal")
  React.useEffect(() => {
    const token = studentTestToken()
    if (!token) { setRow(null); setError(""); return }
    let active = true
    let sequence = 0
    setScreen(studentTestScreen())
    const refresh = async () => {
      const request = ++sequence
      try {
        const response = await fetch(`/api/mock/student-front-tests?studentTest=${encodeURIComponent(token)}`, { cache: "no-store" })
        const value = await response.json(); if (!response.ok) throw new Error(value.message)
        if (active && request === sequence) { setRow(value); setError("") }
      } catch (e) { if (active && request === sequence) setError(e instanceof Error ? e.message : "테스트 정보를 불러오지 못했습니다.") }
    }
    void refresh()
    const unsubscribe = subscribeReviewRefresh(refresh)
    return () => { active = false; unsubscribe() }
  }, [pathname, identity])
  if (!row && !error) return null
  return <aside aria-label="전용 학생 테스트 안내" className="relative z-10 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-slate-700">
    {error ? <p role="alert">{error}</p> : row && <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <strong>{row.designated ? "지정일 테스트" : "오늘 기준 테스트"} · {row.name}</strong>
      <span>기준 {testTime(row.now)} (한국 시간)</span><span>공용 데이터와 분리됨</span>
      <label className="flex items-center gap-2">화면 상태 검증
        <select aria-label="화면 상태 검증" value={screen} className="rounded border border-slate-300 bg-white px-2 py-1" onChange={e => { const value = e.target.value as StudentTestScreen; setScreen(value); setStudentTestScreen(value) }}>
          <option value="normal">정상</option><option value="loading">조회 중 (화면만)</option><option value="error">조회 실패 (화면만)</option>
        </select>
      </label>
    </div>}
    <Link href="/agency/pro-management/student-front-test" target="_blank" rel="noopener noreferrer" className="underline">학생프론트 테스트 목록 열기</Link>
    {screen !== "normal" && <span className="ml-3">저장 데이터는 바뀌지 않습니다. ‘정상’ 선택으로 복귀합니다.</span>}
  </aside>
}
