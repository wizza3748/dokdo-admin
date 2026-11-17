import type { ReviewDatabase } from "./review-domain"
import type { ProMember } from "./pro-types"
import type { MonthlyInput, MonthlyOutput, MonthlyRecord, MonthlyDirection, MonthlyKind, MonthlySource, MonthlyEvidence } from "./pro-monthly-types"
// @ts-expect-error Node tests load TypeScript directly.
import { weekStart } from "./pro-calendar.ts"
// @ts-expect-error Node tests load TypeScript directly.
import { monthlyApplyEnding, monthlyApplyWarmth, monthlyQuestionRequest, monthlyEnding, monthlyExpressionKey, monthlyExpressionRequests, monthlyGivenName, monthlyNameWithParticle, monthlySentences } from "./pro-monthly-language.ts"

export const monthlyKinds = { general: "일반형", feedback_pending: "제출 글 기반 짧은 일반형", no_submission: "참여 안내형" }
export const monthlyCompositions = ["강점 집중형", "성장 이야기형", "솔직 진단형", "한 편 깊이 읽기형", "균형형"]
export const monthlyDirections: MonthlyDirection[] = ["더 간결하게", "더 구체적으로", "더 따뜻하게", "다른 방식으로"]
export const plainMonthlyText = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim()
export const monthlyLength = (value: string) => [...value.replace(/[\r\n]/g, "")].length
export const monthlyMinimum = (kind: MonthlyKind) => kind === "general" ? 450 : 300
export const canShortenMonthly = (kind: MonthlyKind, body: string) => monthlyLength(body) > (kind === "general" ? 500 : 350)

/** Rule-driven prototype adapter, not an AI integration or a claim of complete language understanding. */
export const MONTHLY_PROMPT_RULES = {
  version: "1.4 + 공통 명세 입력·출력 보완 / 모의 생성 2026-11-17",
  greeting: "책글섬 독도 관리 선생님입니다.",
  priority: ["본사 지침", "해당 학생·관리월의 직접 요청", "학원 말투 메모", "학원 발송본 예시"],
  excludedInputs: ["학부모 관심사", "관리 메모", "학원명", "선생님 이름"],
  rules: ["전송 전 피드백은 빈 값", "이전 학원 지도 성과를 현재 학원 성과로 서술하지 않음", "짧은 일반형·참여 안내형 유형 유지", "일반형만 구성 중복 검사", "종료·재등록 안내 없음", "본문과 정확히 일치하는 검토 표시만 사용"],
}

export function monthlyInput(db: ReviewDatabase, member: ProMember, record: Pick<MonthlyRecord, "periodStart" | "periodEnd" | "month" | "id">): MonthlyInput {
  const pro = db.pro!, start = record.periodStart, end = record.periodEnd
  const inside = (at?: string) => !!at && at >= start && at < end
  const sources: MonthlyInput["sources"] = [], writings: NonNullable<MonthlyInput["writings"]> = []
  for (const c of pro.cases.filter(c => c.studentId === member.id)) {
    const review = db.reviews.find(r => r.id === c.reviewId)
    if (!review) continue
    const records = db.records.filter(r => r.reviewId === c.reviewId)
    const valid = records.filter(r => r.writingStatus === "submitted" && r.submittedAt && r.submittedAt < end && !(r.round === 2 && c.secondDeadline && r.submittedAt >= c.secondDeadline))
    const included = valid.filter(r => inside(r.submittedAt) || inside(r.sentAt))
    if (!included.length) continue
    const first = valid.find(r => r.round === 1), revised = included.find(r => r.round === 2)
    const status = revised ? "done_revised" : c.secondDeadline ? c.secondDeadline <= end ? "revision_missed" : "revising" : "done_first"
    for (const r of [...included, ...(revised && first && !included.includes(first) ? [first] : [])]) {
      const sentAt = r.sentAt && r.sentAt < end ? r.sentAt : undefined
      const snapshot = sentAt && c.finalSnapshots.find(s => s.recordId === r.id && s.at === sentAt)
      sources.push({ recordId: r.id, reviewId: c.reviewId, title: review.bookTitle, level: review.level, writingType: review.template.title,
        round: r.round, submittedAt: r.submittedAt!, sentAt, body: plainMonthlyText(snapshot ? snapshot.body : r.finalBody || r.body),
        feedback: sentAt ? plainMonthlyText(snapshot ? snapshot.feedback : r.feedback) : "",
        itemFeedback: sentAt ? r.itemFeedback.filter(i => i.visible).map(i => plainMonthlyText(i.text)) : [],
        scores: sentAt ? r.teacherScores : undefined, report: sentAt ? snapshot ? snapshot.report : r.report : undefined,
        reportFeedback: sentAt ? r.reportFeedback : undefined, institutionId: sentAt ? c.institutionId : undefined,
        is_current_academy: sentAt ? c.institutionId === member.institutionId : null,
        round_status: !sentAt ? "feedback_pending" : status, comparisonOnly: !included.includes(r) })
    }
    writings.push({ reviewId: c.reviewId, firstRecordId: first?.id, revisedRecordId: revised?.id, status })
  }
  sources.sort((a,b) => a.submittedAt.localeCompare(b.submittedAt) || a.recordId.localeCompare(b.recordId))
  const kind: MonthlyKind = sources.some(s => !s.comparisonOnly && inside(s.sentAt)) ? "general" : sources.some(s => !s.comparisonOnly && inside(s.submittedAt)) ? "feedback_pending" : "no_submission"
  const earlier = pro.monthly?.records.filter(r => r.studentId === member.id && r.month < record.month) ?? []
  const previous = earlier.filter(r => r.sent).sort((a,b) => b.month.localeCompare(a.month))[0]
  const previousGeneration = previous?.generations.find(g => g.id === previous.sent?.sourceId)
  const style = pro.monthly?.styles.find(s => s.institutionId === member.institutionId), useStyle = !!style?.enabled && style.sentIds.length >= 3
  const name = monthlyGivenName(member.name)
  return { studentName: name, studentFullName: member.name, parentSalutation: `${monthlyNameWithParticle(name)} 부모님`, isFirst: !earlier.length,
    level: sources.filter(s=>!s.comparisonOnly).at(-1)?.level ?? member.level, periodStart: start, periodEnd: end, kind, sources, writings,
    submittedWeeks: new Set(sources.filter(s => !s.comparisonOnly && inside(s.submittedAt)).map(s => weekStart(s.submittedAt))).size,
    totalWeeks: Math.max(1, Math.ceil((Date.parse(end) - Date.parse(weekStart(start))) / (7 * 86400000))),
    previous: previous?.sent ? { body: previous.sent.body, carry: structuredClone(previous.sent.carry), composition: previousGeneration?.composition ?? "", peerComparison: previousGeneration?.peerComparison ?? false, teachingOutcome: previousGeneration?.teachingOutcome ?? false } : undefined,
    style: useStyle ? style.items.map(i => i.text) : [],
    examples: useStyle ? (pro.monthly?.records ?? []).filter(r => r.id !== record.id && r.sent && r.sent.institutionId === member.institutionId).sort((a,b) => b.sent!.recordedAt.localeCompare(a.sent!.recordedAt)).slice(0,2).map(r => r.sent!.body) : [] }
}

type GenerateOptions = { direction?: MonthlyDirection; request?: string; body?: string; previousComposition?: string; attempt?: number }
const goalRules = [
  { key: "reason", terms: /이유|왜냐|까닭|근거/, goal: "고른 장면과 생각의 이유를 연결하기", instruction: "느낀 점 뒤에 책 속 장면을 근거로 이유를 붙여 쓰도록", action: "책에서 고른 장면을 짧게 적은 다음, 그 장면을 보고 그렇게 생각한 까닭을 이어 쓰는", question: "주인공은 왜 그렇게 행동했을까?", feature: /(?:왜냐하면|때문|까닭|그래서).{8,}|나라면.{8,}(?:이유|때문)/ },
  { key: "experience", terms: /경험|연결/, goal: "책 속 상황과 자신의 경험을 구체적으로 연결하기", instruction: "책 속 상황과 비슷한 경험을 구체적으로 연결하도록", action: "책의 상황과 비슷했던 경험을 떠올리고, 그때의 상황과 마음을 구분해 적는", question: "너도 비슷한 일을 겪은 적이 있을까?", feature: /(?:나도|나는|내가).{8,}(?:친구|학교|가족|경험).{8,}/ },
  { key: "scene", terms: /장면|구체|묘사/, goal: "인물의 행동과 마음을 구체적인 장면으로 설명하기", instruction: "인물의 행동과 마음이 드러나도록 장면을 구체적으로 적도록", action: "인물이 한 행동을 먼저 쓰고, 그때 어떤 마음이었을지 책의 장면을 들어 설명하는", question: "그 장면에서 인물은 어떤 마음이었을까?", feature: /(?:행동|말|손|표정).{8,}(?:마음|느꼈|생각|용기)/ },
  { key: "summary", terms: /순서|요약|줄거리|정리/, goal: "중요한 사건을 순서와 까닭에 맞춰 요약하기", instruction: "중요한 사건을 순서와 까닭에 맞춰 간결하게 정리하도록", action: "처음과 끝을 잇는 중요한 사건을 골라 순서대로 적고, 사건 사이의 까닭을 한 문장으로 설명하는", question: "어떤 일이 먼저 일어났고 그다음에는 어떻게 됐을까?", feature: /처음.{6,}(?:다음|그 뒤|마지막).{6,}/ },
  { key: "vocabulary", terms: /어휘|낱말|단어/, goal: "책에서 고른 낱말을 상황에 맞는 문장에 사용하기", instruction: "책에서 고른 낱말의 뜻을 살려 문장을 쓰도록", action: "책에서 인상 깊은 낱말을 하나 고르고, 그 뜻이 드러나는 새로운 문장을 쓰는", question: "이 낱말을 다른 상황에서 쓰면 어떤 문장이 될까?", feature: /(?:낱말|단어|뜻).{8,}(?:문장|상황).{5,}/ },
] as const
const goalFor = (text: string) => goalRules.find(rule => rule.terms.test(text))
const quoteFor = (body: string) => {
  const sentences = monthlySentences(body)
  return sentences.find(s => s.length >= 12 && s.length <= 140 && /이유|때문|경험|나라면|그래서|왜냐/.test(s)) ??
    sentences.find(s => s.length >= 5 && s.length <= 140) ?? sentences[0] ?? ""
}
const sourceText = (s: MonthlySource) => [s.feedback, ...s.itemFeedback, s.reportFeedback].filter(Boolean).join(" ")
const sourceRef = (s: MonthlySource, field: MonthlyEvidence["references"][number]["field"], quote: string) => ({ recordId: s.recordId, field, quote })
const feedbackRefs = (s:MonthlySource,terms:RegExp) => [
  ...(s.feedback&&terms.test(s.feedback)?[sourceRef(s,"feedback",s.feedback)]:[]),
  ...s.itemFeedback.filter(text=>terms.test(text)).map(text=>sourceRef(s,"itemFeedback",text)),
  ...(s.reportFeedback&&terms.test(s.reportFeedback)?[sourceRef(s,"reportFeedback",s.reportFeedback)]:[]),
]
const sourceLabel = (s: MonthlySource, field: string) => `『${s.title}』 / ${field === "body" ? s.round === 2 ? "고쳐 쓴 글" : "처음 쓴 글" : field === "itemFeedback" ? "항목별 피드백" : field === "reportFeedback" ? "평가 의견" : "요약 피드백"}`
const noSubmissionSentence = "이번 기간에는 제출이 완료된 온라인 독후감이 아직 없습니다."

function analyzeMonthly(input: MonthlyInput) {
  const sources = input.sources.filter(s => !s.comparisonOnly)
  const feedbacks = sources.filter(s => s.sentAt && sourceText(s))
  const scores = goalRules.map(rule => ({ rule, count: feedbacks.filter(s => rule.terms.test(sourceText(s))).length })).sort((a,b)=>b.count-a.count)
  const goal = scores[0]?.count ? scores[0].rule : goalRules[0]
  const selected = sources.find(s => goal.feature.test(s.body)) ?? feedbacks.find(s=>goal.terms.test(sourceText(s))) ?? sources[0]
  const revised = sources.find(s => s.round === 2 && goal.feature.test(s.body) && input.sources.some(first => first.reviewId === s.reviewId && first.round === 1 && !goal.feature.test(first.body) && goal.terms.test(sourceText(first))))
  const before = revised && input.sources.find(s => s.reviewId === revised.reviewId && s.round === 1)
  const next = !input.isFirst && !revised && sources.find(s => goal.feature.test(s.body) && feedbacks.some(first => first.submittedAt < s.submittedAt && !goal.feature.test(first.body) && goal.terms.test(sourceText(first))))
  const comparison = next && feedbacks.find(s=>s.submittedAt<next.submittedAt && !goal.feature.test(s.body) && goal.terms.test(sourceText(s)))
  // A comparison needs the applicable level's concrete criterion and an exact student quotation.
  const peerQuote=(s:MonthlySource)=>monthlySentences(s.body).find(text=>text.length<=140&&(s.level <= 2 ? /(?:왜냐하면|그래서|때문).{8,}/.test(text) :
      s.level === 3 ? /(?:나도|나는|내가).{8,}(?:경험|친구|학교).{8,}/.test(text) :
      s.level === 4 ? /(?:성격|용기|배려|공정).{5,}(?:행동|때문|모습)/.test(text) :
      /(?:다른 관점|출처|믿을|믿기|더 찾아).{8,}/.test(text)))
  const peerSource = sources.find(s=>peerQuote(s))
  const peerCriterion = peerSource ? peerSource.level <= 2 ? "1~2레벨 · 감상을 느낌으로만 끝내기 → 장면에 이유를 붙여 설명하기" : peerSource.level === 3 ? "3레벨 · 막연한 경험 연결 → 구체적인 상황과 자기 경험 연결" : peerSource.level === 4 ? "4레벨 · 줄거리 나열 → 인물의 성격을 행동으로 설명하기" : "5~6레벨 · 요약과 반복 → 관점·출처를 따지고 탐구로 확장하기" : undefined
  return { sources, feedbacks, goal, selected, after: revised || next || undefined, before: before || comparison || undefined, peerSource, peerQuote:peerSource?peerQuote(peerSource):undefined, peerCriterion, repeated: scores[0]?.count >= 2 && !sources.some(s=>goal.feature.test(s.body)) }
}
function uniqueVariant(variants: string[], previous = "") { return variants.find(text => !previous.includes(text)) ?? variants[0] }

function shortenMonthly(body: string, kind: MonthlyKind) {
  const minimum = monthlyMinimum(kind), target = Math.max(minimum, Math.floor(monthlyLength(body) * .75))
  const paragraphs = body.split(/\n\s*\n/).map(p => monthlySentences(p))
  const protectedSentence = (s: string) => /부모님|책글섬|[“”『』]|다음|가정|댁에서|피드백.*전|감사|함께 살펴|한 주에/.test(s)
  for (let p=paragraphs.length-1; p>=0; p--) for(let i=paragraphs[p].length-1; i>=0; i--) {
    if (monthlyLength(paragraphs.map(s=>s.join(" ")).join("\n\n")) <= target) break
    if (protectedSentence(paragraphs[p][i])) continue
    const candidate = paragraphs.map((items,pi)=>items.filter((_,si)=>pi!==p||si!==i).join(" ")).filter(Boolean).join("\n\n")
    if (monthlyLength(candidate)>=minimum) paragraphs[p].splice(i,1)
  }
  return paragraphs.map(items=>items.join(" ")).filter(Boolean).join("\n\n")
}

export function mockMonthlyOutput(input: MonthlyInput, options: GenerateOptions = {}): MonthlyOutput {
  const a = analyzeMonthly(input), source = a.selected, quote = source ? quoteFor(source.body) : ""
  const notes: string[] = [], evidence: MonthlyEvidence[] = []
  const full = input.studentFullName ?? input.studentName, name = input.studentFullName ? input.studentName : monthlyGivenName(input.studentName)
  const call = input.parentSalutation ?? `${monthlyNameWithParticle(name)} 부모님`
  const previous = input.previous?.body ?? ""
  const greeting = `${call}, ${uniqueVariant(["안녕하세요.", "반갑습니다."],previous)} ${MONTHLY_PROMPT_RULES.greeting}`
  const ending = input.kind === "feedback_pending" ? "제출한 글의 피드백은 이어서 전달드리겠습니다." : uniqueVariant(["궁금하신 점은 편하게 말씀해 주세요. 다음 글도 꼼꼼히 살펴보겠습니다.", "글을 읽으며 떠오른 질문이 있다면 함께 나눠 주세요. 다음 글에서도 차근차근 살피겠습니다."],previous)
  const growth = !!a.before && !!a.after
  const eligible = [a.peerSource && "강점 집중형", growth && "성장 이야기형", a.repeated && "솔직 진단형", "한 편 깊이 읽기형", "균형형"].filter((v):v is string=>!!v)
  const avoid = new Set([input.previous?.composition, options.direction === "다른 방식으로" ? options.previousComposition : undefined])
  let composition = input.kind === "general" ? eligible.find(v=>!avoid.has(v)) ?? eligible.find(v=>v!==options.previousComposition)! : monthlyKinds[input.kind]
  if (input.kind === "general" && options.direction !== "다른 방식으로" && options.previousComposition && eligible.includes(options.previousComposition)) composition=options.previousComposition
  if (input.kind === "general" && composition === input.previous?.composition) notes.push("이번 자료로 확인할 수 있는 구성이 제한되어 지난 발송본과 같은 구성을 사용했습니다.")
  const addEvidence = (point: string, references: MonthlyEvidence["references"], criterion?: string) => evidence.push({ point, source: references.map(ref=>{const s=input.sources.find(s=>s.recordId===ref.recordId)!;return sourceLabel(s,ref.field)}).join(" · "), references, criterion })
  const interpretation = a.goal.feature.test(quote) ? `고른 장면에 자신의 설명을 더해 생각을 전한 부분입니다.` : "책에서 기억에 남은 내용을 자신의 말로 골라 적은 부분입니다."
  let observation = source ? `이번에는 『${source.title}』에서 쓴 “${quote}”라는 문장을 함께 살펴보았습니다. ${interpretation}` : ""
  if(source) addEvidence(observation,[sourceRef(source,"body",quote)])
  let guidance = ""
  if (input.kind === "general" && a.feedbacks.length) {
    const teacherSource = a.feedbacks.find(s=>a.goal.terms.test(sourceText(s))) ?? a.feedbacks[0]
    const direct = teacherSource.is_current_academy === true
    guidance = direct ? `${a.goal.instruction} 지도했었습니다.` : `그동안 받은 피드백에서 ${a.goal.goal.replace(/하기$/,"하는 점")}을 짚었습니다.`
    const teacherRefs=feedbackRefs(teacherSource,a.goal.terms)
    if(teacherRefs.length)addEvidence(guidance,teacherRefs)
    if (composition === "성장 이야기형" && a.before && a.after) {
      const beforeQuote=quoteFor(a.before.body),afterQuote=quoteFor(a.after.body)
      const change=`『${a.before.title}』의 처음 쓴 글에서는 “${beforeQuote}”라고 적었는데, ${a.after.round===2?"고쳐 쓴 글":`『${a.after.title}』의 다음 글`}에는 “${afterQuote}”라고 적었습니다. ${a.goal.goal.replace(/하기$/,"하는 표현")}이 글에 더해졌습니다.`
      observation = `${guidance} ${change}`
      addEvidence(change,[sourceRef(a.before,"body",beforeQuote),sourceRef(a.after,"body",afterQuote)])
      guidance = "두 글의 차이를 직접 짚으며 어떤 내용을 더 적으면 생각이 분명해지는지 확인하겠습니다."
    } else if (composition === "솔직 진단형") {
      guidance += ` ${a.goal.goal.replace(/하기$/,"하는 설명")}은 아직 부족합니다. 책의 한 장면을 고른 뒤 어떤 말을 더하면 이해하기 쉬울지 나누어 연습하겠습니다.`
      addEvidence(guidance,a.feedbacks.flatMap(s=>feedbackRefs(s,a.goal.terms)))
    } else {
      guidance += ` 글을 다시 읽을 때는 ${a.goal.action} 방법으로 생각을 구체화해 보겠습니다. 이미 적은 표현을 지우기보다 설명이 필요한 곳을 찾아 한 문장씩 덧붙이도록 돕겠습니다.`
    }
  }
  const usedPeer = input.kind==="general" && composition==="강점 집중형" && !!a.peerSource && !input.previous?.peerComparison
  if(usedPeer && a.peerSource) {
    const q=a.peerQuote!
    observation=`비슷한 단계의 아이들은 ${a.peerSource.level<=2?"감상을 느낌만 적고 마치는 경우가 많은데":a.peerSource.level===3?"경험을 짧게 언급하고 끝내기 쉬운데":a.peerSource.level===4?"책의 줄거리를 차례로 나열하기 쉬운데":"책 내용을 요약하고 마무리하기 쉬운데"}, ${monthlyNameWithParticle(name)}는 『${a.peerSource.title}』에서 “${q}”라고 적었습니다. ${a.peerSource.level<=2?"자신의 생각에 까닭을 붙여 설명했습니다":a.peerSource.level===3?"자신의 경험을 책 속 내용과 구체적으로 연결했습니다":a.peerSource.level===4?"인물의 행동을 들어 성격을 설명했습니다":"책 밖의 정보와 다른 관점으로 생각을 넓혔습니다"}.`
    addEvidence(observation,[sourceRef(a.peerSource,"body",q)],a.peerCriterion)
  }
  const usedTeaching=input.kind==="general"&&growth&&!!a.before?.is_current_academy&&!input.previous?.teachingOutcome
  if(usedTeaching && a.before && a.after) {
    const point=`피드백에서 짚었던 ${a.goal.goal.replace(/하기$/,"하는 점")}이 뒤에 쓴 글에 반영되었습니다.`
    guidance+=" "+point
    addEvidence(point,[...feedbackRefs(a.before,a.goal.terms),sourceRef(a.before,"body",quoteFor(a.before.body)),sourceRef(a.after,"body",quoteFor(a.after.body))])
  }
  const previousCarry = input.previous?.carry ?? []
  const related=previousCarry.find(c=>goalFor(c.text)?.key===a.goal.key)
  const completed=related && !!a.after && a.goal.feature.test(a.after.body)
  const carryGoal=input.kind==="no_submission"?"기억에 남은 장면과 이유를 한 문장씩 적기":completed?"읽는 사람이 궁금해할 점을 질문으로 덧붙이기":related?.text??a.goal.goal
  const continued=input.kind!=="no_submission"&&!!related&&!completed
  let plan = continued ? `지난 발송 때 정한 ‘${related!.text}’는 이번 글의 내용을 바탕으로 다음 달에도 이어 보겠습니다.` : `다음 달에는 ${completed?"읽는 사람이 궁금해할 점을 질문으로 덧붙이는":a.goal.action} 연습에 집중하겠습니다.`
  if(continued && source) addEvidence(plan,[sourceRef(source,"body",quote)])
  if(input.submittedWeeks>0 && input.submittedWeeks<=input.totalWeeks/2) plan+=" 한 주에 한 편씩, 짧은 글이라도 생각을 끝까지 적는 리듬을 함께 만들어 보겠습니다."
  let home=uniqueVariant([`가정에서는 책을 읽은 뒤 ‘${a.goal.question}’ 하고 물어봐 주세요. 아이가 고른 장면과 그 생각을 충분히 듣고, 말로 설명한 내용을 글에 옮길 수 있도록 기다려 주세요.`,`댁에서는 ‘${a.goal.question}’라는 질문으로 책 이야기를 나눠 보셔도 좋겠습니다. 답을 미리 정하지 않고 아이의 말을 들은 다음, 스스로 한 문장으로 적어 보도록 도와주세요.`],previous)
  if(input.kind==="no_submission") {
    observation=`${noSubmissionSentence} 글에 담긴 생각을 전해 드리기는 어려워, 다음 글을 시작할 때 함께 해 볼 방법을 말씀드립니다. 제출하지 않은 이유나 아이의 마음을 미리 짐작하지 않고, 읽은 책에서 편하게 꺼낼 수 있는 이야기부터 듣겠습니다.`
    plan="다음 달에는 기억에 남은 장면과 그 이유를 한 문장씩 적는 것을 목표로 삼겠습니다. 긴 글을 한 번에 완성하기보다, 말로 먼저 나눈 생각을 자기 문장으로 옮기며 시작해 보겠습니다."
    home=uniqueVariant(["가정에서는 책을 덮은 뒤 가장 기억에 남는 장면을 물어봐 주세요. 답을 고치기보다 왜 그 장면을 골랐는지 충분히 듣고, 아이가 쓸 내용을 스스로 정하도록 도와주세요.","댁에서는 읽은 이야기에서 다시 보고 싶은 장면을 함께 찾아 주세요. 장면에 대한 아이의 이야기를 들은 다음 짧게 적어 보는 시간을 마련해 주시면 좋겠습니다."],previous)
    if(options.direction==="다른 방식으로") {
      observation=`${noSubmissionSentence} 아직 글에서 확인할 수 있는 자료가 없어, 아이가 읽고 떠올린 이야기를 자기 말로 꺼내는 일부터 시작하려 합니다. 쓰기 어려운 까닭을 짐작하기보다는 편하게 이야기할 수 있는 장면을 직접 고르게 하겠습니다.`
      plan="다음 달에는 고른 장면과 그 이유를 말로 나눈 뒤 한 문장씩 적어 보겠습니다. 완성할 글의 길이를 먼저 정하기보다, 아이가 전하고 싶은 생각을 스스로 고르고 마무리하는 작은 경험을 쌓도록 돕겠습니다."
    }
  }
  if(input.kind==="feedback_pending") guidance=""
  if(composition==="한 편 깊이 읽기형" && source) observation+=` 『${source.title}』의 어떤 내용이 이 표현으로 이어졌는지 책의 장면과 나란히 읽어 보겠습니다. 학생이 고른 말에서 출발해 설명을 더할 부분을 찾으면, 글 전체를 막연하게 늘리는 부담도 줄일 수 있습니다.`
  if(composition==="균형형" && source) observation+=` 이 부분에서 고른 내용은 살리고, 읽는 사람이 더 궁금해할 설명은 무엇인지 함께 찾아보겠습니다.`
  let body=[greeting,observation,guidance,plan,home,ending].filter(Boolean).join("\n\n")
  if(input.kind==="feedback_pending") body=[greeting,source?options.direction==="다른 방식으로"?`『${source.title}』의 글에서 함께 이어 볼 부분을 골랐습니다. “${quote}”라는 문장입니다. 이 표현을 바탕으로 어떤 장면을 떠올렸는지, 그 장면에 관한 자기 생각은 무엇인지 나누어 살펴보겠습니다.`:`『${source.title}』에서 “${quote}”라고 쓴 내용을 읽었습니다. ${interpretation} 어떤 생각을 전하고 싶은지 책의 장면과 함께 살펴볼 수 있습니다.`:"",plan,home,ending].filter(Boolean).join("\n\n")
  // Preserve a teacher's edited body for targeted requests and shortening; other-direction rebuilds the argument.
  if(options.body?.trim() && options.direction!=="다른 방식으로") body=options.body.trim()
  if(a.feedbacks.length && a.feedbacks.every(s=>s.is_current_academy===false)) {
    body=body.replace(/[^\n.!?]*지도했었습니다\./g,`그동안 받은 피드백에서는 ${a.goal.goal.replace(/하기$/,"하는 점")}을 짚었습니다.`)
      .replace(/전달된 피드백에서는/g,"그동안 받은 피드백에는").replace(/라고 안내했습니다\./g,"라는 의견이 담겨 있습니다.")
      .replace(/피드백에서 짚었던[^.!?]*뒤에 쓴 글에 반영되었습니다\./g,"")
  }
  if(options.direction==="더 구체적으로" && source) body=body.replace(/(?:다음 달에는|다음 글에서는)[^\n]+/,`다음 글에서는 『${source.title}』의 고른 장면, ${a.goal.action} 순서를 나누어 확인하겠습니다. 먼저 책 속 사실을 한 문장으로 적고 그 뒤에 자신의 생각을 이어 붙여 보겠습니다.`)
  const request=options.request?.trim()??""
  const requestExpressions=monthlyExpressionRequests([request,options.direction==="더 따뜻하게"?"말투를 더 따뜻하게":""].join("\n"))
  const preferences=new Map<string,string>()
  const exampleEnding=monthlyEnding(input.examples.slice(0,2).join("\n"))
  if(exampleEnding) preferences.set("ending",exampleEnding==="casual"?"부드러운 해요체로 안내합니다.":"정중한 습니다체로 안내합니다.")
  for(const item of input.style) { const key=monthlyExpressionKey(item);if(key)preferences.set(key,item) }
  for(const item of requestExpressions)preferences.set(item.key,item.text)
  const requestedQuestion=monthlyQuestionRequest(request)
  if(requestedQuestion && !forbiddenMonthly(requestedQuestion.question).length) {
    body=body.replace(/(?:가정에서는|댁에서는)[^\n]+/, paragraph => {
      if (!requestedQuestion.append) return `가정에서는 ‘${requestedQuestion.question}’ 하고 물어봐 주세요. 아이의 답을 충분히 들은 뒤, 말한 생각을 한 문장으로 직접 적어 보도록 도와주세요.`
      if (paragraph.includes(requestedQuestion.question)) return paragraph
      const [first, ...rest] = monthlySentences(paragraph)
      return [first, `‘${requestedQuestion.question}’도 함께 물어봐 주세요.`, ...rest].join(" ")
    })
  }
  const replacements=[...request.matchAll(/[‘“"']([^‘’“”"']+)[’”"'](?:을|를)\s*[‘“"']([^‘’“”"']+)[’”"'](?:로|으로)/g)]
  for(const match of replacements) {
    if(!forbiddenMonthly(match[2]).length && body.includes(match[1]) && !input.sources.some(s=>s.body.includes(match[1]))) body=body.replaceAll(match[1],match[2])
    else notes.push("입력 자료의 인용이나 본사 작성 기준과 충돌하는 교체 요청은 반영하지 않았습니다.")
  }
  if(/그림 이모(?:지|티콘)|이모지|\p{Extended_Pictographic}/u.test(request) && !/빼|없이|사용하지|넣지|제외/.test(request)) notes.push("그림 이모지는 본사 기준에 따라 넣지 않았습니다. 문자 이모티콘은 한 번만 사용할 수 있습니다.")
  if(forbiddenMonthly(request).length) notes.push("본사 작성 기준과 충돌하는 요청은 반영하지 않았습니다.")
  body=body.replace(/^.*?책글섬 독도 관리 선생님입니다\./,greeting).replaceAll("《","『").replaceAll("》","』")
  if(full!==name) body=body.replaceAll(`${full} 학생`,`${name} 학생`)
  body=monthlyApplyEnding(body,/해요체/.test(preferences.get("ending")??""))
  if(preferences.get("warmth")?.includes("따뜻")) body=monthlyApplyWarmth(body)
  body=body.replace(/\p{Extended_Pictographic}[\uFE0F\u200D]?/gu,"").replace(/\^\^/g,"").trim()
  if(preferences.get("emoticon")?.includes("한 번")) body+=" ^^"
  if(options.direction==="더 간결하게" || preferences.get("length")?.includes("간결")) body=shortenMonthly(body,input.kind)
  // Add a source-specific reading step only when brief evidence leaves the message below the allowed minimum.
  if(monthlyLength(body)<monthlyMinimum(input.kind) && source) body=body.replace(ending,`『${source.title}』에서 직접 고른 표현을 다시 읽고, 책에 적힌 내용과 자신의 생각을 구분해 말해 보도록 돕겠습니다. ${a.goal.action} 순서로 점검하면 어느 부분에 설명을 더할지 스스로 찾는 데 도움이 되겠습니다.\n\n${ending}`)
  if(monthlyLength(body)<monthlyMinimum(input.kind)) notes.push("자료에 비해 분량이 짧습니다. 본문과 자료를 함께 확인해 주세요.")
  const reviewSpans: MonthlyOutput["reviewSpans"]=[]
  for(const s of monthlySentences(body)) {
    const reason=/혹시.*도움|쓰는 과정.*도움/.test(s)?"작성 과정의 도움 여부":/아직.*부족/.test(s)?"부족한 점의 직접 언급":/제출.*(?:없|한 편|두 편)|글을.*한 편/.test(s)?"제출 횟수 언급":undefined
    if(reason)reviewSpans.push({text:s,reason})
  }
  // Targeted regeneration can preserve old prose. Bind each remaining exact quote back to its immutable input.
  const retained=evidence.map(e=>({...e,point:monthlyApplyEnding(e.point,/해요체/.test(preferences.get("ending")??""))})).filter(e=>body.includes(e.point))
  for(const match of body.matchAll(/“([^”]+)”/g)) {
    const s=input.sources.find(s=>s.body.includes(match[1]))
    const point=monthlySentences(body).find(sentence=>sentence.includes(match[0]))??match[0]
    if(s&&!retained.some(e=>e.point===point||e.references.some(ref=>ref.recordId===s.recordId&&ref.field==="body"&&ref.quote===match[1])))retained.push({point,source:sourceLabel(s,"body"),references:[sourceRef(s,"body",match[1])]})
  }
  return {body,carry:[{text:carryGoal,continued}],kind:input.kind,composition,focus:input.kind==="no_submission"?"다음 글을 시작할 작은 목표":a.goal.goal,
    evidence:retained,reviewSpans:reviewSpans.slice(0,3),peerComparison:usedPeer&&/비슷한 단계/.test(body),teachingOutcome:usedTeaching&&/뒤에 쓴 글에 반영/.test(body),
    notesForTeacher:[...new Set(notes)],warnings:[],charCount:monthlyLength(body),promptVersion:MONTHLY_PROMPT_RULES.version}
}

export function forbiddenMonthly(body: string): string[] {
  const issues:string[]=[]
  if(/\p{Extended_Pictographic}|[【】■▶※]|^\s*(?:[-*•]|\d+[.)])\s/gmu.test(body))issues.push("그림 이모지·글머리 기호를 확인해 주세요.")
  if((body.match(/\^\^/g)??[]).length>1)issues.push("문자 이모티콘은 한 번만 사용할 수 있습니다.")
  if(/관리월|권수|차감|자동 선정|피드백 신청|[12]차|섬초롱꽃|\bAI\b|인공지능|자동 생성|점수|등급|순위/.test(body))issues.push("내부 용어와 점수·등급 표현을 확인해 주세요.")
  if(/(?:\d+|[한두세네다섯여섯]+)\s*편\s*(?:중|가운데)|공통으로 나타|분석해 보면|분석 결과|로 확인됩니다|한 셈입니다|피드백이.*짚/.test(body))issues.push("통계·보고서 표현을 확인해 주세요.")
  if(/재등록|구독.*종료|학원.*변경|저희 학원으로 옮/.test(body))issues.push("금지된 안내 표현을 확인해 주세요.")
  return issues
}
export function validateMonthlyOutput(raw: unknown, input: MonthlyInput, previousComposition?: string, other=false): {output?:MonthlyOutput;issues:string[];json:boolean} {
  let output:MonthlyOutput
  try {output=typeof raw==="string"?JSON.parse(raw):structuredClone(raw)}catch{return{issues:["생성 결과 형식을 확인해 주세요."],json:false}}
  if(!output||typeof output.body!=="string"||!Array.isArray(output.carry)||!output.carry.every(i=>typeof i?.text==="string"&&typeof i.continued==="boolean")||!Array.isArray(output.reviewSpans)||typeof output.composition!=="string"||typeof output.focus!=="string"||typeof output.peerComparison!=="boolean"||typeof output.teachingOutcome!=="boolean")return{issues:["생성 결과 형식을 확인해 주세요."],json:false}
  if(output.notesForTeacher!==undefined&&(!Array.isArray(output.notesForTeacher)||output.notesForTeacher.some(n=>typeof n!=="string")))return{issues:["생성 결과 형식을 확인해 주세요."],json:false}
  const issues=forbiddenMonthly(output.body),size=monthlyLength(output.body)
  if(size<monthlyMinimum(input.kind)||size>(input.kind==="general"?1000:500))issues.push("생성 분량을 확인해 주세요.")
  if(output.kind!==input.kind)issues.push("메시지 유형을 확인해 주세요.")
  if(input.kind==="general"&&(!monthlyCompositions.includes(output.composition)||(other&&output.composition===previousComposition)))issues.push("구성 유형을 확인해 주세요.")
  if(input.kind==="general"&&output.composition===input.previous?.composition&&!output.notesForTeacher?.some(n=>/같은 구성/.test(n)))issues.push("지난 발송본과 같은 구성입니다. 다른 구성 또는 선택 이유를 확인해 주세요.")
  if(input.kind!=="general"&&(output.composition!==monthlyKinds[input.kind]||output.peerComparison||output.teachingOutcome))issues.push("메시지 유형의 구성과 지도 성과·또래 비교를 확인해 주세요.")
  const a=analyzeMonthly(input)
  if(output.composition==="성장 이야기형"&&(!a.after||!a.before))issues.push("성장 내용을 뒷받침하는 전후 자료를 확인해 주세요.")
  if(output.peerComparison&&(!a.peerSource||!Array.isArray(output.evidence)||!output.evidence.some(e=>e?.criterion&&Array.isArray(e.references)&&e.references.length)))issues.push("또래 비교의 도서 레벨 기준과 학생 글 근거를 확인해 주세요.")
  if(output.peerComparison&&input.previous?.peerComparison)issues.push("지난 발송본에서 사용한 또래 비교가 반복되는지 확인해 주세요.")
  if(output.teachingOutcome&&(!a.before?.is_current_academy||!a.after||input.previous?.teachingOutcome))issues.push("현재 학원의 지도와 변화 근거를 확인해 주세요.")
  if(input.kind==="no_submission"&&/“[^”]+”/.test(output.body))issues.push("참여 안내형에는 학생 글을 인용하지 않습니다.")
  if(input.kind!=="no_submission")for(const match of output.body.matchAll(/“([^”]+)”/g))if(!input.sources.some(s=>s.body.includes(match[1])||s.feedback.includes(match[1])||s.itemFeedback.some(text=>text.includes(match[1]))||s.reportFeedback?.includes(match[1])))issues.push("인용 문장이 입력 자료와 일치하는지 확인해 주세요.")
  if(input.kind!=="no_submission"&&input.sources.length&&!input.sources.some(s=>output.body.includes(`『${s.title}』`)))issues.push("본문의 도서명 표기를 확인해 주세요.")
  if(output.reviewSpans.length>3)issues.push("검토 표시 문장은 세 개까지 사용할 수 있습니다.")
  output.reviewSpans=output.reviewSpans.filter(s=>typeof s?.text==="string"&&s.text&&output.body.includes(s.text)&&["작성 과정의 도움 여부","부족한 점의 직접 언급","제출 횟수 언급"].includes(s.reason)).slice(0,3)
  if(output.evidence && (!Array.isArray(output.evidence)||output.evidence.some(e=>typeof e?.point!=="string"||typeof e.source!=="string"||!Array.isArray(e.references)||e.references.some(ref=>!ref||typeof ref.recordId!=="string"||typeof ref.quote!=="string"||!["body","feedback","itemFeedback","reportFeedback"].includes(ref.field)))))return{issues:["생성 근거 형식을 확인해 주세요."],json:false}
  for(const e of output.evidence??[]) {
    if(!output.body.includes(e.point))issues.push("생성 근거의 주장과 본문을 확인해 주세요.")
    for(const ref of e.references) {
      const s=input.sources.find(s=>s.recordId===ref.recordId),value=s?.[ref.field]
      if(!ref.quote||!(Array.isArray(value)?value.join("\n"):typeof value==="string"?value:"").includes(ref.quote))issues.push("생성 근거 위치와 인용을 확인해 주세요.")
    }
  }
  output.charCount=size
  output.notesForTeacher=Array.isArray(output.notesForTeacher)?output.notesForTeacher.filter(n=>typeof n==="string"):[]
  output.warnings=[...new Set([...(Array.isArray(output.warnings)?output.warnings.filter(w=>typeof w==="string"):[]),...issues])]
  return{output,issues:[...new Set(issues)],json:true}
}
export function generateMonthly(input:MonthlyInput,options:GenerateOptions={},adapter:(input:MonthlyInput,options:GenerateOptions)=>unknown=mockMonthlyOutput):MonthlyOutput {
  for(let attempt=0;attempt<2;attempt++){
    const result=validateMonthlyOutput(adapter(structuredClone(input),{...options,attempt}),input,options.previousComposition,options.direction==="다른 방식으로")
    if(result.output&&(!result.issues.length||attempt===1))return result.output
    if(attempt===1)throw new Error("월간 피드백 AI초안을 만들지 못했습니다. 다시 시도해 주세요.")
  }
  throw new Error("생성 결과가 없습니다.")
}
