import type { ReviewDatabase } from "./review-domain"

/** Only submitted writing and sent feedback are public. No drafts, contacts or management data. */
export function sharedReviewState(db: ReviewDatabase, recordId: string): ReviewDatabase & { sharedRecordId?: string } {
  const selected = db.records.find(r => r.id === recordId && r.writingStatus === "submitted")
  const common = db.reviews.find(r => r.id === selected?.reviewId)
  if (!selected || !common) return {version:1,reviews:[],records:[]}
  return {version:1,sharedRecordId:selected.id,
    reviews:[{...common,institutionId:"",institution:"",classId:"",decidedBy:undefined}],
    records:db.records.filter(r => r.reviewId === common.id && r.writingStatus === "submitted").map(r => {
      const publicRecord = {...r,legacyAiScores:undefined,aiDraft:undefined,aiHistory:[],history:[],parentContact:false,parentSentAt:undefined,itemFeedback:r.itemFeedback.filter(i => i.visible)}
      return r.feedbackStatus === "전송완료" ? publicRecord : {...publicRecord,feedback:"",reportFeedback:"",itemFeedback:[],aiScores:undefined,teacherScores:undefined,report:undefined,savedAt:undefined,feedbackStatus:"작성전" as const}
    })}
}
