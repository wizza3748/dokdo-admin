import { studentTestReviewResponse } from "@/lib/student-test-server"
export const runtime = "nodejs"
export const POST = (request: Request) => studentTestReviewResponse(request, "pro")
