/** Text helpers for the monthly prototype only. Quotes stay intact during shortening. */
export function monthlySentences(text: string): string[] {
  const result: string[] = [], closers: string[] = []
  const pairs: Record<string, string> = { "“": "”", "‘": "’", "\"": "\"", "'": "'" }
  let start = 0
  for (let index = 0; index < text.length; index++) {
    const c = text[index]
    if (closers.at(-1) === c) closers.pop()
    else if (pairs[c]) closers.push(pairs[c])
    if (!closers.length && ((/[.!?。]/.test(c) && (!text[index + 1] || /\s/.test(text[index + 1]))) || c === "\n")) {
      const sentence = text.slice(start, index + 1).trim()
      if (sentence) result.push(sentence)
      start = index + 1
    }
  }
  if (text.slice(start).trim()) result.push(text.slice(start).trim())
  return result
}

export function monthlyGivenName(fullName: string) {
  const name = fullName.trim()
  if (/^[가-힣]{3,5}$/.test(name)) {
    const compound = /^(남궁|황보|제갈|선우|독고|서문|사공|동방|어금)/.test(name) && name.length >= 4
    return name.slice(compound ? 2 : 1)
  }
  return name
}
export function monthlyNameWithParticle(name: string) {
  const last = name.codePointAt(name.length - 1) ?? 0
  return name + (last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0 ? "이" : "")
}

export type MonthlyExpression = { key: "warmth" | "ending" | "length" | "emoticon"; text: string }
/** Classifies explicit requests about expression, not isolated words inside a content request. */
export function monthlyExpressionRequests(request: string): MonthlyExpression[] {
  const result = new Map<MonthlyExpression["key"], MonthlyExpression>()
  const add = (key: MonthlyExpression["key"], text: string) => result.set(key, { key, text })
  for (const sentence of monthlySentences(request)) {
    const plain = sentence.replace(/[“‘"'][\s\S]*?[”’"']/g, "")
    if (/말투|어조|표현|더 따뜻하게|부드럽게 써|따뜻하게 써/.test(plain)) {
      if (/따뜻|부드럽|친근/.test(plain)) add("warmth", "따뜻하고 부드러운 표현을 사용합니다.")
      if (/담백|차분|격식/.test(plain)) add("warmth", "담백하고 차분한 표현을 사용합니다.")
    }
    if (/해요체/.test(plain)) add("ending", "부드러운 해요체로 안내합니다.")
    if (/습니다체|격식체/.test(plain)) add("ending", "정중한 습니다체로 안내합니다.")
    if (/문장|분량|더 간결하게/.test(plain)) {
      if (/간결|짧/.test(plain)) add("length", "짧고 간결한 문장으로 작성합니다.")
      if (/자세|상세|길게/.test(plain)) add("length", "문장을 충분히 풀어서 안내합니다.")
    }
    if (/이모티콘|\^\^/.test(plain) && !/그림|이모지|\p{Extended_Pictographic}/u.test(plain)) add("emoticon", /빼|없이|사용하지|넣지|제외|금지/.test(plain) ? "이모티콘을 사용하지 않습니다." : "문자 이모티콘 ^^를 한 번 사용합니다.")
  }
  return [...result.values()]
}

/** Recognize the prototype's explicit home-question edits independently of other requests. */
export function monthlyQuestionRequest(request: string) {
  const quoted = request.match(/(?:질문|물어볼 말)(?:에|을|는)?\s*[‘“"']([^‘’“”"']+)[’”"']\s*(?:을|를)?\s*(?:(?:로|으로)\s*)?(바꿔|바꾸어|변경|넣어|추가해|추가하여)/)
  const plain = quoted ? undefined : request.match(/(?:질문|물어볼 말)(?:에|을)\s+([^\n]+?)(?:을|를)(?:\s*(?:로|으로))?\s*(바꿔|바꾸어|변경|넣어|추가해|추가하여)/)
  const match = quoted ?? plain
  return match ? { question: match[1].trim(), append: /넣어|추가/.test(match[2]) } : undefined
}

/** Change complete predicates outside quotations; retain the learning action and its object. */
export function monthlyApplyWarmth(body: string) {
  return body.split(/([“‘"'][\s\S]*?[”’"'])/g).map((part, index) => index % 2 ? part : part
    .replace(/연습에 집중하겠습니다\./g, "연습을 아이의 속도에 맞춰 차근차근 이어 가겠습니다.")
    .replace(/연습에 집중할게요\./g, "연습을 아이의 속도에 맞춰 차근차근 이어 갈게요.")
    .replace(/(?<!아이의 속도를 살피며 )집중하겠습니다\./g, "아이의 속도를 살피며 집중하겠습니다.")
    .replace(/(?<!아이의 속도를 살피며 )집중할게요\./g, "아이의 속도를 살피며 집중할게요.")
    .replace(/아직 부족합니다\./g, "아직은 함께 연습하며 익혀 가는 중입니다.")).join("")
}

/** Legacy mock-adapter notes belong in the validation tool, not the writing UI. */
export const monthlyDisplayNotices = (warnings: string[], notes: string[] = []) =>
  [...new Set([...warnings, ...notes])].filter(text => !text.includes("모의 생성"))
export function monthlyExpressionKey(text: string): MonthlyExpression["key"] | undefined {
  if (/이모티콘|\^\^/.test(text)) return "emoticon"
  if (/해요체|습니다체|격식체/.test(text)) return "ending"
  if (/문장.*(간결|짧|충분|풀어)|간결한 문장/.test(text)) return "length"
  if (/따뜻|부드러운 표현|차분|담백/.test(text)) return "warmth"
}

const outsideQuotes = (text: string) => text.replace(/[“‘"'][\s\S]*?[”’"']/g, "")
export function monthlyEnding(text: string) {
  const plain = outsideQuotes(text)
  const casual = (plain.match(/(?:해요|드려요|할게요|볼게요|했어요|었어요|겠어요|있어요|봤어요|이에요|예요)[.!?]/g) ?? []).length
  const formal = (plain.match(/(?:습니다|드립니다|겠습니다|입니다)[.!?]/g) ?? []).length
  return casual > formal && casual > 0 ? "casual" : formal > 0 ? "formal" : undefined
}
export function monthlyStyleObservations(before: string, after: string, request: string): MonthlyExpression[] {
  const result = new Map(monthlyExpressionRequests(request).map(item => [item.key, item]))
  const from = monthlyEnding(before), to = monthlyEnding(after)
  if (from && to && from !== to) result.set("ending", { key: "ending", text: to === "casual" ? "부드러운 해요체로 안내합니다." : "정중한 습니다체로 안내합니다." })
  if (before.includes("^^") && !after.includes("^^")) result.set("emoticon", { key: "emoticon", text: "이모티콘을 사용하지 않습니다." })
  if (!before.includes("^^") && after.includes("^^")) result.set("emoticon", { key: "emoticon", text: "문자 이모티콘 ^^를 한 번 사용합니다." })
  return [...result.values()]
}

/** Edit endings outside direct quotations; quoted student/teacher words are evidence. */
export function monthlyApplyEnding(body: string, casual: boolean) {
  return body.split(/([“‘"'][\s\S]*?[”’"'])/g).map((part, index) => index % 2 ? part : !casual ? part
    .replace(/살펴볼게요\./g,"살펴보겠습니다.").replace(/확인했어요\./g,"확인했습니다.")
    .replace(/안내했어요\./g,"안내했습니다.").replace(/적었어요\./g,"적었습니다.")
    .replace(/좋겠어요\./g,"좋겠습니다.").replace(/연습할게요\./g,"연습하겠습니다.") : part
    .replace(/살펴보겠습니다\./g, "살펴볼게요.")
    .replace(/확인했습니다\./g, "확인했어요.")
    .replace(/적었습니다\./g, "적었어요.")
    .replace(/안내했습니다\./g, "안내했어요.")
    .replace(/좋겠습니다\./g, "좋겠어요.")
    .replace(/연습하겠습니다\./g, "연습할게요.")
    .replace(/집중하겠습니다\./g,"집중할게요.")
    .replace(/확인하겠습니다\./g,"확인할게요.")
    .replace(/돕겠습니다\./g,"도울게요.")
    .replace(/전달드리겠습니다\./g,"전달드릴게요.")
    .replace(/보겠습니다\./g,"볼게요.")
    .replace(/살펴보았습니다\./g,"살펴봤어요.")
    .replace(/지도했었습니다\./g,"지도했어요.")
    .replace(/부분입니다\./g,"부분이에요.")
    .replace(/있습니다\./g,"있어요.")
    .replace(/부모님, 반갑습니다\./g,"부모님, 반가워요.")).join("")
}
