"use client"

import { usePathname } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { BreadcrumbHeader } from "@/components/ui/breadcrumb-header"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStudentFront = pathname === "/student" || pathname.startsWith("/student/")

  if (isStudentFront) {
    return <main className="min-h-screen w-full bg-white">{children}</main>
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="bg-slate-50/50 min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/80 backdrop-blur px-4 sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 px-4">
            <BreadcrumbHeader />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6 min-w-0 max-w-full overflow-x-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
