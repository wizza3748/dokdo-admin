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
  if (pathname === "/agency/students") return { href: pathname, title: "학생목록" }
  if (pathname.startsWith("/agency/students/")) return { href: pathname, title: "학생 상세 정보" }
  if (pathname === "/agency/online-workbooks") return { href: pathname, title: "온라인 독후감 목록" }
  if (pathname.startsWith("/agency/online-workbooks/")) return { href: pathname, title: "온라인 독후감 상세" }
  if (pathname === "/admin/exploration/workbook-templates") return { href: pathname, title: "독후감 템플릿 목록" }
  if (pathname === "/admin/exploration/workbook-templates/create") return { href: pathname, title: "독후감 템플릿 등록" }
  if (/^\/admin\/exploration\/workbook-templates\/\d+$/.test(pathname)) return { href: pathname, title: "독후감 템플릿 수정" }
  if (pathname === "/admin/exploration/reading") return { href: pathname, title: "책 읽기 목록" }
  if (/^\/admin\/exploration\/reading\/\d+\/edit$/.test(pathname)) return { href: pathname, title: "책 읽기 상세" }
  if (/^\/admin\/exploration\/reading\/\d+\/workbook\/\d+$/.test(pathname)) return { href: pathname, title: "온라인 독후감 설정" }
  if (pathname === "/admin/online-workbooks") return { href: pathname, title: "온라인 독후감 현황" }
  if (pathname.startsWith("/admin/exploration/send-status")) return { href: pathname, title: "탐험결과발송" }
  if (pathname.startsWith("/admin/institutions")) return { href: pathname, title: pathname === "/admin/institutions" ? "기관 목록" : "기관 상세" }
  if (pathname.startsWith("/admin/b2c/students")) return { href: pathname, title: pathname === "/admin/b2c/students" ? "학생 목록" : "학생 상세" }
  return { href: pathname, title: "관리 화면" }
}

function restoreTabs(storageKey: string, scope: "admin" | "agency"): AdminTab[] {
  if (typeof window === "undefined") return [DASHBOARD_TAB]
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]") as AdminTab[]
    return [DASHBOARD_TAB, ...stored
      .filter((tab) => tab.href !== "/" && tab.href.startsWith(`/${scope}/`))
      .map((tab) => {
        const pathname = tab.href.split("?")[0]
        const renamed = pathname.startsWith("/admin/exploration/workbook-templates") || /^\/admin\/exploration\/reading\/\d+\/workbook\/\d+$/.test(pathname)
        return renamed ? { ...tab, title: resolveTab(pathname).title } : tab
      })]
  } catch {
    return [DASHBOARD_TAB]
  }
}

export function AdminPageTabs({ scope = "admin" }: { scope?: "admin" | "agency" }) {
  const pathname = usePathname()
  const router = useRouter()
  const [tabs, setTabs] = React.useState<AdminTab[]>([DASHBOARD_TAB])
  const [ready, setReady] = React.useState(false)
  const storageKey = scope === "agency" ? "dokdo-agency-open-tabs" : STORAGE_KEY

  React.useEffect(() => {
    setTabs(restoreTabs(storageKey, scope))
    setReady(true)
  }, [storageKey, scope])

  React.useEffect(() => {
    if (!ready || (pathname !== "/" && !pathname.startsWith(`/${scope}/`))) return
    const current = resolveTab(pathname)
    current.href += window.location.search
    setTabs((existing) => existing.some((tab) => tab.href.split("?")[0] === pathname) ? existing.map((tab) => tab.href.split("?")[0] === pathname ? current : tab) : [...existing, current])
  }, [pathname, ready, scope])

  React.useEffect(() => {
    if (ready) window.sessionStorage.setItem(storageKey, JSON.stringify(tabs.filter((tab) => tab.href !== "/")))
  }, [ready, tabs, storageKey])

  const closeTab = (event: React.MouseEvent, href: string) => {
    event.preventDefault()
    event.stopPropagation()
    const index = tabs.findIndex((tab) => tab.href === href)
    const next = tabs.filter((tab) => tab.href !== href)
    const nextHref = (next[Math.max(0, index - 1)] ?? DASHBOARD_TAB).href

    setTabs(next)
    if (href.split("?")[0] === pathname) router.push(nextHref)
  }

  return <div className="sticky top-[60px] z-20 flex h-12 min-w-0 items-stretch border-b border-slate-200 bg-white">
    <div className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const active = tab.href.split("?")[0] === pathname
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
