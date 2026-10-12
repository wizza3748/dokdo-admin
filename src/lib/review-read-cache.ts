/** Coalesce identical reads without sharing data between actor/record URLs. */
export class ReviewReadCache {
  private entries = new Map<string, { value?: unknown; hasValue?: boolean; until?: number; pending?: Promise<unknown>; error?: unknown; failures: number }>()

  private now: () => number
  private ttl: number
  constructor(now: () => number = Date.now, ttl = 5000) { this.now = now; this.ttl = ttl }

  invalidate() { this.entries.clear() }

  async read<T>(key: string, load: () => Promise<T>): Promise<T> {
    let entry = this.entries.get(key)
    if (!entry) { entry = { failures: 0 }; this.entries.set(key, entry) }
    if (entry.pending) return entry.pending as Promise<T>
    if ((entry.until ?? 0) > this.now()) {
      if (entry.error) throw entry.error
      if (entry.hasValue) return entry.value as T
    }
    const current = entry
    current.pending = load().then(value => {
      current.value = value; current.hasValue = true; current.error = undefined; current.failures = 0
      current.until = this.now() + this.ttl
      return value
    }, error => {
      current.error = error; current.failures++
      current.until = this.now() + Math.min(300_000, 30_000 * 2 ** (current.failures - 1))
      throw error
    }).finally(() => { current.pending = undefined })
    return current.pending as Promise<T>
  }
}
