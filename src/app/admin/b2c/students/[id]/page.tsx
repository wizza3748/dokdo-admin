"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { B2CStudentDetailView } from "@/components/app/students/b2c-student-detail-view"

export default function B2CStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const resolvedParams = React.use(params)
    const id = resolvedParams.id

    return (
        <div className="flex flex-col gap-4 p-4">
            <B2CStudentDetailView
                id={id}
                onBack={() => router.push("/admin/b2c/students")}
            />
        </div>
    )
}
