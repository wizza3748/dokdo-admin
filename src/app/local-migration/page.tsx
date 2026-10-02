"use client"

import { useState } from "react"
import { prototypeBrowserKeys } from "@/lib/prototype-browser-snapshot"

// No normal navigation links: an explicit local-only data export utility.
export default function LocalMigrationPage() {
  const [status, setStatus] = useState("")
  async function exportData() {
    if (!["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) { setStatus("로컬에서만 사용할 수 있습니다."); return }
    try {
      const values: Record<string, string> = {}
      for (const key of prototypeBrowserKeys) {
        const value = localStorage.getItem(key) ?? sessionStorage.getItem(key)
        if (value !== null) values[key] = value
      }
      const response = await fetch("/api/mock/browser-bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: 1, migrationId: crypto.randomUUID(), values }) })
      if (!response.ok) throw new Error("failed")
      setStatus(`브라우저 데이터 ${Object.keys(values).length}개 항목을 로컬 이전 파일에 보관했습니다.`)
    } catch { setStatus("보관하지 못했습니다. 원본 데이터는 변경되지 않았습니다.") }
  }
  return <main><h1>로컬 프로토타입 데이터 이전 준비</h1><p>독도 프로토타입 설정과 작성 데이터만 보관합니다. 원본은 삭제하지 않습니다.</p><button onClick={exportData}>현재 브라우저 데이터 보관</button><p role="status">{status}</p></main>
}
