import { AdminMonthlyFeedback } from "@/components/pro-management/admin-monthly-feedback"
import { adminWeeklyAllowed } from "@/lib/admin-operator"
export const dynamic = "force-dynamic"
export default function Page() { return adminWeeklyAllowed() ? <AdminMonthlyFeedback/> : <p role="alert" className="p-6">조회 권한이 없습니다.</p> }
