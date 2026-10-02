// Only prototype settings and writing data: never authentication or unrelated browser data.
export const prototypeBrowserKeys = [
  "dokdo-student-reading-favorites", "dokdo-student-reading-completed-rounds",
  "dokdo-student-reading-completion-history", "dokdo-student-reading-round-results",
  "dokdo-reading-quiz-overrides", "dokdo-transient-reading-records",
  "dokdo-student-workbook-runtime", "dokdo-workbook-round-settings",
  "dokdo-student-agency-workbook-submissions", "dokdo-workbook-template-settings-v1",
  "dokdo-workbook-display-numbers-v1",
] as const

export type PrototypeBrowserSnapshot = { version: 1; migrationId: string; values: Record<string, string> }

export function validateBrowserSnapshot(input: unknown): PrototypeBrowserSnapshot {
  if (!input || typeof input !== "object") throw new Error("잘못된 이전 데이터입니다.")
  const snapshot = input as PrototypeBrowserSnapshot
  if (snapshot.version !== 1 || typeof snapshot.migrationId !== "string" || !snapshot.migrationId || !snapshot.values || typeof snapshot.values !== "object") throw new Error("잘못된 이전 데이터입니다.")
  const values: Record<string, string> = {}
  for (const key of prototypeBrowserKeys) {
    const value = snapshot.values[key]
    if (value === undefined) continue
    if (typeof value !== "string") throw new Error("잘못된 이전 데이터입니다.")
    JSON.parse(value)
    values[key] = value
  }
  return { version: 1, migrationId: snapshot.migrationId, values }
}
