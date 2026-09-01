import { WorkbookRoundSettings } from "@/components/workbook-templates/workbook-template-admin"

export default async function WorkbookRoundSettingsPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params
  return <WorkbookRoundSettings bookId={Number(bookId)} />
}
