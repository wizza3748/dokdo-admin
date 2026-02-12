"use client"

import * as React from "react"
import { Search, RotateCcw, ExternalLink, Send, Calendar as CalendarIcon, X, Smartphone, Monitor } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

// --- Mock Data & Constants ---
const MOCK_LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6]

type SendMode = "수동" | "자동"
type SendStatus = "발송대기" | "발송완료" | "발송실패"
type StudyType = "책 읽기" | "글쓰기"

interface SendRecord {
    baseDate: string
    sendMode: SendMode
    sendStatus: SendStatus
    sentAt: string | null
    studyTypes: StudyType[]
    level: number
    firstCount: number
    retryCount: number
    previewUrl: string
    canSend: boolean
    canPreview: boolean
}

const MOCK_RECORDS: SendRecord[] = [
    {
        baseDate: format(new Date(), "yyyy-MM-dd"),
        sendMode: "수동",
        sendStatus: "발송대기",
        sentAt: null,
        studyTypes: ["책 읽기", "글쓰기"],
        level: 5,
        firstCount: 1,
        retryCount: 0,
        previewUrl: "/preview/exploration/1",
        canSend: true,
        canPreview: true,
    },
    {
        baseDate: "2026-02-05",
        sendMode: "자동",
        sendStatus: "발송완료",
        sentAt: "2026-02-05 21:00:12",
        studyTypes: ["책 읽기"],
        level: 5,
        firstCount: 1,
        retryCount: 1,
        previewUrl: "/preview/exploration/2",
        canSend: false,
        canPreview: true,
    },
    {
        baseDate: "2026-02-04",
        sendMode: "수동",
        sendStatus: "발송실패",
        sentAt: null,
        studyTypes: ["글쓰기"],
        level: 4,
        firstCount: 0,
        retryCount: 1,
        previewUrl: "/preview/exploration/3",
        canSend: false,
        canPreview: true,
    }
]

export function ExplorationResultSendingTab() {
    // --- States ---
    const [sendMode, setSendMode] = React.useState<SendMode>("수동")
    const [filter, setFilter] = React.useState({
        baseDate: undefined as Date | { from: Date; to: Date } | undefined,
        studyType: "전체",
        sendStatus: "전체",
    })
    // Single source of truth for records
    const [allRecords, setAllRecords] = React.useState<SendRecord[]>(MOCK_RECORDS)

    // Filter state applied to the view
    const [appliedFilter, setAppliedFilter] = React.useState(filter)
    const [toastVisible, setToastVisible] = React.useState(false)

    // Preview Modal States
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)
    const [selectedPreviewUrl, setSelectedPreviewUrl] = React.useState("")

    // Derived visible records - Source of truth is allRecords
    const visibleRecords = React.useMemo(() => {
        let filtered = [...allRecords]
        if (appliedFilter.studyType !== "전체") {
            filtered = filtered.filter(r => r.studyTypes.includes(appliedFilter.studyType as StudyType))
        }
        if (appliedFilter.sendStatus !== "전체") {
            filtered = filtered.filter(r => r.sendStatus === appliedFilter.sendStatus)
        }
        return filtered
    }, [allRecords, appliedFilter])

    // --- Logic ---
    const handleSearch = React.useCallback(() => {
        console.log("Applying search filters:", filter)
        setAppliedFilter(filter)
    }, [filter])

    const handleReset = () => {
        const resetFilter = {
            baseDate: undefined,
            studyType: "전체",
            sendStatus: "전체",
        }
        setFilter(resetFilter)
        setAppliedFilter(resetFilter)
    }

    // 필터 변경 시 자동 갱신 (일부 필드)
    React.useEffect(() => {
        setAppliedFilter(prev => ({
            ...prev,
            studyType: filter.studyType,
            sendStatus: filter.sendStatus
        }))
    }, [filter.studyType, filter.sendStatus])

    // ESC key to close preview
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsPreviewOpen(false)
        }
        window.addEventListener("keydown", handleEsc)
        return () => window.removeEventListener("keydown", handleEsc)
    }, [])

    const handleSendModeChange = (mode: SendMode) => {
        setSendMode(mode)
        setToastVisible(true)
        setTimeout(() => setToastVisible(false), 2000)
    }

    const canShowSendButton = (record: SendRecord) => {
        if (sendMode === "자동") return false // 상단 설정이 자동이면 모든 버튼 미노출

        if (record.sendMode === "자동") return false
        if (record.sendStatus === "발송완료") return false

        return record.sendMode === "수동" && (record.sendStatus === "발송대기" || record.sendStatus === "발송실패")
    }

    const handleSend = React.useCallback((record: SendRecord, e: React.MouseEvent) => {
        if (e && e.stopPropagation) e.stopPropagation();

        console.log("handleSend start")

        const result = window.confirm("해당 학생의 부모님에게 탐험 결과를 발송하시겠어요?")
        console.log("confirm result:", result)

        if (result === false) {
            console.log("cancelled");
            return;
        }

        // 발송 처리 시뮬레이션
        const now = format(new Date(), "yyyy-MM-dd HH:mm:ss")

        setAllRecords(prev => prev.map(r => {
            if (r.baseDate === record.baseDate && r.level === record.level) {
                return {
                    ...r,
                    sendStatus: "발송완료",
                    sentAt: now,
                    canSend: false
                }
            }
            return r
        }))

        alert(`${record.baseDate} 탐험 결과가 부모님에게 발송되었습니다.`)
    }, [])

    // --- Render ---
    return (
        <div className="flex flex-col gap-8 pb-10">

            {/* 1-1. 발송 설정 영역 - 컴팩트한 설정 바 형태로 단순화 */}
            <Card className="py-4 px-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight shrink-0">발송 설정</h3>
                        <div className="w-[1px] h-3 bg-slate-200" />
                        <p className="text-xs font-semibold text-slate-500">
                            자동 발송 시각은 21:00 입니다.
                        </p>
                    </div>
                    <div className="bg-slate-100 p-1 rounded-lg">
                        <Tabs value={sendMode} onValueChange={(v) => handleSendModeChange(v as SendMode)} className="w-[140px]">
                            <TabsList className="grid w-full grid-cols-2 h-7 bg-transparent border-none p-0">
                                <TabsTrigger value="수동" className="h-full rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-bold text-[12px]">수동</TabsTrigger>
                                <TabsTrigger value="자동" className="h-full rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-bold text-[12px]">자동</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
            </Card>

            {/* 1-2. 검색 필터 영역 - 보조 위계 */}
            <Card className="p-5 border border-slate-100 shadow-sm bg-slate-50/50">
                <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">

                        {/* 기준일 필터 */}
                        <div className="flex items-center gap-3">
                            <Label className="text-sm font-semibold w-14 shrink-0 text-right text-slate-600">기준일</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-[240px] h-8 justify-start text-left text-[13px] font-bold border-slate-200 bg-white rounded-lg shadow-sm",
                                            !filter.baseDate && "text-slate-400 font-medium"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                        {filter.baseDate ? (
                                            typeof filter.baseDate === 'object' && 'from' in filter.baseDate ? (
                                                filter.baseDate.to ? (
                                                    <>{format(filter.baseDate.from, "yyyy.MM.dd")} - {format(filter.baseDate.to, "yyyy.MM.dd")}</>
                                                ) : (
                                                    format(filter.baseDate.from, "yyyy.MM.dd")
                                                )
                                            ) : (
                                                format(filter.baseDate as Date, "yyyy.MM.dd")
                                            )
                                        ) : (
                                            <span>날짜를 선택하세요</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={new Date()}
                                        selected={filter.baseDate as any}
                                        onSelect={(v) => setFilter(prev => ({ ...prev, baseDate: v as any }))}
                                        numberOfMonths={2}
                                        locale={ko}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* 학습타입 */}
                        <div className="flex items-center gap-3">
                            <Label className="text-sm font-semibold w-14 shrink-0 text-right text-slate-600">학습타입</Label>
                            <div className="flex p-1 border border-slate-200 rounded-lg bg-white items-center shadow-sm">
                                {["전체", "책 읽기", "글쓰기"].map((type, idx) => (
                                    <React.Fragment key={type}>
                                        {idx > 0 && <div className="w-[1px] h-3 bg-slate-200 mx-1" />}
                                        <Button
                                            variant={filter.studyType === type ? "secondary" : "ghost"}
                                            className={cn(
                                                "h-8 rounded-md px-4 text-[13px] transition-all",
                                                filter.studyType === type
                                                    ? "bg-[#002855] text-white shadow-sm font-semibold hover:bg-[#001d3d]"
                                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                                            )}
                                            onClick={() => setFilter(prev => ({ ...prev, studyType: type }))}
                                        >
                                            {type}
                                        </Button>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* 발송상태 */}
                        <div className="flex items-center gap-3">
                            <Label className="text-sm font-semibold w-14 shrink-0 text-right text-slate-600">발송상태</Label>
                            <div className="flex p-1 border border-slate-200 rounded-lg bg-white items-center shadow-sm">
                                {["전체", "발송대기", "발송완료", "발송실패"].map((status, idx) => (
                                    <React.Fragment key={status}>
                                        {idx > 0 && <div className="w-[1px] h-3 bg-slate-200 mx-1" />}
                                        <Button
                                            variant={filter.sendStatus === status ? "secondary" : "ghost"}
                                            className={cn(
                                                "h-8 rounded-md px-4 text-[13px] transition-all",
                                                filter.sendStatus === status
                                                    ? "bg-[#002855] text-white shadow-sm font-semibold hover:bg-[#001d3d]"
                                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                                            )}
                                            onClick={() => setFilter(prev => ({ ...prev, sendStatus: status }))}
                                        >
                                            {status}
                                        </Button>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons - Moved to right of filters */}
                        <div className="flex items-center gap-2 ml-auto">
                            <Button
                                variant="outline"
                                className="h-8 px-4 border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-semibold text-[13px]"
                                onClick={handleReset}
                            >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                초기화
                            </Button>
                            <Button
                                className="h-8 px-6 bg-[#002855] hover:bg-[#001d3d] text-white rounded-lg shadow-sm font-bold text-[13px] transition-all"
                                onClick={handleSearch}
                            >
                                <Search className="w-3.5 h-3.5 mr-1.5" />
                                검색하기
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* 1-4. 발송 목록 영역 - 최하단 위계 */}
            <Card className="border border-slate-100 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-b-slate-100">
                            <TableHead className="w-[120px] font-semibold text-slate-400 py-4 pl-8">기준일</TableHead>
                            <TableHead className="w-[100px] font-semibold text-slate-400">발송모드</TableHead>
                            <TableHead className="w-[120px] font-semibold text-slate-400">발송상태</TableHead>
                            <TableHead className="font-semibold text-slate-400">발송시각</TableHead>
                            <TableHead className="font-semibold text-slate-400">학습타입</TableHead>
                            <TableHead className="text-center font-semibold text-slate-400">레벨</TableHead>
                            <TableHead className="text-center font-semibold text-slate-400">첫 탐험</TableHead>
                            <TableHead className="text-center font-semibold text-slate-400">재탐험</TableHead>
                            <TableHead className="text-center font-semibold text-slate-400 w-[120px]">발송</TableHead>
                            <TableHead className="text-center font-semibold text-slate-400 w-[120px] pr-8">미리보기</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleRecords.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-40 text-center text-slate-300 font-bold">
                                    조회된 데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleRecords.map((record: SendRecord, i: number) => (
                                <TableRow key={`${record.baseDate}-${record.level}-${i}`} className="group hover:bg-slate-50/50 border-b-slate-50 transition-colors">
                                    <TableCell className="font-semibold text-slate-600 py-5 pl-8">{record.baseDate}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "font-semibold text-[10px] px-2 py-0.5",
                                            record.sendMode === "자동" ? "text-emerald-500 border-emerald-100 bg-emerald-50" : "text-slate-400 border-slate-200"
                                        )}>
                                            {record.sendMode}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn(
                                                "size-1.5 rounded-full",
                                                record.sendStatus === "발송완료" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                                    record.sendStatus === "발송실패" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-slate-300"
                                            )} />
                                            <span className={cn(
                                                "text-sm font-semibold",
                                                record.sendStatus === "발송완료" ? "text-emerald-600" :
                                                    record.sendStatus === "발송실패" ? "text-red-500" : "text-slate-400"
                                            )}>
                                                {record.sendStatus}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-xs font-bold",
                                        record.sendStatus === "발송완료" ? "text-slate-500" : "text-slate-200"
                                    )}>
                                        {record.sendStatus === "발송완료" ? record.sentAt : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {record.studyTypes.map((st: StudyType) => (
                                                <span key={st} className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                                    {st}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="inline-flex items-center justify-center size-8 bg-slate-50 rounded-lg text-sm font-semibold text-slate-700">
                                            {record.level}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-medium text-slate-600">
                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                                            {record.firstCount}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center font-medium text-slate-600">
                                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-semibold">
                                            {record.retryCount}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {canShowSendButton(record) && (
                                            <Button
                                                size="sm"
                                                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-100 transition-all rounded-lg gap-2"
                                                onClick={handleSend.bind(null, record)}
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                발송
                                            </Button>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center pr-8">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-9 px-3 text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all rounded-lg gap-1.5 font-bold"
                                            onClick={() => {
                                                setSelectedPreviewUrl(record.previewUrl)
                                                setIsPreviewOpen(true)
                                            }}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            미리보기
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Local Toast UI */}
            {toastVisible && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700/50">
                        <div className="size-2 bg-blue-400 rounded-full animate-pulse" />
                        <span className="text-sm font-semibold tracking-tight">발송 설정이 변경되었습니다!</span>
                    </div>
                </div>
            )}

            {/* Premium Preview Modal */}
            {isPreviewOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 px-4"
                    onClick={() => setIsPreviewOpen(false)}
                >
                    <Card
                        className="w-full max-w-[500px] bg-white rounded-[32px] shadow-2xl overflow-hidden border-none flex flex-col max-h-[92vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Smartphone className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="font-black text-slate-800 tracking-tight">탐험 결과 미리보기</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg text-slate-500 font-bold gap-1.5 border-slate-200"
                                    onClick={() => window.open(selectedPreviewUrl, "_blank")}
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span className="text-xs">새 창으로 열기</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400"
                                    onClick={() => setIsPreviewOpen(false)}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Modal Body - iPhone Frame */}
                        <div className="flex-1 bg-slate-50 relative flex justify-center py-8 overflow-hidden">
                            {/* iPhone Frame Container (Outer Bezel) */}
                            {/* screen 390px + bezel padding = 420px */}
                            {/* Force a portrait height explicitly */}
                            <div className="relative w-[420px] h-[780px] bg-[#1a1a1a] rounded-[54px] p-3 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[3px] border-[#333] flex flex-col overflow-hidden shrink-0 my-auto">

                                {/* Dynamic Island Area (Top centered) */}
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-[20px] z-30 flex items-center justify-center">
                                    <div className="size-1 rounded-full bg-[#222] mr-6" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#222]" />
                                </div>

                                {/* Inner Bezel & Screen Container */}
                                <div className="w-full h-full bg-white rounded-[42px] overflow-hidden relative shadow-inner">
                                    {/* Scrollable Container (Single Scroll Source) */}
                                    <div className="w-full h-full overflow-y-auto overflow-x-hidden bg-white custom-scrollbar">
                                        {/* iframe - fixed 390px forced */}
                                        <iframe
                                            src={selectedPreviewUrl}
                                            className="w-[390px] h-[3500px] border-none"
                                            title="Preview Content"
                                            style={{
                                                width: '390px',
                                                height: '3500px', // Large height to allow parent container to scroll
                                                display: 'block',
                                                margin: '0 auto',
                                                overflow: 'hidden'
                                            }}
                                            scrolling="no"
                                        />
                                    </div>

                                    {/* Top Status Bar Decoration */}
                                    <div className="absolute top-0 left-0 w-full h-8 bg-transparent pointer-events-none z-20" />
                                </div>

                                {/* Side Button Mocks (Subtle highlights) */}
                                <div className="absolute top-[120px] -left-[1px] w-[3px] h-[60px] bg-gradient-to-b from-[#555] to-[#222] rounded-r-md z-10" />
                                <div className="absolute top-[190px] -left-[1px] w-[3px] h-[60px] bg-gradient-to-b from-[#555] to-[#222] rounded-r-md z-10" />
                                <div className="absolute top-[160px] -right-[1px] w-[3px] h-[100px] bg-gradient-to-b from-[#555] to-[#222] rounded-l-md z-10" />
                            </div>
                        </div>
                    </Card>

                    {/* Internal Styling for scrollbar hiding and refinement */}
                    <style jsx global>{`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 6px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: rgba(0,0,0,0.12);
                            border-radius: 10px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: rgba(0,0,0,0.25);
                        }
                    `}</style>
                </div>
            )}
        </div>
    )
}
