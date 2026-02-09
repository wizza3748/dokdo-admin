"use client"

import * as React from "react"
import {
    User,
    Phone,
    Mail,
    Coins,
    ClipboardCheck,
    Lock,
    Calendar,
    GraduationCap,
    School,
    FileText,
    BookOpen,
    BarChart3,
    Send,
    Video,
    History,
    CreditCard,
    Ticket,
    ShoppingBag,
    Wrench,
    FileEdit,
    Building2
} from "lucide-react"
import { useSearchParams } from "next/navigation"

import { ExplorationResultSendingTab } from "./tabs/exploration-result-sending-tab"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

export interface B2CStudentDetailViewProps {
    id: string;
    onBack?: () => void;
}

export function B2CStudentDetailView({ id, onBack }: B2CStudentDetailViewProps) {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || "info";

    return (
        <div className="flex flex-col gap-8">
            {/* Header / Summary Card - Premium Redesign */}
            <div className="bg-white border border-slate-200/60 rounded-[2.5rem] px-10 py-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.04)] flex flex-col xl:flex-row gap-8 items-center xl:items-stretch transition-all hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -ml-16 -mb-16 opacity-30 pointer-events-none" />

                {/* Left: Student Profile Section */}
                <div className="flex flex-col items-center xl:items-start gap-3 shrink-0 lg:min-w-[240px] relative">
                    <div className="flex flex-col items-center xl:items-start gap-1">
                        <h1 className="text-[28px] font-black text-slate-900 tracking-tight leading-tight">이서빈</h1>
                        <span className="text-[13px] font-bold text-slate-400/80 uppercase tracking-widest">Student Profile</span>
                    </div>
                    <Button variant="outline" className="w-full border-slate-200 text-slate-700 font-black rounded-2xl h-12 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm group/btn">
                        <Lock className="w-4 h-4 mr-2 text-slate-300 group-hover/btn:text-blue-400 transition-colors" />
                        학생로그인
                    </Button>
                </div>

                {/* Vertical Divider */}
                <div className="hidden xl:block w-px bg-slate-100 my-4" />

                {/* Right: Detailed Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-5 flex-1 w-full relative pt-1">
                    {/* Parent Info Group */}
                    <div className="space-y-6">
                        <InfoItem icon={User} label="부모님 성함" value="신민선" />
                        <InfoItem icon={Phone} label="부모님 연락처" value="010-4503-8375" />
                    </div>

                    {/* Contact Info Group */}
                    <div className="space-y-6">
                        <InfoItem icon={Mail} label="EMAIL" value="-" />
                        <div className="flex flex-col gap-2 group/item">
                            <div className="flex items-center gap-2.5 text-slate-400 group-hover/item:text-blue-500 transition-colors">
                                <Coins className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-wider">섬초롱꽃 보유수</span>
                            </div>
                            <div className="flex items-baseline gap-1 ml-[26px]">
                                <span className="text-2xl font-black text-blue-600 drop-shadow-sm">0</span>
                                <span className="text-xs font-bold text-slate-400">개</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Info Group */}
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2 group/item">
                            <div className="flex items-center gap-2.5 text-slate-400 group-hover/item:text-amber-500 transition-colors">
                                <ClipboardCheck className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-wider">독서능력 종합검사</span>
                            </div>
                            <div className="flex items-center gap-2 ml-[26px]">
                                <Badge className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full font-black text-[12px] shadow-sm">
                                    미완료
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs - Premium Redesign */}
            <Tabs defaultValue={defaultTab} className="w-full">
                <div className="px-2 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <TabsList className="bg-slate-100/50 rounded-[1.5rem] h-16 p-1.5 flex justify-start gap-1 border border-slate-200/50 w-fit">
                        {[
                            { value: "info", label: "학생정보", icon: User },
                            { value: "logs", label: "활동로그", icon: History },
                            { value: "change_logs", label: "변경로그", icon: FileEdit },
                            { value: "study", label: "학습정보", icon: BookOpen },
                            { value: "report", label: "탐험보고서", icon: BarChart3 },
                            { value: "send", label: "탐험결과발송", icon: Send },
                            { value: "video", label: "영상편지", icon: Video },
                            { value: "device_logs", label: "장치 옷장 활동", icon: Wrench },
                            { value: "payment", label: "결제 정보", icon: CreditCard },
                            { value: "ticket", label: "이용권 정보", icon: Ticket },
                            { value: "order", label: "주문 정보", icon: ShoppingBag },
                        ].map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="px-6 h-full rounded-[1.2rem] data-[state=active]:bg-white data-[state=active]:text-[#002855] data-[state=active]:shadow-[0_4px_15px_-3px_rgba(0,0,0,0.08)] text-slate-400 font-black transition-all hover:text-slate-600 group/tab shrink-0"
                            >
                                <tab.icon className="w-4 h-4 mr-2.5 transition-transform group-hover/tab:scale-110" />
                                <span className="text-[13px]">{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="info" className="mt-0 focus-visible:ring-0">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardContent className="p-0 flex flex-col gap-8">
                            <div className="flex flex-col gap-6">
                                <div className="flex justify-between items-center px-2">
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-[#002855] rounded-full" />
                                        이서빈 상세 정보
                                    </h3>
                                    <Button variant="outline" className="h-9 px-4 border-[#002855] text-[#002855] font-bold rounded-lg hover:bg-slate-50 transition-all text-xs flex items-center gap-2">
                                        기관 정보
                                    </Button>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.02)] flex flex-col gap-8">
                                    {/* Basic Info Section */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
                                        <FormField label="학생 이름" required>
                                            <Input defaultValue="이서빈" className="bg-slate-50 border-slate-100 rounded-xl h-11" />
                                        </FormField>
                                        <FormField label="아이디">
                                            <Input defaultValue="tsalstjs83" className="bg-slate-50 border-slate-100 rounded-xl h-11" />
                                        </FormField>
                                        <FormField label="비밀번호">
                                            <div className="relative">
                                                <Input placeholder="입력해주세요" className="bg-slate-50 border-slate-100 rounded-xl h-11 pr-10" />
                                                <Lock className="absolute right-3 top-3.5 w-4 h-4 text-slate-300" />
                                            </div>
                                        </FormField>
                                        <FormField label="핀번호">
                                            <Input placeholder="숫자 4자리 입력" className="bg-slate-50 border-slate-100 rounded-xl h-11" />
                                        </FormField>
                                        <FormField label="생년월일" required>
                                            <div className="flex gap-4 items-center">
                                                <div className="relative flex-1">
                                                    <Input type="date" defaultValue="2015-09-04" className="bg-slate-50 border-slate-100 rounded-xl h-11 pl-4 pr-10" />
                                                </div>
                                                <div className="flex items-center gap-2 text-[13px] font-bold text-slate-500 whitespace-nowrap">
                                                    만 나이 <Badge variant="secondary" className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg">10</Badge>
                                                </div>
                                            </div>
                                        </FormField>
                                        <FormField label="연락처">
                                            <Input defaultValue="01045038375" className="bg-slate-50 border-slate-100 rounded-xl h-11" />
                                        </FormField>
                                        <FormField label="학부모 이름" required>
                                            <Input defaultValue="신민선" className="bg-slate-50 border-slate-100 rounded-xl h-11" />
                                        </FormField>
                                        <FormField label="학부모 연락처">
                                            <Input defaultValue="01045038375" className="bg-slate-50 border-slate-100 rounded-xl h-11" />
                                        </FormField>
                                    </div>

                                    {/* Study Settings Section */}
                                    <div className="pt-8 border-t border-slate-50">
                                        <SectionHeader title="학습정보" />
                                        <div className="grid grid-cols-1 gap-6 mt-6">
                                            <FormField label="학습타입">
                                                <Select defaultValue="both">
                                                    <SelectTrigger className="bg-slate-50 border-slate-100 rounded-xl h-11">
                                                        <SelectValue placeholder="선택하세요" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="both">책 읽기+글쓰기</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormField>
                                            <FormField label="독서 성향">
                                                <Select defaultValue="0">
                                                    <SelectTrigger className="bg-slate-50 border-slate-100 rounded-xl h-11">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">0</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormField>
                                            <FormField label="책 읽기 탐험">
                                                <div className="flex items-center gap-4">
                                                    <Badge className="bg-blue-50 text-blue-600 border-none px-4 py-2 rounded-lg font-bold">5 레벨</Badge>
                                                    <span className="text-sm font-bold text-slate-400">0/126</span>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" className="border-blue-200 text-blue-600 font-bold rounded-xl h-9 hover:bg-blue-50">레벨 변경</Button>
                                                        <Button variant="outline" className="border-[#002855] bg-[#002855] text-white font-bold rounded-xl h-9 hover:bg-[#001d3d]">학습 초기화</Button>
                                                    </div>
                                                </div>
                                            </FormField>
                                            <FormField label="글쓰기 탐험">
                                                <div className="flex items-center gap-4">
                                                    <Badge className="bg-amber-50 text-amber-600 border-none px-4 py-2 rounded-lg font-bold">5 레벨</Badge>
                                                    <Badge className="bg-slate-100 text-slate-600 border-none px-4 py-2 rounded-lg font-bold">1 회차</Badge>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" className="border-blue-200 text-blue-600 font-bold rounded-xl h-9 hover:bg-blue-50">레벨/회차 변경</Button>
                                                        <Button variant="outline" className="border-[#002855] bg-[#002855] text-white font-bold rounded-xl h-9 hover:bg-[#001d3d]">학습 초기화</Button>
                                                    </div>
                                                </div>
                                            </FormField>
                                        </div>
                                    </div>

                                    {/* Service Info Section */}
                                    <div className="pt-8 border-t border-slate-50">
                                        <SectionHeader title="서비스정보" />
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6 mt-6">
                                            <FormField label="서비스 상태">
                                                <Badge className="bg-blue-600 text-white border-none px-4 py-2 rounded-lg font-bold w-fit">서비스시작</Badge>
                                            </FormField>
                                            <FormField label="서비스 시작">
                                                <Input placeholder="선택해주세요" type="date" className="bg-slate-50 border-slate-100 rounded-xl h-11" />
                                            </FormField>
                                            <FormField label="서비스기간">
                                                <Input placeholder="선택해주세요" type="date" className="bg-slate-50 border-slate-100 rounded-xl h-11" />
                                            </FormField>
                                        </div>
                                    </div>

                                    {/* Personal Info Section */}
                                    <div className="pt-8 border-t border-slate-50">
                                        <SectionHeader title="개인정보" />
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6 mt-6">
                                            <FormField label="이메일">
                                                <Input placeholder="입력해주세요" className="bg-slate-50 border-slate-100 rounded-xl h-11" />
                                            </FormField>
                                            <FormField label="학년">
                                                <Select>
                                                    <SelectTrigger className="bg-slate-50 border-slate-100 rounded-xl h-11">
                                                        <SelectValue placeholder="선택해주세요" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1">1학년</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormField>
                                            <FormField label="학교">
                                                <Input placeholder="입력해주세요" className="bg-slate-50 border-slate-100 rounded-xl h-11" />
                                            </FormField>
                                        </div>
                                    </div>

                                    {/* Admin Memo Section */}
                                    <div className="pt-8 border-t border-slate-50">
                                        <SectionHeader title="본사관리자에게만 노출되는 정보" />
                                        <div className="grid grid-cols-1 gap-6 mt-6">
                                            <FormField label="메모">
                                                <Textarea placeholder="입력해주세요" className="bg-slate-50 border-slate-100 rounded-2xl min-h-[120px] focus:bg-white transition-all underline-none" />
                                            </FormField>
                                            <FormField label="추천인코드">
                                                <Select>
                                                    <SelectTrigger className="bg-slate-50 border-slate-100 rounded-xl h-11">
                                                        <SelectValue placeholder="선택해주세요" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">선택없음</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormField>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="flex justify-between items-center mt-4 px-2">
                                    <Button onClick={onBack} variant="outline" className="h-11 px-8 border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all">목록</Button>
                                    <Button className="h-11 px-10 bg-[#002855] hover:bg-[#001d3d] text-white font-bold rounded-xl shadow-lg shadow-blue-900/10 transition-all">저장</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Placeholders for other tabs */}
                {["logs", "change_logs", "study", "report", "video", "device_logs", "payment", "ticket", "order"].map((tab) => (
                    <TabsContent key={tab} value={tab} className="mt-0">
                        <Card className="bg-white border text-center border-slate-100 rounded-3xl p-20 flex flex-col items-center gap-4 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.02)]">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                <History className="w-8 h-8 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black text-slate-400">준비 중인 화면입니다</h3>
                            <p className="text-slate-300 font-semibold">{tab.toUpperCase()} 관련 상세 기능을 곧 제공할 예정입니다.</p>
                        </Card>
                    </TabsContent>
                ))}
                <TabsContent value="send" className="mt-0">
                    <ExplorationResultSendingTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Label className={`md:w-32 lg:w-40 shrink-0 text-[13px] font-bold text-slate-600 md:text-right flex items-center md:justify-end gap-1`}>
                {required && <span className="text-red-500 font-black">*</span>}
                {label}
            </Label>
            <div className="flex-1 w-full">
                {children}
            </div>
        </div>
    )
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex flex-col gap-2 group/item">
            <div className="flex items-center gap-2.5 text-slate-400 group-hover/item:text-blue-500 transition-colors">
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-[15px] font-bold text-slate-700 ml-[26px] tracking-tight">{value}</span>
        </div>
    )
}

function SectionHeader({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-4 h-[1px] bg-slate-200" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
            <div className="flex-1 h-[1px] bg-slate-100" />
        </div>
    )
}
