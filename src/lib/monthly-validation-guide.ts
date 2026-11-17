import type { ReviewDatabase } from "./review-domain"
import type { MonthlyDetailCase, MonthlyValidationCase } from "./monthly-test-context"

export type MonthlyValidationGuide = { target: string; path: string; expected: string }

/** Display-only guidance. Read the selected fixture's names without changing its saved results. */
export function monthlyValidationGuide(
  db: ReviewDatabase,
  scenario: MonthlyValidationCase,
  detail: MonthlyDetailCase,
  options: { admin?: boolean; failureRecordId?: string; failureType?: string } = {},
): MonthlyValidationGuide[] {
  const pro = db.pro
  if (!pro) return []
  const records = pro.monthly?.records ?? []
  const month = scenario === "december" ? "12월" : "11월"
  const name = (id?: string) => id ? pro.members.find(m => m.id === id)?.name ?? db.reviews.find(r => r.studentId === id)?.studentName : undefined
  const names = (ids: (string | undefined)[]) => [...new Set(ids.map(name).filter(Boolean))].join("·")
  const studentForRecord = (recordId?: string) => db.reviews.find(r => r.id === db.records.find(record => record.id === recordId)?.reviewId)?.studentId
  const firstStudent = db.reviews[0]?.studentId ?? pro.members[0]?.id
  const primary = name("pro-demo-second") ?? name(records.find(r => r.required && r.generations[0]?.kind === "general")?.studentId)
  const write = (buttons: string, selectedMonth = month) => `주간 관리 현황 → ${scenario === "overdue" && selectedMonth === "11월" ? "오늘 할 일 [월간 피드백 지연] → " : ""}학생 [월간 피드백] → ${selectedMonth} → ${buttons}`
  const view = (buttons: string, selectedMonth = month) => options.admin
    ? `본사 학생별 발송 현황 → [월간 피드백 보기] → ${selectedMonth} → ${buttons}`
    : write(buttons, selectedMonth)
  const rows: MonthlyValidationGuide[] = []
  const add = (target: string | undefined, path: string, expected: string) => {
    if (target) rows.push({ target, path, expected })
  }

  if (detail === "base") {
    add(primary, write("본문 수정 → [저장] → [문구 복사] → [보냈어요]"), scenario === "overdue"
      ? "11월 지연 건도 발송 기록 가능. 처리 후 본사 미발송·지연 수 감소."
      : "저장 전 복사 차단. 재수정 후 재저장·재복사 필요. 발송 후 읽기 전용, 본사에도 발송 완료 반영.")
    if (scenario === "december") {
      add(primary, "주간 관리 현황 → 오늘 할 일 [월간 피드백 지연] → 학생 [월간 피드백] → 11월", "12월 초안과 이전 달 지연을 구분. 11월 처리 후 지연 집계 갱신.")
    } else {
      add(name("pro-demo-1"), write("[다시 만들기] → [생성하기] / [생성 이력 보기]"), "성공 시 횟수 차감·이력 보존, 2회 제한. 내용 교체를 취소하면 입력·선택 유지.")
      add(name("pro-demo-8"), write("[발송 일정 변경] → [일정 저장]"), "지정 일정과 오늘 할 일 표시 시점만 변경. 초안 생성일·발송 기한 유지.")
    }
    add(name("pro-demo-complete"), write("[생성 재시도]", "11월"), "생성 실패 → 생성 중 → 초안 표시.")
  } else if (detail === "requests") {
    add(primary, write("[다시 만들기] → 직접 요청 → [생성하기]"), "“가정에서 물어볼 질문에 ‘친구를 도울 다른 방법은 무엇일까?’를 넣어 주세요.”는 기존 질문에 추가. “질문을 ‘어떤 장면이 기억에 남니?’로 바꿔 주세요.”는 교체.")
    add(primary, write("직접 요청에 ‘그림 이모지 🙂를 넣어 주세요.’ 추가"), "허용된 질문 요청은 반영하고 그림 이모지는 제외. 성공한 다시 만들기만 횟수 차감.")
    add(name("pro-demo-1"), write("[다시 만들기] → [더 따뜻하게] → [생성하기]"), "학습 사실·인용·목표 유지. ‘연습에 … 연습하겠습니다’ 중복 없이 자연스러운 문장.")
  } else if (detail === "learning") {
    const comparisonId = studentForRecord(db.records.find(r => r.id.endsWith("-monthly-revised"))?.id) ?? firstStudent
    if (scenario === "december") {
      const continuedId = db.reviews.find(r => r.id.startsWith("monthly-carry-continue-"))?.studentId
      const completedId = db.reviews.find(r => r.id.startsWith("monthly-carry-complete-"))?.studentId
      add(name(continuedId), view(options.admin ? "[생성에 사용한 자료]" : "[초안 근거 보기]"), "11월 발송 확정 항목과 연결된 12월 글·피드백 확인. 낱말 사용 목표는 ‘이어서 확인’으로 계속 이어짐.")
      add(name(completedId), view(options.admin ? "[생성에 사용한 자료]" : "[초안 근거 보기]"), "12월 고쳐 쓴 글에서 전월 목표 완료 근거 확인. 다음 달 이어 볼 항목은 새 목표로 전환.")
      add(name(comparisonId), view(options.admin ? "[생성에 사용한 자료]" : "[초안 근거 보기]"), "12월 자료를 사용하고, 발송하지 않은 11월 저장 항목은 이어받지 않음.")
    } else {
      add(name(comparisonId), view(options.admin ? "[생성에 사용한 자료]" : "[초안 근거 보기]"), "처음 쓴 글·고쳐 쓴 글·여러 도서의 인용과 근거 원문이 일치.")
      const pendingId = studentForRecord(db.records.find(r => r.feedback === "전송 전 비공개 피드백")?.id)
      const rejectedId = studentForRecord(db.records.find(r => r.rejectedAt === "2026-11-06T01:00:00.000Z")?.id)
      add(name(pendingId), view(options.admin ? "[생성에 사용한 자료]" : "[초안 근거 보기]"), "전송 전 비공개 피드백은 생성 근거에서 제외.")
      add(name(rejectedId), view(options.admin ? "[생성에 사용한 자료]" : "[초안 근거 보기]"), "반려되어 제출되지 않은 글은 생성 자료에서 제외.")
    }
  } else if (detail === "consultations") {
    const student = (index: number) => pro.consultations.find(c => c.id === `consult-detail-${index}`)?.studentId
    const path = options.admin ? "본사 조회 월 11월 → 발송 구분 확인" : write("[기존 상담 기록 보기]", "11월")
    add(names([student(0), student(1)]), path, "유선 완료·카톡 대체는 발송 선택. 필수 미발송·지연 집계에서 제외.")
    add(names([student(2), student(3), student(4)]), path, "미진행·완료 후 정정·전환 이후 완료는 발송 필수.")
  } else if (detail === "timing") {
    const late = [...pro.members].filter(m => m.assignedAt).sort((a,b)=>b.assignedAt!.localeCompare(a.assignedAt!))[0]
    const zero = pro.members[2]
    const ended = pro.members.filter(m => m.status === "ended")
    add(primary, "검증 도구 → [정기 생성 시각으로 진행] → 본사 학생별 발송 현황", "생성 전후 전환 확인. 같은 시각으로 다시 진행해도 기록 중복 없음.")
    add(name(late?.id), "검증 도구 → [매칭·첫 피드백 이후로 진행] → 학생 상세", scenario === "december" ? "07:00 매칭·07:30 첫 피드백 이후 확인. 첫 피드백이 있어도 정기 생성 이후 매칭이므로 12월 제외." : "10:00 매칭·10:30 첫 피드백 이후 확인. 첫 피드백이 있어도 정기 생성 이후 매칭이므로 11월 제외.")
    add(name(zero?.id), "검증 도구 → [정기 생성 시각으로 진행] → 학생 상세", "생성 전 매칭했지만 첫 달 피드백 0편이므로 제외. 생성 이후 매칭 제외와 구분.")
    add(names(ended.map(m => m.id)), "본사 학생별 발송 현황 → [월간 피드백 보기]", "종료 학생의 대상 기간·생성 시점 확인. 12월 예시는 종료월 조기 생성도 확인.")
  } else if (detail === "transfer") {
    const sent = records.find(r => r.month === "2026-11" && r.sent && pro.members.find(m => m.id === r.studentId)?.institutionId !== r.sent.institutionId)
    add(name(firstStudent), "본사 조회 월 11월 → 학생별 발송 현황 → [월간 피드백 보기]", "미발송 건은 새 학원이 담당. 이전 학원의 작성 권한은 없음.")
    add(name(sent?.studentId), "본사 조회 월 11월 → 학생별 발송 현황 → [월간 피드백 보기]", "이미 발송한 기록은 이전 학원 귀속·읽기 전용 유지.")
  } else if (detail === "paging") {
    const added = pro.members.find(m => m.id.startsWith("monthly-page-"))
    add(name(added?.id), "본사 학생명 검색 → [검색] → 검색 해제 → 다음 페이지 / 20·50·100건", "학생 검색·전체 건수·페이지 일치. 학생 검색으로 학원 전체 집계는 바뀌지 않음.")
    const other = records.filter(r => r.month === (scenario === "december" ? "2026-12" : "2026-11") && r.institutionId === "other-agency")
    add(names(other.map(r => r.studentId)), "본사 담당 학원에서 다른 예시기관 선택 → [검색]", scenario === "december" ? "선택한 학원의 학생과 발송 집계를 함께 확인." : "발송 선택 학생만 있는 학원도 표시. 필수 대상은 0명.")
  } else if (detail.startsWith("tone-")) {
    const institutionId = pro.scopeInstitutionId ?? "dokdo"
    const academy = db.reviews.find(r => r.institutionId === institutionId)?.institution ?? (institutionId === "dokdo" ? "독도학원" : "다른 예시기관")
    const expected: Record<string, string> = {
      "tone-zero": "누적 0편·적용 대기. 저장된 말투·변경 이력 없음.",
      "tone-one": "누적 1편·관찰. 새 초안에는 아직 말투 미적용.",
      "tone-two": "누적 2편·확정. 3편 미만이므로 적용 대기.",
      "tone-ready": "누적 3편·사용. 저장된 말투를 이후 새 초안에 적용.",
      "tone-off": "누적 3편·사용 안 함. 저장 항목·이력은 유지하고 새 초안에는 미적용.",
    }
    add(academy, options.admin ? "본사 학원별 발송 현황 → [학원 말투 보기]" : "독도 프로 관리 → 학원 말투 설정", expected[detail])
    if (detail === "tone-ready") {
      add(academy, "학원 말투 설정 → 항목 수정·[항목 삭제] → [저장] → [변경 이력 보기]", "변경 전후 값 보존. [저장된 말투 초기화] 후에도 발송본·이전 변경 이력 유지.")
    }
    if (detail === "tone-ready" || detail === "tone-off") {
      add(primary, write("[다시 만들기] → [생성하기] → [초안 근거 보기]"), detail === "tone-ready" ? "현재 학원의 저장된 말투와 발송본 예시를 새 생성에 사용." : "학원 말투·발송본 예시를 새 생성에 사용하지 않음.")
    } else if (detail === "tone-zero") {
      add(primary, write("[저장] → [문구 복사] → [보냈어요] → 학원 말투 설정"), "발송 기록 후 같은 예시의 누적 편수 증가.")
    }
  } else if (detail === "failures") {
    const record = records.find(r => r.id === options.failureRecordId)
    const actions: Record<string, string> = {
      "monthly-save": "본문 수정 → [저장]",
      "monthly-copy": "저장된 본문에서 [문구 복사]",
      "monthly-send": "저장·복사 후 [보냈어요]",
      generation: "[다시 만들기] → [생성하기]",
      style: "저장·복사 후 [보냈어요] → 학원 말투 설정",
    }
    const type = options.failureType ?? "monthly-save"
    add(name(record?.studentId), `아래 [다음 처리 한 번 실패] → ${write(actions[type] ?? actions["monthly-save"])}`, type === "style"
      ? "말투 갱신 실패여도 발송 완료·기존 말투 유지. 같은 발송본 중복 반영 없음."
      : type === "generation" ? "실패 시 기존 본문·이력·남은 횟수 유지. 재시도 성공 시에만 차감." : "해당 처리의 오류 안내, 입력·기존 상태 유지. 다시 실행하면 정상 처리.")
  } else if (detail === "review") {
    const record = records.find(r => r.month === "2026-11" && r.generations[0]?.reviewSpans.length === 3)
    add(name(record?.studentId), write("표시된 문장 클릭 → 문장 수정", "11월"), "참여 안내형 300~500자. 도움 여부·보완점·제출 횟수의 세 문장과 사유 일치. 해당 문장을 수정하면 검토 표시 해제.")
  }
  return rows
}
