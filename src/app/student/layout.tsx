import { StudentToastProvider } from "@/components/student/student-toast"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentToastProvider>{children}</StudentToastProvider>
}
