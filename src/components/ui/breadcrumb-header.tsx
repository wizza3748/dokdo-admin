"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

export function BreadcrumbHeader() {
    const pathname = usePathname()

    const getBreadcrumbs = () => {
        // [본사관리자] 그룹
        if (pathname.startsWith("/admin")) {
            const crumbs = [{ label: "[본사관리자]", href: "#" }]

            // 기관관리
            if (pathname.includes("/admin/institutions")) {
                crumbs.push({ label: "기관관리", href: "/admin/institutions" })
                if (pathname.split("/").length > 3) {
                    crumbs.push({ label: "기관 상세 정보", href: "#" })
                } else {
                    crumbs.push({ label: "기관 목록", href: "#" })
                }
            }
            // B2C관리
            else if (pathname.includes("/admin/b2c/students")) {
                crumbs.push({ label: "B2C관리", href: "/admin/b2c/students" })
                if (pathname.split("/").length > 4) {
                    crumbs.push({ label: "학생 상세 정보", href: "#" })
                } else {
                    crumbs.push({ label: "학생목록", href: "/admin/b2c/students" })
                }
            }
            // 학생 상세 (본사 측)
            else if (pathname.includes("/admin/students")) {
                crumbs.push({ label: "기관관리", href: "/admin/institutions" })
                crumbs.push({ label: "기관 상세 정보", href: "#" })
                crumbs.push({ label: "학생 상세 정보", href: "#" })
            }

            return crumbs
        }

        // [기관관리자] 그룹
        if (pathname.startsWith("/agency")) {
            const crumbs = [{ label: "[기관관리자]", href: "#" }]

            // 학생관리
            if (pathname.includes("/agency/students")) {
                crumbs.push({ label: "학생관리", href: "#" })
                if (pathname.split("/").length > 3) {
                    crumbs.push({ label: "학생목록", href: "/agency/students" })
                    crumbs.push({ label: "학생 상세 정보", href: "#" })
                } else {
                    crumbs.push({ label: "학생목록", href: "/agency/students" })
                }
            }

            return crumbs
        }

        if (pathname === "/") {
            return [{ label: "일감보드", href: "/" }]
        }

        return [{ label: "Dashboard", href: "/" }]
    }

    const breadcrumbs = getBreadcrumbs()

    return (
        <div className="flex items-center gap-2 text-[14px]">
            {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const content = (
                    <span className={`transition-colors ${isLast
                        ? "text-slate-800 font-black"
                        : "text-slate-400 font-medium hover:text-slate-600"
                        }`}>
                        {crumb.label}
                    </span>
                );

                return (
                    <React.Fragment key={index}>
                        {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                        {!isLast && crumb.href !== "#" ? (
                            <Link href={crumb.href}>{content}</Link>
                        ) : (
                            content
                        )}
                    </React.Fragment>
                )
            })}
        </div>
    )
}
