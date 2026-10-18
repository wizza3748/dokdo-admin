export type ProMember = {
  id: string; name: string; account: string; level: number; age: number;
  product: "pro" | "normal"; status: "active" | "ended"; external: boolean;
  institutionId?: string; teacherId: string; assignedAt?: string; endedAt?: string;
  /** Matching changes keep the old institution's weekday through the change week. */
  matchingHistory?: { at: string; institutionId: string }[];
  effectiveAt: string; effectiveMonth: string; serviceEnd: string; parentContact: boolean;
  limits: Record<string, number>;
  consultation?: { nth: number; weekday: number; time: string }; overrides: Record<string, string>;
  managementMemo?: { text: string; revision: string; at: string; actor: string };
}
export type ProCase = {
  reviewId: string; studentId: string; institutionId: string; teacherId: string;
  week: string; month: string; weekday: number; cutoff: string; due: string; remind1: string; remind2: string;
  selectedAt?: string; selection?: "student" | "auto" | "teacher" | "migration"; lockedAt?: string;
  firstSentAt?: string; debitCancelledAt?: string; secondDeadline?: string;
  secondWeek?: string; secondDue?: string; closedAt?: string; closeReason?: string;
  parent: { status: "none" | "sent" | "failed" | "missing"; at?: string; attempts: { at: string; result: string }[]; simulateFailureOnce?: boolean };
  finalSnapshots: { recordId: string; at: string; feedback: string; body: string; report?: unknown }[];
  aiSnapshots: { recordId: string; at: string; runId: string; result: unknown }[];
}
export type ProAudit = { id: string; studentId: string; kind: string; at: string; actor: string; institutionId?: string; week?: string; month?: string; reviewId?: string; before?: unknown; after?: unknown; reason?: string; memo?: string }
export type ProReminder = { id: string; studentId: string; week: string; kind: "submission" | "revision"; sequence: 1 | 2; at: string; actor: string; cancelledAt?: string }
export type ProConsultation = { id: string; studentId: string; month: string; result: "유선 상담 완료" | "부재 후 카톡 상담으로 대체" | "미진행"; actualAt: string; memo: string; actor: string; at: string; previousId?: string }
export type ProState = {
  version: 1; clock: string; clockMode?: "real" | "test"; effectiveAt: string; effectiveMonth: string;
  members: ProMember[]; cases: ProCase[];
  schedules: { institutionId: string; teacherId: string; weekday: number; from: string }[];
  audit: ProAudit[]; reminders: ProReminder[]; consultations: ProConsultation[];
  processed: string[]; reminderSnapshots: { studentId: string; week: string; kind: "submission" | "revision"; sequence: 1 | 2; due: string }[];
}
export type ProCommand =
  | { type: "apply" | "cancel" | "designate" | "retry-parent"; reviewId: string }
  | { type: "clock"; at: string }
  | { type: "clock-real" }
  | { type: "schedule"; weekday: number; teacherId?: string }
  | { type: "limit"; studentId: string; limit: number; reason: string; memo?: string }
  | { type: "cancel-debit"; reviewId: string; reason: string; memo: string }
  | { type: "reminder"; studentId: string; week: string; kind: "submission" | "revision"; sequence: 1 | 2 }
  | { type: "cancel-reminder"; id: string }
  | { type: "consult-schedule"; studentId: string; nth: number; weekday: number; time: string; month?: string; override?: string }
  | { type: "consult"; studentId: string; month: string; result: ProConsultation["result"]; actualAt: string; memo: string; previousId?: string }
  | { type: "management-memo"; studentId: string; text: string; expectedRevision: string | null }
