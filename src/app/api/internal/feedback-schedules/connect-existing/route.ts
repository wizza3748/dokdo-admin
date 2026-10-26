import { connectExistingCloudSchedules } from "@/lib/feedback-schedule-cloud-maintenance"
export const runtime = "nodejs"
export const maxDuration = 60
export const POST = connectExistingCloudSchedules
