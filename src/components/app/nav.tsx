"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenCheck,
  Building2,
  ChevronRight,
  GraduationCap,
  House,
  LayoutDashboard,
  Map,
  Users,
  type LucideIcon,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

const icons: Record<string, LucideIcon> = {
  BookOpenCheck,
  LayoutDashboard,
  Building2,
  Map,
  Users,
  GraduationCap,
  House,
}

interface NavItem {
  id: string
  title: string
  href?: string
  icon?: string
  type?: "label"
  children?: { title: string; href: string }[]
}

const navConfig: NavItem[] = [
  { id: "dashboard", title: "일감보드", href: "/", icon: "LayoutDashboard" },
  { id: "admin-label", title: "[본사관리자]", type: "label" },
  {
    id: "admin-institutions",
    title: "기관관리",
    icon: "Building2",
    children: [{ title: "기관목록", href: "/admin/institutions" }]
  },
  {
    id: "admin-b2c",
    title: "B2C관리",
    icon: "Users",
    children: [{ title: "학생목록", href: "/admin/b2c/students" }]
  },
  {
    id: "admin-exploration",
    title: "탐험관리",
    icon: "Map",
    children: [{ title: "탐험결과발송 현황", href: "/admin/exploration/send-status" }]
  },
  {
    id: "admin-online-workbooks",
    title: "온라인워크북 관리",
    icon: "BookOpenCheck",
    children: [{ title: "온라인워크북 현황", href: "/admin/online-workbooks" }]
  },
  { id: "agency-label", title: "[기관관리자]", type: "label" },
  {
    id: "agency-students",
    title: "학생관리",
    icon: "GraduationCap",
    children: [{ title: "학생목록", href: "/agency/students" }]
  },
  {
    id: "agency-online-workbooks",
    title: "온라인워크북 관리",
    icon: "BookOpenCheck",
    children: [{ title: "온라인워크북 목록", href: "/agency/online-workbooks" }]
  },
  { id: "student-label", title: "[학생프론트]", type: "label" },
  { id: "student-home", title: "홈", href: "/student", icon: "House" }
]

export function AppNav() {
  const pathname = usePathname()
  const [openItems, setOpenItems] = React.useState<Record<string, boolean>>({})

  const isMatch = (href?: string) => {
    if (!href) return false
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <SidebarContent className="bg-white">
      <SidebarGroup className="px-3 py-4">
        <SidebarMenu className="gap-1">
          {navConfig.map((item) => {
            if (item.type === "label") {
              return (
                <SidebarGroupLabel key={item.id} className="mt-4 h-8 px-2 text-xs font-semibold tracking-wide text-slate-400 first:mt-0">
                  {item.title}
                </SidebarGroupLabel>
              )
            }

            if (!item.children) {
              const Icon = item.icon ? icons[item.icon] : null
              const active = isMatch(item.href)
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton isActive={active} asChild tooltip={item.title} className="h-11 rounded-xl px-3 text-[15px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-600">
                    <Link href={item.href || "#"}>
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            }

            const Icon = item.icon ? icons[item.icon] : null
            const isGroupActive = item.children.some(child => isMatch(child.href))
            const isOpen = openItems[item.id] ?? isGroupActive

            return (
              <Collapsible
                key={item.id}
                asChild
                open={isOpen}
                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, [item.id]: open }))}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isGroupActive} tooltip={item.title} className="h-11 rounded-xl px-3 text-[15px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-600">
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mx-2 gap-1 border-0 px-0 py-1">
                      {item.children.map((subItem) => {
                        const subActive = isMatch(subItem.href)
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton isActive={subActive} asChild className="h-11 rounded-xl px-9 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 data-[active=true]:bg-blue-100/70 data-[active=true]:text-blue-600">
                              <Link href={subItem.href}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  )
}
