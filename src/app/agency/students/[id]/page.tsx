"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { StudentDetailView } from "@/components/app/students/student-detail-view"

export default function AgencyStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <div className="flex flex-col gap-6 p-4">

            <StudentDetailView id={id} onBack={() => router.push('/agency/students')} />
        </div>
    )
}
