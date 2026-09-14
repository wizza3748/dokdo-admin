import { WorkbookDashboard } from "@/components/online-workbooks/workbook-dashboard"

export default async function AgencyOnlineWorkbooksPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams
  return <WorkbookDashboard mode="agency" role={role === "class" ? "class" : "agency"} />
}
