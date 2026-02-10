"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
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
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
}

interface NavItem {
  title: string
  href?: string
  icon?: string
  type?: "label"
  children?: { title: string; href: string }[]
}

const navConfig: NavItem[] = [
  { title: "일감보드", href: "/", icon: "LayoutDashboard" },
  { title: "[본사관리자]", type: "label" },
  {
    title: "기관관리",
    icon: "Building2",
    children: [{ title: "기관목록", href: "/admin/institutions" }]
  },
  {
    title: "B2C관리",
    icon: "Users",
    children: [{ title: "학생목록", href: "/admin/b2c/students" }]
  },
  { title: "[기관관리자]", type: "label" },
  {
    title: "학생관리",
    icon: "GraduationCap",
    children: [{ title: "학생목록", href: "/agency/students" }]
  }
]

export function AppNav() {
  const pathname = usePathname()
  const [openItems, setOpenItems] = React.useState<Record<string, boolean>>({})

  const isMatch = (href?: string) => {
    if (!href) return false
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  // 경로 변경 시 활성 그룹 자동 확장
  React.useEffect(() => {
    const newOpenItems: Record<string, boolean> = { ...openItems }
    navConfig.forEach(item => {
      if (item.children && item.children.some(child => isMatch(child.href))) {
        newOpenItems[item.title] = true
      }
    })
    setOpenItems(newOpenItems)
  }, [pathname])

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          {navConfig.map((item, index) => {
            if (item.type === "label") {
              return (
                <SidebarGroupLabel key={index} className="mt-4 first:mt-0 text-sidebar-foreground/60 font-semibold tracking-wider">
                  {item.title}
                </SidebarGroupLabel>
              )
            }

            if (!item.children) {
              const Icon = item.icon ? icons[item.icon] : null
              const active = isMatch(item.href)
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton isActive={active} asChild tooltip={item.title}>
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
            const isOpen = openItems[item.title] ?? false

            return (
              <Collapsible
                key={item.title}
                asChild
                open={isOpen}
                onOpenChange={(open) => setOpenItems(prev => ({ ...prev, [item.title]: open }))}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.children.map((subItem) => {
                        const subActive = isMatch(subItem.href)
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton isActive={subActive} asChild>
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
