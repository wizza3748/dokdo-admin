import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

        {/* 본사관리자 섹션 */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 ml-1">
            <div className="w-1.5 h-6 bg-[#002855] rounded-full shadow-sm" />
            <h2 className="text-xl font-bold text-[#002855] tracking-tight">본사관리자</h2>
          </div>
          <Card className="overflow-hidden border border-slate-100 py-0 h-full rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <CardContent className="p-0">
              <div className="grid grid-cols-[120px_1fr] border-b border-slate-100 bg-slate-50/80">
                <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">일감 ID</div>
                <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-l border-slate-100">제목</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] border-b border-slate-50 hover:bg-blue-50/40 transition-colors group">
                <div className="p-5 text-center">
                  <a
                    href="https://sloop-dev.atlassian.net/browse/DD-1319"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors underline-offset-4 hover:underline"
                  >
                    DD-1319
                  </a>
                </div>
                <div className="p-5 text-[15px] font-semibold text-slate-700 border-l border-slate-50 group-hover:text-[#002855] transition-colors">
                  <Link href="/admin/b2c/students/26142?tab=send" className="hover:underline">
                    독도 탐험결과 발송 기능 (카카오 알림톡) - B2C
                  </Link>
                </div>
              </div>
              <div className="min-h-[120px] bg-slate-50/20">
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 기관관리자 섹션 */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 ml-1">
            <div className="w-1.5 h-6 bg-[#002855] rounded-full shadow-sm" />
            <h2 className="text-xl font-bold text-[#002855] tracking-tight">기관관리자</h2>
          </div>
          <Card className="overflow-hidden border border-slate-100 py-0 h-full rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <CardContent className="p-0">
              <div className="grid grid-cols-[120px_1fr] border-b border-slate-100 bg-slate-50/80">
                <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">일감 ID</div>
                <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-l border-slate-100">제목</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] border-b border-slate-50 hover:bg-blue-50/40 transition-colors group">
                <div className="p-5 text-center">
                  <a
                    href="https://sloop-dev.atlassian.net/browse/DD-1319"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors underline-offset-4 hover:underline"
                  >
                    DD-1319
                  </a>
                </div>
                <div className="p-5 text-[15px] font-semibold text-slate-700 border-l border-slate-50 group-hover:text-[#002855] transition-colors">
                  <Link href="/agency/students/26142?tab=send" className="hover:underline">
                    독도 탐험결과 발송 기능 (카카오 알림톡) - B2B
                  </Link>
                </div>
              </div>
              <div className="min-h-[120px] bg-slate-50/20">
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
