import { ReviewReportView } from "@/components/online-workbooks/review-report"
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ role?: string; share?: string }> }) {
  const { id } = await params; const { role, share } = await searchParams
  return <ReviewReportView id={id} role={role === "admin" || role === "agency" || role === "class" || role === "external" ? role : "student"} shareToken={share} />
}
