import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

type StoreOptions = {
  env?: Readonly<Record<string, string | undefined>>
  directory?: string
  fetcher?: typeof fetch
  now?: () => number
  sql?: (query: string, parameters: unknown[]) => Promise<Record<string, unknown>[]>
}

type Envelope<T> = { format: "dokdo-state-v1"; revision: string; value: T }
const processState = globalThis as typeof globalThis & { dokdoStateQueues?: Map<string, Promise<unknown>> }
const compareAndSet = `
local current = redis.call('GET', KEYS[1])
if (current or '') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1
`
// Validate a cached snapshot with a 40-byte fingerprint, not another full JSON response.
// This script is read-only and works with both legacy JSON and versioned envelopes.
const readIfChanged = `
local current = redis.call('GET', KEYS[1])
if redis.sha1hex(current or '') == ARGV[1] then return {0} end
return {1, current or false}
`

/** Local JSON in development; explicit Neon or legacy Redis storage on Vercel. */
export class PrototypeStore {
  private env: Readonly<Record<string, string | undefined>>
  private directory: string
  private fetcher: typeof fetch
  private now: () => number
  private snapshots = new Map<string, { raw: string | null }>()
  private reads = new Map<string, Promise<string | null>>()
  private generations = new Map<string, number>()
  private unavailableUntil = 0
  private sqlQuery?: StoreOptions["sql"]

  constructor(options: StoreOptions = {}) {
    this.env = options.env ?? process.env
    this.directory = options.directory ?? path.join(process.cwd(), ".local-state")
    this.fetcher = options.fetcher ?? fetch
    this.now = options.now ?? Date.now
    this.sqlQuery = options.sql
  }

  private provider() {
    const provider = this.env.DOKDO_STATE_PROVIDER
    if (provider && !["local", "redis", "neon"].includes(provider)) throw new Error("지원하지 않는 저장소 설정입니다.")
    if (provider === "local" && this.env.VERCEL === "1") throw new Error("운영 환경에서는 로컬 파일 저장소를 사용할 수 없습니다.")
    return provider
  }

  private neonUrl() {
    const url = this.env.DOKDO_NEON_DATABASE_URL || this.env.DATABASE_URL || this.env.POSTGRES_URL
    if (!url) throw new Error("Neon 영구 저장소 연결 설정이 완료되지 않았습니다.")
    try {
      const parsed = new URL(url)
      if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname.endsWith(".neon.tech") || !parsed.password) throw new Error()
    } catch { throw new Error("Neon 영구 저장소 연결 설정이 올바르지 않습니다.") }
    return url
  }

  private async sql(query: string, parameters: unknown[] = []) {
    if (this.now() < this.unavailableUntil) throw new Error("영구 저장소에 잠시 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.")
    const url = this.neonUrl()
    try {
      if (!this.sqlQuery) {
        const { neon } = await import("@neondatabase/serverless")
        const client = neon(url)
        this.sqlQuery = (text, values) => client.query(text, values, { fetchOptions: { signal: AbortSignal.timeout(15000) } })
      }
      return await this.sqlQuery(query, parameters)
    } catch {
      // Never expose credentials, query parameters or provider errors in the UI.
      this.unavailableUntil = this.now() + 30_000
      throw new Error("Neon 영구 저장소 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.")
    }
  }

  /** Explicit migration step only: runtime requests never create or replace tables. */
  async prepareNeon() {
    if (this.provider() !== "neon") throw new Error("Neon 이전 대상 설정이 필요합니다.")
    await this.sql(`CREATE TABLE IF NOT EXISTS dokdo_prototype_state (
      key text PRIMARY KEY, payload text NOT NULL, digest text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`)
  }

  private digest(raw: string) { return createHash("sha256").update(raw).digest("hex") }

  private connection() {
    if (["neon", "local"].includes(this.provider() ?? "")) return null
    const url = this.env.UPSTASH_REDIS_REST_URL || this.env.KV_REST_API_URL
    const token = this.env.UPSTASH_REDIS_REST_TOKEN || this.env.KV_REST_API_TOKEN
    if (url && token) {
      if (new URL(url).protocol !== "https:") throw new Error("저장소 연결에는 HTTPS 주소가 필요합니다.")
      return { url, token }
    }
    if (url || token || this.env.VERCEL === "1" || this.provider() === "redis") {
      throw new Error("영구 저장소 연결 설정이 완료되지 않았습니다.")
    }
    return null
  }

  key(name: string) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("잘못된 저장소 이름입니다.")
    return `${this.env.DOKDO_STATE_NAMESPACE || "dokdo-admin:prototype:v1"}:${name}`
  }

  private async command(command: (string | number)[]) {
    if (this.now() < this.unavailableUntil) throw new Error("영구 저장소에 잠시 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.")
    const connection = this.connection()!
    const response = await this.fetcher(connection.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${connection.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command), cache: "no-store", signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) this.unavailableUntil = this.now() + 30_000
      throw new Error(`영구 저장소 요청에 실패했습니다. (${response.status})`)
    }
    const result = await response.json() as { result?: unknown; error?: string }
    // Never include provider responses in UI errors: they may contain submitted content.
    if (result.error || !("result" in result)) {
      this.unavailableUntil = this.now() + 30_000
      throw new Error("영구 저장소 처리에 실패했습니다.")
    }
    return result.result
  }

  private unpack<T>(raw: string | null, fallback: () => T): T {
    if (raw === null) return fallback()
    const parsed = JSON.parse(raw) as T | Envelope<T>
    if (parsed && typeof parsed === "object" && "format" in parsed && parsed.format === "dokdo-state-v1" && "value" in parsed) return parsed.value
    return parsed as T
  }

  private remember(name: string, raw: string | null) {
    this.generations.set(name, (this.generations.get(name) ?? 0) + 1)
    this.reads.delete(name)
    this.snapshots.set(name, { raw })
  }

  private async raw(name: string): Promise<string | null> {
    this.key(name)
    if (this.provider() === "neon") {
      const pending = this.reads.get(name)
      if (pending) return pending
      const snapshot = this.snapshots.get(name)
      const fingerprint = snapshot?.raw == null ? "" : this.digest(snapshot.raw)
      const generation = this.generations.get(name) ?? 0
      const read = (async () => {
        const rows = await this.sql("SELECT digest, CASE WHEN digest = $2 THEN NULL ELSE payload END AS payload FROM dokdo_prototype_state WHERE key = $1", [this.key(name), fingerprint])
        const raw = !rows.length ? null : rows[0].digest === fingerprint ? snapshot!.raw : rows[0].payload
        if (raw !== null && typeof raw !== "string") throw new Error("저장된 데이터 형식이 올바르지 않습니다.")
        if ((this.generations.get(name) ?? 0) === generation) this.snapshots.set(name, { raw })
        return raw
      })()
      this.reads.set(name, read)
      try { return await read }
      finally { if (this.reads.get(name) === read) this.reads.delete(name) }
    }
    if (this.connection()) {
      const snapshot = this.snapshots.get(name)
      const pending = this.reads.get(name)
      if (pending) return pending
      const generation = this.generations.get(name) ?? 0
      const read = (async () => {
        let result: unknown
        if (snapshot) {
          const fingerprint = createHash("sha1").update(snapshot.raw ?? "").digest("hex")
          const reply = await this.command(["EVAL", readIfChanged, 1, this.key(name), fingerprint])
          if (!Array.isArray(reply) || (reply[0] !== 0 && reply[0] !== 1)) throw new Error("저장된 데이터 형식이 올바르지 않습니다.")
          result = reply[0] === 0 ? snapshot.raw : reply[1]
        } else result = await this.command(["GET", this.key(name)])
        if (result !== null && typeof result !== "string") throw new Error("저장된 데이터 형식이 올바르지 않습니다.")
        if ((this.generations.get(name) ?? 0) === generation) this.snapshots.set(name, { raw: result })
        return result
      })()
      this.reads.set(name, read)
      try { return await read }
      finally { if (this.reads.get(name) === read) this.reads.delete(name) }
    }
    try { return await readFile(path.join(this.directory, `${name}.json`), "utf8") }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error }
  }

  async read<T>(name: string, fallback: () => T): Promise<T> {
    return this.unpack(await this.raw(name), fallback)
  }

  async update<T>(name: string, fallback: () => T, update: (state: T) => T): Promise<T> {
    if (this.provider() === "neon") {
      for (let attempt = 0; attempt < 12; attempt++) {
        const raw = await this.raw(name)
        const state = this.unpack(raw, fallback)
        const next = update(state)
        if (next === state && raw !== null) return next
        const serialized = JSON.stringify({ format: "dokdo-state-v1", revision: randomUUID(), value: next } satisfies Envelope<T>)
        const rows = raw === null
          ? await this.sql("INSERT INTO dokdo_prototype_state (key, payload, digest) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING RETURNING key", [this.key(name), serialized, this.digest(serialized)])
          : await this.sql("UPDATE dokdo_prototype_state SET payload = $3, digest = $4, updated_at = now() WHERE key = $1 AND digest = $2 RETURNING key", [this.key(name), this.digest(raw), serialized, this.digest(serialized)])
        if (rows.length) { this.remember(name, serialized); return next }
        this.snapshots.delete(name)
      }
      throw new Error("다른 변경 내용을 저장 중입니다. 잠시 후 다시 시도해 주세요.")
    }
    if (this.connection()) {
      // Compare-and-set across serverless instances, not just a process-local queue.
      for (let attempt = 0; attempt < 12; attempt++) {
        // Both background reads and commands validate the snapshot against Redis.
        const raw = await this.raw(name)
        const state = this.unpack(raw, fallback)
        const next = update(state)
        if (next === state && raw !== null) return next
        const envelope: Envelope<T> = { format: "dokdo-state-v1", revision: randomUUID(), value: next }
        const serialized = JSON.stringify(envelope)
        if (await this.command(["EVAL", compareAndSet, 1, this.key(name), raw ?? "", serialized]) === 1) {
          this.remember(name, serialized)
          return next
        }
        this.snapshots.delete(name)
      }
      throw new Error("다른 변경 내용을 저장 중입니다. 잠시 후 다시 시도해 주세요.")
    }
    processState.dokdoStateQueues ??= new Map()
    const queueKey = path.join(this.directory, `${name}.json`)
    const previous = processState.dokdoStateQueues.get(queueKey) ?? Promise.resolve()
    const job = previous.catch(() => undefined).then(async () => {
      const raw = await this.raw(name)
      const state = this.unpack(raw, fallback)
      const next = update(state)
      if (next !== state || raw === null) {
        await mkdir(this.directory, { recursive: true })
        const temporary = `${queueKey}.${randomUUID()}.tmp`
        await writeFile(temporary, JSON.stringify(next), "utf8")
        await rename(temporary, queueKey)
      }
      return next
    })
    processState.dokdoStateQueues.set(queueKey, job.catch(() => undefined))
    return job
  }

  /** Import only into an empty cloud key; rerunning cannot replace deployed edits. */
  async importIfEmpty<T>(name: string, value: T): Promise<boolean> {
    if (this.provider() === "neon") {
      const serialized = JSON.stringify({ format: "dokdo-state-v1", revision: randomUUID(), value } satisfies Envelope<T>)
      const rows = await this.sql("INSERT INTO dokdo_prototype_state (key, payload, digest) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING RETURNING key", [this.key(name), serialized, this.digest(serialized)])
      if (rows.length) this.remember(name, serialized)
      return rows.length > 0
    }
    if (!this.connection()) throw new Error("데이터 이전 대상 영구 저장소를 연결해 주세요.")
    const envelope: Envelope<T> = { format: "dokdo-state-v1", revision: randomUUID(), value }
    const serialized = JSON.stringify(envelope)
    const imported = await this.command(["SET", this.key(name), serialized, "NX"]) === "OK"
    if (imported) this.remember(name, serialized)
    return imported
  }
}

export const prototypeStore = new PrototypeStore()
