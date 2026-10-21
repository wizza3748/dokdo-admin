import type { CSSProperties } from "react"
import styles from "./review-design-icons.module.css"

// DD-1723 uses Font Awesome Free 6.5.2 for feedback icons and these outline
// SVGs for navigation. Font files and their SIL license are self-hosted.
const glyphs = {
  send: ["\uf1d8", "regular"], clock: ["\uf017", "regular"],
  calendar: ["\uf133", "regular"], calendarCheck: ["\uf274", "regular"],
  document: ["\uf15c", "regular"], edit: ["\uf044", "regular"],
  rotate: ["\uf2f1", "solid"], pen: ["\uf304", "solid"],
  check: ["\uf00c", "solid"], hourglass: ["\uf252", "solid"],
  info: ["\uf05a", "solid"], question: ["\u003f", "solid"],
  down: ["\uf063", "solid"],
} as const

const outlines = {
  bell: ["M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15z", "M10 21h4"],
  speaker: ["M3 10v4h3l7 4V6l-7 4H3z", "M17 9a4 4 0 0 1 0 6"],
  siren: ["M7 18v-6a5 5 0 0 1 10 0v6", "M4 18h16v3H4z", "M12 3v2M5 6l1.5 1.5M19 6l-1.5 1.5"],
  menu: ["M4 6h16M4 12h16M4 18h16"],
  chevron: ["M9 5l7 7-7 7"],
  close: ["M6 6l12 12M18 6L6 18"],
  report: ["M6 3h8l4 4v14H6z", "M14 3v4h4", "M9 17v-3M12 17v-6M15 17v-4"],
} as const

export type ReviewIconName = keyof typeof glyphs | keyof typeof outlines
export function ReviewIcon({ name, size = 18, className = "", style }: { name: ReviewIconName; size?: number; className?: string; style?: CSSProperties }) {
  if (name in outlines) return <svg aria-hidden="true" className={`${styles.icon} ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>{outlines[name as keyof typeof outlines].map(d => <path key={d} d={d}/>)}</svg>
  const [glyph, weight] = glyphs[name as keyof typeof glyphs]
  return <span aria-hidden="true" className={`${styles.icon} ${styles[weight]} ${className}`} style={{fontSize:size,...style}}>{glyph}</span>
}
