import { NextResponse } from "next/server"
import { prototypeStore } from "@/lib/prototype-store"
import { validateBrowserSnapshot, type PrototypeBrowserSnapshot } from "@/lib/prototype-browser-snapshot"

export const runtime = "nodejs"
export async function GET() {
  try {
    const snapshot = await prototypeStore.read<PrototypeBrowserSnapshot | null>("browser-bootstrap", () => null)
    return NextResponse.json(snapshot && validateBrowserSnapshot(snapshot), { headers: { "Cache-Control": "no-store" } })
  } catch { return NextResponse.json({ message: "이전 데이터를 불러오지 못했습니다." }, { status: 503 }) }
}

export async function POST(request: Request) {
  // This export endpoint is unavailable on any deployed origin.
  if (process.env.VERCEL || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) return new NextResponse(null, { status: 404 })
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403 })
  try {
    const text = await request.text()
    if (text.length > 5_000_000) throw new Error("이전 데이터가 너무 큽니다.")
    const snapshot = validateBrowserSnapshot(JSON.parse(text))
    await prototypeStore.update<PrototypeBrowserSnapshot | null>("browser-bootstrap", () => null, () => snapshot)
    return NextResponse.json({ ok: true, count: Object.keys(snapshot.values).length })
  } catch { return NextResponse.json({ message: "이전 데이터를 저장하지 못했습니다." }, { status: 400 }) }
}
