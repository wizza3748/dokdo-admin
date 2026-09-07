import { NextResponse } from "next/server"

import type { OnlineWorkbook } from "@/lib/online-workbooks"

type SharedWorkbookState = typeof globalThis & {
  __dokdoStudentWorkbookSubmissions?: OnlineWorkbook[]
}

const sharedState = globalThis as SharedWorkbookState

function getSubmissions() {
  sharedState.__dokdoStudentWorkbookSubmissions ??= []
  return sharedState.__dokdoStudentWorkbookSubmissions
}

export async function GET() {
  return NextResponse.json(getSubmissions(), {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request) {
  const record = await request.json() as OnlineWorkbook
  if (!record || typeof record.id !== "string" || typeof record.bookTitle !== "string") {
    return NextResponse.json({ message: "Invalid workbook submission" }, { status: 400 })
  }

  const submissions = getSubmissions()
  const existingIndex = submissions.findIndex((item) => item.id === record.id)
  if (existingIndex === -1) submissions.unshift(record)
  else submissions[existingIndex] = record

  return NextResponse.json(record)
}

export async function DELETE() {
  sharedState.__dokdoStudentWorkbookSubmissions = []
  return NextResponse.json({ ok: true })
}
