import { StudentWorkbookFlow } from "@/components/student/student-workbook-flow"

export default async function StudentWorkbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StudentWorkbookFlow id={id} />
}
