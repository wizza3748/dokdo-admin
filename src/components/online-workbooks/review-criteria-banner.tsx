"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { GripHorizontal, X } from "lucide-react"
import { reviewAreaLabel, reviewCriterionLabel, type ReviewAssessmentCriterion } from "@/lib/review-assessment-config"
import styles from "./review-criteria-banner.module.css"

const margin = 8
const clamp = (value: number, max: number) => Math.max(margin, Math.min(value, max - margin))

function scoreCellRect(trigger: HTMLElement) {
  return (trigger.closest("td, th") ?? trigger).getBoundingClientRect()
}

function initialPosition(trigger: HTMLElement) {
  const cell = scoreCellRect(trigger)
  const w = window.innerWidth, h = window.innerHeight
  const leftSpace = cell.left - 2 * margin, rightSpace = w - cell.right - 2 * margin
  const width = Math.min(440, Math.max(leftSpace, rightSpace), w - 2 * margin)
  const top = clamp(cell.top, h - Math.min(320, h * 0.55))
  if (width >= 240) return {
    x: leftSpace >= rightSpace ? clamp(cell.left - width - margin, w - width) : cell.right + margin,
    y: top, width, maxHeight: h - top - margin,
  }
  const above = cell.top > h - cell.bottom
  const maxHeight = Math.max(80, (above ? cell.top : h - cell.bottom) - 2 * margin)
  return { x: margin, y: above ? margin : clamp(cell.bottom + margin, h - maxHeight), width: Math.min(440, w - 2 * margin), maxHeight }
}

function CriterionDescription({ text }: { text: string }) {
  return <div className={styles.description}>
    {text.split(/\r?\n/).map((line, index) => {
      const note = line.match(/^\s*([•＊])\s*(.*)$/u)
      return note
        ? <p key={index} className={styles.note}><span>{note[1]} </span><span>{note[2]}</span></p>
        : <p key={index}>{line}</p>
    })}
  </div>
}

export function ReviewCriteriaBanner({ selection, trigger, criteria, level, groupLabel, onClose }: {
  selection: string; trigger: HTMLElement; criteria: ReviewAssessmentCriterion[]; level: number; groupLabel: string; onClose: () => void
}) {
  const panel = React.useRef<HTMLElement>(null)
  const content = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ x: number; y: number } | null>(null)
  const titleId = React.useId()
  const [position, setPosition] = React.useState(() => initialPosition(trigger))
  const all = selection === "all"
  const visible = all ? criteria : criteria.filter(c => c.id === selection)
  const areas = [...new Set(visible.map(criterion => criterion.area))]
  const close = React.useCallback(() => {
    if (panel.current?.contains(document.activeElement)) trigger.focus({ preventScroll: true })
    onClose()
  }, [trigger, onClose])
  React.useLayoutEffect(() => {
    if (content.current) content.current.scrollTop = 0
  }, [selection])
  React.useEffect(() => {
    const resize = () => setPosition(initialPosition(trigger))
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close() } }
    window.addEventListener("resize", resize)
    window.addEventListener("keydown", key)
    return () => { window.removeEventListener("resize", resize); window.removeEventListener("keydown", key) }
  }, [trigger, close])
  return createPortal(<aside ref={panel} role="dialog" aria-modal={false} aria-labelledby={titleId}
    className="fixed z-[75] flex flex-col overflow-hidden rounded-xl border border-slate-300 bg-white text-left text-sm text-slate-800 shadow-xl"
    style={{ left: position.x, top: position.y, width: position.width, maxHeight: Math.min(position.maxHeight, window.innerHeight - position.y - margin) }}>
    <header className="flex shrink-0 cursor-grab touch-none select-none items-center justify-between gap-2 border-b border-slate-200 bg-white px-3.5 py-2 active:cursor-grabbing"
      onPointerDown={event => {
        if (event.button !== 0 || (event.target as Element).closest("button")) return
        drag.current = { x: event.clientX - position.x, y: event.clientY - position.y }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={event => {
        if (!drag.current || !panel.current) return
        const box = panel.current.getBoundingClientRect()
        setPosition({ ...position, x: clamp(event.clientX - drag.current.x, window.innerWidth - box.width),
          y: clamp(event.clientY - drag.current.y, window.innerHeight - box.height) })
      }}
      onLostPointerCapture={() => { drag.current = null }}>
      <h2 id={titleId} className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-slate-900"><GripHorizontal aria-hidden size={16} className="text-slate-400" />{all ? "평가 기준표" : "세부 평가 기준"}{visible[0]?.bands && <span className={styles.level}>{groupLabel}</span>}</h2>
      <button type="button" onClick={close} aria-label="닫기" className="grid size-7 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"><X aria-hidden size={17} /></button>
    </header>
    <div ref={content} tabIndex={0} className={all ? styles.overview : styles.detail}>
      {areas.map(area => <section key={area} className={styles.area}>
        {all && <h3 className={styles.areaTitle}>{reviewAreaLabel(area)}</h3>}
        {visible.filter(criterion => criterion.area === area).map(criterion =>
          <section key={criterion.id} className={styles.criterion}>
            <div className={styles.heading}>
              <h4>{reviewCriterionLabel(criterion)}</h4>
              <span className={styles.score}>{criterion.max}점</span>
            </div>
            <CriterionDescription text={criterion.description} />
            {criterion.levelDescriptions?.filter(item => level >= item.minLevel && level <= item.maxLevel).map(item =>
              <CriterionDescription key={item.minLevel + "-" + item.maxLevel} text={item.description} />)}
            {criterion.bands && <table className={styles.bands} aria-label={`${reviewCriterionLabel(criterion)} 점수 구간`}>
              <thead><tr><th scope="col">점수</th><th scope="col">구간 설명</th></tr></thead>
              <tbody>{criterion.bands.map(band => <tr key={band.score}>
                <th scope="row">{band.score}</th><td>{band.description}</td>
              </tr>)}</tbody>
            </table>}
          </section>)}
      </section>)}
      {all && <div className={styles.total}><span>배점 합계</span><strong>{criteria.reduce((sum, c) => sum + c.max, 0)}점</strong></div>}
    </div>
  </aside>, document.body)
}
