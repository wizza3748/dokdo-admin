"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { useReviews } from "@/lib/review-client"
import { dateLabel } from "@/lib/pro-calendar"
import { studentFrontTestRows } from "@/lib/pro-demo-navigation"
import { Button } from "@/components/ui/button"
import { panel } from "./pro-common"

export function StudentFrontTest() {
  const { db, loaded, error, refresh } = useReviews("agency")
  const pro = db.pro
  return <div className="space-y-5 p-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-slate-900">학생프론트 테스트</h1>
      <Button asChild variant="outline"><Link href="/agency/pro-management">주간 관리 현황</Link></Button>
    </header>
    <p className="text-sm text-slate-600">학생을 선택하면 해당 학생의 온라인 독후감 목록이 새 탭으로 열립니다.</p>
    {!loaded ? <p role="status">학생 목록을 불러오는 중…</p> : error ? <div role="alert" className={panel}>
      <p>{error}</p><Button className="mt-3" variant="outline" onClick={() => void refresh()}>다시 시도</Button>
    </div> : !pro ? <p>테스트 학생이 없습니다.</p> : <section className={`${panel} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <p>확인할 내용은 초기 예시 기준입니다. 테스트 후에는 학생 상태가 달라질 수 있습니다.</p>
        <p>{pro.clockMode === "test" ? "테스트 시각" : "실제 시각"} · {dateLabel(pro.clock)} (한국 시간)</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] text-left text-sm [&_th]:bg-slate-50 [&_th]:px-5 [&_th]:py-3 [&_th]:font-medium [&_th]:text-slate-500 [&_td]:border-t [&_td]:border-slate-200 [&_td]:px-5 [&_td]:py-4">
          <thead><tr><th scope="col">학생</th><th scope="col">확인할 내용</th><th scope="col">이동</th></tr></thead>
          <tbody>{studentFrontTestRows(pro).map(row => <tr key={row.id}>
            <td><Link className="inline-flex items-center gap-1.5 font-semibold text-blue-700 underline underline-offset-4 hover:text-blue-900" href={row.href} target="_blank" rel="noopener noreferrer" aria-label={`${row.name} 학생 화면 새 탭으로 열기`}>{row.name}<ExternalLink className="size-3.5" aria-hidden="true"/></Link></td>
            <td className="text-slate-600">{row.purpose}</td>
            <td><Button asChild variant="outline" size="sm"><Link href={row.href} target="_blank" rel="noopener noreferrer" aria-label={`${row.name} 학생 화면 열기`}>학생 화면 열기<ExternalLink aria-hidden="true"/></Link></Button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>}
  </div>
}
