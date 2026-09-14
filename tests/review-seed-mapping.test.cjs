/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CommonJS test loader for Next's TS aliases; never loaded by the app. */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')

// Load the application's actual seed builders without a browser or state-file writes.
const root = path.resolve(__dirname, '..')
const originalResolve = Module._resolveFilename
Module._resolveFilename = function (name, ...args) {
  return originalResolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args)
}
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename)
const { getDefaultReviewDatabase } = require('../src/lib/review-seeds.ts')
const { mergeReviewSeeds, studentReviewNotices, studentReviewRecordStatus } = require('../src/lib/review-domain.ts')
const { studentWorkbooks } = require('../src/lib/student-workbooks.ts')
const { WORKBOOK_TEMPLATE_LIVE_DETAILS } = require('../src/lib/workbook-template-live-data.ts')

test('초기화 기본값은 9월 미확인 피드백 2건이며 이전 피드백은 읽음이다', () => {
  const db = getDefaultReviewDatabase()
  const studentIds = db.reviews.filter(c => c.studentId === '26142').map(c => c.id)
  const unread = db.records.filter(r => studentIds.includes(r.reviewId) && r.feedbackStatus === '전송완료' && !r.seenAt)
  assert.deepEqual(unread.map(r => r.id).sort(), ['review-seed-student-gamunjang-0824-r1', 'review-seed-two-rounds-r2'].sort())
  assert.ok(unread.every(r => r.sentAt.startsWith('2026-09')))
  const old = structuredClone(db)
  old.seedVersion = 5
  const historical = old.records.find(r => studentIds.includes(r.reviewId) && r.sentAt < '2026-09-01')
  historical.seenAt = undefined
  historical.feedback = '수정한 피드백 보존'
  historical.history.push({ requestId: 'user-edit', action: 'save-feedback', actor: '선생님', at: historical.sentAt })
  const migrated = mergeReviewSeeds(old, db)
  assert.ok(migrated.records.find(r => r.id === historical.id).seenAt)
  assert.equal(migrated.records.find(r => r.id === historical.id).feedback, '수정한 피드백 보존')
  assert.deepEqual(mergeReviewSeeds(migrated, db), migrated)
  assert.deepEqual(getDefaultReviewDatabase(), db)
})

test('학생 기본 목 데이터는 오늘 이전 작성 단계와 알림 유형을 골고루 유지한다', () => {
  const db = getDefaultReviewDatabase()
  const today = '2026-09-09'
  const studentReviews = db.reviews.filter(common => common.studentId === '26142' && common.createdAt.slice(0, 10) < today)
  const records = db.records.filter(record => studentReviews.some(common => common.id === record.reviewId))
  const statusLabels = records.map(record => studentReviewRecordStatus(studentReviews.find(common => common.id === record.reviewId), record))

  const beforeWorkbook = studentWorkbooks.find(workbook => workbook.status === 'before' && `${workbook.year}-${String(workbook.month).padStart(2, '0')}-${String(workbook.day).padStart(2, '0')}` < today)
  assert.ok(beforeWorkbook)
  assert.ok(!db.reviews.some(common => common.sourceWorkbookId === beforeWorkbook.id))
  assert.ok(statusLabels.includes('2차 작성가능'))
  assert.ok(statusLabels.includes('2차 작성중'))
  assert.ok(statusLabels.includes('2차 피드백 도착'))

  const notices = studentReviewNotices(db)
  assert.equal(notices.filter(notice => notice.kind === 'feedback').length, 2)
  assert.equal(notices.filter(notice => notice.kind === 'writing-request').length, 1)
  assert.equal(new Set(notices.map(notice => notice.review.id)).size, notices.length)
  assert.deepEqual(getDefaultReviewDatabase(), db)
})

test('모든 기본 독후감은 수집된 같은 책·레벨·회차 연결만 사용하고 자유형을 쓰지 않는다', () => {
  const db = getDefaultReviewDatabase()
  for (const common of db.reviews) {
    const template = WORKBOOK_TEMPLATE_LIVE_DETAILS.find(t => String(t.id) === common.template.id)
    assert.ok(template, common.bookTitle)
    assert.ok(template.connectedBooks.some(([, title, level, round]) => title === common.bookTitle && level === common.level && round === 1), common.bookTitle)
    assert.notEqual(common.template.id, '43')
  }
  assert.equal(db.reviews.find(c => c.sourceWorkbookId === 'gamunjang-0824').template.id, '68')
  assert.equal(db.reviews.find(c => c.sourceWorkbookId === 'room901-0825').template.id, '51')
})

test('2차 완료 예시는 901호 실제 연결 51번과 차수별 보고서를 갖는다', () => {
  const db = getDefaultReviewDatabase()
  const common = db.reviews.find(c => c.sourceWorkbookId === 'review-two-round-sample')
  assert.equal(common.bookTitle, '901호 띵똥 아저씨')
  assert.equal(common.template.id, '51')
  const records = db.records.filter(r => r.reviewId === common.id)
  assert.equal(records.length, 2)
  assert.ok(records.every(r => r.report && !r.body.includes('민주주의')))
  assert.deepEqual(getDefaultReviewDatabase(), db)
})
