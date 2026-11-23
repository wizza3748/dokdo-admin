"use client"

import { use, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

export default function StudentRewriteExample({ params }: { params: Promise<{ scenario: string }> }) {
  const { scenario } = use(params)
  const router = useRouter()
  const request = useRef<{ scenario: string; result: Promise<string> } | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    if (request.current?.scenario !== scenario) {
      const result = fetch("/api/mock/student-front-tests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open-rewrite", scenario }),
      }).then(async response => {
        const data = await response.json()
        if (!response.ok || !data.detailHref) throw new Error(data.message || "고쳐쓰기 예시를 열 수 없습니다.")
        return data.detailHref as string
      })
      request.current = { scenario, result }
    }
    request.current.result.then(href => { if (active) router.replace(href) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "고쳐쓰기 예시를 열 수 없습니다.") })
    return () => { active = false }
  }, [router, scenario])
  return <p className="p-6" role={error ? "alert" : "status"}>{error || "고쳐쓰기 예시를 여는 중입니다."}</p>
}
