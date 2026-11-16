import type { ReviewDatabase } from "./review-domain"
import type { ProMember } from "./pro-types"
import type { MonthlyInput, MonthlyOutput, MonthlyRecord, MonthlyDirection, MonthlyKind } from "./pro-monthly-types"
// @ts-expect-error Node tests load TypeScript directly.
import { weekStart } from "./pro-calendar.ts"

export const monthlyKinds = { general: "일반형", feedback_pending: "제출 글 기반 짧은 일반형", no_submission: "참여 안내형" }
export const monthlyCompositions = ["강점 집중형", "성장 이야기형", "솔직 진단형", "한 편 깊이 읽기형", "균형형"]
export const monthlyDirections: MonthlyDirection[] = ["더 간결하게", "더 구체적으로", "더 따뜻하게", "다른 방식으로"]
export const plainMonthlyText = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim()
export const monthlyLength = (value: string) => [...value.replace(/[\r\n]/g, "")].length
export const monthlyMinimum = (kind: MonthlyKind) => kind === "general" ? 450 : 300
export const canShortenMonthly = (kind: MonthlyKind, body: string) => monthlyLength(body) > (kind === "general" ? 500 : 350)

/** Adapter contract: v1.4 + the common specification's input/output supplements. No network AI calls. */
export const MONTHLY_PROMPT_RULES = {
  version: "1.4 + 공통 명세 입력·출력 보완 (2026-11-16)",
  greeting: "안녕하세요, 책글섬 독도 관리 선생님입니다.",
  priority: ["본사 지침", "해당 학생·관리월의 직접 요청", "학원 말투 메모", "학원 발송본 예시"],
  excludedInputs: ["학부모 관심사", "관리 메모", "학원명", "선생님 이름"],
  rules: ["전송 전 피드백은 빈 값", "이전 학원 지도 성과를 현재 학원 성과로 서술하지 않음", "짧은 일반형·참여 안내형 유형 유지", "일반형만 구성 중복 검사", "종료·재등록 안내 없음", "본문과 정확히 일치하는 검토 표시만 사용"],
}

export function monthlyInput(db: ReviewDatabase, member: ProMember, record: Pick<MonthlyRecord, "periodStart" | "periodEnd" | "month" | "id">): MonthlyInput {
  const pro = db.pro!, start = record.periodStart, end = record.periodEnd
  const inside = (at?: string) => !!at && at >= start && at < end
  const sources: MonthlyInput["sources"] = []
  for (const c of pro.cases.filter(c => c.studentId === member.id)) {
    const review = db.reviews.find(r => r.id === c.reviewId)
    if (!review) continue
    for (const r of db.records.filter(r => r.reviewId === c.reviewId)) {
      if (r.writingStatus !== "submitted" || !r.submittedAt || r.submittedAt >= end || r.round === 2 && c.secondDeadline && r.submittedAt >= c.secondDeadline) continue
      const sentAt = r.sentAt && r.sentAt < end ? r.sentAt : undefined
      if (!inside(r.submittedAt) && !inside(sentAt)) continue
      const snapshot = sentAt && c.finalSnapshots.find(s => s.recordId === r.id && s.at === sentAt)
      sources.push({ recordId: r.id, reviewId: c.reviewId, title: review.bookTitle, level: review.level, writingType: review.template.title,
        round: r.round, submittedAt: r.submittedAt, sentAt, body: plainMonthlyText(snapshot ? snapshot.body : r.finalBody || r.body),
        feedback: sentAt ? plainMonthlyText(snapshot ? snapshot.feedback : r.feedback) : "",
        itemFeedback: sentAt ? r.itemFeedback.filter(i => i.visible).map(i => plainMonthlyText(i.text)) : [],
        scores: sentAt ? r.teacherScores : undefined, report: sentAt ? snapshot ? snapshot.report : r.report : undefined,
        reportFeedback: sentAt ? r.reportFeedback : undefined, institutionId: sentAt ? c.institutionId : undefined,
        is_current_academy: sentAt ? c.institutionId === member.institutionId : null,
        round_status: !sentAt ? "feedback_pending" : r.round === 2 ? "second_completed" : c.secondDeadline ? "second_requested" : "first_completed" })
    }
  }
  sources.sort((a,b) => a.submittedAt.localeCompare(b.submittedAt) || a.recordId.localeCompare(b.recordId))
  const kind: MonthlyKind = sources.some(s => inside(s.sentAt)) ? "general" : sources.some(s => inside(s.submittedAt)) ? "feedback_pending" : "no_submission"
  const previous = pro.monthly?.records.filter(r => r.studentId === member.id && r.month < record.month && r.sent).sort((a,b) => b.month.localeCompare(a.month))[0]
  const previousGeneration = previous?.generations.find(g => g.id === previous.sent?.sourceId)
  const style = pro.monthly?.styles.find(s => s.institutionId === member.institutionId)
  const useStyle = !!style?.enabled && style.sentIds.length >= 3
  return { studentName: member.name, level: member.level, periodStart: start, periodEnd: end, kind, sources,
    submittedWeeks: new Set(sources.filter(s => inside(s.submittedAt)).map(s => weekStart(s.submittedAt))).size,
    totalWeeks: Math.max(1, Math.ceil((Date.parse(end) - Date.parse(weekStart(start))) / (7 * 86400000))),
    previous: previous?.sent ? { body: previous.sent.body, carry: previous.sent.carry, composition: previousGeneration?.composition ?? "", peerComparison: previousGeneration?.peerComparison ?? false, teachingOutcome: previousGeneration?.teachingOutcome ?? false } : undefined,
    style: useStyle ? style.items.map(i => i.text) : [],
    examples: useStyle ? (pro.monthly?.records ?? []).filter(r => r.id !== record.id && r.sent && r.sent.institutionId === member.institutionId).sort((a,b) => b.sent!.recordedAt.localeCompare(a.sent!.recordedAt)).slice(0,2).map(r => r.sent!.body) : [] }
}

/** Synthetic generation is evidence-aware; it never sends student content to an AI service. */
export function mockMonthlyOutput(input: MonthlyInput, options: { direction?: MonthlyDirection; request?: string; body?: string; previousComposition?: string; attempt?: number } = {}): MonthlyOutput {
  const source = input.sources.find(s => s.feedback) ?? input.sources[0]
  const quote = source?.body.split(/(?<=[.!?。])\s|\n/).find(s => s.trim())?.slice(0,100) || ""
  let composition = input.kind === "general" ? monthlyCompositions[(monthlyCompositions.indexOf(options.previousComposition || input.previous?.composition || "") + 1) % 5] : input.kind === "feedback_pending" ? "제출 글 기반 짧은 일반형" : "참여 안내형"
  if (input.kind === "general" && options.direction !== "다른 방식으로" && options.previousComposition) composition = options.previousComposition
  const greeting = MONTHLY_PROMPT_RULES.greeting
  const introduction = input.kind === "no_submission"
    ? `${input.studentName} 학생의 이번 기간에는 제출이 완료된 온라인 독후감이 아직 없습니다. 이번에는 앞으로 글을 시작할 때 함께 살펴볼 방법을 안내드립니다. 제출하지 않은 이유를 단정하기보다 아이가 읽은 책과 떠오르는 생각을 편안하게 이야기할 수 있도록 도와주세요.`
    : `${input.studentName} 학생이 제출한 《${source?.title}》의 글을 함께 살펴보았습니다. “${quote}”라고 적은 부분에서 책을 읽고 떠올린 생각을 확인할 수 있습니다. 이 문장을 바탕으로 어떤 장면을 골랐는지, 그 장면에서 어떤 생각을 했는지 차례로 이야기해 보면 좋겠습니다.`
  const evidence = input.kind === "general"
    ? `전달된 피드백에서는 “${(source?.feedback || "").slice(0,130)}”라고 안내했습니다. 다음 글에서도 이러한 의견을 참고하며 자기 생각과 그 이유가 자연스럽게 이어지는지 살펴보겠습니다. 책의 장면과 자신의 경험을 구분해 적고, 두 내용을 연결하는 이유를 한 문장 덧붙이는 연습을 이어 가면 좋겠습니다.`
    : input.kind === "feedback_pending" ? "아직 선생님의 피드백을 전달하기 전이므로, 이번 안내는 학생이 제출한 글을 바탕으로 작성했습니다. 글을 다시 읽으며 가장 전하고 싶은 생각이 어느 부분인지 골라 보세요." : "다음 달에는 읽은 책에서 기억에 남은 장면 하나를 고르고, 그 장면이 기억에 남은 이유를 짧게 적는 것을 목표로 삼겠습니다. 처음부터 긴 글을 완성하려고 하기보다 한 문장씩 생각을 이어 가도 좋습니다."
  const home = "가정에서는 ‘어떤 장면이 가장 기억에 남았니?’처럼 답을 정하지 않은 질문을 건네 주세요. 아이가 고른 장면과 이유를 충분히 듣고, 말한 내용을 자기 문장으로 옮겨 적도록 격려해 주세요. 다음 달에도 글에 담긴 생각과 근거를 함께 살펴보겠습니다."
  const ending = input.kind === "feedback_pending" ? "제출한 글의 피드백은 이어서 전달드리겠습니다." : "아이의 읽기와 글쓰기를 함께 응원해 주셔서 감사합니다."
  const shortIntro = input.kind === "no_submission" ? introduction : `${input.studentName} 학생이 제출한 《${source?.title}》에서 “${quote}”라고 쓴 내용을 확인했습니다.`
  const shortGoal = input.kind === "no_submission" ? "다음 달에는 기억에 남은 장면과 그 이유를 한 문장씩 적는 것을 목표로 삼겠습니다." : "다음 글에서는 고른 장면과 자신의 생각을 이어 주는 이유를 한 문장 더 적어 보세요."
  const shortHome = "가정에서는 기억에 남는 장면을 물어보고 아이의 이야기를 충분히 들어 주세요. 말한 생각을 자기 문장으로 적도록 격려해 주시면 좋겠습니다."
  let body = options.body?.trim() || (input.kind === "general" ? [greeting, introduction, evidence, home, ending] : [greeting,shortIntro,shortGoal,shortHome,ending]).join("\n\n")
  if (options.direction === "더 따뜻하게") body = body.replace("살펴보겠습니다.", "차근차근 함께 살펴보겠습니다.").replace("연습을 이어 가면 좋겠습니다.", "아이의 속도에 맞춰 즐겁게 연습을 이어 가겠습니다.")
  if (options.direction === "다른 방식으로") { const parts=body.split(/\n\s*\n/); if(parts.length>3) body=[parts[0],...parts.slice(1,-1).reverse(),parts.at(-1)].join("\n\n") }
  if (options.direction === "더 구체적으로" && source) body = body.replace(home, `다음 글에서는 《${source.title}》에서 고른 장면, 그 장면을 고른 이유, 자신의 경험을 각각 한 문장으로 나누어 적어 보세요.\n\n${home}`)
  // Expression requests are local to this result. Facts/other students are never interpolated as evidence.
  const expression = `${options.request ?? ""} ${input.style.join(" ")}`
  if (/따뜻|부드럽/.test(expression)) body = body.replace("안내드립니다", "함께 안내드려요")
  if (/이모티콘/.test(expression) && !/사용하지|빼|없이/.test(expression)) body += " 🙂"
  const min = monthlyMinimum(input.kind), max = input.kind === "general" ? 1000 : 500
  const target = options.direction === "더 간결하게" ? Math.max(min, Math.floor(monthlyLength(options.body || body) * .75)) : max
  if (options.direction === "더 간결하게") {
    // Remove only complete supporting sentences. Preserve quotes, next-month goals, and family tips.
    const sentences=body.match(/[^.!?。]+[.!?。]+(?:[”’"])?|[^.!?。]+$/g) ?? [body]
    const protectedSentence=(text:string)=> /책글섬|[“”]|다음|가정|전달드리겠습니다|감사합니다/.test(text)
    for(let i=sentences.length-1;i>=0 && monthlyLength(sentences.join(""))>target;i--){
      if(!protectedSentence(sentences[i]) && monthlyLength(sentences.filter((_,n)=>n!==i).join(""))>=min)sentences.splice(i,1)
    }
    body=sentences.join("").trim()
  }
  const encouragement=" 아이가 떠올린 생각을 편안하게 말할 수 있도록 기다려 주시고, 말한 내용을 글로 옮기는 과정을 함께 응원해 주세요."
  while(monthlyLength(body)<min)body=body.includes(ending)?body.replace(ending,encouragement.trim()+"\n\n"+ending):body+encouragement
  const reviewSpans: MonthlyOutput["reviewSpans"] = input.kind === "no_submission" && body.includes("이번 기간에는 제출이 완료된 온라인 독후감이 아직 없습니다.") ? [{text:"이번 기간에는 제출이 완료된 온라인 독후감이 아직 없습니다.",reason:"제출 횟수 언급"}] : []
  return { body, carry: [{ text: input.kind === "no_submission" ? "기억에 남은 장면과 이유를 한 문장씩 적기" : "책 속 장면과 자기 생각을 이유로 연결하기", continued: !!input.previous?.carry.length }], kind: input.kind, composition, focus: input.kind === "no_submission" ? "다음 달 글쓰기 시작과 가정의 도움" : `《${source?.title}》의 학생 글과 다음 글쓰기 목표`, reviewSpans, peerComparison: false, teachingOutcome: false, warnings: [] }
}

export function validateMonthlyOutput(raw: unknown, input: MonthlyInput, previousComposition?: string, other = false): { output?: MonthlyOutput; issues: string[]; json: boolean } {
  let output: MonthlyOutput
  try { output = typeof raw === "string" ? JSON.parse(raw) : structuredClone(raw) } catch { return { issues: ["생성 결과 형식을 확인해 주세요."], json: false } }
  if (!output || typeof output.body !== "string" || !Array.isArray(output.carry) || !output.carry.every(i => typeof i?.text === "string" && typeof i.continued === "boolean") || !Array.isArray(output.reviewSpans) || typeof output.composition !== "string" || typeof output.focus !== "string") return { issues: ["생성 결과 형식을 확인해 주세요."], json: false }
  const issues: string[] = []
  const size = monthlyLength(output.body)
  if (size < monthlyMinimum(input.kind) || size > (input.kind === "general" ? 1000 : 500)) issues.push("생성 분량을 확인해 주세요.")
  if (output.kind !== input.kind) issues.push("메시지 유형을 확인해 주세요.")
  if (input.kind === "general" && (!monthlyCompositions.includes(output.composition) || (other && output.composition === previousComposition))) issues.push("구성 유형을 확인해 주세요.")
  if (/재등록|구독.*종료|학원.*변경|저희 학원으로 옮/.test(output.body)) issues.push("금지된 안내 표현을 확인해 주세요.")
  if (input.kind !== "general" && (output.peerComparison || output.teachingOutcome)) issues.push("피드백 전 글에는 지도 성과와 또래 비교를 사용하지 않습니다.")
  output.reviewSpans = output.reviewSpans.filter(s => typeof s?.text === "string" && s.text && output.body.includes(s.text) && ["작성 과정의 도움 여부", "부족한 점의 직접 언급", "제출 횟수 언급"].includes(s.reason))
  output.warnings = issues
  return { output, issues, json: true }
}

export function generateMonthly(input: MonthlyInput, options: Parameters<typeof mockMonthlyOutput>[1] = {}, adapter: (input: MonthlyInput, options: Parameters<typeof mockMonthlyOutput>[1]) => unknown = mockMonthlyOutput): MonthlyOutput {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = validateMonthlyOutput(adapter(input, { ...options, attempt }), input, options.previousComposition, options.direction === "다른 방식으로")
    if (result.output && (!result.issues.length || attempt === 1)) return result.output
    if (attempt === 1) throw new Error("월간 피드백 AI초안을 만들지 못했습니다. 다시 시도해 주세요.")
  }
  throw new Error("생성 결과가 없습니다.")
}
