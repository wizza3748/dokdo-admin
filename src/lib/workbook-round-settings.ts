import { getOnlineWorkbookSettingId, getReadingBook, READING_BOOKS } from "@/lib/reading-books"
import { WORKBOOK_TEMPLATE_LIVE_DETAILS } from "@/lib/workbook-template-live-data"
import { WORKBOOK_TEMPLATES, type WorkbookTemplateRecord } from "@/lib/workbook-templates"
import { STUDENT_MOCK_STORAGE_KEYS } from "@/lib/student-mock-state"

export type WorkbookRoundDisplayMode = "items" | "continuous"

export type WorkbookRoundTemplateSetting = {
  templateId: number
  displayMode: WorkbookRoundDisplayMode
  questions?: Array<{ id: number; title: string; description: string; example?: string }>
}

export type WorkbookRoundSetting = {
  bookId: number
  settingId: number
  previewId: number
  round: number
  reviewed?: boolean
  templates: WorkbookRoundTemplateSetting[]
  priorityTemplateId: number
}

export const WORKBOOK_ROUND_SETTING_CHANGE_EVENT = "dokdo-workbook-round-setting-change"

type LiveTemplateSetting = {
  name: string
  mode: WorkbookRoundDisplayMode
  priority?: boolean
}

type LiveRoundSetting = {
  settingId: number
  previewId: number
  templates: LiveTemplateSetting[]
}

const item = (name: string, priority = false): LiveTemplateSetting => ({ name, mode: "items", priority })
const continuous = (name: string, priority = false): LiveTemplateSetting => ({ name, mode: "continuous", priority })

// 실서버 책 읽기 목록의 최신 도서들을 읽기 전용으로 대조한 회차별 설정입니다.
const LIVE_ROUND_SETTINGS: Record<number, LiveRoundSetting> = {
  730: { settingId: 1780, previewId: 1574, templates: [continuous("[고] 통합형 독서록 – 기본", true), continuous("[고] 위인전 독서록 – 정보형"), item("[고] 창작 독서록 – 인물에게 편지"), item("[고] 창작 독서록 – 인터뷰"), item("[공통] 자유형 독서록")] },
  729: { settingId: 1773, previewId: 1569, templates: [item("[저] 통합형 독서록 – 기본", true), item("[공통] 자유형 독서록"), item("[저] 창작 독서록 – 인터뷰"), item("[저] 창작 독서록 – 퀴즈 만들기"), item("[저] 창작 독서록 – 책 소개하는 편지 쓰기")] },
  728: { settingId: 1748, previewId: 1459, templates: [continuous("[중] 통합형 독서록 – 기본", true), continuous("[중] 통합형 독서록 – 인물 중심"), item("[중] 토의·토론 독서록"), item("[중] 창작 독서록 – 뒷이야기 상상"), item("[공통] 자유형 독서록")] },
  727: { settingId: 1766, previewId: 1549, templates: [continuous("[중][고] 통합형 독서록 – 주제/이해 중심", true), continuous("[고] 제목 탐구 독서록"), continuous("[고] 사건 독서록 – 전환점 살펴보기"), item("[고] 창작 독서록 – 인터뷰"), item("[고] 요약 독서록 – 이야기 구조")] },
  726: { settingId: 1749, previewId: 1509, templates: [item("[저] 인물 독서록 – 성장 관찰", true), item("[저] 통합형 독서록 – 기본"), item("[저] 인물 독서록 – 공감하기"), item("[저] 통합형 독서록 – 독서 일기"), item("[저] 창작 독서록 – 책 소개하는 편지 쓰기")] },
  724: { settingId: 1741, previewId: 1479, templates: [item("[저] 통합형 독서록 – 기본", true), item("[저] 인물 독서록 – 판단/상상하기"), item("[저] 창작 독서록 – 뒷이야기 상상"), item("[저] 창작 독서록 – 퀴즈 만들기"), item("[저] 창작 독서록 – 책 소개하는 편지 쓰기")] },
  723: { settingId: 1740, previewId: 1524, templates: [item("[저] 인물 독서록 – 공감하기", true), item("[저] 창작 독서록 – 인터뷰"), item("[저] 창작 독서록 – 장면 바꾸기"), item("[저] 통합형 독서록 – 독서 일기"), item("[저] 창작 독서록 – 책 소개하는 편지 쓰기")] },
  722: { settingId: 1739, previewId: 1489, templates: [item("[저] 창작 독서록 – 인물에게 편지", true), item("[공통] 자유형 독서록"), item("[저] 통합형 독서록 – 기본"), item("[저] 인물 독서록 – 인물 탐구"), item("[저] 창작 독서록 – 책 소개하는 편지 쓰기")] },
  721: { settingId: 1738, previewId: 1466, templates: [item("[저] 인물 독서록 – 공감하기", true), item("[공통] 자유형 독서록"), item("[저] 통합형 독서록 – 기본"), item("[저] 창작 독서록 – 인물에게 편지"), item("[저] 창작 독서록 – 장면 바꾸기")] },
  720: { settingId: 1737, previewId: 1494, templates: [item("[저] 인물 독서록 – 인물 탐구", true), item("[저] 통합형 독서록 – 기본"), item("[저] 통합형 독서록 – 인물 중심"), item("[저] 창작 독서록 – 인터뷰"), item("[저] 창작 독서록 – 장면 바꾸기")] },
  718: { settingId: 1735, previewId: 1469, templates: [item("[공통] 자유형 독서록", true), item("[저] 통합형 독서록 – 기본"), item("[저] 인물 독서록 – 판단/상상하기"), item("[저] 인물 독서록 – 공감하기"), item("[저] 창작 독서록 – 뒷이야기 상상")] },
  717: { settingId: 1734, previewId: 1484, templates: [item("[저] 인물 독서록 – 성장 관찰", true), item("[저] 인물 독서록 – 공감하기"), item("[저] 창작 독서록 – 인터뷰"), item("[저] 창작 독서록 – 결말 바꾸기"), item("[저] 통합형 독서록 – 독서 일기")] },
  716: { settingId: 1771, previewId: 1559, templates: [continuous("[고] 통합형 독서록 – 기본", true), continuous("[중][고] 통합형 독서록 – 인물 중심"), item("[고] 토의·토론 독서록"), item("[고] 창작 독서록 – 인터뷰"), item("[공통] 자유형 독서록")] },
  715: { settingId: 1760, previewId: 1534, templates: [item("[고] 창작 독서록 – 인터뷰", true), continuous("[중][고] 통합형 독서록 – 주제/이해 중심"), continuous("[중][고] 인물 독서록 – 갈등과 해결"), continuous("[고] 비판적 사고 독서록 – 다른 시선"), item("[고] 창작 독서록 – 뒷이야기 상상")] },
  714: { settingId: 1758, previewId: 1529, templates: [item("[고] 요약 독서록 – 이야기 구조", true), continuous("[중][고] 통합형 독서록 – 인물 중심"), item("[고] 창작 독서록 – 인터뷰"), continuous("[중][고] 통합형 독서록 – 주제/이해 중심"), item("[고] 토의·토론 독서록")] },
  713: { settingId: 1753, previewId: 1454, templates: [item("[중][고] 요약 독서록 – 인물/사건/배경", true), continuous("[중][고] 인물 독서록 – 성장 관찰"), item("[고] 창작 독서록 – 결말 바꾸기"), continuous("[고] 제목 탐구 독서록"), item("[고] 토의·토론 독서록")] },
  712: { settingId: 1757, previewId: 1519, templates: [continuous("[중][고] 통합형 독서록 – 주제/이해 중심", true), continuous("[고] 비판적 사고 독서록 – 다른 시선"), continuous("[중][고] 인물 독서록 – 성장 관찰"), item("[중][고] 요약 독서록 – 인물/사건/배경"), item("[공통] 자유형 독서록")] },
  711: { settingId: 1768, previewId: 1554, templates: [continuous("[고] 통합형 독서록 – 기본", true), item("[고] 창작 독서록 – 인물에게 편지"), item("[고] 창작 독서록 – 인터뷰"), item("[공통] 자유형 독서록"), item("[고] 요약 독서록 – 이야기 구조")] },
  710: { settingId: 1755, previewId: 1514, templates: [item("[중] 창작 독서록 – 인터뷰", true), continuous("[고] 통합형 독서록 – 기본"), item("[중] 창작 독서록 – 뒷이야기 상상"), item("[고] 창작 독서록 – 장면 바꾸기"), item("[공통] 자유형 독서록")] },
}

const LOW_LEVEL_POOL = [
  "[저] 통합형 독서록 – 기본",
  "[저] 통합형 독서록 – 인물 중심",
  "[저] 인물 독서록 – 성장 관찰",
  "[저] 인물 독서록 – 인물 탐구",
  "[저] 인물 독서록 – 판단/상상하기",
  "[저] 인물 독서록 – 공감하기",
  "[저] 창작 독서록 – 뒷이야기 상상",
  "[저] 창작 독서록 – 인물에게 편지",
  "[저] 창작 독서록 – 인터뷰",
  "[저] 창작 독서록 – 퀴즈 만들기",
  "[저] 창작 독서록 – 장면 바꾸기",
  "[저] 창작 독서록 – 결말 바꾸기",
  "[저] 통합형 독서록 – 독서 일기",
  "[저] 창작 독서록 – 책 소개하는 편지 쓰기",
  "[공통] 자유형 독서록",
]

const MIDDLE_LEVEL_POOL = [
  "[중] 통합형 독서록 – 기본",
  "[중] 통합형 독서록 – 인물 중심",
  "[중][고] 통합형 독서록 – 주제/이해 중심",
  "[중] 인물 독서록 – 인물 탐구",
  "[중] 토의·토론 독서록",
  "[중] 창작 독서록 – 뒷이야기 상상",
  "[중] 창작 독서록 – 인물에게 편지",
  "[중] 창작 독서록 – 인터뷰",
  "[중][고] 창작 독서록 – 퀴즈 만들기",
  "[중][고] 요약 독서록 – 인물/사건/배경",
  "[공통] 자유형 독서록",
]

const HIGH_LEVEL_POOL = [
  "[고] 통합형 독서록 – 기본",
  "[중][고] 통합형 독서록 – 인물 중심",
  "[중][고] 통합형 독서록 – 주제/이해 중심",
  "[중][고] 인물 독서록 – 갈등과 해결",
  "[중][고] 인물 독서록 – 성장 관찰",
  "[고] 제목 탐구 독서록",
  "[고] 사건 독서록 – 전환점 살펴보기",
  "[고] 토의·토론 독서록",
  "[고] 비판적 사고 독서록 – 다른 시선",
  "[고] 창작 독서록 – 뒷이야기 상상",
  "[고] 창작 독서록 – 인물에게 편지",
  "[고] 창작 독서록 – 인터뷰",
  "[고] 요약 독서록 – 이야기 구조",
  "[중][고] 요약 독서록 – 인물/사건/배경",
  "[공통] 자유형 독서록",
]

function findTemplate(name: string) {
  return WORKBOOK_TEMPLATES.find((template) => template.name === name)
}

function resolveLiveSetting(bookId: number, source: LiveRoundSetting): WorkbookRoundSetting | undefined {
  const templates = source.templates.flatMap(({ name, mode }) => {
    const template = findTemplate(name)
    return template ? [{ templateId: template.id, displayMode: mode }] : []
  })
  const priorityName = source.templates.find((template) => template.priority)?.name
  const priorityTemplate = priorityName ? findTemplate(priorityName) : undefined
  if (!templates.length || !priorityTemplate) return undefined
  return {
    bookId,
    settingId: source.settingId,
    previewId: source.previewId,
    round: getReadingBook(bookId)?.rounds ?? 1,
    reviewed: true,
    templates,
    priorityTemplateId: priorityTemplate.id,
  }
}

function inferDisplayMode(name: string, level: number): WorkbookRoundDisplayMode {
  if (level <= 2) return "items"
  return /통합형|인물 독서록|위인전 독서록|제목 탐구|사건 독서록|비판적 사고/.test(name)
    ? "continuous"
    : "items"
}

function buildImportedSetting(bookId: number, requestedRound?: number): WorkbookRoundSetting | undefined {
  const book = getReadingBook(bookId)
  if (!book) return undefined

  const connections = WORKBOOK_TEMPLATE_LIVE_DETAILS.flatMap((detail) => detail.connectedBooks
    .filter(([, title, level, round]) => title === book.title && level === book.level && (requestedRound === undefined || round === requestedRound))
    .map(([connectionId, , , round]) => ({ connectionId, round, templateId: detail.id })))
    .sort((a, b) => a.connectionId - b.connectionId)

  if (!connections.length) return undefined
  const round = requestedRound ?? connections[0].round
  const roundConnections = connections.filter((connection) => connection.round === round)
  if (!roundConnections.length) return undefined
  const live = LIVE_ROUND_SETTINGS[bookId]

  return {
    bookId,
    round,
    settingId: live?.settingId ?? getOnlineWorkbookSettingId(bookId),
    previewId: live?.previewId ?? 2000 + bookId,
    reviewed: true,
    templates: roundConnections.map(({ templateId }) => {
      const template = WORKBOOK_TEMPLATES.find((item) => item.id === templateId)
      return { templateId, displayMode: inferDisplayMode(template?.name ?? "", book.level) }
    }),
    priorityTemplateId: roundConnections[0].templateId,
  }
}

function readStoredSettings() {
  if (typeof window === "undefined") return {} as Record<string, WorkbookRoundSetting>
  try {
    return JSON.parse(window.localStorage.getItem(STUDENT_MOCK_STORAGE_KEYS.workbookRoundSettings) ?? "{}") as Record<string, WorkbookRoundSetting>
  } catch {
    window.localStorage.removeItem(STUDENT_MOCK_STORAGE_KEYS.workbookRoundSettings)
    return {} as Record<string, WorkbookRoundSetting>
  }
}

const settingKey = (bookId: number, round: number) => `${bookId}:${round}`

export function saveWorkbookRoundSetting(setting: WorkbookRoundSetting) {
  if (typeof window === "undefined") return
  const stored = readStoredSettings()
  stored[settingKey(setting.bookId, setting.round)] = setting
  window.localStorage.setItem(STUDENT_MOCK_STORAGE_KEYS.workbookRoundSettings, JSON.stringify(stored))
  window.dispatchEvent(new CustomEvent(WORKBOOK_ROUND_SETTING_CHANGE_EVENT, { detail: { bookId: setting.bookId, round: setting.round } }))
}

function buildBookSpecificSetting(bookId: number): WorkbookRoundSetting {
  const book = getReadingBook(bookId) ?? READING_BOOKS[0]
  const pool = book.level <= 2 ? LOW_LEVEL_POOL : book.level === 3 ? MIDDLE_LEVEL_POOL : HIGH_LEVEL_POOL
  const offset = (book.id + book.rounds + book.level) % pool.length
  const names = Array.from({ length: pool.length }, (_, index) => pool[(offset + index) % pool.length])
  const selected = names.flatMap((name) => {
    const template = findTemplate(name)
    return template ? [template] : []
  }).slice(0, 5)
  const templates = selected.map((template) => ({
    templateId: template.id,
    displayMode: template.name.includes("통합형") || template.name.includes("인물 독서록") ? "continuous" as const : "items" as const,
  }))
  return {
    bookId: book.id,
    settingId: getOnlineWorkbookSettingId(book.id),
    previewId: 2000 + book.id,
    round: book.rounds,
    reviewed: true,
    templates,
    priorityTemplateId: templates[0]?.templateId ?? WORKBOOK_TEMPLATES[0].id,
  }
}

export function getWorkbookRoundSetting(bookId: number, round?: number): WorkbookRoundSetting {
  const imported = buildImportedSetting(bookId, round)
  const targetRound = round ?? imported?.round ?? getReadingBook(bookId)?.rounds ?? 1
  const stored = readStoredSettings()[settingKey(bookId, targetRound)]
  if (stored) return stored
  if (imported) return imported
  const live = LIVE_ROUND_SETTINGS[bookId]
  return (live && resolveLiveSetting(bookId, live)) || buildBookSpecificSetting(bookId)
}

export function getWorkbookRoundSettingByPreviewId(previewId: number) {
  for (const [bookId, setting] of Object.entries(LIVE_ROUND_SETTINGS)) {
    if (setting.previewId === previewId) return getWorkbookRoundSetting(Number(bookId))
  }
  const fallbackBook = READING_BOOKS.find((book) => 2000 + book.id === previewId)
  return fallbackBook ? getWorkbookRoundSetting(fallbackBook.id) : undefined
}

export function getWorkbookRoundTemplate(setting: WorkbookRoundSetting, templateId = setting.priorityTemplateId): WorkbookTemplateRecord {
  return WORKBOOK_TEMPLATES.find((template) => template.id === templateId)
    ?? WORKBOOK_TEMPLATES.find((template) => template.id === setting.priorityTemplateId)
    ?? WORKBOOK_TEMPLATES[0]
}
