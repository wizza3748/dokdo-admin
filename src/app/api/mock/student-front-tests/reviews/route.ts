import { studentTestReviewResponse } from "@/lib/student-test-server"
export const runtime = "nodejs"
export const GET = (request: Request) => studentTestReviewResponse(request, "review")
export const POST = (request: Request) => studentTestReviewResponse(request, "review")
