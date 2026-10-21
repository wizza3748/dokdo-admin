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
const { READING_BOOKS } = require('../src/lib/reading-books.ts')
const { getConfiguredTemplates } = require('../src/lib/workbook-template-settings.ts')
const { initializePro } = require('../src/lib/pro-seeds.ts')

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
    const book = READING_BOOKS.find(book => book.id === common.sourceBookId)
    assert.ok(book, common.bookTitle)
    assert.equal(common.bookTitle, book.title)
    assert.equal(common.level, book.level)
    assert.equal(common.sourceReadingRound, book.rounds)
    assert.equal(common.sourceReadingWorkbookId, `reading-${book.id}-round-${book.rounds}`)
    assert.equal(common.sourceReadingRecordId, `reading-complete-${common.sourceWorkbookId}`)
    const template = WORKBOOK_TEMPLATE_LIVE_DETAILS.find(t => String(t.id) === common.template.id)
    assert.ok(template, common.bookTitle)
    assert.ok(template.connectedBooks.some(([, title, level, round]) => title === common.bookTitle && level === common.level && round === common.sourceReadingRound), common.bookTitle)
    const configured = getConfiguredTemplates().find(t => String(t.id) === common.template.id)
    assert.ok(configured.levels.includes(common.level), common.bookTitle)
    assert.doesNotMatch(configured.name, /자유형/)
    assert.equal(common.template.rewriteMode, configured.rewriteMode)
    assert.equal(common.template.rewriteGuide, configured.guides.rewrite)
    assert.deepEqual(common.template.items.map(i => [i.title, i.description]), configured.questions.map(q => [q.title, q.description ?? '']))
  }
  assert.equal(db.reviews.find(c => c.sourceWorkbookId === 'gamunjang-0824').template.id, '68')
  assert.equal(db.reviews.find(c => c.sourceWorkbookId === 'room901-0825').template.id, '51')
})

test('2차 완료 예시는 푸른 눈의 독립운동가 5레벨·독서 3회차·양식 1번과 차수별 보고서를 갖는다', () => {
  const db = getDefaultReviewDatabase()
  const common = db.reviews.find(c => c.sourceWorkbookId === 'review-two-round-sample')
  assert.equal(common.bookTitle, '푸른 눈의 독립운동가 [개정본]')
  assert.equal(common.level, 5)
  assert.equal(common.sourceReadingRound, 3)
  assert.equal(common.template.id, '1')
  assert.equal(common.template.rewriteMode, 'continuous')
  const records = db.records.filter(r => r.reviewId === common.id)
  assert.equal(records.length, 2)
  assert.ok(records.every(r => r.report && !r.body.includes('민주주의')))
  assert.deepEqual(records.map(r => r.round), [1, 2])
  assert.equal(records[1].linkedRecordId, records[0].id)
  assert.ok(records.every(r => r.feedbackStatus === '전송완료' && r.finalBody && r.feedback && r.history.length > 0))
  assert.ok(records[0].seenAt)
  assert.equal(records[1].seenAt, undefined)
  assert.notEqual(records[0].finalBody, records[1].finalBody)
  assert.deepEqual(getDefaultReviewDatabase(), db)
})

test('윌로딘 2차 작성 예시는 6레벨·독서 5회차·양식 3번의 문항과 서로 다른 초안을 갖는다', () => {
  const db = getDefaultReviewDatabase()
  const common = db.reviews.find(c => c.id === 'review-seed-second-writing')
  assert.equal(common.bookTitle, '괴물을 사랑한 아이 윌로딘')
  assert.equal(common.level, 6)
  assert.equal(common.sourceReadingRound, 5)
  assert.equal(common.template.id, '3')
  assert.equal(common.template.rewriteMode, 'continuous')
  assert.deepEqual(common.template.items.map(i => i.title), ['중심 내용 요약', '인상 깊은 장면', '주제·작가의 생각 찾기', '느낀 점 / 감상'])
  const first = db.records.find(r => r.reviewId === common.id && r.round === 1)
  const second = db.records.find(r => r.reviewId === common.id && r.round === 2)
  assert.ok(first.report && first.seenAt)
  assert.equal(second.linkedRecordId, first.id)
  assert.equal(second.writingStatus, 'writing')
  assert.equal(studentReviewRecordStatus(common, second), '2차 작성중')
  for (const item of common.template.items) {
    assert.ok(first.answers[item.id] && second.answers[item.id])
    assert.notEqual(first.answers[item.id], second.answers[item.id])
  }
  assert.match(first.answers['2'], /장면/)
  assert.match(second.answers['3'], /작가/)
})

for (const [field, invalid] of [['title', '연결되지 않은 도서'], ['level', 5], ['rounds', 4]]) {
  test(`필수 예시의 ${field} 연결이 없으면 다른 도서의 양식을 대신 넣지 않는다`, () => {
    const book = READING_BOOKS.find(book => book.id === 727)
    const original = book[field]
    try {
      book[field] = invalid
      assert.throws(() => getDefaultReviewDatabase(), /괴물을 사랑한 아이 윌로딘 \(6레벨\)/)
    } finally {
      book[field] = original
    }
  })
}

test('양식 연결 수정으로 기존 학생·기관·본사 예시나 알림 대상이 추가되지 않는다', () => {
  const db = getDefaultReviewDatabase()
  const expectedIds = [
    ...['room901-0825', 'asia-table-0824', 'gamunjang-0824', 'no-first-0721', 'galileo-0715', 'korean-noun-0708'].map(id => `review-seed-student-${id}`),
    ...[42784, 37335, 16447, 14894, 14868, 12433, 9031, 2693, 2620, 2496, 14, 10, 8].map(id => `review-seed-agency-${id}`),
    'review-seed-hq-42741',
    ...['new-writing', 'new-submitted', 'second-available', 'second-writing', 'second-submitted', 'two-rounds'].map(id => `review-seed-${id}`),
  ]
  assert.deepEqual(db.reviews.map(c => c.id).sort(), expectedIds.sort())
  assert.equal(db.records.length, 29)
  assert.equal(db.seedVersion, 14, '이미 저장된 예시를 재설치하는 버전 변경 금지')
})

test('기존 양식 스냅샷·작성 글·피드백·보고서·이력과 프로 관리 데이터는 수정하거나 초기화하지 않는다', () => {
  const fresh = getDefaultReviewDatabase()
  const oldTemplate = fresh.reviews.find(c => c.template.id === '51').template
  for (const edited of [false, true]) {
    const existing = initializePro(structuredClone(fresh))
    for (const id of ['review-seed-second-writing', 'review-seed-two-rounds']) {
      existing.reviews.find(c => c.id === id).template = structuredClone(oldTemplate)
      for (const record of existing.records.filter(r => r.reviewId === id)) {
        record.answers = { '1': '기존 저장 답변', '2': '이전에 정리한 줄거리', '3': '나의 감상', '4': '나의 실천 계획' }
        record.body = '기존 작성 본문'
        record.finalBody = '기존 제출 본문'
        record.feedback = '기존 선생님 피드백'
        record.reportFeedback = '기존 보고서 총평'
        if (edited) record.history.push({ requestId: `user-edit:${record.id}`, action: 'save-writing', actor: '학생', at: '2026-10-21T01:00:00.000Z' })
      }
    }
    const before = structuredClone(existing)
    const merged = mergeReviewSeeds(existing, fresh)
    assert.strictEqual(merged, existing)
    assert.deepEqual(merged, before)
    assert.deepEqual(mergeReviewSeeds(merged, getDefaultReviewDatabase()), before)
  }
})
