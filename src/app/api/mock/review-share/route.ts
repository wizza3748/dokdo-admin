import { NextResponse } from "next/server"
import { prototypeStore } from "@/lib/prototype-store"
import { canAccessReview, type ReviewDatabase } from "@/lib/review-domain"
import { getDefaultReviewDatabase } from "@/lib/review-seeds"
import { reviewActor } from "@/lib/review-server"
import { createReviewShareSecrets, encryptReviewShare, decryptReviewShare } from "@/lib/review-share-token"
import { sharedReviewState } from "@/lib/review-share-projection"
import { assertSharedReviewRequest } from "@/lib/review-request-scope"
export const runtime = "nodejs"
const headers = { "Cache-Control":"private, no-store", "Referrer-Policy":"no-referrer", "X-Robots-Tag":"noindex, nofollow" }
export async function POST(request: Request) {
  try {
    assertSharedReviewRequest(request)
    const {recordId} = await request.json()
    const db = await prototypeStore.read<ReviewDatabase>("online-reviews",getDefaultReviewDatabase)
    const actor = reviewActor(request,db), record = db.records.find(r => r.id === recordId)
    const common = db.reviews.find(r => r.id === record?.reviewId)
    if (!record || !common || record.writingStatus !== "submitted" || !canAccessReview(common,actor,db.pro) || actor.role === "external" || actor.role !== "student" && record.feedbackStatus !== "전송완료") return NextResponse.json({message:"이 독후감의 공유 링크를 만들 수 없습니다."},{status:403,headers})
    const secrets = await prototypeStore.update("review-share-links",createReviewShareSecrets, state => state.links[record.id] ? state : {...state,links:{...state.links,[record.id]:encryptReviewShare(record.id,state.key)}})
    return NextResponse.json({path:`/online-workbook-results/${secrets.links[record.id]}`},{headers})
  } catch { return NextResponse.json({message:"공유 링크를 만들지 못했어요. 다시 시도해 주세요."},{status:503,headers}) }
}
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? ""
    const secrets = await prototypeStore.read("review-share-links",createReviewShareSecrets)
    const id = decryptReviewShare(token,secrets.key)
    if (!id || secrets.links[id] !== token) return NextResponse.json({message:"공유된 독후감을 조회할 수 없습니다."},{status:404,headers})
    const db = await prototypeStore.read<ReviewDatabase>("online-reviews",getDefaultReviewDatabase)
    return NextResponse.json(sharedReviewState(db,id),{headers})
  } catch { return NextResponse.json({message:"공유된 독후감을 불러오지 못했습니다."},{status:503,headers}) }
}
