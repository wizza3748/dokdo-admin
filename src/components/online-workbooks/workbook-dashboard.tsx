"use client"

import { AdminWorkbookStatus } from "@/components/online-workbooks/admin-workbook-status"
import { AgencyWorkbookList } from "@/components/online-workbooks/agency-workbook-list"

export function WorkbookDashboard({ mode }: { mode: "admin" | "agency" }) {
  return mode === "agency" ? <AgencyWorkbookList /> : <AdminWorkbookStatus />
}
