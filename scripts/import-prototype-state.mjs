import { readFile } from "node:fs/promises"
import path from "node:path"
import nextEnv from "@next/env"
import { PrototypeStore } from "../src/lib/prototype-store.ts"
import { validateBrowserSnapshot } from "../src/lib/prototype-browser-snapshot.ts"

nextEnv.loadEnvConfig(process.cwd())
const store = new PrototypeStore()
if (!process.env.UPSTASH_REDIS_REST_URL && !process.env.KV_REST_API_URL) throw new Error("원격 저장소 환경 변수가 필요합니다.")
const directory = path.join(process.cwd(), ".local-state")
let browserSnapshot = null
try { browserSnapshot = validateBrowserSnapshot(JSON.parse(await readFile(path.join(directory, "browser-bootstrap.json"), "utf8"))) }
catch (error) { if (error.code !== "ENOENT") throw error }
for (const name of ["online-reviews", "browser-bootstrap", "student-workbook-submissions"]) {
  let data
  try { data = JSON.parse(await readFile(path.join(process.cwd(), ".local-state", `${name}.json`), "utf8")) }
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
  console.log(`${name}: ${imported ? "이전 및 내용 검증 완료" : "기존 원격 데이터 보존 (덮어쓰지 않음)"}`)
}
