"use client"

import * as React from "react"
import Link from "next/link"
import { Grid2X2, Pin, RefreshCw, X } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

type AdminTab = { href: string; title: string }

const STORAGE_KEY = "dokdo-admin-open-tabs"
const DASHBOARD_TAB: AdminTab = { href: "/", title: "대시보드" }

function resolveTab(pathname: string): AdminTab {
  if (pathname === "/") return DASHBOARD_TAB
  if (pathname === "/admin/exploration/workbook-templates") return { href: pathname, title: "워크북 템플릿 목록" }
  if (pathname === "/admin/exploration/workbook-templates/create") return { href: pathname, title: "워크북 템플릿 등록" }
  if (/^\/admin\/exploration\/workbook-templates\/\d+$/.test(pathname)) return { href: pathname, title: "워크북 템플릿 수정" }
  if (pathname === "/admin/exploration/reading") return { href: pathname, title: "책 읽기 목록" }
  if (/^\/admin\/exploration\/reading\/\d+\/edit$/.test(pathname)) return { href: pathname, title: "책 읽기 상세" }
  if (/^\/admin\/exploration\/reading\/\d+\/workbook\/\d+$/.test(pathname)) return { href: pathname, title: "온라인 워크북 설정" }
  if (pathname === "/admin/online-workbooks") return { href: pathname, title: "온라인워크북 현황" }
  if (pathname.startsWith("/admin/exploration/send-status")) return { href: pathname, title: "탐험결과발송" }
  if (pathname.startsWith("/admin/institutions")) return { href: pathname, title: pathname === "/admin/institutions" ? "기관 목록" : "기관 상세" }
  if (pathname.startsWith("/admin/b2c/students")) return { href: pathname, title: pathname === "/admin/b2c/students" ? "학생 목록" : "학생 상세" }
  return { href: pathname, title: "관리 화면" }
}

function restoreTabs(): AdminTab[] {
  if (typeof window === "undefined") return [DASHBOARD_TAB]
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]") as AdminTab[]
    return [DASHBOARD_TAB, ...stored.filter((tab) => tab.href !== "/" && tab.href.startsWith("/admin/"))]
  } catch {
    return [DASHBOARD_TAB]
  }
}

export function AdminPageTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const [tabs, setTabs] = React.useState<AdminTab[]>([DASHBOARD_TAB])
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    setTabs(restoreTabs())
    setReady(true)
  }, [])

  React.useEffect(() => {
    if (!ready || (pathname !== "/" && !pathname.startsWith("/admin/"))) return
    const current = resolveTab(pathname)
    setTabs((existing) => existing.some((tab) => tab.href === pathname) ? existing.map((tab) => tab.href === pathname ? current : tab) : [...existing, current])
  }, [pathname, ready])

  React.useEffect(() => {
    if (ready) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs.filter((tab) => tab.href !== "/")))
  }, [ready, tabs])

  const closeTab = (event: React.MouseEvent, href: string) => {
    event.preventDefault()
    event.stopPropagation()
    setTabs((existing) => {
      const index = existing.findIndex((tab) => tab.href === href)
      const next = existing.filter((tab) => tab.href !== href)
      if (href === pathname) router.push((next[Math.max(0, index - 1)] ?? DASHBOARD_TAB).href)
      return next
    })
  }

  return <div className="sticky top-[60px] z-20 flex h-12 min-w-0 items-stretch border-b border-slate-200 bg-white">
    <div className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const active = tab.href === pathname
        return <Link key={tab.href} href={tab.href} className={`group flex h-12 shrink-0 cursor-pointer items-center gap-2 border-r border-slate-200 px-4 text-sm transition ${active ? "rounded-t-xl bg-[#dcebff] font-bold text-blue-600" : "text-slate-600 hover:bg-slate-50"}`}>
          {tab.href === "/" && <Grid2X2 className="size-4" />}
          <span>{tab.title}</span>
          {tab.href === "/" ? <Pin className="size-3.5 text-slate-500" /> : <button type="button" onClick={(event) => closeTab(event, tab.href)} aria-label={`${tab.title} 탭 닫기`} className="grid size-6 cursor-pointer place-items-center rounded text-slate-400 hover:bg-white/80 hover:text-slate-700"><X className="size-3.5" /></button>}
        </Link>
      })}
    </div>
    <div className="flex shrink-0 items-center border-l border-slate-200 bg-white px-2"><button type="button" aria-label="현재 화면 새로고침" onClick={() => window.location.reload()} className="grid size-8 cursor-pointer place-items-center rounded-md text-slate-500 hover:bg-slate-100"><RefreshCw className="size-4" /></button><span className="mx-1 h-5 w-px bg-slate-200" /><span className="grid size-8 place-items-center text-slate-500"><Grid2X2 className="size-4" /></span></div>
  </div>
}
