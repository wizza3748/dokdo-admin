"use client"

import * as React from "react"
import { Search, RotateCcw, ExternalLink, Send, Calendar as CalendarIcon } from "lucide-react"
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
    const [records, setRecords] = React.useState<SendRecord[]>(MOCK_RECORDS)
    const [toastVisible, setToastVisible] = React.useState(false)

    // --- Logic ---
    const handleSearch = React.useCallback(() => {
        // 실제 환경에서는 여기서 API 호출
        console.log("Searching with:", filter)
        // 필터링 시뮬레이션
        let filtered = [...MOCK_RECORDS]
        if (filter.studyType !== "전체") {
            filtered = filtered.filter(r => r.studyTypes.includes(filter.studyType as StudyType))
        }
        if (filter.sendStatus !== "전체") {
            filtered = filtered.filter(r => r.sendStatus === filter.sendStatus)
        }
        setRecords(filtered)
    }, [filter])

    const handleReset = () => {
        setFilter({
            baseDate: undefined,
            studyType: "전체",
            sendStatus: "전체",
        })
    }

    // 필터 변경 시 자동 갱신
    React.useEffect(() => {
        handleSearch()
    }, [filter.studyType, filter.sendStatus, handleSearch])

    const handleSendModeChange = (mode: SendMode) => {
        setSendMode(mode)
        setToastVisible(true)
        setTimeout(() => setToastVisible(false), 2000)
    }

    const canShowSendButton = (record: SendRecord) => {
        if (sendMode === "자동") return false // 상단 설정이 자동이면 모든 버튼 미노출

        const today = format(new Date(), "yyyy-MM-dd") // Asia/Seoul 가정 (브라우저 로컬)
        const isToday = record.baseDate === today

        // 12개 조합 규칙 적용
        if (record.sendMode === "자동") return false
        if (record.sendStatus === "발송완료") return false
        if (!isToday) return false

        // 수동 + (발송대기 | 발송실패) + 오늘
        return record.sendMode === "수동" && (record.sendStatus === "발송대기" || record.sendStatus === "발송실패") && isToday
    }

    const handleSend = (record: SendRecord) => {
        if (window.confirm("해당 학생의 부모님에게 탐험 결과를 발송하시겠어요?")) {
            alert(`${record.baseDate} 탐험 결과가 발송되었습니다.`)
            // 발송 성공 처리 시뮬레이션
            setRecords(prev => prev.map(r =>
                r.baseDate === record.baseDate
                    ? { ...r, sendStatus: "발송완료", sentAt: format(new Date(), "yyyy-MM-dd HH:mm:ss") }
                    : r
            ))
        }
    }

    // --- Render ---
    return (
        <div className="flex flex-col gap-8 pb-10">

            {/* 1-1. 발송 설정 영역 - 가장 강한 위계 */}
            <Card className="p-8 border-2 border-slate-200 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">발송 설정</h3>
                        <p className="text-sm font-semibold text-slate-500">
                            {sendMode === "자동" ? "자동 발송 시각은 21:00 입니다." : "수동 발송 모드입니다. 목록에서 발송 버튼을 눌러주세요."}
                        </p>
                    </div>
                    <div className="bg-slate-100 p-1 rounded-xl">
                        <Tabs value={sendMode} onValueChange={(v) => handleSendModeChange(v as SendMode)} className="w-[180px]">
                            <TabsList className="grid w-full grid-cols-2 h-9 bg-transparent">
                                <TabsTrigger value="수동" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-bold">수동</TabsTrigger>
                                <TabsTrigger value="자동" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-bold">자동</TabsTrigger>
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
                            <TableHead className="w-[120px] font-bold text-slate-400 py-4 pl-8">기준일</TableHead>
                            <TableHead className="w-[100px] font-bold text-slate-400">발송모드</TableHead>
                            <TableHead className="w-[120px] font-bold text-slate-400">발송상태</TableHead>
                            <TableHead className="font-bold text-slate-400">발송시각</TableHead>
                            <TableHead className="font-bold text-slate-400">학습타입</TableHead>
                            <TableHead className="text-center font-bold text-slate-400">레벨</TableHead>
                            <TableHead className="text-center font-bold text-slate-400">첫 탐험</TableHead>
                            <TableHead className="text-center font-bold text-slate-400">재탐험</TableHead>
                            <TableHead className="text-center font-bold text-slate-400 w-[120px]">발송</TableHead>
                            <TableHead className="text-center font-bold text-slate-400 w-[120px] pr-8">미리보기</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-40 text-center text-slate-300 font-bold">
                                    조회된 데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((record, i) => (
                                <TableRow key={i} className="group hover:bg-slate-50/50 border-b-slate-50 transition-colors">
                                    <TableCell className="font-black text-slate-600 py-5 pl-8">{record.baseDate}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "font-black text-[10px] px-2 py-0.5",
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
                                                "text-sm font-black",
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
                                            {record.studyTypes.map(st => (
                                                <span key={st} className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-md">
                                                    {st}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="inline-flex items-center justify-center size-8 bg-slate-50 rounded-lg text-sm font-black text-slate-700">
                                            {record.level}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-slate-600">
                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black">
                                            {record.firstCount}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-slate-600">
                                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-black">
                                            {record.retryCount}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {canShowSendButton(record) && (
                                            <Button
                                                size="sm"
                                                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-100 transition-all rounded-lg gap-2"
                                                onClick={() => handleSend(record)}
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
                                            onClick={() => window.open(record.previewUrl, "_blank")}
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
                        <span className="text-sm font-black tracking-tight">발송 설정이 변경되었습니다!</span>
                    </div>
                </div>
            )}
        </div>
    )
}
