import { WORKBOOK_TEMPLATES, type WorkbookTemplateRecord } from "@/lib/workbook-templates"
import rewriteGuides from "@/lib/workbook-rewrite-guides.json"

const key = "dokdo-workbook-template-settings-v1"
const legacyWritingGuides = new Set([
  "※ 안내에 따라 워크북을 작성해 보세요.",
  "※ 안내에 따라 독서 감상문을 작성해 보세요.",
])

function normalizeTemplateGuides(template: WorkbookTemplateRecord): WorkbookTemplateRecord {
  const writing = legacyWritingGuides.has(template.guides.writing)
    ? "※ 안내에 따라 온라인 독후감을 작성해 보세요."
    : template.guides.writing
  const complete = template.guides.complete === "※ 워크북 활동을 마무리하고, 완성된 글을 확인해 보세요."
    ? "※ 온라인 독후감 활동을 마무리하고, 완성된 글을 확인해 보세요."
    : template.guides.complete
  return writing === template.guides.writing && complete === template.guides.complete
    ? template
    : { ...template, guides: { ...template.guides, writing, complete } }
}

export function subscribeTemplateSettings(onChange: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) onChange() }
  window.addEventListener("dokdo-template-settings-change", onChange)
  window.addEventListener("storage", onStorage)
  window.addEventListener("focus", onChange)
  return () => {
    window.removeEventListener("dokdo-template-settings-change", onChange)
    window.removeEventListener("storage", onStorage)
    window.removeEventListener("focus", onChange)
  }
}
export function getConfiguredTemplates(): WorkbookTemplateRecord[] {
  let overrides: WorkbookTemplateRecord[] = []
  if (typeof window !== "undefined") { try { overrides = JSON.parse(localStorage.getItem(key) ?? "[]") } catch { /* Preserve stored data for recovery. */ } }
  // User-configured demo base (2026-09-07): every existing 통합형 독서록 uses reports.
  // Other unconfigured templates and newly registered templates remain disabled.
  // Subsequent explicit HQ saves always win over this base setting.
  const bases = WORKBOOK_TEMPLATES.map(t => normalizeTemplateGuides({ ...t, reportEnabled: t.reportEnabled ?? t.name.includes("통합형 독서록"), guides: { ...t.guides, rewrite: (rewriteGuides as Record<string, string>)[String(t.id)] ?? t.guides.rewrite } }))
  return [...new Map([...bases, ...overrides.map(normalizeTemplateGuides)].map(t => [t.id, t])).values()]
}
export function saveConfiguredTemplate(template: WorkbookTemplateRecord) {
  const overrides: WorkbookTemplateRecord[] = JSON.parse(localStorage.getItem(key) ?? "[]")
  localStorage.setItem(key, JSON.stringify([...overrides.filter(t => t.id !== template.id), template]))
  window.dispatchEvent(new Event("dokdo-template-settings-change"))
}
