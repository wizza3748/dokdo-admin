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
  children?: NavChild[]
}

interface NavChild {
  title: string
  href?: string
  children?: NavChild[]
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
    children: [
      { title: "글쓰기", href: "#" },
      {
        title: "책 읽기",
        children: [
          { title: "책그룹 관리", href: "#" },
          { title: "책 읽기 목록", href: "/admin/exploration/reading" },
          { title: "온라인워크북 현황", href: "/admin/online-workbooks" },
        ],
      },
      { title: "영상편지", href: "#" },
      { title: "끊어읽기", href: "#" },
      { title: "워크북 템플릿", href: "/admin/exploration/workbook-templates" },
      { title: "탐험결과발송", href: "/admin/exploration/send-status" },
    ]
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
    if (!href || href === "#") return false
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const isChildActive = (child: NavChild): boolean => isMatch(child.href) || Boolean(child.children?.some(isChildActive))

  const renderChild = (child: NavChild, depth = 0): React.ReactNode => {
    if (child.children) {
      const childActive = isChildActive(child)
      const childKey = `nested-${child.title}`
      const childOpen = openItems[childKey] ?? childActive
      return <Collapsible key={child.title} open={childOpen} onOpenChange={(open) => setOpenItems((current) => ({ ...current, [childKey]: open }))} className="group/nested">
        <SidebarMenuSubItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuSubButton isActive={childActive} className="h-11 w-full cursor-pointer rounded-xl px-5 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 data-[active=true]:bg-transparent data-[active=true]:text-blue-600">
              <span>{child.title}</span><ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/nested:rotate-90" />
            </SidebarMenuSubButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="mx-0 gap-1 border-0 px-0 py-1">
              {child.children.map((nested) => renderChild(nested, depth + 1))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuSubItem>
      </Collapsible>
    }
    const active = isMatch(child.href)
    const content = <span>{child.title}</span>
    return <SidebarMenuSubItem key={child.title}>
      <SidebarMenuSubButton isActive={active} asChild={Boolean(child.href && child.href !== "#")} className={`h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 data-[active=true]:bg-blue-100/70 data-[active=true]:text-blue-600 ${depth ? "px-12" : "px-9"}`}>
        {child.href && child.href !== "#" ? <Link href={child.href}>{content}</Link> : <button type="button" className="w-full cursor-default text-left">{content}</button>}
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
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
            const isGroupActive = item.children.some(isChildActive) || (item.id === "admin-exploration" && pathname.startsWith("/admin/exploration"))
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
                      {item.children.map((subItem) => renderChild(subItem))}
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
