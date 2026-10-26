/** Date/time inputs represent a Korean local minute regardless of the browser time zone. */
export function feedbackScheduleInput(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return undefined
  const at = Date.parse(`${date}T${time}:00+09:00`)
  if (!Number.isFinite(at)) return undefined
  const korean = new Date(at + 9 * 3_600_000).toISOString()
  return korean.slice(0, 16) === `${date}T${time}` ? new Date(at).toISOString() : undefined
}

/** Keep the same inclusive current-time boundary for both live and fixed test clocks. */
export function invalidFeedbackScheduleTime(date: string, time: string, now: number) {
  const scheduledAt = feedbackScheduleInput(date, time)
  return !!date && !!time && (!scheduledAt || Date.parse(scheduledAt) <= now)
}

export function feedbackScheduleNotices(round: 1 | 2, decision?: "request" | "complete", scheduledAt?: string, due?: string) {
  return [
    "예약한 시간에 학생에게 피드백이 전송됩니다.",
    ...(round === 2 || decision === "complete" ? ["학생에게 피드백이 전송되면 학부모에게도 결과가 자동 발송됩니다."] : []),
    ...(round === 1 && decision === "complete" ? ["학생에게 피드백이 전송된 후에는 '2차 작성 요청'으로 변경할 수 없습니다."] : []),
    ...(scheduledAt && due && Date.parse(scheduledAt) > Date.parse(due) ? ["처리 기한이 지나면 전송 완료 전까지 '지연'으로 표시됩니다."] : []),
  ]
}
