"use client"

import * as React from "react"
import { Info } from "lucide-react"
import { snapshotReviewAssessment, type ReviewAssessmentSnapshot } from "@/lib/review-assessment-config"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { assessmentCriteria, scoreLabel, scoreTotal, validAiScores, validScores, type ReviewCommon, type ReviewRecord, type ReviewReport, type ReviewScores } from "@/lib/review-domain"

type AssessmentProps = {
  common: ReviewCommon
  record: ReviewRecord
  scores: ReviewScores
  onChange?: (scores: ReviewScores) => void
  readOnly?: boolean
  hideHeading?: boolean
}

export function ReviewAssessment({ common, record, scores, onChange, readOnly = false, hideHeading = false }: AssessmentProps) {
  if (!common.reportEnabled) return null
  const criteria = assessmentCriteria(common.level, record)
  const areas = [...new Set(criteria.map(criterion => criterion.area))]
  const aiComplete = validAiScores(common.level, record.aiScores, record)
  const teacherComplete = validScores(common.level, scores, record)
  const aiTotal = aiComplete ? scoreTotal(record.aiScores!) : undefined
  const teacherTotal = teacherComplete ? scoreTotal(scores) : undefined
  const previewScore = aiTotal !== undefined && teacherTotal !== undefined ? (aiTotal + teacherTotal) / 2 : undefined
  const roundScore = record.report?.score ?? previewScore
  const confirmed = Boolean(record.report)
  const assessmentState = confirmed ? "확정" : teacherComplete ? "입력 완료" : "입력 중"
  const subtotal = (values: ReviewScores | undefined, ids: string[]) => ids.every(id => Number.isFinite(values?.[id])) ? scoreLabel(ids.reduce((sum, id) => sum + values![id], 0)) : "-"

  return <section className="space-y-4" aria-label={`${record.round}차 점수 평가`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      {!hideHeading && <h3 className="font-bold">{record.round}차 평가</h3>}
      <div className={`flex items-center gap-3 ${hideHeading ? "ml-auto" : ""}`}><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${confirmed ? "bg-[#e6f7ff] text-[#0877b9]" : "bg-[#f1f3f5] text-[#697681]"}`}>{assessmentState}</span><ScoreHelp group={record.assessment ?? snapshotReviewAssessment(common.level)} /></div>
    </div>
    <p className="text-sm leading-6 text-[#667581]">AI 점수는 최초 AI 피드백 작성 성공 시 확정되며 수정할 수 없습니다. 선생님은 각 기준을 배점 범위 안에서 직접 평가해 주세요.</p>
    <div className="grid overflow-hidden rounded-lg border border-[#dfe4e8] bg-white sm:grid-cols-3 sm:divide-x sm:divide-[#e8ecef]">
      <ScoreSummary label="AI 점수" value={aiTotal} />
      <ScoreSummary label="선생님 점수" value={teacherTotal} />
      <ScoreSummary label={`${record.round}차 점수`} value={roundScore} primary />
    </div>
    <div className="overflow-x-auto rounded-lg border border-[#dfe4e8]">
      <table className="w-full min-w-[480px] table-fixed border-collapse text-sm">
        <thead><tr className="border-b border-[#dfe4e8] bg-[#f7f9fb] text-left text-[#596773]"><th className="w-[18%] px-3 py-3 font-semibold">평가 기준</th><th className="w-[10%] px-2 py-3 text-center font-semibold">배점</th><th className="w-[10%] px-2 py-3 text-center font-semibold">AI 점수</th><th className="w-[62%] px-2 py-3 text-center font-semibold">세부 기준별 선생님 평가</th></tr></thead>
        <tbody>{areas.map(area => {
          const group = criteria.filter(criterion => criterion.area === area)
          const areaMax = group.reduce((sum, criterion) => sum + criterion.max, 0)
          return <tr key={area} className="border-b border-[#edf0f2] bg-white last:border-b-0">
            <th scope="row" className="px-3 py-4 text-left font-semibold text-[#263747]">{area}</th>
            <td className="px-2 py-4 text-center text-[#596773]">{areaMax}점</td>
            <td className="px-2 py-4 text-center font-semibold text-[#42515e]">{record.aiScores?.[area] === undefined ? "-" : scoreLabel(record.aiScores[area])}</td>
            <td className="px-2 py-3"><div className="flex flex-wrap items-end gap-x-2 gap-y-2">
              {group.map(criterion => {
                const value = scores[criterion.id]
                const invalid = value !== undefined && (!Number.isFinite(value) || value < 0 || value > criterion.max)
                return <div key={criterion.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-xs text-[#596773]"><span>{criterion.name}</span><CriterionHelp name={criterion.name} description={criterion.description} /></div>
                  <div className="flex items-center gap-1.5">
                  {readOnly ? <span className="flex h-9 min-w-20 items-center justify-center rounded-md bg-[#f7f9fb] px-2 font-semibold text-[#42515e]">{value === undefined ? "-" : scoreLabel(value)}<span className="ml-1 text-xs font-normal text-[#89949d]">/ {criterion.max}</span></span> : <label className={`inline-flex h-9 items-center overflow-hidden rounded-md border bg-white ${invalid ? "border-[#ff4d4f]" : "border-[#bfc8cf] focus-within:border-[#1890ff] focus-within:ring-2 focus-within:ring-[#1890ff]/15"}`}><input aria-label={`${criterion.name} 선생님 점수`} type="number" min={0} max={criterion.max} step="any" value={value ?? ""} aria-invalid={invalid} onChange={event => { const next = { ...scores }; if (event.target.value === "") delete next[criterion.id]; else next[criterion.id] = Number(event.target.value); onChange?.(next) }} className="h-full w-12 border-0 bg-transparent px-1 text-right font-semibold outline-none" /><span className="border-l border-[#e2e6e9] bg-[#f7f9fb] px-1.5 text-xs text-[#697681]">/ {criterion.max}</span></label>}</div>
                  {invalid && <span role="alert" className="text-xs text-[#d4380d]">0~{criterion.max}점</span>}
                </div>
              })}
              <span className="mb-2 ml-auto whitespace-nowrap text-xs font-semibold text-[#0877b9]">소계 {subtotal(scores, group.map(criterion => criterion.id))} / {areaMax}</span>
            </div></td>
          </tr>
        })}</tbody>
        <tfoot><tr className="bg-[#eaf6ff] font-bold text-[#123b5a]"><td className="px-4 py-3.5">총점</td><td className="px-3 py-3.5 text-center">{criteria.reduce((sum, criterion) => sum + criterion.max, 0)}점</td><td className="px-3 py-3.5 text-center">{aiTotal === undefined ? "-" : scoreLabel(aiTotal)}</td><td className="px-4 py-3.5 text-center">{teacherTotal === undefined ? "-" : scoreLabel(teacherTotal)}</td></tr></tfoot>
      </table>
    </div>
    {record.round === 2 && record.report && <SecondRoundResult report={record.report} />}
  </section>
}

function CriterionHelp({ name, description }: { name: string; description: string }) {
  return <Popover><PopoverTrigger asChild><button type="button" aria-label={`${name} 세부 평가 기준`} className="inline-flex shrink-0 items-center text-[#0877b9] hover:text-[#005a91]"><Info className="size-3.5" /></button></PopoverTrigger><PopoverContent align="start" className="max-w-[min(20rem,calc(100vw-2rem))] whitespace-pre-line text-sm leading-6 text-[#42515e]"><strong className="mb-1 block text-[#263747]">{name}</strong>{description}</PopoverContent></Popover>
}

function ScoreHelp({ group }: { group: ReviewAssessmentSnapshot }) {
  return <Popover><PopoverTrigger asChild><button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-[#0877b9] hover:underline"><Info className="size-3.5" />점수 계산 기준</button></PopoverTrigger><PopoverContent align="end" className="w-80 space-y-2 text-sm leading-6 text-[#596773]"><p><strong className="text-[#263747]">차수 점수</strong><br />(AI 점수 + 선생님 점수) ÷ 2</p><p><strong className="text-[#263747]">최종 평가</strong><br />1차 1/3·2차 2/3 비중 적용 후 AI·선생님 환산 점수의 평균</p><p className="border-t pt-2">{group.label}({group.minLevel}~{group.maxLevel}레벨)의 평가 기준 및 배점을 적용합니다.</p></PopoverContent></Popover>
}

function ScoreSummary({ label, value, primary = false }: { label: string; value?: number; primary?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 px-4 py-3 sm:block ${primary ? "bg-[#f1f8fd]" : ""}`}><span className="text-xs font-medium text-[#697681]">{label}</span><strong className={`sm:mt-1 sm:block ${primary ? "text-xl text-[#0877b9]" : "text-lg text-[#263747]"}`}>{value === undefined ? "-" : scoreLabel(value)}<span className="ml-1 text-xs font-medium">점</span></strong></div>
}

function SecondRoundResult({ report }: { report: ReviewReport }) {
  return <section aria-label="2차 평가 결과" className="rounded-xl border border-[#bae0ff] bg-[#f5fbff] p-4"><div className="mb-3 flex items-center justify-between"><h4 className="font-bold text-[#123b5a]">평가 결과</h4><span className="rounded-full bg-[#d9f0ff] px-2.5 py-1 text-xs font-semibold text-[#0877b9]">확정</span></div><div className="grid gap-3 sm:grid-cols-2"><ResultGroup title="성장 비교"><ResultValue label="1차 점수" value={report.firstScore} /><ResultValue label="2차 점수" value={report.score} /><ResultValue label="향상 수치" value={report.improvement} signed primary /></ResultGroup><ResultGroup title="최종 평가"><ResultValue label="AI 환산 점수" value={report.weightedAi} /><ResultValue label="선생님 환산 점수" value={report.weightedTeacher} /><ResultValue label="최종 점수" value={report.finalScore} primary /></ResultGroup></div></section>
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-[#dce8f0] bg-white p-4"><h5 className="mb-3 text-sm font-bold text-[#42515e]">{title}</h5><dl className="space-y-2">{children}</dl></div>
}

function ResultValue({ label, value, primary = false, signed = false }: { label: string; value?: number; primary?: boolean; signed?: boolean }) {
  const formatted = value === undefined ? "-" : `${signed && value > 0 ? "+" : ""}${scoreLabel(value)}`
  return <div className={`flex items-center justify-between gap-3 ${primary ? "border-t border-[#e6edf2] pt-2" : ""}`}><dt className="text-xs text-[#697681]">{label}</dt><dd className={`${primary ? "text-xl text-[#0877b9]" : "text-sm text-[#263747]"} font-bold`}>{formatted}<span className="ml-0.5 text-xs font-medium">점</span></dd></div>
}
