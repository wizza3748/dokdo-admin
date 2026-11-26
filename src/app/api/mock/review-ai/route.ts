import { mockReviewAi } from "@/lib/review-ai-mock"

export async function POST(request: Request) {
  try {
    return Response.json({ output: mockReviewAi(await request.json()) })
  } catch {
    return Response.json({ error: "AI 요청 형식을 확인해 주세요." }, { status: 400 })
  }
}
