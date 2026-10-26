import { receiveCloudFeedbackSchedule } from "@/lib/feedback-schedule-cloud"
export const runtime = "nodejs"
export const maxDuration = 60
export const POST = (request: Request) => receiveCloudFeedbackSchedule(request, true)
