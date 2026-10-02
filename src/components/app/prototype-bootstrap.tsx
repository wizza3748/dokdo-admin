"use client"

import { useEffect, useState } from "react"
import { validateBrowserSnapshot } from "@/lib/prototype-browser-snapshot"

export function PrototypeBootstrap({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [status, setStatus] = useState(enabled ? "loading" : "ready")
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    async function load() {
      try {
        const response = await fetch("/api/mock/browser-bootstrap", { cache: "no-store" })
        if (!response.ok) throw new Error("load failed")
        const input: unknown = await response.json()
        if (cancelled) return
        if (input) {
          const snapshot = validateBrowserSnapshot(input)
          const marker = `dokdo-bootstrap:${snapshot.migrationId}`
          if (!localStorage.getItem(marker)) {
            for (const [key, value] of Object.entries(snapshot.values)) {
              if (localStorage.getItem(key) === null) localStorage.setItem(key, value)
            }
            localStorage.setItem(marker, "1")
          }
        }
        setStatus("ready")
      } catch { if (!cancelled) setStatus("error") }
    }
    void load()
    return () => { cancelled = true }
  }, [enabled, retry])
  if (status === "loading") return <p role="status">프로토타입 데이터를 불러오는 중입니다.</p>
  if (status === "error") return <div role="alert"><p>이전 데이터를 불러오지 못했습니다. 저장소 연결을 확인해 주세요.</p><button onClick={() => { setStatus("loading"); setRetry(value => value + 1) }}>다시 시도</button></div>
  return children
}
