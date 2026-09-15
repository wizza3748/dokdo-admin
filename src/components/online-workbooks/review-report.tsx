"use client"
import Image from "next/image"
import { Fragment, type ReactNode } from "react"
import { ArrowRight, BookOpen, MessageCircle, Printer, TrendingUp } from "lucide-react"
import { useReviews, type ReviewRole } from "@/lib/review-client"
import { assessmentCriteria, reviewFeedbackItems, plainReviewText, scoreLabel, type ReviewCommon, type ReviewRecord } from "@/lib/review-domain"
import { reportAreaScores, reportDate, type ReportArea } from "@/lib/review-report-model"
import { reviewCriterionLabel } from "@/lib/review-assessment-config"
import { reviewImprovementMessage, reviewScoreExplanation } from "@/lib/review-score-policy"
import { ReviewText } from "./review-ui"
import styles from "./review-report.module.css"

const colors = { first: "#3974cc", current: "#008778", final: "#7b51c7" }
const n = (value?: number) => value === undefined ? "—" : scoreLabel(value)
function SeriesMark({ series }: { series: "first" | "current" | "final" }) {
  return <svg viewBox="0 0 32 12" width="32" height="12" aria-hidden="true"><line x1="0" y1="6" x2="32" y2="6" stroke={colors[series]} strokeWidth={series === "final" ? 3 : 2} strokeDasharray={series === "first" ? "4 3" : undefined} />{series === "final" ? <rect x="12" y="2" width="8" height="8" fill={colors[series]} /> : series === "current" ? <path d="M16 1 L21 10 L11 10 Z" fill={colors[series]} /> : <circle cx="16" cy="6" r="3.5" fill="white" stroke={colors.first} strokeWidth="2" />}</svg>
}
function Heading({ index, title, description }: { index: string; title: string; description?: string }) {
  return <header className={styles.heading}><span>{index}</span><div><h2>{title}</h2>{description && <p>{description}</p>}</div></header>
}
function CriterionDescription({ value }: { value: string }) {
  return <>{value.split(/\r?\n/).map((line, index) => /^(이야기책|정보\s*책\s*:\s*개념 간 관계)$/.test(line.trim())
    ? <strong key={index} className={styles.criterionSubtitle}>{line}</strong>
    : <div key={index}>{line || <br />}</div>)}</>
}
function ReportSheet({ common, rounds, label, children }: { common: ReviewCommon; rounds: ReviewRecord[]; label: string; children: ReactNode }) {
  return <section className={styles.sheet} aria-label={label}>
    <table role="presentation" className={styles.sheetFrame}>
      <thead><tr><td><header className={styles.pageHeader} aria-label="보고서 머리말">
        <div className={styles.pageIdentity}><strong>{common.studentName}</strong><span>{common.bookTitle}</span></div>
        <div className={styles.pageDates}>{rounds.slice(-1).map(round => <span key={round.id}>{round.round}차 작성 완료 <time>{reportDate(round.submittedAt)}</time></span>)}</div>
      </header></td></tr></thead>
      <tbody><tr><td>{children}</td></tr></tbody>
    </table>
  </section>
}
function Radar({ areas, second }: { areas: ReportArea[]; second: boolean }) {
  const series = second ? ["first", "current", "final"] as const : ["current"] as const
  const point = (i: number, ratio: number, radius = 162) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / areas.length
    return { x: 220 + Math.cos(angle) * radius * ratio, y: 220 + Math.sin(angle) * radius * ratio }
  }
  const polygon = (ratio: number) => areas.map((_, i) => { const p = point(i, ratio); return p.x + "," + p.y }).join(" ")
  return <figure className={styles.integratedRadar} data-round={second ? 2 : 1} aria-label="영역별 성취도와 점수">
    <figcaption className={styles.srOnly}>평가 영역별 성취도와 득점/배점</figcaption>
    <div className={styles.radarCanvas}>
      <svg className={styles.radarPlot} viewBox="0 0 440 440" role="img" aria-label={second ? "5개 평가 영역의 1차·2차·최종 성취도 비교. 성취도와 득점/배점은 각 영역 설명에 표시됩니다." : "5개 평가 영역의 1차 성취도. 성취도와 득점/배점은 각 영역 설명에 표시됩니다."}>
        {[1, .8, .6, .4, .2].map(r => <polygon key={r} points={polygon(r)} fill={r === 1 ? "#f5f8fd" : "none"} stroke="#d9e2eb" />)}
        {areas.map((a, i) => { const p = point(i, 1), label = point(i, 1, 196); return <g key={a.area}>
          <line x1="220" y1="220" x2={p.x} y2={p.y} stroke="#d9e2eb" />
          <text className={styles.mobileAxis} x={label.x} y={label.y - (i === 1 || i === 4 ? 12 : 0)} textAnchor="middle">{a.area}</text>
        </g> })}
        {[.2, .4, .6, .8, 1].map(r => <text key={r} x="227" y={220 - 162 * r + 4} className={styles.tick}>{r * 100}%</text>)}
        {series.map(key => { const styleKey = second ? key : "first"; return <g key={key}>
          <polygon points={areas.map((a, i) => { const p = point(i, a[key] / a.max); return p.x + "," + p.y }).join(" ")} fill={colors[styleKey]} fillOpacity={key === "final" || !second ? ".1" : "0"} stroke={colors[styleKey]} strokeWidth={key === "final" ? 3.5 : 2.5} strokeLinejoin="round" strokeDasharray={styleKey === "first" ? "6 4" : undefined} />
          {areas.map((a, i) => { const p = point(i, a[key] / a.max); return styleKey === "final"
            ? <rect key={a.area} x={p.x - 4} y={p.y - 4} width="8" height="8" fill={colors.final} />
            : styleKey === "current" ? <path key={a.area} d={`M${p.x} ${p.y - 5} L${p.x + 5} ${p.y + 4} L${p.x - 5} ${p.y + 4} Z`} fill={colors.current} />
            : <circle key={a.area} cx={p.x} cy={p.y} r="4" fill="white" stroke={colors.first} strokeWidth="2.5" /> })}
        </g> })}
      </svg>
      {areas.map((area, index) => <section key={area.area} className={styles.radarArea} data-axis={index} aria-label={area.area}>
        <h4>{area.area}</h4>
        <dl>{series.map(key => {
          const styleKey = second ? key : "first"
          return <div key={key} data-series={styleKey}>
            <dt className={second ? undefined : styles.srOnly}>{second ? styleKey === "first" ? "1차" : styleKey === "current" ? "2차" : "최종" : "성취도와 점수"}</dt>
            <dd><strong className={styles.achievement}>{n(area[key] / area.max * 100)}<span>%</span></strong><small className={styles.areaPoints}>({n(area[key])}/{area.max})</small></dd>
          </div>
        })}</dl>
      </section>)}
    </div>
    <p className={styles.radarHint}>바깥쪽에 가까울수록 성취도가 높아요.</p>
  </figure>
}
function RoundWriting({ common, record, rounds }: { common: ReviewCommon; record: ReviewRecord; rounds: ReviewRecord[] }) {
  const items = reviewFeedbackItems(common.template, record.itemFeedback).filter(item => item.visible && plainReviewText(item.text))
  return <ReportSheet common={common} rounds={rounds} label={record.round + "차 작성글과 피드백"}>
    <Heading index={"0" + (record.round + 1)} title={record.round + "차 작성글과 피드백"} />
    <div className={styles.writingGrid}><article><header><h3><BookOpen size={21} aria-hidden="true" />내가 쓴 {record.round}차 글</h3><p>{common.template.title}</p></header><div className={styles.richText}><ReviewText value={record.finalBody || "제출한 작성글이 없습니다."} /></div></article>
      <article className={styles.feedback}><header><h3><MessageCircle size={21} aria-hidden="true" />선생님의 {record.round}차 피드백</h3></header><div className={styles.richText}><h4>선생님의 한마디</h4><ReviewText value={record.feedback || "저장된 피드백이 없습니다."} />{items.length > 0 && <div className={styles.items}>{items.map((item, i) => <section key={item.itemId}><h4><span>{i + 1}</span>{common.template.items.find(t => t.id === item.itemId)?.title ?? "항목별 피드백"}</h4><ReviewText value={item.text} /></section>)}</div>}</div></article></div>
  </ReportSheet>
}
export function ReviewReportView({ id, role }: { id: string; role: ReviewRole }) {
  const { db, loaded, error } = useReviews(role, role === "external" ? id : undefined)
  const record = db.records.find(r => r.id === id)
  const common = db.reviews.find(r => r.id === record?.reviewId)
  if (!loaded) return <p className={styles.empty} role="status">평가 보고서를 불러오고 있습니다.</p>
  if (!record?.report || !common?.reportEnabled || ((role === "student" || role === "external") && record.feedbackStatus !== "전송완료")) return <p role="alert" className={styles.empty}>조회할 수 있는 평가 보고서가 없습니다. {error}</p>
  const second = record.round === 2
  const first = second ? db.records.find(r => r.id === record.linkedRecordId && r.reviewId === record.reviewId && r.round === 1) : undefined
  const areas = reportAreaScores(common, record, first)
  if (!areas || (second && !first?.report)) return <p role="alert" className={styles.empty}>보고서 평가 데이터를 확인할 수 없습니다. {error}</p>
  const report = record.report, rounds = first ? [first, record] : [record]
  const criteria = assessmentCriteria(common.level, record)
  const improvement = reviewImprovementMessage(report.improvement ?? 0)
  return <div className={styles.document}>
    <nav className={styles.toolbar} aria-label="평가 보고서 도구"><span><BookOpen size={17} />온라인 독후감 평가 보고서</span><div>{first && <a href={"/online-review/report/" + first.id + "?role=" + role} target="_blank" rel="noopener noreferrer">1차 보고서 ↗</a>}<button type="button" onClick={() => window.print()}><Printer size={16} />인쇄 / 파일 저장</button></div></nav>
    <div className={styles.pages}>
      <section className={styles.sheet + " " + styles.cover} aria-label={record.round + "차 평가 보고서 표지"}>
        <header className={styles.coverTop}><Image src="/student-assets/dokdo-logo.svg" width={64} height={55} alt="독도" priority /></header>
        <div className={styles.coverContent}>
          <p className={styles.coverTagline}>읽어서 이치를 깨달아 표현하다. 독도!</p>
          <h1>독후감<br />평가 보고서</h1>
          <dl className={styles.coverDetails}>
            <div><dt>학생명</dt><dd className={styles.coverStudent}>{common.studentName}</dd></div>
            <div><dt>도서명</dt><dd><strong>{common.bookTitle}</strong><small>{common.template.title} · {common.level}레벨</small></dd></div>
            {common.institution?.trim() && <div><dt>학원명</dt><dd>{common.institution}</dd></div>}
            <div><dt>제출일</dt><dd>{record.round}차 · {reportDate(record.submittedAt)}</dd></div>
          </dl>
        </div>
        <div className={styles.coverArt} aria-hidden="true"><Image src="/student-assets/kangchi-reading.svg" width={240} height={188} alt="" /></div>
      </section>
      <ReportSheet common={common} rounds={rounds} label="평가 결과와 총평">
        <Heading index="01" title={second ? "글을 다시 쓰며 달라진 점" : "내 글을 함께 살펴봐요"} />
        <div className={styles.scoreOverview} data-round={record.round}>
        <div className={styles.scoreHero} data-round={record.round}>
          <div className={styles.mainScore}><span>{second ? "최종 점수" : "1차 점수"}</span><p><strong>{n(second ? report.finalScore : report.score)}</strong><span>/ 100점</span></p></div>
          {second ? <div className={styles.comparison}><h3>작성 차수별 점수</h3><div className={styles.roundScores}><div data-series="first"><span>1차 점수</span><strong>{n(report.firstScore)}<small>점</small></strong></div><ArrowRight aria-hidden="true" className={styles.scoreArrow} /><div data-series="current"><span>2차 점수</span><strong>{n(report.score)}<small>점</small></strong></div></div>{improvement && <p className={styles.change} data-change="up"><TrendingUp size={18} strokeWidth={2.5} aria-hidden="true" /><span>{improvement}</span></p>}</div> : <div className={styles.evaluatorSummary}><h3>평가 주체별 점수</h3><div className={styles.breakdown}><div><span>AI 1차 점수</span><strong>{n(report.ai)}<small>점</small></strong></div><div><span>선생님 1차 점수</span><strong>{n(report.teacher)}<small>점</small></strong></div></div></div>}
        </div>
        {second && <section className={styles.subjectScores} aria-label="평가 주체별 점수"><h3>평가 주체별 점수</h3><dl>
          <div><dt>AI 평가 총점</dt><dd>{n(report.weightedAi)}<small>점</small></dd></div>
          <div><dt>선생님 평가 총점</dt><dd>{n(report.weightedTeacher)}<small>점</small></dd></div>
          <div><dt>최종 점수</dt><dd>{n(report.finalScore)}<small>점</small></dd></div>
        </dl></section>}
        <section className={styles.scoreExplanation} aria-label="평가 점수 산출 방법"><h3>평가 점수 산출 방법</h3><p>{reviewScoreExplanation(record.round)}</p></section>
        </div>
        <section className={styles.areaSection} aria-label="영역별 평가 결과">
        <header className={styles.areaHeader}><div><h3>영역별 평가 결과</h3><p>성취도(%) · 괄호 안은 득점/배점</p></div>
          {second && <div className={styles.legend} aria-label="그래프 범례">{(["first", "current", "final"] as const).map(key => <span key={key}><SeriesMark series={key} />{key === "first" ? "1차" : key === "current" ? "2차" : "최종"}</span>)}</div>}
        </header>
        <Radar areas={areas} second={second} />
        </section>
        <section className={styles.commentSection} aria-label="평가보고서용 총평">
          <h3>{record.round}차 총평</h3>
          <div className={styles.reportComment}><div className={styles.richText}><ReviewText value={record.reportFeedback || "저장된 보고서용 총평이 없습니다."} /></div></div>
        </section>
      </ReportSheet>
      {rounds.map(r => <RoundWriting key={r.id} common={common} record={r} rounds={rounds} />)}
      <ReportSheet common={common} rounds={rounds} label="평가 기준 안내">
        <Heading index={second ? "04" : "03"} title="평가 기준 안내" />
        <div className={styles.tableWrap}><table className={styles.table + " " + styles.assessmentTable}>
          <colgroup><col style={{ width: "12%" }} /><col style={{ width: "14%" }} /><col /><col style={{ width: "8%" }} /></colgroup>
          <thead><tr><th scope="col">평가 영역</th><th scope="col">세부 기준</th><th scope="col">평가 기준 설명</th><th scope="col">배점</th></tr></thead>
          <tbody>{areas.map(area => <Fragment key={area.area}>{area.details.map((c, i) => <tr key={c.id}>
            {i === 0 && <th scope="rowgroup" rowSpan={area.details.length}>{area.area}</th>}
            <th scope="row">{reviewCriterionLabel(c)}</th><td className={styles.criterionDescription}><CriterionDescription value={c.description} /></td><td>{c.max}</td>
          </tr>)}</Fragment>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={3}>총점</th><td>{criteria.reduce((s, c) => s + c.max, 0)}</td></tr></tfoot>
        </table></div>
        <footer className={styles.endnote}><Image src="/student-assets/dokdo-logo.svg" width={38} height={33} alt="독도" /></footer>
      </ReportSheet>
    </div>
  </div>
}
