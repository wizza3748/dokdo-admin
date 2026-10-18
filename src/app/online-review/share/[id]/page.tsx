"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { reviewSharePath, type ReviewRole } from "@/lib/review-client"
export default function SharedReviewPage({params}: {params:Promise<{id:string}>}) {
  const {id} = React.use(params), router = useRouter()
  const [error,setError] = React.useState("")
  React.useEffect(() => {
    let active = true
    const selected = new URLSearchParams(window.location.search).get("role")
    const role: ReviewRole = selected === "admin" || selected === "class" ? selected : "agency"
    void reviewSharePath(id,role).then(path => {if(active)router.replace(path)}).catch(() => {if(active)setError("미리보기를 열 수 없습니다. 기관 목록에서 다시 진입해 주세요.")})
    return () => {active=false}
  },[id,router])
  return <p role="status" className="p-8">{error || "학부모 발송 미리보기를 여는 중…"}</p>
}
