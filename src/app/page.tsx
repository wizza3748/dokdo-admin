import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-stretch">

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
              <div className="grid grid-cols-[120px_1fr] border-b border-slate-50 hover:bg-blue-50/40 transition-colors group">
                <div className="p-5 text-center">
                  <a
                    href="https://sloop-dev.atlassian.net/browse/DD-1401"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors underline-offset-4 hover:underline"
                  >
                    DD-1401
                  </a>
                </div>
                <div className="p-5 text-[15px] font-semibold text-slate-700 border-l border-slate-50 group-hover:text-[#002855] transition-colors">
                  <Link href="/admin/exploration/send-status" className="hover:underline">
                    탐험관리 &gt; 탐험결과발송 현황
                  </Link>
                </div>
              </div>
              <div className="min-h-[80px] bg-slate-50/20">
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
              <div className="mx-2 mt-2 grid grid-cols-[150px_minmax(0,1fr)] overflow-hidden rounded-lg border border-amber-300 bg-amber-50/80 transition-colors hover:bg-amber-100/80 group">
                <div className="flex flex-nowrap items-center justify-center gap-1.5 p-4 text-center">
                  <a
                    href="https://sloop-dev.atlassian.net/browse/DD-1653"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap text-sm font-bold text-amber-700 underline underline-offset-4 transition-colors hover:text-amber-900"
                  >
                    DD-1653
                  </a>
                  <span className="shrink-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">NEW</span>
                </div>
                <div className="border-l border-amber-200 p-4 text-[14px] font-bold text-amber-700 transition-colors group-hover:text-amber-900">
                  <Link href="/agency/online-workbooks" className="hover:underline">
                    [공통] 온라인 워크북 2차 작성·피드백 기능 추가
                  </Link>
                </div>
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

        {/* 학생프론트 섹션 */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 ml-1">
            <div className="w-1.5 h-6 bg-[#002855] rounded-full shadow-sm" />
            <h2 className="text-xl font-bold text-[#002855] tracking-tight">학생프론트</h2>
          </div>
          <Card className="overflow-hidden border border-slate-100 py-0 h-full rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <CardContent className="p-0">
              <div className="grid grid-cols-[120px_1fr] border-b border-slate-100 bg-slate-50/80">
                <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">일감 ID</div>
                <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-l border-slate-100">제목</div>
              </div>
              <div className="mx-2 mt-2 grid grid-cols-[150px_minmax(0,1fr)] overflow-hidden rounded-lg border border-amber-300 bg-amber-50/80 transition-colors hover:bg-amber-100/80 group">
                <div className="flex flex-nowrap items-center justify-center gap-1.5 p-4 text-center">
                  <a
                    href="https://sloop-dev.atlassian.net/browse/DD-1653"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap text-sm font-bold text-amber-700 underline underline-offset-4 transition-colors hover:text-amber-900"
                  >
                    DD-1653
                  </a>
                  <span className="shrink-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">NEW</span>
                </div>
                <div className="border-l border-amber-200 p-4 text-[14px] font-bold text-amber-700 transition-colors group-hover:text-amber-900">
                  <Link href="/student" className="hover:underline">
                    [공통] 온라인 워크북 2차 작성·피드백 기능 추가
                  </Link>
                </div>
              </div>
              <div className="min-h-[112px] bg-slate-50/20" />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
