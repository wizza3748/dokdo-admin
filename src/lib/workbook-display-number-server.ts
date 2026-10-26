import { prototypeStore, type PrototypeStore } from "./prototype-store"
import type { ReviewDatabase } from "./review-domain"
import { assignWorkbookDisplayNumbers } from "./workbook-display-numbers"

const registryKey = "workbook-display-numbers-v2"

/** Presentation metadata only. Never modify review records, shared results or test workspaces. */
export async function withSharedWorkbookDisplayNumbers(full: ReviewDatabase, visible: ReviewDatabase, reservedIds: string[], store: PrototypeStore = prototypeStore): Promise<ReviewDatabase> {
  const ids = [...reservedIds, ...full.records.map(record => record.id)]
  const mapping = await store.update<Record<string, string>>(registryKey, () => ({}), previous => {
    const next = assignWorkbookDisplayNumbers(ids, previous)
    return JSON.stringify(next) === JSON.stringify(previous) ? previous : next
  })
  // Do not expose IDs belonging to another institution through presentation metadata.
  const visibleIds = new Set([...reservedIds, ...visible.records.map(record => record.id)])
  return { ...visible, displayNumbers: Object.fromEntries([...visibleIds].map(id => [id, mapping[id]])) }
}
