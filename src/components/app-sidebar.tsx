"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"

import { AppNav } from "@/components/app/nav"
import {
    Sidebar,
    SidebarHeader,
    SidebarRail,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" className="border-r border-slate-200" {...props}>
            <SidebarHeader className="h-[66px] justify-center border-b border-slate-100 px-3 py-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="h-12 rounded-xl px-2 text-slate-900 hover:bg-transparent hover:text-slate-900">
                            <Link href="/">
                                <div className="flex aspect-square size-9 items-center justify-center overflow-hidden rounded-lg bg-blue-50 transition-transform group-hover:scale-105">
                                    <Image unoptimized src="https://admin.dokdo.app/assets/dokdo_256.b304d946.png" alt="Dokdo Admin" width={36} height={36} className="size-full object-contain" />
                                </div>
                                <span className="text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">Prototype</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <AppNav />
            <SidebarRail />
        </Sidebar>
    )
}
