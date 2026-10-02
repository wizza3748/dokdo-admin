import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

type StoreOptions = {
  env?: Readonly<Record<string, string | undefined>>
  directory?: string
  fetcher?: typeof fetch
}

type Envelope<T> = { format: "dokdo-state-v1"; revision: string; value: T }
const processState = globalThis as typeof globalThis & { dokdoStateQueues?: Map<string, Promise<unknown>> }
const compareAndSet = `
local current = redis.call('GET', KEYS[1])
if (current or '') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1
`

/** Local JSON in development; durable Redis REST storage on Vercel. */
export class PrototypeStore {
  private env: Readonly<Record<string, string | undefined>>
  private directory: string
  private fetcher: typeof fetch

  constructor(options: StoreOptions = {}) {
    this.env = options.env ?? process.env
    this.directory = options.directory ?? path.join(process.cwd(), ".local-state")
    this.fetcher = options.fetcher ?? fetch
  }

  private connection() {
    const url = this.env.UPSTASH_REDIS_REST_URL || this.env.KV_REST_API_URL
    const token = this.env.UPSTASH_REDIS_REST_TOKEN || this.env.KV_REST_API_TOKEN
    if (url && token) {
      if (new URL(url).protocol !== "https:") throw new Error("저장소 연결에는 HTTPS 주소가 필요합니다.")
      return { url, token }
    }
    if (url || token || this.env.VERCEL === "1") {
      throw new Error("영구 저장소 연결 설정이 완료되지 않았습니다.")
    }
    return null
  }

  key(name: string) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("잘못된 저장소 이름입니다.")
    return `${this.env.DOKDO_STATE_NAMESPACE || "dokdo-admin:prototype:v1"}:${name}`
  }

  private async command(command: (string | number)[]) {
    const connection = this.connection()!
    const response = await this.fetcher(connection.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${connection.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command), cache: "no-store", signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`영구 저장소 요청에 실패했습니다. (${response.status})`)
    const result = await response.json() as { result?: unknown; error?: string }
    // Never include provider responses in UI errors: they may contain submitted content.
    if (result.error || !("result" in result)) throw new Error("영구 저장소 처리에 실패했습니다.")
    return result.result
  }

  private unpack<T>(raw: string | null, fallback: () => T): T {
    if (raw === null) return fallback()
    const parsed = JSON.parse(raw) as T | Envelope<T>
    if (parsed && typeof parsed === "object" && "format" in parsed && parsed.format === "dokdo-state-v1" && "value" in parsed) return parsed.value
    return parsed as T
  }

  private async raw(name: string): Promise<string | null> {
    this.key(name)
    if (this.connection()) {
      const result = await this.command(["GET", this.key(name)])
      if (result !== null && typeof result !== "string") throw new Error("저장된 데이터 형식이 올바르지 않습니다.")
      return result
    }
    try { return await readFile(path.join(this.directory, `${name}.json`), "utf8") }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error }
  }

  async read<T>(name: string, fallback: () => T): Promise<T> {
    return this.unpack(await this.raw(name), fallback)
  }

  async update<T>(name: string, fallback: () => T, update: (state: T) => T): Promise<T> {
    if (this.connection()) {
      // Compare-and-set across serverless instances, not just a process-local queue.
      for (let attempt = 0; attempt < 12; attempt++) {
        const raw = await this.raw(name)
        const state = this.unpack(raw, fallback)
        const next = update(state)
        if (next === state && raw !== null) return next
        const envelope: Envelope<T> = { format: "dokdo-state-v1", revision: randomUUID(), value: next }
        if (await this.command(["EVAL", compareAndSet, 1, this.key(name), raw ?? "", JSON.stringify(envelope)]) === 1) return next
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
    if (!this.connection()) throw new Error("데이터 이전 대상 영구 저장소를 연결해 주세요.")
    const envelope: Envelope<T> = { format: "dokdo-state-v1", revision: randomUUID(), value }
    return await this.command(["SET", this.key(name), JSON.stringify(envelope), "NX"]) === "OK"
  }
}

export const prototypeStore = new PrototypeStore()
