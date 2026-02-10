"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Download, Plus, Search, RotateCcw, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

// Mock Data
const institutions = [
    { id: "1085", region1: "인천B", region2: "-", name: "진순이학원", type: "가맹전", status: "정상", paymentDate: "-", group: "무료이용", ebook: "-", ebookPay: "-", ebookPayDate: "-", autoPay: "자동", minAmount: "150,000", fee: "15,000", students: 7, points: 0, regDate: "2024-01-09" },
    { id: "1082", region1: "원주", region2: "-", name: "신통방통", type: "일반", status: "정상", paymentDate: "-", group: "정상", ebook: "-", ebookPay: "기존미납", ebookPayDate: "2026-06-01", autoPay: "자동", minAmount: "150,000", fee: "15,000", students: 3, points: 0, regDate: "2023-12-28" },
    { id: "1070", region1: "성남", region2: "-", "name": "기본교실", type: "가맹점", status: "정상", paymentDate: "2026-02-06", group: "무료이용", ebook: "-", ebookPay: "-", ebookPayDate: "-", autoPay: "자동", minAmount: "75,000", fee: "25,000", students: 0, points: 0, regDate: "2023-12-13" },
    { id: "1066", region1: "동작", region2: "-", name: "원네스SE공부방", type: "가맹점", status: "정상", paymentDate: "2026-02-06", group: "무료이용", ebook: "-", ebookPay: "-", ebookPayDate: "-", autoPay: "자동", minAmount: "75,000", fee: "25,000", students: 3, points: 0, regDate: "2023-12-01" },
    { id: "1060", region1: "인천", region2: "-", name: "학원&꿈꾸는아이들", type: "스탠다드", status: "-", paymentDate: "-", group: "정지", ebook: "-", ebookPay: "-", ebookPayDate: "-", autoPay: "자동", minAmount: "150,000", fee: "15,000", students: 1, points: 500, regDate: "2023-11-01" },
    { id: "1059", region1: "농산", region2: "-", name: "이성연(학원준비)", type: "가맹전", status: "정상", paymentDate: "2026-02-06", group: "무료이용", ebook: "-", ebookPay: "-", ebookPayDate: "-", autoPay: "미등록", minAmount: "75,000", fee: "25,000", students: 3, points: 0, regDate: "2023-10-31" },
    { id: "1053", region1: "인천", region2: "평택안성", name: "바른국어논술", type: "스탠다드", status: "정상", paymentDate: "-", group: "정지", ebook: "-", ebookPay: "-", ebookPayDate: "-", autoPay: "자동", minAmount: "150,000", fee: "15,000", students: 14, points: 20000, regDate: "2023-10-24" },
    { id: "1052", region1: "인천", region2: "천안", name: "인사이트국어논술", type: "스탠다드", status: "정상", paymentDate: "-", group: "정지", ebook: "-", ebookPay: "-", ebookPayDate: "-", autoPay: "미등록", minAmount: "150,000", fee: "15,000", students: 16, points: 0, regDate: "2023-10-20" },
    { id: "1050", region1: "인천", region2: "부산", name: "생각자라는논술", type: "스탠다드", status: "정상", paymentDate: "-", group: "정지", ebook: "-", ebookPay: "-", ebookPayDate: "-", autoPay: "자동", minAmount: "150,000", fee: "15,000", students: 16, points: 0, regDate: "2023-10-20" },
    { id: "1048", region1: "제주", region2: "-", name: "마니나독서토론학원", type: "스탠다드", status: "정상", paymentDate: "2026-02-06", group: "무료이용", ebook: "-", ebookPay: "-", ebookPayDate: "-", autoPay: "자동", minAmount: "180,000", fee: "15,000", students: 4, points: 0, regDate: "2023-10-17" },
]

const FilterItem = ({ label, children, labelWidth = "w-20" }: { label: string; children: React.ReactNode; labelWidth?: string }) => (
    <div className="flex items-center gap-4">
        <span className={`text-sm font-semibold ${labelWidth} shrink-0 text-right text-slate-600`}>{label}</span>
        <div className="flex-1">{children}</div>
    </div>
);

const FilterButtonGroup = ({
    label,
    items,
    activeItem = "전체",
    labelWidth = "w-20"
}: {
    label: string;
    items: string[];
    activeItem?: string;
    labelWidth?: string;
}) => (
    <div className="flex items-center gap-4">
        <span className={`text-sm font-semibold ${labelWidth} shrink-0 text-right text-slate-600`}>{label}</span>
        <div className="flex p-1 border border-slate-200 rounded-lg bg-slate-50/50 items-center shadow-sm">
            <Button
                variant="secondary"
                className="h-8 rounded-md px-4 text-[13px] bg-[#002855] text-white shadow-sm font-semibold hover:bg-[#001d3d] transition-all"
            >
                전체
            </Button>
            <div className="flex items-center">
                {items.map((item) => (
                    <React.Fragment key={item}>
                        <div className="w-[1px] h-3 bg-slate-200 mx-1" />
                        <Button
                            variant="ghost"
                            className="h-8 rounded-md px-4 text-[13px] text-slate-500 hover:text-slate-900 hover:bg-white/80 transition-all font-medium"
                        >
                            {item}
                        </Button>
                    </React.Fragment>
                ))}
            </div>
        </div>
    </div>
);

export default function InstitutionsPage() {
    return (
        <div className="flex flex-col gap-4 min-w-0">
            {/* Filter Section */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-3">
                    <FilterItem label="검색" labelWidth="w-20">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input placeholder="기관명, 기관장명, 아이디..." className="h-10 pl-10 bg-slate-50/50 border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
                        </div>
                    </FilterItem>

                    <FilterItem label="지사" labelWidth="w-20">
                        <Select>
                            <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg">
                                <SelectValue placeholder="지사 선택" />
                            </SelectTrigger>
                        </Select>
                    </FilterItem>

                    <FilterItem label="책 그룹" labelWidth="w-20">
                        <Select>
                            <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg">
                                <SelectValue placeholder="그룹 선택" />
                            </SelectTrigger>
                        </Select>
                    </FilterItem>

                    <FilterButtonGroup label="미납 상태" items={["정상", "미납"]} labelWidth="w-20" />
                    <FilterButtonGroup label="자동 결제" items={["자동", "미등록"]} labelWidth="w-20" />
                    <FilterButtonGroup label="가맹 타입" items={["가맹전", "스탠다드", "슬림", "학교"]} labelWidth="w-20" />
                    <FilterButtonGroup label="서비스 상태" items={["정지", "정상", "미납", "무료"]} labelWidth="w-20" />
                    <FilterButtonGroup label="전자책 상태" items={["정지", "정상", "무료"]} labelWidth="w-20" />
                    <FilterButtonGroup label="전자책 결제" items={["월납", "연납"]} labelWidth="w-20" />
                </div>

                <div className="flex justify-center gap-3 pt-5 border-t border-slate-100">
                    <Button variant="outline" className="h-10 px-8 border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-semibold">
                        <RotateCcw className="w-4 h-4 mr-2" /> 초기화
                    </Button>
                    <Button className="h-10 px-12 bg-[#002855] hover:bg-[#001d3d] text-white rounded-lg shadow-lg shadow-blue-900/10 font-bold transition-all transform hover:-translate-y-0.5">
                        <Search className="w-4 h-4 mr-2" /> 검색하기
                    </Button>
                </div>
            </div>

            {/* Table Actions */}
            <div className="flex flex-wrap justify-between items-center mt-8 gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[#002855] rounded-full" />
                    <h3 className="text-lg font-bold text-slate-800">기관 데이터 목록</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9 px-4 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold rounded-lg transition-all text-[13px] flex items-center gap-2" asChild>
                        <Link href="#"><Download className="w-4 h-4" /> 엑셀 다운로드</Link>
                    </Button>
                    <Button className="h-9 px-5 bg-[#002855] hover:bg-[#001d3d] text-white font-bold rounded-lg shadow-lg shadow-blue-900/10 transition-all text-[13px]" asChild>
                        <Link href="#"><Plus className="w-4 h-4 mr-2" /> 신규 기관 등록</Link>
                    </Button>
                    <div className="flex items-center gap-1 ml-4 border-l border-slate-100 pl-4 text-slate-300">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100"><RotateCcw className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100">
                            <div className="flex flex-col gap-[2px] items-center">
                                <div className="w-3 h-[1.5px] bg-slate-400" />
                                <div className="h-2 w-[1.5px] bg-slate-400" />
                                <div className="w-3 h-[1.5px] bg-slate-400" />
                            </div>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100"><Settings className="w-4 h-4 text-slate-600" /></Button>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="min-w-[1600px]">
                        <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="text-center w-24 py-5 font-semibold text-slate-600">고유번호</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">지사1</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">지사2</TableHead>
                                <TableHead className="text-center min-w-[180px] py-5 font-semibold text-slate-600 border-x border-slate-200/50">기관명</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">가맹 타입</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">서비스 상태</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">교육비 입금일</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">책 그룹</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">전자책 상태</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">전자책 결제</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">결제 예정일</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">자동 결제</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">최소 이용 금액</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">인당 이용료</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">학생 수</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">포인트</TableHead>
                                <TableHead className="text-center py-5 font-semibold text-slate-600">등록일</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {institutions.map((item) => (
                                <TableRow key={item.id} className="text-center border-slate-50 hover:bg-blue-50/30 transition-colors group">
                                    <TableCell className="font-medium text-slate-400 py-4">{item.id}</TableCell>
                                    <TableCell className="text-blue-500 font-medium py-4">{item.region1}</TableCell>
                                    <TableCell className="text-blue-400 py-4">{item.region2}</TableCell>
                                    <TableCell className="border-x border-slate-50 py-4 group-hover:bg-blue-50/50 transition-colors">
                                        <Link href={`/admin/institutions/${item.id}`} className="text-[#002855] hover:text-blue-700 hover:underline font-semibold text-[15px]">
                                            {item.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Badge variant="outline" className="rounded-md px-2.5 py-0.5 font-semibold border-amber-200 text-amber-700 bg-amber-50">
                                            {item.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        {item.status !== "-" && (
                                            <Badge variant="outline" className="rounded-md px-2.5 py-0.5 font-semibold border-blue-200 text-blue-700 bg-blue-50">
                                                {item.status}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-400 py-4">{item.paymentDate}</TableCell>
                                    <TableCell className="py-4">
                                        {item.group === "무료이용" ? (
                                            <Badge variant="outline" className="rounded-md px-2.5 py-0.5 font-semibold border-green-200 text-green-700 bg-green-50">무료이용</Badge>
                                        ) : item.group === "정지" ? (
                                            <Badge variant="outline" className="rounded-md px-2.5 py-0.5 font-semibold border-slate-200 text-slate-500 bg-slate-50">정지</Badge>
                                        ) : (
                                            <Badge variant="outline" className="rounded-md px-2.5 py-0.5 font-semibold border-blue-200 text-blue-700 bg-blue-50">정상</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-400 py-4">{item.ebook}</TableCell>
                                    <TableCell className="py-4">
                                        {item.ebookPay === "기존미납" ? (
                                            <Badge variant="outline" className="rounded-md px-2.5 py-0.5 font-semibold border-red-100 text-red-600 bg-red-50">기존미납</Badge>
                                        ) : item.ebookPay}
                                    </TableCell>
                                    <TableCell className="text-slate-400 py-4">{item.ebookPayDate}</TableCell>
                                    <TableCell className="py-4">
                                        <Badge variant="outline" className={`rounded-md px-2.5 py-0.5 font-semibold ${item.autoPay === "자동" ? "border-indigo-200 text-indigo-700 bg-indigo-50" : "border-slate-100 text-slate-400 bg-slate-50/50"}`}>
                                            {item.autoPay}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold text-slate-700 py-4">₩{item.minAmount}</TableCell>
                                    <TableCell className="font-semibold text-slate-700 py-4">₩{item.fee}</TableCell>
                                    <TableCell className="font-medium py-4">{item.students}</TableCell>
                                    <TableCell className={`py-4 ${item.points > 0 ? "text-blue-600 font-semibold" : "text-slate-400"}`}>
                                        {item.points.toLocaleString()}P
                                    </TableCell>
                                    <TableCell className="text-slate-400 text-xs py-4">{item.regDate}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-8 py-6 bg-slate-50/50 border-t border-slate-100">
                    <div className="text-[13px] text-slate-400 font-medium">
                        총 <span className="text-slate-700 font-semibold">{institutions.length}</span>개의 데이터가 검색되었습니다.
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 text-slate-400 hover:bg-white hover:text-slate-700 rounded-lg transition-all"><ChevronLeft className="h-4 w-4" /></Button>
                        {[1, 2, 3].map(page => (
                            <Button key={page} variant={page === 1 ? "secondary" : "ghost"} className={`h-9 w-9 p-0 text-[13px] font-bold rounded-lg transition-all ${page === 1 ? "bg-[#002855] text-white shadow-md shadow-blue-900/10 hover:bg-[#001d3d]" : "text-slate-400 hover:text-slate-700 hover:bg-white"}`}>
                                {page}
                            </Button>
                        ))}
                        <div className="px-2 text-slate-300">...</div>
                        <Button variant="ghost" className="h-9 w-9 p-0 text-[13px] font-bold rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white">7</Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 text-slate-400 hover:bg-white hover:text-slate-700 rounded-lg transition-all"><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <div className="w-[180px] flex justify-end">
                        <Select defaultValue="10">
                            <SelectTrigger className="h-9 w-24 bg-white border-slate-200 text-xs font-semibold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10개씩</SelectItem>
                                <SelectItem value="30">30개씩</SelectItem>
                                <SelectItem value="50">50개씩</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    )
}
