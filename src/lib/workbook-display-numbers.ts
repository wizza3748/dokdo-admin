/** Display numbers are independent of route IDs and remain stable across sorting/filtering. */
export function assignWorkbookDisplayNumbers(ids: string[], previous: Record<string, string> = {}) {
  const result: Record<string, string> = {}
  const used = new Set<string>()
  for (const [id, number] of Object.entries(previous)) {
    if (/^\d{5}$/.test(number) && !used.has(number)) { result[id] = number; used.add(number) }
  }
  const uniqueIds = [...new Set(ids)].sort()
  for (const id of uniqueIds) {
    const number = id.padStart(5, "0")
    if (!result[id] && /^\d{5}$/.test(number) && !used.has(number)) { result[id] = number; used.add(number) }
  }
  let next = 50000
  for (const id of uniqueIds) {
    if (result[id]) continue
    while (next <= 99999 && used.has(String(next))) next++
    if (next > 99999) throw new Error("표시 고유번호 범위를 초과했습니다.")
    result[id] = String(next++)
    used.add(result[id])
  }
  return result
}

const storageKey = "dokdo-workbook-display-numbers-v1"
export function withWorkbookDisplayNumbers<T extends { id: string }>(rows: T[], reservedIds: string[] = []): (T & { displayNumber: string })[] {
  let previous: Record<string, string> = {}
  try { if (typeof window !== "undefined") previous = JSON.parse(localStorage.getItem(storageKey) ?? "{}") ?? {} } catch { /* Recover from unavailable or invalid prototype storage. */ }
  const mapping = assignWorkbookDisplayNumbers([...reservedIds, ...rows.map(row => row.id)], previous)
  try { if (typeof window !== "undefined") localStorage.setItem(storageKey, JSON.stringify(mapping)) } catch { /* Deterministic initial numbering still works without browser persistence. */ }
  return rows.map(row => ({ ...row, displayNumber: mapping[row.id] }))
}
