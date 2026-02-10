"use client"

import * as React from "react"
import Link from "next/link"
import {
    ChevronRight,
    Mail,
    Phone,
    User,
    Users,
    CreditCard,
    Calendar,
    Clock,
    Copy,
    ExternalLink,
    Search,
    Plus,
    Trash2,
    Edit2,
    Save,
    RotateCcw,
    FileText,
    MessageSquare,
    History,
    Activity,
    Wallet,
    Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

const FormLabel = ({ children, required = false, className = "" }: { children: React.ReactNode; required?: boolean; className?: string }) => (
    <Label className={`text-[13px] font-semibold text-slate-600 flex items-center gap-1 ${className}`}>
        {required && <span className="text-red-500">*</span>}
        {children}
    </Label>
);

const InfoItem = ({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: any }) => (
    <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
            {Icon && <Icon className="w-3 h-3" />}
            {label}
        </span>
        <span className="text-[13px] font-semibold text-slate-700">{value}</span>
    </div>
);

export default function InstitutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;
    return (
        <div className="flex flex-col gap-8 p-4">
            {/* Summary Header Card - Premium Redesign */}
            <div className="bg-white border border-slate-200/60 rounded-[2.5rem] px-10 py-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.04)] flex flex-col xl:flex-row gap-10 items-center xl:items-stretch transition-all hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)] relative overflow-hidden group">

                {/* Left: Agency Profile Section */}
                <div className="flex flex-col items-center xl:items-start gap-3 shrink-0 lg:min-w-[240px] relative">
                    <div className="flex flex-col items-center xl:items-start gap-1">
                        <h1 className="text-[28px] font-bold text-slate-900 tracking-tight leading-tight">진순이학원</h1>
                        <span className="text-[13px] font-semibold text-slate-400/80 uppercase tracking-widest">성남지사</span>
                    </div>
                    <Button className="w-full bg-[#002855] hover:bg-[#001d3d] text-white font-black rounded-2xl h-12 shadow-lg shadow-blue-900/15 transition-all transform hover:-translate-y-0.5">
                        <ExternalLink className="w-4 h-4 mr-2 opacity-70" />
                        기관 로그인
                    </Button>
                </div>

                {/* Vertical Divider */}
                <div className="hidden xl:block w-px bg-slate-100 my-4" />

                {/* Right: Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-12 flex-1 w-full relative pt-1">
                    <InfoItem label="연락처" value="010-1234-5678" icon={Phone} />

                    <div className="flex flex-col gap-2 group/item">
                        <div className="flex items-center gap-2.5 text-slate-400 group-hover/item:text-indigo-500 transition-colors">
                            <Users className="w-4 h-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">선생님 / 학생 수</span>
                        </div>
                        <div className="flex items-baseline gap-2 ml-[26px]">
                            <span className="text-xl font-bold text-blue-600">2<span className="text-xs ml-0.5 opacity-60">명</span></span>
                            <span className="text-slate-300 font-light">/</span>
                            <span className="text-xl font-bold text-indigo-600">6<span className="text-xs ml-0.5 opacity-60">명</span></span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 group/item">
                        <div className="flex items-center gap-2.5 text-slate-400 group-hover/item:text-emerald-500 transition-colors">
                            <Wallet className="w-4 h-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">포인트 현황</span>
                        </div>
                        <div className="flex flex-col ml-[26px]">
                            <span className="text-2xl font-bold text-emerald-600">0 <span className="text-xs font-semibold text-slate-400">P</span></span>
                            <span className="text-[10px] font-semibold text-slate-300 uppercase">무료: 0</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 group/item">
                        <div className="flex items-center gap-2.5 text-slate-400 group-hover/item:text-blue-500 transition-colors">
                            <CreditCard className="w-4 h-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">단체 코드</span>
                        </div>
                        <div className="flex items-center gap-2 ml-[26px]">
                            <code className="bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-blue-600 font-semibold text-[13px] tracking-wider shadow-sm">495448</code>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50">
                                <Copy className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Tabs Container - Premium Redesign */}
            <Tabs defaultValue="info" className="w-full">
                <div className="px-2 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <TabsList className="bg-slate-100/50 rounded-[1.5rem] h-16 p-1.5 flex justify-start gap-1 border border-slate-200/50 w-fit">
                        {[
                            { value: "info", label: "기관정보", icon: Building2 },
                            { value: "students", label: "학생목록", icon: Users },
                            { value: "points", label: "포인트내역", icon: Wallet },
                            { value: "activity", label: "활동로그", icon: Activity },
                            { value: "changes", label: "변경로그", icon: History },
                            { value: "inquiry", label: "문의하기", icon: MessageSquare },
                            { value: "payments", label: "결제내역", icon: CreditCard },
                        ].map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="px-8 h-full rounded-[1.2rem] data-[state=active]:bg-white data-[state=active]:text-[#002855] data-[state=active]:shadow-[0_4px_15px_-3px_rgba(0,0,0,0.08)] text-slate-400 font-semibold transition-all hover:text-slate-600 group/tab"
                            >
                                <tab.icon className="w-4 h-4 mr-2.5 transition-transform group-hover/tab:scale-110" />
                                <span className="text-[14px]">{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="info" className="mt-0">
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
                        {/* Left Content - Form List */}
                        <div className="flex flex-col gap-10 bg-white border border-slate-100 rounded-3xl p-10 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.02)]">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-[#002855] rounded-full" />
                                    진순이학원 상세 정보
                                </h2>

                                <div className="flex flex-col gap-12">
                                    {/* 기관 정보 섹션 */}
                                    <div className="flex flex-col gap-6">
                                        <h3 className="text-[14px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">기관 정보</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                            <div className="flex flex-col gap-2">
                                                <FormLabel required>기관명</FormLabel>
                                                <Input defaultValue="진순이학원" className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white transition-all font-semibold" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <FormLabel required>연락처</FormLabel>
                                                <Input defaultValue="010-1234-5678" className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white transition-all font-semibold" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <FormLabel required>지사1</FormLabel>
                                                <Select defaultValue="seongnam">
                                                    <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="seongnam">성남</SelectItem>
                                                        <SelectItem value="incheon">인천</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <FormLabel>지사2</FormLabel>
                                                <Select>
                                                    <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold">
                                                        <SelectValue placeholder="선택해주세요" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">없음</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col gap-2 md:col-span-2">
                                                <FormLabel>주소</FormLabel>
                                                <div className="flex gap-2 mb-2">
                                                    <Input placeholder="우편번호" className="h-11 w-32 bg-slate-50/50 border-slate-200 rounded-xl font-semibold" />
                                                    <Button variant="outline" className="h-11 px-6 border-[#002855] text-[#002855] hover:bg-blue-50 font-bold rounded-xl transition-all">주소검색</Button>
                                                </div>
                                                <Input placeholder="기본 주소" className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold mb-2" />
                                                <Input placeholder="상세 주소" className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 서비스 정보 섹션 */}
                                    <div className="flex flex-col gap-6">
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                            <h3 className="text-[14px] font-semibold text-slate-400 uppercase tracking-widest">서비스 정보</h3>
                                            <Button variant="ghost" className="h-8 text-amber-600 bg-amber-50 hover:bg-amber-100 font-bold text-[12px] rounded-lg">서비스 변경 예약</Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                            <div className="flex flex-col gap-3">
                                                <FormLabel required>서비스 상태</FormLabel>
                                                <RadioGroup defaultValue="active" className="flex gap-6 items-center">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="pause" id="pause" className="border-slate-300 text-[#002855]" />
                                                        <Label htmlFor="pause" className="text-[13px] font-semibold text-slate-600 cursor-pointer">일시정지</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="active" id="active" className="border-slate-300 text-blue-600" />
                                                        <Label htmlFor="active" className="text-[13px] font-bold text-blue-600 cursor-pointer">정상</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="unpaid" id="unpaid" className="border-slate-300 text-[#002855]" />
                                                        <Label htmlFor="unpaid" className="text-[13px] font-semibold text-slate-600 cursor-pointer">미납정지</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="free" id="free" className="border-slate-300 text-[#002855]" />
                                                        <Label htmlFor="free" className="text-[13px] font-semibold text-slate-600 cursor-pointer">무료이용</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <FormLabel>가맹비</FormLabel>
                                                <div className="flex gap-2">
                                                    <Input defaultValue="2,000,000" className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold" />
                                                    <div className="flex flex-col justify-center">
                                                        <Button className="h-11 bg-slate-100 text-slate-400 font-bold rounded-xl shrink-0 cursor-not-allowed" disabled>가맹비 입금완료</Button>
                                                        <span className="text-[10px] text-slate-400 mt-1 ml-1">2023-08-18 14:39:01</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <FormLabel required>가맹 타입</FormLabel>
                                                <RadioGroup defaultValue="standard" className="flex gap-6 items-center">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="pre" id="pre" className="border-slate-300" />
                                                        <Label htmlFor="pre" className="text-[13px] font-semibold text-slate-600 cursor-pointer">가맹전</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="standard" id="standard" className="border-slate-300 shadow-sm" />
                                                        <Label htmlFor="standard" className="text-[13px] font-bold text-blue-600 cursor-pointer">스탠다드</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="slim" id="slim" className="border-slate-300" />
                                                        <Label htmlFor="slim" className="text-[13px] font-semibold text-slate-600 cursor-pointer">슬림</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="school" id="school" className="border-slate-300" />
                                                        <Label htmlFor="school" className="text-[13px] font-semibold text-slate-600 cursor-pointer">학교</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-2">
                                                    <FormLabel>교육비</FormLabel>
                                                    <div className="flex gap-2">
                                                        <Input defaultValue="0" className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold w-24" />
                                                        <Button className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shrink-0 px-4 text-[12px]">교육비 입금 처리</Button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <FormLabel>기타 비용</FormLabel>
                                                    <div className="flex gap-2">
                                                        <Select><SelectTrigger className="h-11 w-24 bg-slate-50/50 border-slate-200 rounded-xl font-semibold"><SelectValue placeholder="선택" /></SelectTrigger></Select>
                                                        <Input defaultValue="0" className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold w-24" />
                                                        <Button className="h-11 bg-blue-900 hover:bg-black text-white font-bold rounded-xl shrink-0 px-4 text-[12px]">기타 비용 입금 처리</Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <FormLabel required>최소 이용 금액</FormLabel>
                                                <Input defaultValue="180,000" className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <FormLabel required>인당 이용료</FormLabel>
                                                <Select defaultValue="15000">
                                                    <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent><SelectItem value="15000">15,000</SelectItem></SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <FormLabel required>전자책 인당 이용료</FormLabel>
                                                <Select defaultValue="3000">
                                                    <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent><SelectItem value="3000">3,000</SelectItem></SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 전자책 정보 섹션 */}
                                    <div className="flex flex-col gap-6">
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                            <h3 className="text-[14px] font-semibold text-slate-400 uppercase tracking-widest">전자책 정보</h3>
                                            <Button variant="ghost" className="h-8 text-amber-600 bg-amber-50 hover:bg-amber-100 font-bold text-[12px] rounded-lg">전자책 변경 예약</Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                            <div className="flex flex-col gap-2">
                                                <FormLabel>책 그룹</FormLabel>
                                                <Select defaultValue="2503">
                                                    <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent><SelectItem value="2503">25.03 406권에서 2권 절판(290권)</SelectItem></SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <FormLabel required>전자책 상태</FormLabel>
                                                <RadioGroup defaultValue="free" className="flex gap-6 items-center">
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="pause" id="e-pause" /><Label htmlFor="e-pause" className="text-[13px] font-semibold text-slate-600">정지</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="active" id="e-active" /><Label htmlFor="e-active" className="text-[13px] font-semibold text-slate-600">정상</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="free" id="e-free" className="text-blue-600" /><Label htmlFor="e-free" className="text-[13px] font-bold text-blue-600">무료이용</Label></div>
                                                </RadioGroup>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <FormLabel required>책 읽기 7레벨 이상</FormLabel>
                                                <RadioGroup defaultValue="on" className="flex gap-6 items-center">
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="off" id="l7-off" /><Label htmlFor="l7-off" className="text-[13px] font-semibold text-slate-600">비활성</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="on" id="l7-on" /><Label htmlFor="l7-on" className="text-[13px] font-bold text-blue-600">활성</Label></div>
                                                </RadioGroup>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <FormLabel required>전자책 결제 방식</FormLabel>
                                                <RadioGroup defaultValue="monthly" className="flex gap-6 items-center">
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="monthly" id="pay-m" /><Label htmlFor="pay-m" className="text-[13px] font-bold text-blue-600">기관 월납</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="yearly" id="pay-y" /><Label htmlFor="pay-y" className="text-[13px] font-semibold text-slate-600">기관 연납</Label></div>
                                                </RadioGroup>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <FormLabel>전자책 결제</FormLabel>
                                                <Button className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl w-fit px-10">전자책 입금 처리</Button>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <FormLabel>자동 결제 예정일</FormLabel>
                                                <Input type="month" defaultValue="2026-03" className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-semibold" />
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <FormLabel required>탐험 자료실</FormLabel>
                                                <RadioGroup defaultValue="all" className="flex gap-6 items-center">
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="limit" id="exp-limit" /><Label htmlFor="exp-limit" className="text-[13px] font-semibold text-slate-600">제한</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="exp-all" /><Label htmlFor="exp-all" className="text-[13px] font-bold text-blue-600">활성</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="none" id="exp-none" /><Label htmlFor="exp-none" className="text-[13px] font-semibold text-slate-600">비활성</Label></div>
                                                </RadioGroup>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <FormLabel>깊여 읽기</FormLabel>
                                                <RadioGroup defaultValue="on" className="flex gap-6 items-center">
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="off" id="deep-off" /><Label htmlFor="deep-off" className="text-[13px] font-semibold text-slate-600">비활성</Label></div>
                                                    <div className="flex items-center space-x-2"><RadioGroupItem value="on" id="deep-on" /><Label htmlFor="deep-on" className="text-[13px] font-bold text-blue-600">활성</Label></div>
                                                </RadioGroup>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 본사관리자 전용 섹션 */}
                                    <div className="flex flex-col gap-6 border-t border-slate-50 pt-8">
                                        <h3 className="text-[14px] font-semibold text-slate-400 uppercase tracking-widest">본사관리자에게만 노출되는 정보</h3>
                                        <div className="flex flex-col gap-4">
                                            <FormLabel>메모</FormLabel>
                                            <Textarea
                                                className="min-h-[160px] bg-slate-50/50 border-slate-200 rounded-2xl p-5 focus:bg-white transition-all font-medium text-[13px] leading-relaxed text-slate-600"
                                                defaultValue="250818 독도 스탠다드계약(200만원, 도서 : 25.02(290권 세트) A버전)&#10;250818-250930 무료이용기간&#10;251001 정상과금일"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 pt-10 border-t border-slate-100 flex justify-start">
                                    <Button className="h-14 px-16 bg-[#002855] hover:bg-[#001d3d] text-white rounded-[1.2rem] shadow-xl shadow-blue-900/15 font-black text-lg transition-all transform hover:-translate-y-0.5 active:scale-95">
                                        저장하기
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Right Content - Teacher List Sidebar */}
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-[#002855] rounded-full" />
                                    선생님 목록
                                </h3>
                                <Button variant="outline" className="h-9 px-4 border-[#002855] text-[#002855] hover:bg-blue-50 font-bold rounded-lg transition-all scale-95 origin-right">
                                    <Plus className="w-4 h-4 mr-2" /> 선생님 등록
                                </Button>
                            </div>

                            {[
                                { name: "진선생", role: "대표선생님", id: "teacherid1", phone: "010-1234-5678", email: "test@test.com", regDate: "2023-08-18" },
                                { name: "방선생", role: "선생님", id: "teacherid2", phone: "010-1234-5678", email: "test@test.com", regDate: "2023-09-05" }
                            ].map((teacher, idx) => (
                                <Card key={idx} className="border border-slate-200/60 rounded-[2rem] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.06)] transition-all overflow-hidden group bg-white relative">
                                    <CardContent className="p-7 flex flex-col gap-5">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-xl font-bold text-slate-800 tracking-tight">{teacher.name}</span>
                                                    <Badge className={`${teacher.role === "대표선생님" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"} text-[10px] font-semibold px-2.5 py-1 rounded-lg border-0 shadow-sm`}>
                                                        {teacher.role}
                                                    </Badge>
                                                </div>
                                                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest">{teacher.id}</span>
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3 text-slate-600">
                                                <div className="size-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
                                                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                                                </div>
                                                <span className="text-[14px] font-semibold tracking-tight">{teacher.phone}</span>
                                            </div>
                                            {teacher.email && (
                                                <div className="flex items-center gap-3 text-slate-600">
                                                    <div className="size-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100/50">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                    </div>
                                                    <span className="text-[13px] font-bold truncate tracking-tight">{teacher.email}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center pt-5 border-t border-slate-50 mt-1">
                                            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-300/80 uppercase tracking-wider">
                                                <Calendar className="w-3 h-3" />
                                                <span>Joined {teacher.regDate}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="students" className="mt-0">
                    <div className="flex flex-col gap-8">
                        {/* Filter Section - Premium Redesign */}
                        <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-full blur-3xl -mr-24 -mt-24 opacity-50 pointer-events-none" />

                            <div className="flex flex-col gap-10 relative">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                    {/* Search Group */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                            <span className="text-[13px] font-semibold text-slate-800 uppercase tracking-wider">학생 검색</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <Select defaultValue="name">
                                                <SelectTrigger className="w-[140px] h-12 bg-slate-50 border-slate-200 rounded-2xl font-semibold text-[13px] focus:bg-white focus:ring-blue-100 transition-all">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="name">학생명</SelectItem>
                                                    <SelectItem value="id">아이디</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="relative flex-1 group/search">
                                                <Input placeholder="검색어를 입력해주세요" className="h-12 bg-slate-50 border-slate-200 rounded-2xl pl-5 pr-12 focus:bg-white focus:ring-blue-100 transition-all font-bold text-[14px]" />
                                                <div className="absolute right-4 top-3.5 text-slate-300 group-focus-within/search:text-blue-500 transition-colors">
                                                    <Search className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Type Group */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                            <span className="text-[13px] font-semibold text-slate-800 uppercase tracking-wider">학습 타입</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2.5">
                                            {["전체", "책 읽기+글쓰기", "책 읽기", "글쓰기"].map((type) => (
                                                <Button
                                                    key={type}
                                                    variant="outline"
                                                    className={`h-12 px-6 rounded-2xl text-[13px] font-semibold tracking-tight transition-all border-2 ${type === "전체" ? "bg-slate-900 border-slate-900 text-white hover:bg-black hover:text-white shadow-md shadow-slate-200" : "bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50"}`}
                                                >
                                                    {type}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-slate-50/50">
                                    <div className="flex gap-3">
                                        <Button variant="outline" className="h-12 px-8 border-slate-200 text-slate-500 font-semibold rounded-2xl hover:bg-slate-50 transition-all active:scale-95">초기화</Button>
                                        <Button className="h-12 px-12 bg-[#002855] hover:bg-[#001d3d] text-white font-bold rounded-2xl shadow-xl shadow-blue-900/15 transition-all transform hover:-translate-y-0.5 active:scale-95">검색하기</Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Header Action Bar */}
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 px-4">
                            <div className="flex items-center gap-4">
                                <div className="size-10 bg-blue-50 rounded-2xl flex items-center justify-center shadow-sm border border-blue-100/50">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">학생 목록</h3>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Total 9 Students</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl gap-1.5 border border-slate-200/50">
                                    <Button variant="outline" className="h-10 px-5 border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-200 font-black rounded-[1rem] transition-all text-[12px] shadow-sm active:scale-95">엑셀 업로드</Button>
                                    <Button variant="outline" className="h-10 px-5 border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-200 font-black rounded-[1rem] transition-all text-[12px] shadow-sm active:scale-95">일괄 등록</Button>
                                </div>
                                <Button className="h-[52px] px-8 bg-[#002855] hover:bg-[#001d3d] text-white font-black rounded-2xl shadow-xl shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 active:scale-95">
                                    <Plus className="w-4 h-4 mr-2.5 opacity-80" /> 학생 개별 등록
                                </Button>
                            </div>
                        </div>

                        {/* Student Table Container */}
                        <div className="bg-white border border-slate-200/60 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.04)]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/40">
                                            {[
                                                { label: "고유번호", sortable: true },
                                                { label: "이름", sortable: true },
                                                { label: "학습타입", sortable: false },
                                                { label: "서비스상태", sortable: false },
                                                { label: "서비스종료일", sortable: true },
                                                { label: "생성일", sortable: false },
                                                { label: "편집", sortable: false }
                                            ].map((col, idx) => (
                                                <th key={idx} className="px-8 py-6 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap">
                                                    <div className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors group/th">
                                                        {col.label}
                                                        {col.sortable && (
                                                            <Activity className="w-3 h-3 opacity-0 group-hover/th:opacity-40 transition-opacity" />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {[
                                            { id: "26142", name: "진방울", type: "책 읽기+글쓰기", status: "사용전", endDate: "-", regDate: "2025-12-01" },
                                            { id: "25809", name: "박지우", type: "책 읽기+글쓰기", status: "사용전", endDate: "-", regDate: "2025-11-19" },
                                            { id: "25178", name: "신다민", type: "책 읽기+글쓰기", status: "서비스만료", endDate: "2025-12-01", regDate: "2025-10-01" },
                                            { id: "25088", name: "김현우", type: "책 읽기+글쓰기", status: "사용중", endDate: "2026-02-28", regDate: "2025-09-22" },
                                            { id: "25062", name: "임시윤", type: "책 읽기+글쓰기", status: "사용중", endDate: "2026-02-28", regDate: "2025-09-16" },
                                            { id: "24902", name: "이예서", type: "책 읽기+글쓰기", status: "사용중", endDate: "2026-02-28", regDate: "2025-09-07" },
                                            { id: "24901", name: "이윤건", type: "책 읽기+글쓰기", status: "사용중", endDate: "2026-02-28", regDate: "2025-09-07" },
                                            { id: "24874", name: "심수연", type: "책 읽기+글쓰기", status: "사용중", endDate: "2026-02-28", regDate: "2025-09-05" },
                                            { id: "24215", name: "최서우", type: "책 읽기+글쓰기", status: "사용중", endDate: "2026-02-28", regDate: "2025-08-18" },
                                        ].map((student, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/20 transition-all group">
                                                <td className="px-8 py-5 text-[13px] font-semibold text-slate-400 group-hover:text-blue-900 transition-colors uppercase tracking-tight">{student.id}</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <Link href={`/admin/students/${student.id}`} className="text-[15px] font-bold text-slate-800 hover:text-blue-600 transition-colors tracking-tight">
                                                            {student.name}
                                                        </Link>
                                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Full Profile</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <Badge className="bg-slate-100 text-slate-600 border-0 font-semibold text-[11px] px-3 py-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                        {student.type}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`size-2 rounded-full ${student.status === "사용중" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" : student.status === "사용전" ? "bg-amber-500" : "bg-slate-300"}`} />
                                                        <span className={`font-semibold text-[12px] tracking-tight ${student.status === "사용중" ? "text-emerald-600" : student.status === "사용전" ? "text-amber-600" : "text-slate-400"}`}>
                                                            {student.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-[13px] font-semibold text-slate-500">{student.endDate}</td>
                                                <td className="px-8 py-5 text-[13px] font-semibold text-slate-400">{student.regDate}</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                        <Button variant="ghost" size="icon" className="h-[38px] w-[38px] text-slate-300 hover:text-blue-600 hover:bg-white rounded-xl shadow-none hover:shadow-lg hover:shadow-blue-900/5 transition-all">
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-[38px] w-[38px] text-slate-300 hover:text-red-500 hover:bg-white rounded-xl shadow-none hover:shadow-lg hover:shadow-red-900/5 transition-all">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Premium Pagination */}
                            <div className="p-10 border-t border-slate-50 flex justify-center bg-slate-50/20">
                                <div className="flex gap-2.5 p-1.5 bg-white rounded-2xl shadow-sm border border-slate-200/50">
                                    {[1, 2, 3, 4, 5].map((p) => (
                                        <Button key={p} variant="ghost" className={`w-10 h-10 p-0 rounded-xl font-semibold text-[13px] transition-all ${p === 1 ? "bg-[#002855] text-white hover:bg-[#001d3d] hover:text-white shadow-lg shadow-blue-900/10" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"}`}>
                                            {p}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="points" className="mt-0">
                    <div className="h-[500px] flex flex-col items-center justify-center bg-white border border-slate-200/60 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 size-64 bg-slate-50 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700" />
                        <div className="size-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-emerald-100/50 group-hover:rotate-12 transition-transform">
                            <Wallet className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">포인트 내역 관리</h3>
                        <p className="text-slate-400 font-bold text-[14px]">해당 화면은 현재 준비 중입니다.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
