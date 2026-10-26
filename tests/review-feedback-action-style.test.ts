import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

test("피드백 작성 열은 연필과 AI 횟수만 표시하며 동작별 접근성 이름과 이동은 유지", () => {
  const source = readFileSync("src/components/online-workbooks/review-feedback-action.tsx", "utf8")
  const contents = source.slice(source.indexOf("const contents ="), source.indexOf("const close ="))
  assert.match(contents, /<Pencil/)
  assert.match(contents, /\(\{record\.aiUsed\}\/2\)/)
  assert.doesNotMatch(contents, /\{action\}|보기|수정|작성/)
  assert.match(source, /피드백 \$\{action\}, AI 사용 \$\{record\.aiUsed\}\/2회/)
  assert.match(source, /<Link href=\{href\} aria-label=\{label\}/)
  assert.match(source, /aria-label=\{label\} className=\{className\} onClick=\{\(\) => void enter\(\)\}/)
})
