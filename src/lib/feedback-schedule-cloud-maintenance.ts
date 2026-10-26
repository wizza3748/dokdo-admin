import { Client, Receiver } from "@upstash/qstash"
import { neon } from "@neondatabase/serverless"
import { bindCloudFeedbackSchedule, cloudScheduleConfig, createCloudFeedbackScheduler, type ScheduleScope } from "./feedback-schedule-cloud"
import { PrototypeStore } from "./prototype-store"
import { createStudentTestWorkspaceStore } from "./student-test-workspace"
import { emptyStudentTests } from "./student-test-store"
import { emptyReviewDatabase, type ReviewDatabase } from "./review-domain"

/** Explicit, signed one-time deployment repair. No timer, seeding, resets or data merging. */
export async function connectExistingCloudSchedules(request: Request) {
  try {
    const env = process.env, config = cloudScheduleConfig(env)
    if (!config) return Response.json({ result: "unavailable" }, { status: 503 })
    const url = `${config.url}/connect-existing`, raw = await request.text()
    if (raw.length > 2048) return Response.json({ result: "too-large" }, { status: 413 })
    try {
      const receiver = new Receiver({ currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY, nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY, devMode: false })
      if (!await receiver.verify({ body: raw, signature: request.headers.get("upstash-signature") || "", url })) throw new Error()
    } catch { return Response.json({ result: "unauthorized" }, { status: 401 }) }
    const body = JSON.parse(raw) as { operation?: string; after?: string; run?: string }
    if (body.operation !== "connect-existing" || body.after && !body.after.startsWith(`${config.namespace}:`) || !body.run || !/^[\w-]{1,80}$/.test(body.run)) return Response.json({ result: "invalid-operation" }, { status: 400 })
    const databaseUrl = env.DOKDO_NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL
    if (!databaseUrl) throw new Error()
    const sql = neon(databaseUrl)
    const prefix = `${config.namespace}:student-front-tests:v1:`
    // Exact namespace prefixes, parameterized SQL, small pages. Do not read unrelated app keys.
    const rows = await sql.query("SELECT key FROM dokdo_prototype_state WHERE (key = $1 OR starts_with(key, $2)) AND key > $3 ORDER BY key LIMIT 5", [`${config.namespace}:online-reviews`, `${prefix}browser-`, body.after || ""])
    const shared = new PrototypeStore(), workspace = createStudentTestWorkspaceStore(), scheduler = createCloudFeedbackScheduler()
    let linked = 0
    async function connect(db: ReviewDatabase, scope: ScheduleScope) {
      for (const record of db.records) for (const schedule of record.feedbackSchedules ?? []) {
        if (!["waiting", "sending"].includes(schedule.status) || schedule.cloudDelivery) continue
        const prepared = await scheduler.prepare(db, scope, record.id, schedule.id)
        if (!prepared) continue
        if (scope.kind === "shared") await shared.update("online-reviews", emptyReviewDatabase, current => {
          const exists = current.records.find(r => r.id === record.id)?.feedbackSchedules?.some(s => s.id === schedule.id)
          return exists ? bindCloudFeedbackSchedule(current, record.id, schedule.id, prepared) : current
        })
        else await workspace.update(scope.key, emptyStudentTests, state => ({ ...state, sessions: state.sessions.map(session => {
          if (session.token !== scope.token) return session
          const exists = session.db.records.find(r => r.id === record.id)?.feedbackSchedules?.some(s => s.id === schedule.id)
          return exists ? { ...session, db: bindCloudFeedbackSchedule(session.db, record.id, schedule.id, prepared) } : session
        }) }))
        linked++
      }
    }
    for (const row of rows) {
      if (row.key === `${config.namespace}:online-reviews`) await connect(await shared.read("online-reviews", emptyReviewDatabase), { kind: "shared" })
      else {
        const key = String(row.key).slice(prefix.length)
        if (!/^browser-[a-f0-9]{64}$/.test(key)) continue
        const state = await workspace.read(key, emptyStudentTests)
        for (const session of state.sessions) await connect(session.db, { kind: "workspace", key, token: session.token })
      }
    }
    if (rows.length === 5) {
      const client = new Client({ token: env.QSTASH_TOKEN!, baseUrl: env.QSTASH_URL! })
      await client.publishJSON({ url, body: { ...body, after: rows.at(-1)!.key }, retries: 3 })
    }
    return Response.json({ result: "connected", sourcesChecked: rows.length, reservationsLinked: linked, more: rows.length === 5 }, { headers: { "Cache-Control": "no-store" } })
  } catch { return Response.json({ result: "temporarily-unavailable" }, { status: 503 }) }
}
