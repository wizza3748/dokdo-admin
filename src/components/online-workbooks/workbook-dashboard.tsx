"use client"

import { AdminWorkbookStatus } from "@/components/online-workbooks/admin-workbook-status"
import { AgencyWorkbookList } from "@/components/online-workbooks/agency-workbook-list"

export function WorkbookDashboard({ mode, role = "agency" }: { mode: "admin" | "agency"; role?: "agency" | "class" }) {
  return mode === "agency" ? <AgencyWorkbookList role={role} /> : <AdminWorkbookStatus />
}
