import { WorkbookTemplateForm } from "@/components/workbook-templates/workbook-template-admin"

export default async function EditWorkbookTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <WorkbookTemplateForm templateId={Number(id)} />
}
