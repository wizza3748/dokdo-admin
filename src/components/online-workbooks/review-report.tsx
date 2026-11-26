"use client"
import { ExternalLink, Printer } from "lucide-react"
import { demoIdentityQuery, useReviews, type ReviewRole } from "@/lib/review-client"
import { reportAreaScores } from "@/lib/review-report-model"
import { ReviewReportScreen } from "./review-report-screen"
import styles from "./review-report.module.css"

export function ReviewReportView({ id, role, shareToken }: { id: string; role: ReviewRole; shareToken?: string }) {
  const { db, loaded, error } = useReviews(role, role === "external" ? id : undefined)
  const record = db.records.find(r => r.id === id)
  const common = db.reviews.find(r => r.id === record?.reviewId)
  if (!loaded) return <p className={styles.empty} role="status">평가 보고서를 불러오고 있습니다.</p>
  if (!record?.report || !common?.reportEnabled || ((role === "student" || role === "external") && record.feedbackStatus !== "전송완료")) return <p className={styles.empty} role="alert">조회할 수 있는 평가 보고서가 없습니다. {error}</p>
  const first = record.round === 2 ? db.records.find(r => r.id === record.linkedRecordId && r.reviewId === record.reviewId && r.round === 1) : undefined
  const areas = reportAreaScores(common, record, first)
  if (!areas || (record.round === 2 && !first?.report)) return <p className={styles.empty} role="alert">보고서 평가 데이터를 확인할 수 없습니다. {error}</p>
  const query = role === "external" && shareToken ? "&share=" + encodeURIComponent(shareToken) : demoIdentityQuery(role)
  return <div className={styles.document}>
    <nav className={styles.toolbar} aria-label="평가 보고서 도구"><div>
      <button type="button" onClick={() => window.print()}><Printer size={16} />인쇄 / 파일 저장</button>
      {first && <a href={"/online-review/report/" + first.id + "?role=" + role + query} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" />1차 보고서 보기</a>}
    </div></nav>
    <ReviewReportScreen key={record.id} common={common} record={record} first={first} areas={areas} />
  </div>
}
