import { NextResponse } from "next/server"
import { adminWeeklyAllowed } from "@/lib/admin-operator"
import { adminWeeklyAvailableFrom, adminWeeklyInstitutions, adminWeeklyMembers } from "@/lib/admin-pro-weekly-data"
import { summarizeAdminWeekly } from "@/lib/admin-pro-weekly"
import { weekStart } from "@/lib/pro-calendar"

export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" }
  if (!adminWeeklyAllowed()) return NextResponse.json({ message: "조회 권한이 없습니다." }, { status: 403, headers })
  const now = new Date().toISOString(), requestedWeek = new URL(request.url).searchParams.get("week") || weekStart(now)
  if (!Number.isFinite(Date.parse(requestedWeek))) return NextResponse.json({ message: "올바른 주차를 선택해 주세요." }, { status: 400, headers })
  return NextResponse.json(summarizeAdminWeekly(adminWeeklyMembers(), adminWeeklyInstitutions, requestedWeek, now, adminWeeklyAvailableFrom), { headers })
}
