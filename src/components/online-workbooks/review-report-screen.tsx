import Image from "next/image"
import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { paginateReport, type ReportPagePart } from "./review-report-pagination"
import { reviewFeedbackItems, plainReviewText, scoreTotal, type ReviewCommon, type ReviewRecord } from "@/lib/review-domain"
import { weightedReviewScore, weightNote, roundingNote } from "@/lib/review-score-policy"
import { reportDate, type ReportArea } from "@/lib/review-report-model"
import { familyCriteriaForBook } from "@/lib/review-family-criteria"
import { safeReviewHtml } from "@/lib/review-html"
import { ReviewText } from "./review-ui"
import css from "./review-report-screen.module.css"

const points = (score: number) => score.toFixed(1) + "점"
type Identity = { common: ReviewCommon; record: ReviewRecord }

type Section = { title: string; intro?: ReactNode; body: ReactNode }

type PageHeaderProps = { identity: string; date: string; number: number; total: number }

function PageHeader({ identity, date, number, total }: PageHeaderProps) {
  return <header className={css.running}>
    <span>{identity}</span><span>{date}</span><span className={css.pageNumber}>{number} / {total}</span>
  </header>
}

function Sheet({ section, part, ...header }: PageHeaderProps & { section: Section; part?: ReportPagePart }) {
  return <section className={css.sheet} aria-label={section.title}>
    <PageHeader {...header} />
    {!part?.continuation && (section.intro ?? <h2 className={css.title}>{section.title}</h2>)}
    {part?.html === undefined ? <div data-page-body>{section.body}</div> :
      <div data-page-body dangerouslySetInnerHTML={{ __html: part.html }} />}
  </section>
}

function printString(value: string) {
  return '"' + value.replace(/["\\]/g, "\\$&").replace(/[\r\n\f]/g, " ") + '"'
}

function Radar({ areas, second }: { areas: ReportArea[]; second: boolean }) {
  const center = { x: 149, y: 137 }
  const point = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / areas.length
    const radius = 96 * ratio
    return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) }
  }
  const polygon = (values: number[]) => values.map((value, i) => {
    const p = point(i, value)
    return p.x + "," + p.y
  }).join(" ")
  const series = second ? (["first", "current"] as const) : (["current"] as const)
  return <figure className={css.figure}>
    <svg viewBox="0 0 338 255" role="img" aria-label={second ? "1차·2차 영역별 점수 비교" : "1차 영역별 점수"}>
      {[1, .75, .5, .25].map(r => <polygon key={r} points={polygon(areas.map(() => r))} fill="none" stroke="#cbd5df" />)}
      {areas.map((area, i) => {
        const vertex = point(i, 1)
        const label = point(i, 1.1)
        const side = i === 1 || i === 4
        const anchor = side ? (i === 1 ? "start" : "end") : "middle"
        const y = i === 0 ? label.y - 10 : label.y + (side ? 3 : 16)
        return <g key={area.area}>
          <line x1={center.x} y1={center.y} x2={vertex.x} y2={vertex.y} stroke="#d7dfe7" />
          <text x={label.x} y={y} textAnchor={anchor}>{area.area}</text>
        </g>
      })}
      {series.map(key => <g key={key} data-series={second && key === "current" ? "2차" : "1차"}>
        <polygon points={polygon(areas.map(a => a[key] / a.max))} fill="none" stroke="#1c2837" strokeWidth="2.2" strokeDasharray={key === "first" ? "5 4" : undefined} />
        {areas.map((area, i) => {
          const p = point(i, area[key] / area.max)
          return <circle key={area.area} cx={p.x} cy={p.y} r={second && key === "current" ? 3.8 : 3} stroke="#1c2837" strokeWidth="1.7" fill={second && key === "current" ? "white" : "#1c2837"} />
        })}
      </g>)}
    </svg>
    {second && <figcaption className={css.legend}><span><i />1차</span><span><i />2차</span></figcaption>}
  </figure>
}

function Change({ value, card = false }: { value: number; card?: boolean }) {
  if (value === 0) return <>{card ? points(0) : "–"}</>
  return <span className={value > 0 ? css.up : css.down}>{value > 0 ? "▲ " : "▼ "}{points(Math.abs(value))}</span>
}

function Scores({ record, first, areas }: { record: ReviewRecord; first?: ReviewRecord; areas: ReportArea[] }) {
  const rounds = (first ? [first, record] : [record]).map(r => {
    const ai = scoreTotal(r.aiScores!), teacher = scoreTotal(r.teacherScores!)
    return { round: r.round, ai, teacher, score: weightedReviewScore(ai, teacher) }
  })
  const current = rounds[rounds.length - 1].score, previous = rounds[0].score
  const rows = [...areas.map(a => ({ label: a.area, max: a.max, first: a.first, current: a.current })),
    { label: "총점", max: 100, first: previous, current }]
  return <>
    <section className={css.results} aria-label="평가 결과">
      <h2 className={css.title}>평가 결과</h2>
      <div className={css.scoreOverview}>
        <div className={css.scoreCard}>
          <span>{record.round}차 점수</span>
          <div><strong>{current.toFixed(1)}</strong><span> / 100점</span></div>
          {first && <p>1차 {points(previous)} → <Change value={current - previous} card /></p>}
        </div>
        <div className={css.tablePanel}>
          <table className={css.roundsTable} aria-label="평가자 점수"><thead><tr>
            {first && <th scope="col" aria-label="차수" />}
            <th scope="col">AI 평가</th><th scope="col">선생님 평가 <span className={css.weight}>×2</span></th>
            <th scope="col">{first ? "회차 점수" : "1차 점수"}</th>
          </tr></thead><tbody>{rounds.map(r => <tr key={r.round}>
            {first && <th scope="row">{r.round}차</th>}
            <td>{points(r.ai)}</td><td>{points(r.teacher)}</td><td>{points(r.score)}</td>
          </tr>)}</tbody></table>
          <p className={css.note}>{weightNote}</p>
        </div>
      </div>
    </section>
    <section className={css.areaSection} aria-label="영역별 점수">
      <div className={css.scoreHeader}><h2 className={css.title}>영역별 점수</h2>{first && <small>그래프: 1차 · 2차 점수</small>}</div>
      <div className={css.areaResults}><Radar areas={areas} second={!!first} />
        <div className={css.tablePanel}>
          <table className={css.data} aria-label="영역별 점수표">
            <thead><tr>{(first ? ["영역", "1차", "2차", "변화", "2차 성취도"] : ["영역", "점수", "성취도"]).map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{rows.map(a => <tr key={a.label}><th scope="row">{a.label} <span>({a.max}점)</span></th>
              {first && <td>{points(a.first)}</td>}<td>{points(a.current)}</td>
              {first && <td><Change value={a.current - a.first} /></td>}<td>{Math.round(a.current / a.max * 100)}%</td>
            </tr>)}</tbody>
          </table>
          <p className={css.note}>{roundingNote}</p>
        </div>
      </div>
    </section>
  </>
}

function TeacherEvaluation({ record }: { record: ReviewRecord }) {
  // Only mark an existing paragraph label. Scores, quotes and other teacher edits are saved text.
  const clean = safeReviewHtml(record.reportFeedback ?? "")
    .replace(/<(p|div)>(?:\s|&nbsp;|<br>)*<\/\1>/gi, "")
    .replace(/(?:\r?\n[ \t]*){2,}/g, "\n")
  const paragraphLabel = /(^|\n|<br>|<(?:p|div)>)([ \t]*(?:<(?:strong|b|em|i|u|s)>)*)(내용 요약|감상과 깨달음|발상과 독창성|구성과 조직력|표현력|종합)(:|(?=(?:<\/(?:strong|b|em|i|u|s)>)+:))/g
  const firstLabel = clean.search(paragraphLabel)
  const marked = clean.replace(paragraphLabel, (_, boundary: string, formatting: string, label: string, colon: string, offset: number) => {
    const separator = offset === firstLabel ? "" : ` data-separator="${label === "종합" ? "summary" : "area"}"`
    return `${boundary}${formatting}<span class="${css.areaLabel}"${separator}>${label}${colon}</span>`
  })
  return <div className={css.areaComments} data-report-flow dangerouslySetInnerHTML={{ __html: marked }} />
}

function Writing({ common, round }: { common: ReviewCommon; round: ReviewRecord }) {
  const items = reviewFeedbackItems(common.template, round.itemFeedback).filter(item => item.visible && plainReviewText(item.text))
  return <div className={css.writing}>
    <article className={css.studentWriting} data-report-flow>
      <header className={css.writingHeader}><h3>내가 쓴 글</h3><span>{reportDate(round.submittedAt, "long")} 제출</span></header>
      <ReviewText value={round.finalBody} />
    </article>
    <article className={css.teacherWriting} data-report-flow>
      <h3>선생님 피드백</h3><h4>선생님 한마디</h4><ReviewText value={round.feedback} />
      {items.map(item => <section key={item.itemId}><h4>{common.template.items.find(q => q.id === item.itemId)?.title}</h4><ReviewText value={item.text} /></section>)}
    </article>
  </div>
}

function FamilyGuide({ level }: { level: number }) {
  const criteria = familyCriteriaForBook(level)
  return <><table className={css.guide}><thead><tr><th scope="col">평가 영역</th><th scope="col">세부 기준</th><th scope="col">세부 평가 기준</th></tr></thead>
    {[...new Set(criteria.map(c => c.area))].map(area => {
      const group = criteria.filter(c => c.area === area)
      return <tbody key={area}>{group.map((c, i) => <tr key={c.id}>{i === 0 && <th scope="rowgroup" rowSpan={group.length}>{area} ({group.reduce((sum, v) => sum + v.max, 0)}점)</th>}
        <th scope="row">{c.number} {c.name} ({c.max}점)</th><td>{c.description}</td></tr>)}</tbody>
    })}<tfoot><tr><td colSpan={3}>총점 100점</td></tr></tfoot></table>
    <div className={css.guideNotes} data-guide-note><p>{weightNote}</p><p>AI 평가 점수는 처음 생성할 때 확정되며 바뀌지 않아요.</p></div>
  </>
}

export function ReviewReportScreen({ common, record, first, areas }: Identity & { first?: ReviewRecord; areas: ReportArea[] }) {
  const rounds = first ? [first, record] : [record]
  const institution = common.institution?.trim() || record.report?.institutionName?.trim()
  const identity = common.studentName + " · 《" + common.bookTitle + "》 " + common.template.title
  const date = record.round + "차 작성 완료 · " + reportDate(record.submittedAt, "long")
  const sections: Section[] = [
    { title: "영역별 평가", body: <TeacherEvaluation record={record} /> },
    ...rounds.map(r => ({
      title: r.round + "차 작성글과 피드백",
      intro: <h2 className={css.writingRound}>{r.round}차</h2>,
      body: <Writing common={common} round={r} />,
    })),
    { title: "평가 기준 안내", intro: <><h2 className={css.title}>평가 기준 안내</h2>
      <p className={css.guideIntro}>이 보고서는 {common.level < 4 ? "1~3" : "4~6"}레벨 도서용 기준으로 평가했어요.</p></>,
      body: <FamilyGuide level={common.level} /> },
  ]
  const measurement = useRef<HTMLDivElement>(null)
  const [parts, setParts] = useState<ReportPagePart[] | null>(null)
  useLayoutEffect(() => {
    const stage = measurement.current!
    let active = true, frame = 0
    const layout = () => {
      if (!active || !stage.clientHeight) return
      const pages = paginateReport(stage)
      setParts(previous => previous && JSON.stringify(previous) === JSON.stringify(pages) ? previous : pages)
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(layout) }
    const rootStyle = document.documentElement.style
    rootStyle.setProperty("--review-print-identity", printString(identity))
    rootStyle.setProperty("--review-print-date", printString(date))
    layout()
    const observer = new ResizeObserver(schedule)
    Array.from(stage.children).forEach(el => observer.observe(el))
    stage.addEventListener("load", schedule, true)
    void document.fonts.ready.then(() => { if (active) schedule() })
    const forPrint = () => { flushSync(layout) }
    window.addEventListener("beforeprint", forPrint)
    return () => {
      active = false
      observer.disconnect()
      cancelAnimationFrame(frame)
      stage.removeEventListener("load", schedule, true)
      window.removeEventListener("beforeprint", forPrint)
      rootStyle.removeProperty("--review-print-identity")
      rootStyle.removeProperty("--review-print-date")
    }
  }, [common, record, first, identity, date])
  const pages = parts ?? sections.map((_, section) => ({ section }))
  const total = 1 + pages.length
  return <>
    <main className={css.pages} aria-label={record.round + "차 독후감 평가 보고서"}>
      <section className={css.sheet + " " + css.overview} aria-label="보고서 첫 쪽">
        <header className={css.masthead}>
          <div className={css.coverBar}>
            <Image src="/student-assets/dokdo-logo.svg" alt="독도" width={52} height={44} priority />
            <span>독후감 평가 보고서 {record.round}차</span>
          </div>
          <h1>{common.bookTitle}</h1>
          <p>{common.level}레벨 · {common.template.title}</p>
          <dl className={css.identity}>{[["학생", common.studentName], ...(institution ? [["학원", institution]] : []), ["제출일", reportDate(record.submittedAt)]].map(([k,v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </header>
        <Scores record={record} first={first} areas={areas} />
      </section>
      {pages.map((part, i) => <Sheet key={i} section={sections[part.section]} part={part} identity={identity} date={date} number={i + 2} total={total} />)}
    </main>
    <div ref={measurement} className={css.measurement} aria-hidden inert>
      {sections.map((section, i) => <Sheet key={section.title} section={section} identity={identity} date={date} number={i + 2} total={sections.length + 1} />)}
    </div>
  </>
}
