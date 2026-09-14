import { ADMIN_WORKBOOK_SEEDS } from "@/lib/admin-workbook-seeds"
import { AGENCY_ONLINE_WORKBOOKS } from "@/lib/online-workbooks"
import { studentWorkbooks } from "@/lib/student-workbooks"
import { getConfiguredTemplates } from "@/lib/workbook-template-settings"
import { WORKBOOK_TEMPLATE_LIVE_DETAILS } from "@/lib/workbook-template-live-data"
import { createSeededReviewDatabase, type ReviewSeed, type ReviewTemplate } from "@/lib/review-domain"
import { READING_BOOKS } from "@/lib/reading-books"

/** Stable base fixtures shared by all roles. User-created progress is never built from these. */
export function getDefaultReviewDatabase() {
  // Historical demo snapshots include report-enabled examples even if HQ later disables
  // that template. These fixture-only values never set policy for newly started reviews.
  const templates = getConfiguredTemplates().map(t => ({ ...t, reportEnabled: t.name.includes("통합형 독서록") }))
  const seeds: ReviewSeed[] = []
  const roomAnswers = [
    "집에서 뛰다가 조용히 하라는 말을 들은 적이 있습니다. 초인종 소리가 들어 있는 제목을 보고 어떤 일이 생길지 궁금해서 이 책을 골랐습니다.",
    "산이와 별이가 집에서 신나게 뛰자 아래층 아저씨가 시끄럽다고 찾아옵니다. 내가 노는 소리가 이웃에게는 불편할 수 있다는 것을 보여 주는 이야기입니다.",
    "처음에는 아저씨가 무섭다고 생각했습니다. 하지만 아래층에서 쿵쿵 소리가 계속 들리면 쉬기 힘들 것 같습니다. 나도 이웃의 마음을 생각해야겠습니다.",
    "앞으로 집에서는 뛰지 않고 걸어 다니겠습니다. 뛰고 싶을 때는 놀이터에 가고, 저녁에는 동생과 그림을 그리겠습니다.",
  ]
  const connectedTemplate = (bookTitle: string, level: number, preferredTitle?: string) => {
    const ids = WORKBOOK_TEMPLATE_LIVE_DETAILS.filter(t => t.connectedBooks.some(([, title, bookLevel, round]) => title === bookTitle && bookLevel === level && round === 1)).map(t => t.id)
    const connected = templates.filter(t => ids.includes(t.id) && !t.name.includes("자유형"))
    return connected.find(t => t.name.includes("통합형 독서록")) ?? connected.find(t => t.studentTitle === preferredTitle) ?? connected[0]
  }
  const readingLink = (bookTitle: string, sourceWorkbookId: string) => {
    const book = READING_BOOKS.find(item => item.title === bookTitle)
    if (!book) return {}
    return {
      sourceBookId: book.id,
      sourceReadingRecordId: `reading-complete-${sourceWorkbookId}`,
      sourceReadingWorkbookId: `reading-${book.id}-round-${book.rounds}`,
      sourceReadingRound: book.rounds,
    }
  }
  const mapTemplate = (title: string, level: number, questions: { title: string; description?: string }[], id?: string): ReviewTemplate => {
    // Legacy demo IDs must not match the first duplicate student-facing title.
    const canonicalId = id === "reading-diary" ? "68" : id
    const candidates = templates.filter(t => t.studentTitle === title && t.levels.includes(level))
    const configured = templates.find(t => String(t.id) === canonicalId) ?? candidates.find(t => t.questions.length === questions.length) ?? (candidates.length === 1 ? candidates[0] : undefined)
    return { id: configured ? String(configured.id) : id ?? title, title: configured?.studentTitle ?? title, rewriteMode: configured?.rewriteMode, reportEnabled: configured?.reportEnabled ?? false, rewriteGuide: configured?.guides.rewrite ?? "책의 내용과 자신의 생각이 잘 드러나도록 글을 다시 읽고 다듬어 보세요.", items: (configured?.questions ?? questions).map((q, i) => ({ id: String(i + 1), title: q.title, description: q.description ?? "", example: "example" in q ? q.example as string : undefined })) }
  }
  for (const workbook of studentWorkbooks) {
    // A not-yet-started workbook must remain a list fixture, not become a writing review record.
    if (workbook.status === "before") continue
    const template = workbook.templates.find(t => t.id === workbook.selectedTemplateId) ?? workbook.templates[0]
    const integrated = connectedTemplate(workbook.bookTitle, workbook.level, template.title)
    if (!integrated) continue
    const month = `${workbook.year}-${String(workbook.month).padStart(2, "0")}`
    seeds.push({
      common: { id: `review-seed-student-${workbook.id}`, sourceWorkbookId: workbook.id, ...readingLink(workbook.bookTitle, workbook.id), studentId: "26142", studentName: "진독도", institutionId: "dokdo", institution: "독도학원", classId: "class-1", bookTitle: workbook.bookTitle, bookAuthor: workbook.author, bookCoverSrc: workbook.coverSrc, level: workbook.level, month, template: integrated ? mapTemplate(integrated.studentTitle, workbook.level, integrated.questions, String(integrated.id)) : mapTemplate(template.title, workbook.level, template.questions, template.id) },
      at: `${month}-${String(workbook.day).padStart(2, "0")}T00:00:00Z`,
      status: workbook.status === "feedback" ? "전송완료" : workbook.status === "completed" ? "작성전" : "writing",
      answers: workbook.bookTitle === "901호 띵똥 아저씨" ? roomAnswers : workbook.answers, feedback: workbook.feedback?.content, seen: workbook.id !== "gamunjang-0824", flowers: workbook.feedback?.reward,
    })
  }
  for (const row of AGENCY_ONLINE_WORKBOOKS) {
    const template = connectedTemplate(row.bookTitle, row.level, row.templateName)
    if (!template) continue
    const original = row.questions?.map(q => q.answer) ?? []
    // Old fixtures used four generic prompts. Match the selected HQ template's item order.
    const [summary = "", scene = "", reflection = "", plan = ""] = original
    const reason = `『${row.bookTitle}』라는 제목을 보고 어떤 이야기가 담겼을지 궁금해서 골랐습니다. 책을 읽고 제 생활과 연결해 생각해 보고 싶었습니다.`
    const answers = template.id === 68 ? [row.submittedAt.slice(0, 10), "맑은 날씨입니다. 책을 읽고 새로운 생각이 떠올라 마음도 환해졌습니다.", summary, scene, `${reflection} ${plan}`]
      : template.id === 1 || template.id === 51 || template.id === 56 ? [reason, summary, reflection, plan].slice(0, template.questions.length)
      : template.id === 2 ? [summary, summary, scene, plan, reflection]
      : template.id === 69 ? ["친구, 교실, 연필, 운동장", "친구가 교실에서 연필로 그림을 그립니다. 우리는 쉬는 시간에 운동장에서 놉니다.", "친구가 교실에서 연필을 찾고 있었습니다. 나는 책상 아래에 떨어진 연필을 주워 주었습니다. 우리는 함께 운동장으로 나가 웃으며 놀았습니다."]
      : original
    seeds.push({
      common: { id: `review-seed-agency-${row.id}`, legacyRecordId: row.id, sourceWorkbookId: `seed-agency-${row.id}`, ...readingLink(row.bookTitle, `seed-agency-${row.id}`), studentId: row.studentName === "진독도" ? "26142" : `seed-${row.studentName}`, studentName: row.studentName, institutionId: "dokdo", institution: row.institution, classId: "class-1", bookTitle: row.bookTitle, level: row.level, month: row.submittedAt.slice(0, 7), template: mapTemplate(template.studentTitle, row.level, row.questions ?? template.questions, String(template.id)) },
      at: `${row.submittedAt}T00:00:00Z`, status: row.status, answers, feedback: row.feedbackText, seen: true, flowers: row.status === "작성전" ? 0 : row.flowers, parentContact: row.parentContactRegistered, parentSent: row.parentSent,
    })
  }
  for (const row of ADMIN_WORKBOOK_SEEDS.filter(r => !AGENCY_ONLINE_WORKBOOKS.some(a => a.id === r.id))) {
    const template = connectedTemplate(row.book, row.level)
    if (!template) continue
    const answers = row.book === "거울 속 도플갱어" ? [
      "나는 거울에 비친 모습과 실제 마음이 다를 수 있다는 점을 생각하며 이 책을 읽었다. 겉으로 보이는 모습만으로 사람을 판단하지 않는 것이 중요하다고 느꼈다.",
      "주인공이 낯선 자신의 모습을 마주하는 부분이 기억에 남았다. 나라면 무섭기도 하겠지만 무엇이 다른지 차근차근 살펴보고 싶다.",
      "친구가 조용하다고 해서 할 말이 없는 것은 아니다. 나도 발표할 때 긴장해서 생각을 다 말하지 못한 적이 있어서, 다른 사람의 마음을 먼저 물어봐야겠다고 생각했다.",
      "앞으로 친구와 생각이 다를 때 바로 판단하지 않고 이유를 들어 보고 싶다. 나의 모습도 한 가지 말로 정해 버리지 않고 새로운 일에 도전하며 알아가고 싶다.",
    ] : [
      "부산에서 런던까지 기차를 타고 이동한다면 어떤 나라와 풍경을 만나게 될지 상상하며 읽었다.",
      "지도에서 멀리 떨어진 곳들이 철도로 연결될 수 있다는 점이 인상 깊었다.",
      "여행은 목적지에 빨리 도착하는 것뿐 아니라 가는 길에서 다른 사람들의 생활을 배우는 일이라고 생각했다.",
      "책에 나온 경로를 지도에 표시하고 나라별로 달라지는 자연환경을 더 찾아보고 싶다.",
    ]
    seeds.push({ common: { id: `review-seed-hq-${row.id}`, legacyRecordId: row.id, sourceWorkbookId: `seed-hq-${row.id}`, ...readingLink(row.book, `seed-hq-${row.id}`), studentId: `seed-hq-${row.student}`, studentName: row.student, institutionId: `seed-${row.institution}`, institution: row.institution, classId: "class-1", bookTitle: row.book, level: row.level, month: row.submittedAt.slice(0,7), template: mapTemplate(template.studentTitle, row.level, template.questions, String(template.id)) }, at: `${row.submittedAt}T00:00:00Z`, status: row.status, answers, flowers: row.status === "작성전" ? 0 : row.flowers })
  }
  const template = connectedTemplate("901호 띵똥 아저씨", 2)!
  const templateFor = (bookTitle: string, level: number) => {
    const connected = connectedTemplate(bookTitle, level) ?? template
    return mapTemplate(connected.studentTitle, level, connected.questions, String(connected.id))
  }
  const answersFor = (bookTitle: string, reviewTemplate: ReviewTemplate) => {
    const answers = [
      `『${bookTitle}』라는 제목에 담긴 이야기가 궁금해서 이 책을 골랐습니다.`,
      `책에서 인물이 문제를 만나 생각하고 행동하는 과정을 중심으로 내용을 정리했습니다.`,
      `인물의 선택을 보며 나라면 어떻게 행동했을지 생각해 보았습니다.`,
      `책에서 배운 점을 생활 속에서 실천하고 비슷한 주제의 책도 더 찾아 읽고 싶습니다.`,
    ]
    return reviewTemplate.items.map((_, index) => answers[index] ?? `${bookTitle}을 읽고 떠오른 생각을 정리했습니다.`)
  }
  const newWritingTemplate = templateFor("남몰래 거울", 2)
  const newWritingAnswers = answersFor("남몰래 거울", newWritingTemplate)
  const newSubmittedTemplate = templateFor("우리 곧 사라져요", 1)
  const newSubmittedAnswers = answersFor("우리 곧 사라져요", newSubmittedTemplate)
  const secondAvailableTemplate = templateFor("미술관으로 간 백곰", 2)
  const secondAvailableAnswers = answersFor("미술관으로 간 백곰", secondAvailableTemplate)
  const secondWritingTemplate = templateFor("괴물을 사랑한 아이 윌로딘", 6)
  const secondWritingAnswers = [
    "괴물처럼 보이는 존재를 사랑하는 아이라는 제목이 신기해서 이 책을 골랐습니다.",
    "마을 사람들이 싫어하는 괴물과 벌새곰이 사라지는 일을 윌로딘이 살펴보는 이야기입니다.",
    "윌로딘이 다른 사람들의 시선과 상관없이 괴물을 지켜 주려는 모습이 용감하다고 생각했습니다.",
    "책에서 배운 점을 생활 속에서 실천하고 비슷한 주제의 책도 더 찾아 읽고 싶습니다.",
  ]
  const secondWritingDraftAnswers = [
    "처음에는 ‘괴물을 사랑한다’는 제목이 낯설어서 책을 골랐습니다. 읽고 나니 겉모습 때문에 미움받는 존재도 소중할 수 있다는 뜻이 궁금해졌고, 내가 생명을 바라보는 태도도 돌아보게 되었습니다.",
    "마을 사람들은 냄새가 나고 보기 싫다는 이유로 괴물을 없애려 합니다. 하지만 벌새곰이 사라지자 윌로딘은 두 생물이 이어져 있을지 모른다고 생각하고 원인을 찾아 나섭니다. 이 과정에서 자연의 모든 생명은 서로 영향을 주고받는다는 사실이 드러납니다.",
    "윌로딘이 사람들의 편견보다 자신이 관찰한 사실을 믿고 괴물을 지키려 한 점이 인상 깊었습니다. 나도 학교 화단에서 징그럽다는 이유로 작은 벌레를 피한 적이 있는데, 그 벌레에게도 자연 속 역할이 있을 수 있다는 생각이 들었습니다.",
    "이번 주말에는 집 근처 공원에서 볼 수 있는 곤충과 식물을 관찰해 기록하겠습니다. 생김새만 보고 해롭다고 판단하지 않고 어떤 역할을 하는지 찾아본 뒤, 비슷한 주제의 생태 책도 한 권 더 읽어 보겠습니다.",
  ]
  const secondSubmittedTemplate = templateFor("쥐와 다람쥐의 이야기", 3)
  const secondSubmittedAnswers = [
    "표지에 함께 나온 쥐와 다람쥐가 어떤 이야기를 들려줄지 궁금해서 이 책을 골랐습니다.",
    "서로 다른 모습과 생각을 가진 두 동물이 함께 지내며 상대방을 이해해 가는 이야기입니다.",
    "친구와 생각이 다를 때 내 입장만 말하지 않고 먼저 이야기를 들어야겠다고 느꼈습니다.",
    "친구와 의견이 다를 때 서로의 이유를 차례로 말해 보는 활동을 해 보고 싶습니다.",
  ]
  const secondSubmittedDraftAnswers = [
    "표지 속 쥐와 다람쥐가 닮은 듯 다르게 보여서 두 친구가 서로를 어떻게 이해하게 될지 궁금해 이 책을 골랐습니다.",
    "쥐와 다람쥐는 생김새와 생활 방식이 달라 처음에는 서로를 오해합니다. 하지만 함께 시간을 보내며 상대의 행동에는 저마다 이유가 있다는 것을 알게 되고, 다름을 인정하며 가까워집니다.",
    "나도 모둠 활동에서 친구가 내 의견에 반대했을 때 기분이 상한 적이 있습니다. 두 동물처럼 상대의 이유를 먼저 들었다면 더 좋은 방법을 함께 찾을 수 있었을 것이라고 생각했습니다.",
    "다음 모둠 활동에서는 의견이 다를 때 각자의 이유를 한 번씩 말하고 공통점을 적어 보겠습니다. 친구의 말을 끝까지 들었는지도 활동이 끝난 뒤 스스로 확인하겠습니다.",
  ]
  const twoRoundsTemplate = templateFor("푸른 눈의 독립운동가 [개정본]", 5)
  const twoRoundsAnswers = answersFor("푸른 눈의 독립운동가 [개정본]", twoRoundsTemplate)
  seeds.push({
    common: { id: "review-seed-new-writing", sourceWorkbookId: "new-review-writing-room901", ...readingLink("남몰래 거울", "new-review-writing-room901"), studentId: "26142", studentName: "진독도", institutionId: "dokdo", institution: "독도학원", classId: "class-1", bookTitle: "남몰래 거울", bookAuthor: "노란돼지", level: 2, month: "2026-09", template: newWritingTemplate },
    at: "2026-09-07T00:00:00Z", status: "writing", answers: newWritingAnswers,
  })
  seeds.push({
    common: { id: "review-seed-new-submitted", sourceWorkbookId: "new-review-submitted-gamunjang", ...readingLink("우리 곧 사라져요", "new-review-submitted-gamunjang"), studentId: "26142", studentName: "진독도", institutionId: "dokdo", institution: "독도학원", classId: "class-1", bookTitle: "우리 곧 사라져요", bookAuthor: "노란상상", level: 1, month: "2026-09", template: newSubmittedTemplate },
    at: "2026-09-07T01:00:00Z", status: "작성전", answers: newSubmittedAnswers,
  })
  seeds.push({
    common: { id: "review-seed-second-available", sourceWorkbookId: "review-second-available-room901", ...readingLink("미술관으로 간 백곰", "review-second-available-room901"), studentId: "26142", studentName: "진독도", institutionId: "dokdo", institution: "독도학원", classId: "class-1", bookTitle: "미술관으로 간 백곰", bookAuthor: "노란상상", level: 2, month: "2026-09", template: secondAvailableTemplate },
    at: "2026-09-06T00:00:00Z", status: "전송완료", seen: true, secondState: "available", answers: secondAvailableAnswers,
    feedback: "책의 내용을 자신의 생각과 연결한 점이 좋습니다. 선생님의 질문을 참고해 행동 계획을 조금 더 구체적으로 고쳐 써 보세요.",
  })
  seeds.push({
    common: { id: "review-seed-second-writing", sourceWorkbookId: "review-second-writing-room901", ...readingLink("괴물을 사랑한 아이 윌로딘", "review-second-writing-room901"), studentId: "26142", studentName: "진독도", institutionId: "dokdo", institution: "독도학원", classId: "class-1", bookTitle: "괴물을 사랑한 아이 윌로딘", bookAuthor: "가람어린이", level: 6, month: "2026-09", template: secondWritingTemplate },
    at: "2026-09-05T00:00:00Z", status: "전송완료", seen: true, secondState: "writing", answers: secondWritingAnswers,
    secondDraftAnswers: secondWritingDraftAnswers,
    feedback: "책 속 인물의 마음을 잘 살펴보았어요. 이번에는 인물의 선택을 자신의 경험과 더 구체적으로 연결해 보세요.",
  })
  seeds.push({
    common: { id: "review-seed-second-submitted", sourceWorkbookId: "review-second-submitted-squirrel", ...readingLink("쥐와 다람쥐의 이야기", "review-second-submitted-squirrel"), studentId: "26142", studentName: "진독도", institutionId: "dokdo", institution: "독도학원", classId: "class-1", bookTitle: "쥐와 다람쥐의 이야기", bookAuthor: "책빛", level: 3, month: "2026-09", template: secondSubmittedTemplate },
    at: "2026-09-03T00:00:00Z", status: "전송완료", seen: true, secondState: "submitted", answers: secondSubmittedAnswers,
    secondDraftAnswers: secondSubmittedDraftAnswers,
    feedback: "두 동물의 차이를 잘 살펴보았어요. 친구와 생각이 달랐던 경험을 떠올리고 서로를 이해할 방법을 더 구체적으로 써 보세요.",
  })
  seeds.push({
    common: { id: "review-seed-two-rounds", sourceWorkbookId: "review-two-round-sample", ...readingLink("푸른 눈의 독립운동가 [개정본]", "review-two-round-sample"), studentId: "26142", studentName: "진독도", institutionId: "dokdo", institution: "독도학원", classId: "class-1", bookTitle: "푸른 눈의 독립운동가 [개정본]", bookAuthor: "풀빛", level: 5, month: "2026-09", template: twoRoundsTemplate },
    at: "2026-09-02T00:00:00Z", status: "전송완료", seen: true, secondSeen: false, flowers: 15, parentSent: true,
    answers: twoRoundsAnswers,
    feedback: "책의 내용을 자신의 생각과 연결했어요. 독립운동가의 선택이 어떤 의미인지 한 가지 근거를 더 들어 구체적으로 써 볼까요?",
    secondAnswers: twoRoundsAnswers.map((answer, index) => index === 0 ? `${answer} 선생님의 질문을 읽고 인물의 선택을 더 자세히 살펴보았습니다.` : `${answer} 책에서 찾은 근거를 덧붙여 생각을 발전시켰습니다.`),
    secondFeedback: "첫 번째 글에서 더 나아가 인물의 선택과 의미를 구체적인 근거로 설명했어요. 책의 내용을 자신의 생각과 연결하며 글을 발전시킨 점이 돋보입니다.",
  })
  return { ...createSeededReviewDatabase(seeds), seedVersion: 14 }
}
