import { createHash, randomBytes } from "node:crypto"
import path from "node:path"
import { PrototypeStore } from "./prototype-store"

type Environment = Readonly<Record<string, string | undefined>>
type StoreOptions = NonNullable<ConstructorParameters<typeof PrototypeStore>[0]>
const localHosts = ["localhost", "127.0.0.1", "[::1]"]
const ownerPattern = /^[a-f0-9]{64}$/

export function isLocalStudentTestEnvironment(env: Environment = process.env) {
  return env.VERCEL !== "1" && env.NODE_ENV !== "production"
}

/** Same database, different namespace and browser key. Never use the shared aggregate. */
export function createStudentTestWorkspaceStore(env: Environment = process.env, options: Pick<StoreOptions, "sql" | "fetcher"> = {}) {
  const local = isLocalStudentTestEnvironment(env)
  return new PrototypeStore({
    ...options,
    env: local ? { DOKDO_STATE_PROVIDER: "local" } : {
      ...env,
      DOKDO_STATE_PROVIDER: "neon",
      DOKDO_STATE_NAMESPACE: `${env.DOKDO_STATE_NAMESPACE || "dokdo-admin:prototype:v1"}:student-front-tests:v1`,
    },
    directory: path.join(env.DOKDO_LOCAL_STATE_DIR || path.join(process.cwd(), ".local-state"), "student-front-tests", "workspaces"),
  })
}

export const studentTestWorkspaceStore = createStudentTestWorkspaceStore()

/** The URL's case token is NOT authority: an HttpOnly, host-only browser cookie owns the workspace. */
export function studentTestWorkspace(request: Request, create = false, env: Environment = process.env) {
  const url = new URL(request.url), local = isLocalStudentTestEnvironment(env)
  if (local ? !localHosts.includes(url.hostname) : env.DOKDO_STATE_PROVIDER !== "neon" || !env.DOKDO_STATE_NAMESPACE) {
    throw new Error("전용 테스트 저장소 설정을 확인해 주세요.")
  }
  const origin = request.headers.get("origin"), site = request.headers.get("sec-fetch-site")
  if ((origin && origin !== url.origin) || site === "cross-site" || site === "same-site" || (request.method !== "GET" && origin !== url.origin)) {
    throw new Error("같은 사이트의 테스트 화면에서만 실행할 수 있습니다.")
  }
  const secure = url.protocol === "https:"
  if (!local && !secure) throw new Error("전용 테스트는 HTTPS에서만 사용할 수 있습니다.")
  const cookieName = secure ? "__Host-dokdo-student-tests" : "dokdo-student-tests"
  const cookies = (request.headers.get("cookie") || "").split(";").map(item => item.trim()).filter(item => item.startsWith(`${cookieName}=`))
  if (cookies.length > 1) throw new Error("테스트 브라우저 정보가 올바르지 않습니다.")
  const existing = cookies[0]?.slice(cookieName.length + 1)
  if (existing && !ownerPattern.test(existing)) throw new Error("테스트 브라우저 정보가 올바르지 않습니다.")
  const owner = existing || (create ? randomBytes(32).toString("hex") : undefined)
  if (!owner) return null
  return {
    key: `browser-${createHash("sha256").update(owner).digest("hex")}`,
    local,
    cookie: existing ? undefined : { name: cookieName, value: owner, httpOnly: true, secure, sameSite: "strict" as const, path: "/", maxAge: 60 * 60 * 24 * 30 },
  }
}

export function requireStudentTestWorkspace(request: Request) {
  const workspace = studentTestWorkspace(request)
  if (!workspace) throw new Error("이 브라우저의 학생프론트 테스트 목록에서 예시를 다시 열어 주세요.")
  return workspace
}

export const studentTestResponseHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie", "Referrer-Policy": "same-origin" }
