import { NextResponse } from "next/server"

import type { OnlineWorkbook } from "@/lib/online-workbooks"
import { prototypeStore } from "@/lib/prototype-store"

export const runtime = "nodejs"
const emptySubmissions = (): OnlineWorkbook[] => []

export async function GET() {
  return NextResponse.json(await prototypeStore.read("student-workbook-submissions", emptySubmissions), {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request) {
  const record = await request.json() as OnlineWorkbook
  if (!record || typeof record.id !== "string" || typeof record.bookTitle !== "string") {
    return NextResponse.json({ message: "Invalid workbook submission" }, { status: 400 })
  }

  await prototypeStore.update("student-workbook-submissions", emptySubmissions, submissions => {
    const existingIndex = submissions.findIndex((item) => item.id === record.id)
    if (existingIndex === -1) return [record, ...submissions]
    return submissions.map((item, index) => index === existingIndex ? record : item)
  })

  return NextResponse.json(record)
}

export async function DELETE() {
  await prototypeStore.update("student-workbook-submissions", emptySubmissions, () => [])
  return NextResponse.json({ ok: true })
}
