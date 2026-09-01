import { StudentWorkbookPreview } from "@/components/student/student-workbook-preview"

export default async function OnlineWorkbookPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StudentWorkbookPreview previewId={Number(id)} />
}
