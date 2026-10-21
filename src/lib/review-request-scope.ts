/** A lost/incorrect test context must fail closed, never become the default shared student. */
export function assertSharedReviewRequest(request: Request) {
  const params = new URL(request.url).searchParams
  if (params.has("studentTest") || params.get("demoStudent")?.startsWith("student-test-")) {
    throw new Error("전용 예시는 학생프론트 테스트 목록에서 다시 열어 주세요. 공용 데이터에는 반영되지 않았습니다.")
  }
}
