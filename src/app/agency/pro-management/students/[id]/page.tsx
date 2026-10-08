import { StudentManagementDetail } from "@/components/pro-management/student-management-detail"
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <StudentManagementDetail id={(await params).id}/> }
