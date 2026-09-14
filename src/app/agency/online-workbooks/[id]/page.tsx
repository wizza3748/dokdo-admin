import { WorkbookDetail } from "@/components/online-workbooks/workbook-detail"

export default async function AgencyOnlineWorkbookDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ role?: string }> }) {
  const { id } = await params
  const { role } = await searchParams
  return <WorkbookDetail id={id} role={role === "admin" ? "admin" : role === "class" ? "class" : "agency"} />
}
