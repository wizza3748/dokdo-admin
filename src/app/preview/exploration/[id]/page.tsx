"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"
import { BookOpen, PenTool, CheckCircle2, XCircle, Star, Clock } from "lucide-react"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// --- Mock Data (Unchanged Structure) ---
interface BaseResult {
    level: number
    completedAt: string
    exploreType: "첫 탐험" | "재탐험"
    flowerCount: number
}

interface ReadingResult extends BaseResult {
    category: "인문" | "문학" | "사회" | "과학·수학" | "예체능" | "고전" | "역사" | string
    bookTitle: string
    author: string
    bookImage: string
    roundInfo: string
    questions: { no: number; area: "사실" | "추론" | "비판"; isCorrect: boolean }[]
}

interface WritingResult extends BaseResult {
    category: "감상문" | "일기" | "건의문" | "홍보글" | "설명문" | "시" | "소개글" | "편지" | "논설문" | "연설문" | "기행문" | "이야기" | "기사문" | "사자성어" | string
    title: string
    roundInfo: string
    avgScore: number
    scores: {
        vocabulary: number
        sentence: number
        structure: number
        metacognition: number
    }
}

const MOCK_DATA = {
    header: { title: "박지우의 2026-02-06 탐험 결과에요!" },
    student: {
        name: "박지우",
        type: "B2B",
        orgName: "매일국어학원",
    },
    context: { baseDate: "2026-02-06" },
    data: {
        readingResults: [
            {
                level: 5,
                completedAt: "2026-02-06T10:30:00Z",
                exploreType: "첫 탐험",
                category: "문학",
                bookTitle: "똘망똘망 왕국의 비밀",
                author: "김미숙 글, 윤지영 그림",
                bookImage: "https://storage.dokdo.app/readlearn/upload/fJ5qx2UWkDQq3swdUG6xuGplkODHCy9iWE95FrOd.jpg",
                roundInfo: "1/3회차",
                flowerCount: 5,
                questions: [
                    { no: 1, area: "사실", isCorrect: true },
                    { no: 2, area: "추론", isCorrect: true },
                    { no: 3, area: "사실", isCorrect: false },
                    { no: 4, area: "비판", isCorrect: true },
                    { no: 5, area: "추론", isCorrect: true },
                    { no: 6, area: "사실", isCorrect: true },
                ],
            } as ReadingResult,
            {
                level: 5,
                completedAt: "2026-02-06T14:20:00Z",
                exploreType: "재탐험",
                category: "문학",
                bookTitle: "똘망똘망 왕국의 비밀",
                author: "김미숙 글, 윤지영 그림",
                bookImage: "https://storage.dokdo.app/readlearn/upload/fJ5qx2UWkDQq3swdUG6xuGplkODHCy9iWE95FrOd.jpg",
                roundInfo: "1/3회차",
                flowerCount: 6,
                questions: [
                    { no: 1, area: "사실", isCorrect: true },
                    { no: 2, area: "추론", isCorrect: false },
                    { no: 3, area: "사실", isCorrect: true },
                    { no: 4, area: "추론", isCorrect: true },
                    { no: 5, area: "비판", isCorrect: false },
                    { no: 6, area: "사실", isCorrect: true },
                ],
            } as ReadingResult,
        ],
        writingResults: [
            {
                level: 4,
                completedAt: "2026-02-06T11:15:00Z",
                exploreType: "첫 탐험",
                category: "사자성어",
                title: "맹모삼천(孟母三遷)의 뜻과 유래",
                roundInfo: "4회차",
                flowerCount: 4,
                avgScore: 85,
                scores: {
                    vocabulary: 90,
                    sentence: 80,
                    structure: 85,
                    metacognition: 85,
                },
            } as WritingResult,
            {
                level: 4,
                completedAt: "2026-02-06T15:45:00Z",
                exploreType: "재탐험",
                category: "사자성어",
                title: "맹모삼천(孟母三遷)의 뜻과 유래",
                roundInfo: "4회차",
                flowerCount: 5,
                avgScore: 92,
                scores: {
                    vocabulary: 95,
                    sentence: 88,
                    structure: 92,
                    metacognition: 93,
                },
            } as WritingResult,
        ],
    },
}

export default function ParentPreviewPage() {
    const params = useParams()
    const data = MOCK_DATA

    const { readingResults, writingResults } = data.data
    const hasReading = readingResults.length > 0
    const hasWriting = writingResults.length > 0
    const showTabs = hasReading && hasWriting

    const allResults = [
        ...readingResults.map(r => ({ ...r, type: "reading" })),
        ...writingResults.map(r => ({ ...r, type: "writing" }))
    ].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())

    const defaultTab = allResults[0]?.type === "reading" ? "reading" : "writing"

    const handleTabChange = () => {
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    return (
        <div className="min-h-svh bg-slate-200 flex flex-col items-center">
            {/* Container - Mobile First 중앙 정렬 */}
            <div className="w-full max-w-md bg-[#FEF3C7] min-h-svh flex flex-col shadow-2xl relative">

                {/* 상단 영역 */}
                <header className="px-6 pt-10 pb-6 flex flex-col gap-3">
                    {data.student.type === "B2B" && data.student.orgName && (
                        <div className="flex items-center gap-1.5 text-blue-600">
                            <span className="text-xs font-bold tracking-widest uppercase">{data.student.orgName}</span>
                            <div className="size-1 rounded-full bg-blue-200" />
                            <span className="text-xs font-bold text-blue-300">REPORT</span>
                        </div>
                    )}
                    <div className="space-y-1">
                        <h1 className="text-[26px] font-bold text-slate-900 leading-[1.2] tracking-tight">
                            {data.student.name}의<br />
                            <span className="text-blue-600 decoration-blue-100 decoration-8 underline-offset-[-2px] underline">{data.context.baseDate}</span><br />
                            탐험 결과에요!
                        </h1>
                    </div>
                </header>

                {/* 탭 영역 */}
                <div className="flex-1 flex flex-col">
                    <Tabs
                        defaultValue={defaultTab}
                        className="flex-1 flex flex-col"
                        onValueChange={handleTabChange}
                    >
                        {showTabs && (
                            <div className="px-6 mb-6">
                                <TabsList className="bg-transparent w-full flex justify-center gap-16 h-10 p-0 border-none rounded-none">
                                    <TabsTrigger
                                        value="reading"
                                        className="relative px-0 h-full rounded-none bg-transparent data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-slate-900 font-bold data-[state=active]:font-bold text-[18px] transition-all duration-300 border-none tracking-tight"
                                    >
                                        책 읽기
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="writing"
                                        className="relative px-0 h-full rounded-none bg-transparent data-[state=active]:bg-transparent text-slate-400 data-[state=active]:text-slate-900 font-bold data-[state=active]:font-bold text-[18px] transition-all duration-300 border-none tracking-tight"
                                    >
                                        글쓰기
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                        )}

                        <div className="flex-1 px-4 pb-20 space-y-6">
                            <TabsContent value="reading" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {readingResults.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()).map((res) => (
                                    <ResultCard key={res.completedAt} res={res} type="reading" />
                                ))}
                            </TabsContent>
                            <TabsContent value="writing" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {writingResults.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()).map((res) => (
                                    <ResultCard key={res.completedAt} res={res} type="writing" />
                                ))}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}

function ResultCard({ res, type }: { res: any, type: "reading" | "writing" }) {
    return (
        <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-b from-blue-50/20 to-transparent rounded-[3rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <Card className="overflow-hidden border-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] rounded-[2.5rem] bg-white ring-1 ring-slate-100/50">
                <div className="p-6 space-y-5">

                    {/* ── [공통] 헤더: 회차 강조 배지 + 탐험 유형 + 레벨 ── */}
                    <div className="flex items-center justify-between gap-2">
                        {/* 왼쪽: 회차 (최우선 강조) + 탐험 유형 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* 회차 강조 배지 */}
                            <div className="flex items-center gap-1 bg-amber-400 text-amber-950 px-3 py-1 rounded-full shadow-sm">
                                <span className="text-[13px] font-black tracking-tight">{res.roundInfo}</span>
                            </div>
                            {/* 첫탐험/재탐험 배지 */}
                            <Badge className={cn(
                                "rounded-full px-3 py-1 text-[11px] font-black border-none shadow-sm",
                                res.exploreType === "첫 탐험" ? "bg-blue-600 text-white" : "bg-emerald-500 text-white"
                            )}>
                                {res.exploreType}
                            </Badge>
                        </div>
                        {/* 오른쪽: 레벨 */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100/50 shrink-0">
                            <div className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                            <span className="text-[11px] font-black text-slate-500 tracking-wider">LEVEL {res.level}</span>
                        </div>
                    </div>

                    {/* ── [책 읽기] 카드 본문 ── */}
                    {type === "reading" ? (
                        <div className="space-y-5">
                            {/* 도서 정보: 소형 표지(좌) + 도서명/저자/메타(우) 가로 배치 */}
                            <div className="flex gap-4 items-start">
                                {/* 도서 표지 - 소형 */}
                                <div className="shrink-0 w-[88px] h-[116px] rounded-2xl overflow-hidden shadow-lg">
                                    <img
                                        src={res.bookImage}
                                        alt={res.bookTitle}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* 도서 텍스트 정보 */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between h-[116px] py-1">
                                    {/* 도서명 + 저자 */}
                                    <div>
                                        <h2 className="text-[16px] font-black text-slate-900 leading-snug break-keep line-clamp-2">{res.bookTitle}</h2>
                                        <p className="text-[13px] font-semibold text-slate-400 mt-1 line-clamp-1">{res.author}</p>
                                    </div>
                                    {/* 카테고리 + 완료 시각 */}
                                    <div className="flex items-center gap-2 flex-wrap mt-2">
                                        <Badge className="bg-blue-50 text-blue-600 border-none px-2.5 py-0.5 rounded-md font-black text-[11px] shadow-sm">{res.category}</Badge>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Clock className="size-3 opacity-50" />
                                            <span className="text-[12px] font-bold">{format(parseISO(res.completedAt), "a hh:mm", { locale: ko })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 탐험 상세 리포트 - 1줄 인라인 pill 형태 */}
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="size-6 rounded-md bg-blue-50 flex items-center justify-center">
                                        <BookOpen className="size-3 text-blue-500" />
                                    </div>
                                    <h3 className="text-[13px] font-black text-slate-800">탐험 상세 리포트</h3>
                                </div>
                                {/* 문항 pill 1줄 나열 - 가능한 한 줄에 */}
                                <div className="flex flex-wrap gap-1.5 px-1">
                                    {res.questions.map((q: any) => (
                                        <div
                                            key={q.no}
                                            className={cn(
                                                "flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-black",
                                                q.isCorrect
                                                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                                    : "bg-red-50 border-red-100 text-red-500"
                                            )}
                                        >
                                            <span className="text-[9px] font-black text-slate-400">Q{q.no}</span>
                                            {q.isCorrect
                                                ? <CheckCircle2 className="size-3.5 text-emerald-500" strokeWidth={3} />
                                                : <XCircle className="size-3.5 text-red-400" strokeWidth={3} />
                                            }
                                            <span className="text-[10px]">{q.area}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <FlowerReward count={res.flowerCount} />
                        </div>
                    ) : (
                        /* ── [글쓰기] 카드 본문 ── */
                        <div className="space-y-5">
                            {/* 글 제목 + 메타 정보 */}
                            <div className="space-y-3 px-1 text-center">
                                <h2 className="text-[22px] font-black text-slate-900 leading-[1.2] break-keep">{res.title}</h2>
                                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-3 py-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <Badge className="bg-indigo-50 text-indigo-600 border-none px-2.5 py-0.5 rounded-md font-black text-[11px]">{res.category}</Badge>
                                    <span className="text-slate-200">|</span>
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Clock className="size-3 opacity-50" />
                                        <span className="text-[13px] font-bold">{format(parseISO(res.completedAt), "a hh:mm", { locale: ko })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 종합 점수 */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                                            <PenTool className="size-3.5 text-indigo-500" />
                                        </div>
                                        <h3 className="text-[15px] font-black text-slate-800">종합 점수</h3>
                                    </div>
                                    <div className="relative">
                                        <div className="text-[40px] font-black text-indigo-600 leading-none tracking-tight">{res.avgScore}<span className="text-[15px] ml-1 opacity-60">점</span></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: "어휘력", val: res.scores.vocabulary, color: "bg-blue-500" },
                                        { label: "문장력", val: res.scores.sentence, color: "bg-emerald-500" },
                                        { label: "글 구성력", val: res.scores.structure, color: "bg-orange-400" },
                                        { label: "작문 상위 인지", val: res.scores.metacognition, color: "bg-purple-500" }
                                    ].map((s, i) => (
                                        <div key={i} className="flex flex-col gap-2 p-4 rounded-[1.6rem] bg-white border border-slate-100 shadow-sm">
                                            <span className="text-[13px] font-black text-slate-800 leading-tight break-keep">{s.label}</span>
                                            <div className="flex items-baseline gap-1 px-2.5 py-1 bg-slate-50/50 rounded-lg w-fit">
                                                <span className="text-xl font-black text-slate-900">{s.val}</span>
                                                <span className="text-[11px] font-bold text-slate-400">점</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <FlowerReward count={res.flowerCount} />
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}

function FlowerReward({ count }: { count: number }) {
    return (
        <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100/50 group/reward">
            <div className="flex items-center gap-3">
                <div className="size-8 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/reward:scale-110 transition-transform">
                    <Star className="size-4 text-orange-400 fill-orange-400" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-slate-700 leading-none">섬초롱꽃 획득</span>
                </div>
            </div>
            <div className="flex items-baseline gap-0.5 px-3.5 py-1.5 bg-white rounded-xl shadow-sm border border-slate-200/30">
                <span className="text-xl font-black text-orange-500">{count}</span>
                <span className="text-[11px] font-black text-orange-300">개</span>
            </div>
        </div>
    )
}
