import { AdminWeeklyManagement } from "@/components/pro-management/admin-weekly-management"
import { adminWeeklyAllowed } from "@/lib/admin-operator"
export const dynamic = "force-dynamic"

export default function AdminProManagementPage() {
  if (!adminWeeklyAllowed()) return <p role="alert" className="p-6">조회 권한이 없습니다.</p>
  return <AdminWeeklyManagement initialNow={new Date().toISOString()}/>
}
