"use client"

import * as React from "react"
import { createPortal } from "react-dom"

const StudentToastContext = React.createContext<((message: string) => void) | null>(null)

export function StudentToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = React.useState("")
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = React.useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current)
    setMessage(next)
    timer.current = setTimeout(() => { setMessage(""); timer.current = null }, 2000)
  }, [])
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return <StudentToastContext.Provider value={show}>{children}{message && createPortal(
    <p role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none fixed bottom-24 left-1/2 z-[100] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-[#28333b] px-6 py-3 text-center text-sm font-bold text-white shadow-xl sm:text-base">{message}</p>, document.body,
  )}</StudentToastContext.Provider>
}

export function useStudentToast() {
  const show = React.useContext(StudentToastContext)
  if (!show) throw new Error("StudentToastProvider is required")
  return show
}
