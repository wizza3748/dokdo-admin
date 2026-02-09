"use client"

import * as React from "react"
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
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-transparent group-hover:scale-110 transition-transform overflow-hidden">
                                    <img src="https://admin.dokdo.app/assets/dokdo_256.b304d946.png" alt="Dokdo Admin" className="size-full object-contain" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                                    <span className="font-semibold">Dokdo Admin</span>
                                    <span className="text-[11px] opacity-70">Management System</span>
                                </div>
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
