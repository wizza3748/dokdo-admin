import { StudentToastProvider } from "@/components/student/student-toast"
import "./student-font.css"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentToastProvider><div data-student-front>{children}</div></StudentToastProvider>
}
