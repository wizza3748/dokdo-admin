export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "development") {
    const { startLocalFeedbackScheduleWorker } = await import("./lib/feedback-schedule-worker")
    startLocalFeedbackScheduleWorker()
  }
}
