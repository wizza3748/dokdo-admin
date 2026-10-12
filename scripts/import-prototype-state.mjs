import { readFile } from "node:fs/promises"
import path from "node:path"
import nextEnv from "@next/env"
import { parseArgs } from "node:util"
import { createHash } from "node:crypto"
import { PrototypeStore } from "../src/lib/prototype-store.ts"
import { validateBrowserSnapshot } from "../src/lib/prototype-browser-snapshot.ts"

nextEnv.loadEnvConfig(process.cwd())
const { values: args } = parseArgs({ options: { source: { type: "string" }, provider: { type: "string" }, namespace: { type: "string" } } })
const directory = path.resolve(args.source || path.join(process.cwd(), ".local-state"))
const env = { ...process.env }
if (args.provider) env.DOKDO_STATE_PROVIDER = args.provider
if (args.namespace) env.DOKDO_STATE_NAMESPACE = args.namespace
// Sensitive Vercel variables are intentionally not downloadable by CLI. An authorized
// storage-provider export can supply the two required credentials without logging them.
if (env.DOKDO_STATE_PROVIDER !== "neon") try {
  const credentials = JSON.parse(await readFile(path.join(directory, "redis-migration-credentials.json"), "utf8"))
  for (const key of ["KV_REST_API_URL", "KV_REST_API_TOKEN"]) {
    if (typeof credentials[key] !== "string" || !credentials[key] || credentials[key].includes("[SENSITIVE]")) throw new Error("저장소 연결 정보 검증 실패")
    env[key] = credentials[key]
  }
} catch (error) { if (error.code !== "ENOENT") throw error }
if (!env.DOKDO_STATE_NAMESPACE || env.DOKDO_STATE_NAMESPACE === "[SENSITIVE]") throw new Error("이전 대상 DOKDO_STATE_NAMESPACE를 명시해 주세요.")
if (env.DOKDO_STATE_PROVIDER !== "neon" && !env.UPSTASH_REDIS_REST_URL && !env.KV_REST_API_URL) throw new Error("원격 저장소 환경 변수가 필요합니다.")
const store = new PrototypeStore({ env })
if (env.DOKDO_STATE_PROVIDER === "neon") await store.prepareNeon()
let browserSnapshot = null
try { browserSnapshot = validateBrowserSnapshot(JSON.parse(await readFile(path.join(directory, "browser-bootstrap.json"), "utf8"))) }
catch (error) { if (error.code !== "ENOENT") throw error }
for (const name of ["online-reviews", "browser-bootstrap", "student-workbook-submissions"]) {
  let data
  try { data = JSON.parse(await readFile(path.join(directory, `${name}.json`), "utf8")) }
  catch (error) {
    if (error.code !== "ENOENT" || name === "online-reviews") throw error
    if (name === "student-workbook-submissions" && browserSnapshot?.values["dokdo-student-agency-workbook-submissions"]) {
      data = JSON.parse(browserSnapshot.values["dokdo-student-agency-workbook-submissions"])
      if (!Array.isArray(data) || data.some(record => !record || typeof record.id !== "string" || typeof record.bookTitle !== "string")) throw new Error("제출 데이터 형식 검증 실패")
    } else continue
  }
  if (name === "browser-bootstrap") data = validateBrowserSnapshot(data)
  const imported = await store.importIfEmpty(name, data)
  const remote = await store.read(name, () => null)
  if (imported && JSON.stringify(remote) !== JSON.stringify(data)) throw new Error(`${name}: 이전 검증 실패`)
  const equal = JSON.stringify(remote) === JSON.stringify(data)
  const hash = createHash("sha256").update(JSON.stringify(remote)).digest("hex")
  console.log(`${env.DOKDO_STATE_NAMESPACE}/${name}: ${imported ? "이전 완료" : "기존 원격 데이터 보존 (덮어쓰지 않음)"}; 원본 일치=${equal}; SHA256=${hash}`)
}
