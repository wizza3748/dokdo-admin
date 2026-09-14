"use client"
import Image from "next/image"
import { Fragment } from "react"
import { BookOpen, MessageCircle, Printer } from "lucide-react"
import { useReviews, type ReviewRole } from "@/lib/review-client"
import { assessmentCriteria, plainReviewText, scoreLabel, type ReviewCommon, type ReviewRecord } from "@/lib/review-domain"
import { snapshotReviewAssessment } from "@/lib/review-assessment-config"
import { reportAreaScores, reportDate, type ReportArea } from "@/lib/review-report-model"
import { ReviewText } from "./review-ui"
import styles from "./review-report.module.css"

const colors = { first: "#3974cc", current: "#008778", final: "#7b51c7" }
const n = (value?: number) => value === undefined ? "—" : scoreLabel(value)
function Heading({ index, title, description }: { index: string; title: string; description?: string }) {
  return <header className={styles.heading}><span>{index}</span><div><h2>{title}</h2>{description && <p>{description}</p>}</div></header>
}
function Radar({ areas, second }: { areas: ReportArea[]; second: boolean }) {
  const series = second ? ["first", "current", "final"] as const : ["current"] as const
  const point = (i: number, ratio: number, radius = 142) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / areas.length
    return { x: 300 + Math.cos(angle) * radius * ratio, y: 190 + Math.sin(angle) * radius * ratio }
  }
  const polygon = (ratio: number) => areas.map((_, i) => { const p = point(i, ratio); return p.x + "," + p.y }).join(" ")
  return <figure className={styles.radar}><figcaption>평가 영역별 성취도</figcaption>
    <div className={styles.legend}>{series.map(key => <span key={key}><i style={{ background: colors[key] }} />{key === "first" ? "1차" : key === "final" ? "최종" : second ? "2차" : "1차"} 점수</span>)}</div>
    <svg viewBox="0 0 600 380" role="img" aria-label="영역별 성취도 방사형 그래프. 정확한 점수와 성취도는 아래 표에서 확인할 수 있습니다.">
      {[1, .8, .6, .4, .2].map(r => <polygon key={r} points={polygon(r)} fill={r === 1 ? "#f7f9fc" : "none"} stroke="#d9e2eb" strokeDasharray={r === 1 ? undefined : "3 4"} />)}
      {areas.map((a, i) => { const p = point(i, 1), label = point(i, 1, 178); return <g key={a.area}><line x1="300" y1="190" x2={p.x} y2={p.y} stroke="#d9e2eb" /><text x={label.x} y={label.y} textAnchor={i === 0 ? "middle" : i <= 2 ? "start" : "end"} className={styles.axis}>{a.area}<tspan x={label.x} dy="17" className={styles.axisMax}>{a.max}점</tspan></text></g> })}
      {[.2, .4, .6, .8, 1].map(r => <text key={r} x="307" y={190 - 142 * r + 4} className={styles.tick}>{r * 100}%</text>)}
      {series.map(key => <g key={key}><polygon points={areas.map((a, i) => { const p = point(i, a[key] / a.max); return p.x + "," + p.y }).join(" ")} fill={colors[key]} fillOpacity=".06" stroke={colors[key]} strokeWidth="2.5" strokeLinejoin="round" strokeDasharray={key === "final" ? "5 3" : undefined} />{areas.map((a, i) => { const p = point(i, a[key] / a.max); return key === "final" ? <rect key={a.area} x={p.x - 3} y={p.y - 3} width="6" height="6" fill={colors[key]} /> : <circle key={a.area} cx={p.x} cy={p.y} r="3.5" fill={colors[key]} /> })}</g>)}
    </svg><p>영역별 배점 대비 성취도(%) · AI와 선생님 평가를 평균한 점수</p>
  </figure>
}
function RoundWriting({ common, record }: { common: ReviewCommon; record: ReviewRecord }) {
  const items = record.itemFeedback.filter(item => item.visible && plainReviewText(item.text))
  return <section className={styles.sheet} aria-label={record.round + "차 작성글과 피드백"}>
    <Heading index={"0" + (record.round + 1)} title={record.round + "차 작성글과 피드백"} description={"학생 제출 " + reportDate(record.submittedAt) + " · 피드백 저장 " + reportDate(record.savedAt)} />
    <div className={styles.writingGrid}><article><header><h3><BookOpen size={21} aria-hidden="true" />내가 쓴 {record.round}차 글</h3><p>{common.template.title}</p></header><div className={styles.richText}><ReviewText value={record.finalBody || "제출한 작성글이 없습니다."} /></div></article>
      <article className={styles.feedback}><header><h3><MessageCircle size={21} aria-hidden="true" />선생님의 {record.round}차 피드백</h3></header><div className={styles.richText}><h4>선생님의 한마디</h4><ReviewText value={record.feedback || "저장된 피드백이 없습니다."} />{items.length > 0 && <div className={styles.items}>{items.map((item, i) => <section key={item.itemId}><h4><span>{i + 1}</span>{common.template.items.find(t => t.id === item.itemId)?.title ?? "항목별 피드백"}</h4><ReviewText value={item.text} /></section>)}</div>}</div></article></div>
  </section>
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
  const criteria = assessmentCriteria(common.level, record), group = record.assessment ?? snapshotReviewAssessment(common.level)
  const change = report.improvement ?? 0
  return <div className={styles.document}>
    <nav className={styles.toolbar} aria-label="평가 보고서 도구"><span><BookOpen size={17} />온라인 독후감 평가 보고서</span><div>{first && <a href={"/online-review/report/" + first.id + "?role=" + role} target="_blank" rel="noopener noreferrer">1차 보고서 ↗</a>}<button type="button" onClick={() => window.print()}><Printer size={16} />인쇄 / 파일 저장</button></div></nav>
    <div className={styles.pages}>
      <section className={styles.sheet + " " + styles.cover} aria-label={record.round + "차 평가 보고서 표지"}>
        <header className={styles.coverTop}><Image src="/student-assets/dokdo-logo.svg" width={64} height={55} alt="독도" priority /></header>
        <div className={styles.coverContent}><div className={styles.eyebrow}>{reportDate(record.submittedAt, true)}<span />{record.round}차 평가 보고서</div><h1>읽어서<br />이치를 깨달아<br />표현하다. <span>독도!</span></h1><p className={styles.subtitle}>독서 감상문 평가 보고서</p><div className={styles.student}>{common.studentName}<span>학생의 독서 기록</span></div><div className={styles.book}><BookOpen size={23} /><div><strong>{common.bookTitle}</strong><p>{common.template.title} · {common.level}레벨</p></div></div></div>
        <div className={styles.coverArt} aria-hidden="true"><Image src="/student-assets/kangchi-reading.svg" width={240} height={188} alt="" /></div>
        <footer className={styles.coverFooter}><div>{common.institution?.trim() && <strong>{common.institution}</strong>}<p>학생 제출 {reportDate(record.submittedAt)}</p></div></footer>
      </section>
      <section className={styles.sheet} aria-label="평가 결과와 총평">
        <Heading index="01" title={second ? "글을 다시 쓰며 달라진 점" : "내 글을 함께 살펴봐요"} description={common.studentName + " 학생 · " + common.bookTitle} />
        <div className={styles.scoreHero}><div><span>{second ? "최종 점수" : "1차 점수"}</span><p><strong>{n(second ? report.finalScore : report.score)}</strong><span>/ 100</span></p>{!second && <small>AI · 선생님 평가 평균</small>}</div><div className={styles.breakdown}>{second ? <><div><span>1차 점수</span><strong>{n(report.firstScore)}</strong></div><div><span>2차 점수</span><strong>{n(report.score)}</strong></div><div className={styles.change}><span>점수 변화</span><strong>{change > 0 ? "+" : ""}{n(change)}<small>점</small></strong></div></> : <><div><span>AI 1차 점수</span><strong>{n(report.ai)}</strong></div><div><span>선생님 1차 점수</span><strong>{n(report.teacher)}</strong></div></>}</div></div>
        <div className={styles.visualSummary}>
        <Radar areas={areas} second={second} />
        <div className={styles.tableWrap}><table className={styles.table}><caption>영역별 점수 · 배점 대비 성취도</caption><thead><tr><th scope="col">평가 영역</th><th scope="col">배점</th><th scope="col">1차</th>{second && <><th scope="col">2차</th><th scope="col">최종</th></>}</tr></thead><tbody>{areas.map(a => <tr key={a.area}><th scope="row">{a.area}</th><td>{a.max}점</td>{(second ? [a.first, a.current, a.final] : [a.current]).map((score, i) => <td key={i}><b>{n(score)}</b><small>{n(score / a.max * 100)}%</small></td>)}</tr>)}</tbody></table></div>
        </div>
        <section className={styles.commentSection} aria-label="평가보고서용 총평">
          <h3>{record.round}차 총평</h3>
          <div className={styles.reportComment}><div className={styles.richText}><ReviewText value={record.reportFeedback || "저장된 보고서용 총평이 없습니다."} /></div></div>
        </section>
      </section>
      {rounds.map(r => <RoundWriting key={r.id} common={common} record={r} />)}
      <section className={styles.sheet} aria-label="평가 기준 안내">
        <Heading index={second ? "04" : "03"} title="평가 기준 안내" description={group.label + " (" + group.minLevel + "–" + group.maxLevel + "레벨) · " + areas.length + "개 영역 · " + criteria.length + "개 세부 기준"} />
        <div className={styles.tableWrap}><table className={styles.table + " " + styles.assessmentTable}>
          <colgroup><col style={{ width: "12%" }} /><col style={{ width: "14%" }} /><col /><col style={{ width: "8%" }} /></colgroup>
          <thead><tr><th scope="col">평가 영역</th><th scope="col">세부 기준</th><th scope="col">평가 기준 설명</th><th scope="col">배점</th></tr></thead>
          <tbody>{areas.map(area => <Fragment key={area.area}>{area.details.map((c, i) => <tr key={c.id}>
            {i === 0 && <th scope="rowgroup" rowSpan={area.details.length}>{area.area}</th>}
            <th scope="row">{c.name}</th><td className={styles.criterionDescription} style={{ whiteSpace: "pre-line" }}>{c.description}</td><td>{c.max}</td>
          </tr>)}</Fragment>)}</tbody>
          <tfoot><tr><th scope="row" colSpan={3}>총점</th><td>{criteria.reduce((s, c) => s + c.max, 0)}</td></tr></tfoot>
        </table></div>
        <footer className={styles.endnote}><Image src="/student-assets/dokdo-logo.svg" width={38} height={33} alt="독도" /><span>피드백 저장 {reportDate(record.savedAt)}</span></footer>
      </section>
    </div>
  </div>
}
