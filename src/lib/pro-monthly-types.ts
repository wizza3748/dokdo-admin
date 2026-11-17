export type MonthlyKind = "general" | "feedback_pending" | "no_submission"
export type MonthlyDirection = "더 간결하게" | "더 구체적으로" | "더 따뜻하게" | "다른 방식으로"
export type MonthlyCarry = { text: string; continued: boolean }
export type MonthlySource = {
  recordId: string; reviewId: string; title: string; level: number; writingType: string; round: number;
  submittedAt: string; sentAt?: string; body: string; feedback: string; itemFeedback: string[];
  scores?: Record<string, number>; report?: unknown; reportFeedback?: string;
  institutionId?: string; is_current_academy: boolean | null; round_status: string;
  /** The first draft may be carried in only to compare with an in-period revision. */
  comparisonOnly?: boolean;
}
export type MonthlyEvidence = {
  point: string;
  source: string;
  references: { recordId: string; field: "body" | "feedback" | "itemFeedback" | "reportFeedback"; quote: string }[];
  criterion?: string;
}
export type MonthlyInput = {
  studentName: string; level: number; periodStart: string; periodEnd: string; kind: MonthlyKind;
  studentFullName?: string; parentSalutation?: string; isFirst?: boolean;
  writings?: { reviewId: string; firstRecordId?: string; revisedRecordId?: string; status: string }[];
  sources: MonthlySource[]; submittedWeeks: number; totalWeeks: number;
  previous?: { body: string; carry: MonthlyCarry[]; composition: string; peerComparison: boolean; teachingOutcome: boolean };
  style: string[]; examples: string[];
}
export type MonthlyOutput = {
  body: string; carry: MonthlyCarry[]; kind: MonthlyKind; composition: string; focus: string;
  reviewSpans: { text: string; reason: "작성 과정의 도움 여부" | "부족한 점의 직접 언급" | "제출 횟수 언급" }[];
  peerComparison: boolean; teachingOutcome: boolean; warnings: string[];
  /** Optional for historical generations. Never backfill their evidence or rewrite their body. */
  evidence?: MonthlyEvidence[]; notesForTeacher?: string[]; charCount?: number; promptVersion?: string;
}
export type MonthlyGeneration = MonthlyOutput & { id: string; at: string; institutionId: string; input: MonthlyInput; direction?: MonthlyDirection; request?: string }
export type MonthlyVersion = { body: string; carry: MonthlyCarry[]; sourceId: string; at: string; actor: string; revision: number }
export type MonthlyRecord = {
  id: string; studentId: string; month: string; institutionId: string; required: boolean; optionalConsultationIds: string[];
  periodStart: string; periodEnd: string; due: string; scheduledGenerationAt: string; firstGeneratedAt: string; earlyEnd: boolean;
  revision: number; generations: MonthlyGeneration[]; regenerationCount: number; saved?: MonthlyVersion;
  copied?: { at: string; revision: number }; sent?: MonthlyVersion & { actualAt: string; recordedAt: string; institutionId: string; manual: boolean };
  job?: { id: string; at: string; readyAt: string; institutionId: string; input: MonthlyInput; direction?: MonthlyDirection; request?: string; body?: string; regenerate: boolean };
  error?: string; audit: { id: string; action: string; at: string; actor: string; institutionId: string }[];
  /** Only isolated prototype fixtures set failure switches. */
  simulateGenerationFailureOnce?: boolean; simulateStyleFailureOnce?: boolean; styleUpdate?: "applied" | "failed";
}
export type AcademyStyle = {
  institutionId: string; enabled: boolean; revision: number;
  items: { text: string; observations: number }[]; sentIds: string[]; handledIds: string[];
  updatedAt?: string;
  history: { id: string; at: string; actor: string; kind: string; before: string; after: string }[];
}
export type MonthlyState = {
  transition?: { at: string; optional: Record<string, string[]> };
  records: MonthlyRecord[];
  exclusions: { studentId: string; month: string; reason: "first-month" | "late-assignment"; at: string }[];
  evaluatedMonths: string[]; styles: AcademyStyle[];
  schedules: { studentId: string; weekday: number | null; time: string; at: string; actor: string }[];
  /** Dedicated monthly examples only; not an operational policy or a shared data migration. */
  validation?: { version: number; scenario: string; caseId: string; createdAt: string; fault?: {recordId:string;type:string} };
}
export type MonthlyCommand =
  | { type: "monthly-save"; id: string; body: string; carry: MonthlyCarry[]; sourceId: string; revision: number }
  | { type: "monthly-copy"; id: string; revision: number }
  | { type: "monthly-send"; id: string; revision: number; actualAt?: string }
  | { type: "monthly-regenerate"; id: string; revision: number; body: string; direction?: MonthlyDirection; request?: string }
  | { type: "monthly-retry"; id: string; revision: number }
  | { type: "monthly-schedule"; studentId: string; weekday: number | null; time: string }
  | { type: "monthly-style-save"; enabled: boolean; items: string[]; revision: number }
  | { type: "monthly-style-reset"; revision: number }
