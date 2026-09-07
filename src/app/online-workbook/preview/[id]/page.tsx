import { StudentWorkbookPreview } from "@/components/student/student-workbook-preview"

export default async function OnlineWorkbookPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ templateId?: string | string[] }> }) {
  const { id } = await params
  const query = await searchParams
  const rawTemplateId = Array.isArray(query.templateId) ? query.templateId[0] : query.templateId
  const templateId = rawTemplateId ? Number(rawTemplateId) : undefined
  return <StudentWorkbookPreview key={`${id}-${templateId ?? "original"}`} previewId={Number(id)} templateId={templateId} />
}
