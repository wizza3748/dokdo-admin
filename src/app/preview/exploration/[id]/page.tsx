"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"
import { BookOpen, PenTool, CheckCircle2, XCircle, Star, ChevronRight, Clock } from "lucide-react"

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
            {/* Container - Mobile First 중앙 정렬 (세련된 프리미엄 옐로우 적용) */}
            <div className="w-full max-w-md bg-[#FEF3C7] min-h-svh flex flex-col shadow-2xl relative">

                {/* 2-1. 상단 영역 - 여백 및 타이틀 위계 강화 */}
                <header className="px-8 pt-12 pb-8 flex flex-col gap-4">
                    {data.student.type === "B2B" && data.student.orgName && (
                        <div className="flex items-center gap-1.5 text-blue-600">
                            <span className="text-xs font-bold tracking-widest uppercase">{data.student.orgName}</span>
                            <div className="size-1 rounded-full bg-blue-200" />
                            <span className="text-xs font-bold text-blue-300">REPORT</span>
                        </div>
                    )}
                    <div className="space-y-1">
                        <h1 className="text-[28px] font-bold text-slate-900 leading-[1.2] tracking-tight">
                            {data.student.name}의<br />
                            <span className="text-blue-600 decoration-blue-100 decoration-8 underline-offset-[-2px] underline">{data.context.baseDate}</span><br />
                            탐험 결과에요!
                        </h1>
                    </div>
                </header>

                {/* 2-2. 탭 영역 - 세련된 프리미엄 스타일 */}
                <div className="flex-1 flex flex-col">
                    <Tabs
                        defaultValue={defaultTab}
                        className="flex-1 flex flex-col"
                        onValueChange={handleTabChange}
                    >
                        {showTabs && (
                            <div className="px-8 mb-8">
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

                        <div className="flex-1 px-6 pb-24 space-y-10">
                            <TabsContent value="reading" className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {readingResults.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()).map((res, idx) => (
                                    <ResultCard key={res.completedAt} res={res} type="reading" />
                                ))}
                            </TabsContent>
                            <TabsContent value="writing" className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {writingResults.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()).map((res, idx) => (
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
            <div className="absolute -inset-2 bg-gradient-to-b from-blue-50/20 to-transparent rounded-[4rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <Card className="overflow-hidden border-none shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] rounded-[3.5rem] bg-white ring-1 ring-slate-100/50">
                <div className="p-9 space-y-12">

                    {/* --- [Reading Type] 미니멀 프리미엄 레이아웃 --- */}
                    {type === "reading" ? (
                        <div className="space-y-10">
                            {/* 헤더: 배지 영역 (레이블 없이 색상과 위치로 구분) */}
                            <div className="flex justify-between items-center px-1">
                                <Badge className={cn(
                                    "rounded-xl px-4 py-1.5 text-[12px] font-black border-none shadow-sm",
                                    res.exploreType === "첫 탐험" ? "bg-blue-600 text-white" : "bg-emerald-500 text-white"
                                )}>
                                    {res.exploreType}
                                </Badge>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100/50">
                                    <div className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    <span className="text-[11px] font-black text-slate-500 tracking-wider">LEVEL {res.level}</span>
                                </div>
                            </div>

                            {/* 메인 비주얼: 도서 이미지 (Lv. 오버레이 유지, 여백 방지 스케일업) */}
                            <div className="space-y-8">
                                <div className="relative w-full aspect-[3.2/4] rounded-[2.8rem] overflow-hidden shadow-2xl transition-all duration-700 group-hover:scale-[1.02] bg-white">
                                    <img src={res.bookImage} alt={res.bookTitle} className="w-full h-full object-cover scale-[1.05]" />
                                    <div className="absolute top-6 left-6">
                                        <div className="bg-white/95 backdrop-blur-md text-blue-600 rounded-2xl px-5 py-2 text-[16px] font-black shadow-xl ring-1 ring-black/5">Lv.{res.level}</div>
                                    </div>
                                </div>

                                {/* 타이틀 및 저자 (레이블 제거: 부모는 제목과 저자임을 직관적으로 인지) */}
                                <div className="space-y-3 px-2 text-center">
                                    <h2 className="text-[28px] font-black text-slate-900 leading-[1.15] break-keep">{res.bookTitle}</h2>
                                    <p className="text-[18px] font-bold text-slate-400 leading-snug">{res.author}</p>
                                </div>
                            </div>

                            {/* 메타 정보 섹션 (최소한의 구분자로 정제) */}
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-6 bg-slate-50/50 rounded-[2rem] border border-slate-100/50">
                                <Badge className="bg-blue-50 text-blue-600 border-none px-3 py-1 rounded-lg font-black text-[12px] shadow-sm">{res.category}</Badge>
                                <span className="text-slate-200">|</span>
                                <span className="text-[15px] font-black text-slate-700 tracking-tight">{res.roundInfo}</span>
                                <span className="text-slate-200">|</span>
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <Clock className="size-3.5 opacity-40" />
                                    <span className="text-[14px] font-bold">{format(parseISO(res.completedAt), "a hh:mm", { locale: ko })}</span>
                                </div>
                            </div>

                            {/* 상세 리포트 */}
                            <div className="space-y-7">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="size-8 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <BookOpen className="size-4 text-blue-500" />
                                    </div>
                                    <h3 className="text-[17px] font-black text-slate-800">탐험 상세 리포트</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {res.questions.map((q: any) => (
                                        <div key={q.no} className="flex flex-col items-center gap-3 p-4 rounded-[1.8rem] bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                            <span className="text-[11px] font-black text-slate-300">Q{q.no}</span>
                                            <div className={cn(
                                                "size-12 rounded-full flex items-center justify-center shadow-lg",
                                                q.isCorrect ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-red-400 text-white shadow-red-100"
                                            )}>
                                                {q.isCorrect ? <CheckCircle2 className="size-7" strokeWidth={3} /> : <XCircle className="size-6" strokeWidth={3} />}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-black px-2 py-0.5 rounded-md",
                                                q.isCorrect ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"
                                            )}>{q.area}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <FlowerReward count={res.flowerCount} />
                        </div>
                    ) : (
                        /* --- [Writing Type] 미니멀 프리미엄 레이아웃 --- */
                        <div className="space-y-12">
                            {/* 헤더 */}
                            <div className="flex justify-between items-center px-1">
                                <Badge className={cn(
                                    "rounded-xl px-4 py-1.5 text-[12px] font-black border-none shadow-sm",
                                    res.exploreType === "첫 탐험" ? "bg-blue-600 text-white" : "bg-emerald-500 text-white"
                                )}>
                                    {res.exploreType}
                                </Badge>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100/50">
                                    <div className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    <span className="text-[11px] font-black text-slate-500 tracking-wider">LEVEL {res.level}</span>
                                </div>
                            </div>

                            {/* 타이틀 중심부 (레이블 제거) */}
                            <div className="space-y-6 px-2 text-center">
                                <h2 className="text-[32px] font-black text-slate-900 leading-[1.2] break-keep">{res.title}</h2>
                                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-5 bg-slate-50/50 rounded-[1.8rem] border border-slate-50">
                                    <Badge className="bg-indigo-50 text-indigo-600 border-none px-3 py-1 rounded-lg font-black text-[12px]">{res.category}</Badge>
                                    <span className="text-slate-200">|</span>
                                    <span className="text-[15px] font-black text-slate-700">{res.roundInfo}</span>
                                    <span className="text-slate-200">|</span>
                                    <span className="text-[14px] font-bold text-slate-500">{format(parseISO(res.completedAt), "a hh:mm", { locale: ko })}</span>
                                </div>
                            </div>

                            {/* 종합 점수 (시각적 임팩트 강화) */}
                            <div className="pt-4 space-y-8">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                                            <PenTool className="size-4 text-indigo-500" />
                                        </div>
                                        <h3 className="text-[18px] font-black text-slate-800">종합 점수</h3>
                                    </div>
                                    <div className="relative">
                                        <div className="text-[48px] font-black text-indigo-600 leading-none tracking-tight">{res.avgScore}<span className="text-[18px] ml-1 opacity-60">점</span></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: "어휘력", val: res.scores.vocabulary, color: "bg-blue-500" },
                                        { label: "문장력", val: res.scores.sentence, color: "bg-emerald-500" },
                                        { label: "글 구성력", val: res.scores.structure, color: "bg-orange-400" },
                                        { label: "작문 상위 인지", val: res.scores.metacognition, color: "bg-purple-500" }
                                    ].map((s, i) => (
                                        <div key={i} className="group/score flex flex-col gap-3 p-5 rounded-[2.2rem] bg-white border border-slate-100 shadow-sm transition-all hover:shadow-xl">
                                            <div className="flex items-center">
                                                <span className="text-[14px] font-black text-slate-800 leading-tight break-keep">{s.label}</span>
                                            </div>
                                            <div className="flex items-baseline gap-1 px-3 py-1.5 bg-slate-50/50 rounded-xl w-fit">
                                                <span className="text-2xl font-black text-slate-900">{s.val}</span>
                                                <span className="text-[12px] font-bold text-slate-400">점</span>
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
        <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-100/50 group/reward">
            <div className="flex items-center gap-3">
                <div className="size-9 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/reward:scale-110 transition-transform">
                    <Star className="size-4 text-orange-400 fill-orange-400" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-slate-700 leading-none">섬초롱꽃 획득</span>
                </div>
            </div>
            <div className="flex items-baseline gap-0.5 px-4 py-1.5 bg-white rounded-xl shadow-sm border border-slate-200/30">
                <span className="text-2xl font-black text-orange-500">{count}</span>
                <span className="text-[12px] font-black text-orange-300">개</span>
            </div>
        </div>
    )
}
