import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
test("공통 글꼴은 학생 route와 portal에 한정하고 외부 공유·관리자 스타일을 바꾸지 않음", () => {
  const layout = source("src/app/student/layout.tsx")
  const css = source("src/app/student/student-font.css")
  assert.match(layout, /data-student-front/)
  assert.match(source("src/app/reading/layout.tsx"), /data-student-front/)
  assert.match(css, /body:has\(\[data-student-front\]\)/)
  assert.match(css, /Dokdo Student Noto/)
  assert.doesNotMatch(css, /(?:^|\n)body\s*\{/)
  const header = source("src/components/student/student-header.tsx")
  assert.match(header, /reviewDesign = false/)
  const flow = source("src/components/student/student-review-flow.tsx")
  assert.match(flow, /!external \? ui.referenceResult : ""/)
})

test("독후감 목록만 원본 아이콘·달력 접기·오늘 강조 사용, 기존 집계 기준 보존", () => {
  const page = source("src/components/student/exploration-record.tsx")
  const css = source("src/components/student/exploration-test-server.module.css")
  const row = source("src/components/student/student-review-records.tsx")
  assert.match(page, /referenceDesign=\{tab === "온라인 독후감"\}/)
  assert.match(page, /data-active=\{Boolean\(grouped\[i\+1\]\)\}/)
  assert.match(page, /aria-expanded=\{calendarExpanded\}/)
  assert.match(css, /\.workbookDesign \.calendar\[data-expanded=false\] \.calendarBody\{display:none\}/)
  assert.match(css, /@media\(max-width:800px\)/)
  assert.match(row, /referenceDesign && <ReviewIcon name="chevron"/)
})

test("신청 변경 1건은 전후 도서와 제출일, 여러 건은 기존 선택 및 키보드 동작 유지", () => {
  const modal = source("src/components/student/pro-feedback-modal.tsx")
  assert.match(modal, /singleChange = action === "change" && candidates.length === 1/)
  assert.match(modal, /useState\(candidates.length === 1 \? candidates\[0\] : ""\)/)
  assert.match(modal, /className=\{ui.changeFlow\}/)
  assert.match(modal, /<ReviewIcon name="down"/)
  assert.match(modal, /previousRecord\.submittedAt/)
  assert.match(modal, /role="radiogroup"/)
  assert.match(modal, /aria-checked=\{selected === id\}/)
  assert.match(modal, /"ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"/)
  assert.match(modal, /disabled=\{busy \|\| \(action === "change" && !selected\)\}/)
  assert.match(modal, /onConfirm\(selected \|\| undefined\)/)
})

test("피드백 문구·판정은 그대로 사용하고 원형 아이콘과 분홍색만 표현 계층에서 변경", () => {
  const action = source("src/components/student/pro-feedback-status.tsx")
  const css = source("src/components/student/pro-feedback.module.css")
  assert.match(action, /proBookPresentation\(db.studentPro, reviewId\)/)
  assert.match(action, /data-writing=\{state.status === "피드백 작성 중"\}/)
  assert.match(action, /c\?\.selected \? "check"/)
  assert.match(css, /\.badge\[data-writing=true\]\{background:#ffedf3;color:#ff6597\}/)
  assert.match(css, /\.symbol\[data-variant=teacher\]\{background:#ff6597;color:white\}/)
  const modal = source("src/components/student/pro-feedback-modal.tsx")
  assert.match(modal, /proRolloverText\(view.usage\)/)
  assert.match(modal, /studentProCopy.cancelNotice/)
  assert.match(modal, /name="document"/)
  assert.match(modal, /action === "apply" \? "calendar" : "info"/)
})

test("상단 행동 버튼은 권수 안내와 분리하고 도움말 바로 왼쪽에 배치", () => {
  const page = source("src/components/student/pro-feedback-status.tsx")
  const actions = page.slice(page.indexOf("className={ui.summaryActions}"), page.indexOf("{ready && helpOpen"))
  assert.ok(actions.indexOf("{guidance.label}") < actions.indexOf('aria-label="자세히"'))
  assert.match(actions, /href=\{guidance.href\}/)
  assert.match(source("src/components/student/pro-feedback.module.css"), /\.summaryActions\{display:flex;align-items:center;gap:8px;flex-shrink:0\}/)
})
