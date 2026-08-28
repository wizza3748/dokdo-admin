import { WorkbookDetail } from "@/components/online-workbooks/workbook-detail"

export default async function AgencyOnlineWorkbookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <WorkbookDetail id={id} />
}
