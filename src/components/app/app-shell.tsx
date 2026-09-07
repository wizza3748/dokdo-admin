"use client"

import { usePathname } from "next/navigation"
import { RefreshCw } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { AdminPageTabs } from "@/components/app/admin-page-tabs"
import { BreadcrumbHeader } from "@/components/ui/breadcrumb-header"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStudentFront = pathname === "/student" || pathname.startsWith("/student/")
  const isReadingFront = pathname === "/reading/index" || pathname.startsWith("/reading/")
  const isWorkbookPreview = pathname.startsWith("/online-workbook/preview/")
  const isAgency = pathname === "/agency" || pathname.startsWith("/agency/")
  const isTaskBoard = pathname === "/"

  if (isStudentFront || isReadingFront || isWorkbookPreview) {
    return <main className="min-h-screen w-full bg-white">{children}</main>
  }

  return (
    <SidebarProvider key={`app-shell:${pathname}`} defaultOpen={isTaskBoard} style={{ "--sidebar-width": "17.5rem" } as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-[#f3f5f7] [--admin-fixed-left:0px] md:[--admin-fixed-left:var(--sidebar-width)] md:peer-data-[state=collapsed]:[--admin-fixed-left:0px]">
        <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
          <SidebarTrigger className="-ml-1 text-slate-500" aria-label="사이드 메뉴 열기 또는 닫기" />
          <RefreshCw className="ml-1 size-4 text-slate-500" aria-hidden="true" />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <div className="flex items-center gap-2">
            <BreadcrumbHeader />
          </div>
        </header>
        {!isAgency && <AdminPageTabs />}
        <main className={cn("flex min-w-0 max-w-full flex-1 flex-col gap-4 overflow-x-hidden p-4", !isAgency && "lg:p-6")}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
