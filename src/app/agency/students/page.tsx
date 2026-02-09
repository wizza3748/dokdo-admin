"use client"

import * as React from "react"
import Link from "next/link"
import {
    ChevronRight,
    Search,
    RotateCcw,
    FileText,
    Download,
    Plus,
    Edit2,
    Trash2,
    Settings,
    LayoutGrid,
    Users
} from "lucide-react"

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

export default function AgencyStudentListPage() {
    return (
        <div className="flex flex-col gap-6 p-4">

            {/* Complex Filter Section */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.02)] flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
                    {/* Search */}
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0 whitespace-nowrap">검색</span>
                        <div className="flex items-center gap-2">
                            <Select defaultValue="name">
                                <SelectTrigger className="w-[100px] h-10 bg-slate-50 border-slate-100 rounded-xl font-semibold text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">학생명</SelectItem>
                                    <SelectItem value="id">아이디</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative w-[240px]">
                                <Input placeholder="검색어를 입력해주세요" className="h-10 bg-slate-50 border-slate-100 rounded-xl pl-4 pr-10 focus:bg-white transition-all text-xs font-medium" />
                            </div>
                        </div>
                    </div>

                    {/* Reading Level */}
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0 whitespace-nowrap">책읽기 레벨</span>
                        <Select defaultValue="all">
                            <SelectTrigger className="w-[80px] h-10 bg-slate-50 border-slate-100 rounded-xl font-semibold text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">전체</SelectItem>
                                <SelectItem value="1">1레벨</SelectItem>
                                <SelectItem value="2">2레벨</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Writing Level */}
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0 whitespace-nowrap">글쓰기 레벨</span>
                        <Select defaultValue="all">
                            <SelectTrigger className="w-[80px] h-10 bg-slate-50 border-slate-100 rounded-xl font-semibold text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">전체</SelectItem>
                                <SelectItem value="1">1레벨</SelectItem>
                                <SelectItem value="2">2레벨</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
                    {/* Study Type Buttons */}
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0 whitespace-nowrap">학습타입</span>
                        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50/50 border border-slate-100 rounded-xl">
                            {["전체", "책 읽기+글쓰기", "책 읽기", "글쓰기", "책 읽기+도서관", "글쓰기+도서관"].map((type) => (
                                <Button
                                    key={type}
                                    variant="ghost"
                                    className={`h-8 px-3 rounded-lg text-[12px] font-bold transition-all ${type === "전체" ? "bg-[#002855] text-white shadow-sm hover:bg-[#001d3d] hover:text-white" : "text-slate-500 hover:bg-white"}`}
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Service Status Buttons */}
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0 whitespace-nowrap">서비스상태</span>
                        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50/50 border border-slate-100 rounded-xl">
                            {["전체", "사용전", "사용중", "서비스만료"].map((status) => (
                                <Button
                                    key={status}
                                    variant="ghost"
                                    className={`h-8 px-4 rounded-lg text-[12px] font-bold transition-all ${status === "전체" ? "bg-[#002855] text-white shadow-sm hover:bg-[#001d3d] hover:text-white" : "text-slate-500 hover:bg-white"}`}
                                >
                                    {status}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Search Action Buttons */}
                <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-50">
                    <Button variant="outline" className="h-10 px-6 border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all text-xs">재설정</Button>
                    <Button className="h-10 px-8 bg-[#002855] hover:bg-[#001d3d] text-white font-bold rounded-xl shadow-lg shadow-blue-900/10 transition-all text-xs">검색</Button>
                </div>
            </div>

            {/* Table Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#002855] rounded-full" />
                    학생 목록
                </h3>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg transition-all text-[13px]">엑셀 업로드</Button>
                    <Button variant="outline" className="h-9 px-4 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold rounded-lg transition-all text-[13px]">엑셀 다운로드</Button>
                    <Button variant="outline" className="h-9 px-4 border-[#002855] text-[#002855] hover:bg-blue-50 font-bold rounded-lg transition-all text-[13px]">학생 일괄 등록</Button>
                    <Button className="h-9 px-5 bg-[#002855] hover:bg-[#001d3d] text-white font-bold rounded-lg shadow-lg shadow-blue-900/10 transition-all text-[13px]">학생 개별 등록</Button>
                    <div className="flex items-center gap-1 ml-4 border-l border-slate-100 pl-4 text-slate-300">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100"><RotateCcw className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100"><LayoutGrid className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100"><Settings className="w-4 h-4 text-slate-600" /></Button>
                    </div>
                </div>
            </div>

            {/* Student Table */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-[0_4px_25px_-5px_rgba(0,0,0,0.01)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed min-w-[1400px]">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/30">
                                {[
                                    { label: "고유번호", width: "w-[100px]", sortable: true },
                                    { label: "학생명", width: "w-[120px]", sortable: true },
                                    { label: "PIN 번호", width: "w-[100px]", sortable: false },
                                    { label: "아이디", width: "w-[120px]", sortable: false },
                                    { label: "연락처", width: "w-[150px]", sortable: false },
                                    { label: "나이", width: "w-[80px]", sortable: true },
                                    { label: "학습타입", width: "w-[150px]", sortable: false },
                                    { label: "책 읽기 레벨", width: "w-[100px]", sortable: false },
                                    { label: "글쓰기 레벨", width: "w-[100px]", sortable: false },
                                    { label: "글쓰기 회차", width: "w-[100px]", sortable: false },
                                    { label: "서비스상태", width: "w-[100px]", sortable: false },
                                    { label: "서비스 정지 예약", width: "w-[140px]", sortable: false },
                                    { label: "생성일", width: "w-[120px]", sortable: true },
                                    { label: "서비스 종료일", width: "w-[120px]", sortable: true },
                                    { label: "편집", width: "w-[100px]", sortable: false }
                                ].map((col, idx) => (
                                    <th key={idx} className={`px-4 py-5 font-bold text-slate-400 text-[13px] uppercase tracking-wider ${col.width}`}>
                                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600 transition-colors">
                                            {col.label}
                                            {col.sortable && (
                                                <div className="flex flex-col">
                                                    <ChevronRight className="w-2.5 h-2.5 -rotate-90 -mb-1" />
                                                    <ChevronRight className="w-2.5 h-2.5 rotate-90" />
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {[
                                { id: "26142", name: "진방울", pin: "", userId: "", phone: "", age: 6, type: "책 읽기+글쓰기", readLvl: 1, writeLvl: 1, writeCnt: 1, status: "사용전", stopRes: "", regDate: "2025-12-01", endDate: "-" },
                                { id: "25809", name: "박지우", pin: "0006", userId: "", phone: "01050560676", age: 7, type: "책 읽기+글쓰기", readLvl: 1, writeLvl: 1, writeCnt: 1, status: "사용전", stopRes: "", regDate: "2025-11-19", endDate: "-" },
                                { id: "25178", name: "신다민", pin: "0008", userId: "", phone: "01071141586", age: 9, type: "책 읽기+글쓰기", readLvl: 2, writeLvl: 2, writeCnt: 7, status: "서비스만료", stopRes: "", regDate: "2025-10-01", endDate: "2025-12-01" },
                                { id: "25088", name: "김현우", pin: "0007", userId: "", phone: "01065226206", age: 7, type: "책 읽기+글쓰기", readLvl: 2, writeLvl: 1, writeCnt: 19, status: "사용중", stopRes: "", regDate: "2025-09-22", endDate: "2026-02-28" },
                                { id: "25062", name: "임시윤", pin: "0005", userId: "", phone: "01033273082", age: 10, type: "책 읽기+글쓰기", readLvl: 4, writeLvl: 5, writeCnt: 2, status: "사용중", stopRes: "", regDate: "2025-09-16", endDate: "2026-02-28" },
                                { id: "24902", name: "이예서", pin: "0004", userId: "", phone: "", age: 7, type: "책 읽기+글쓰기", readLvl: 1, writeLvl: 1, writeCnt: 13, status: "사용중", stopRes: "", regDate: "2025-09-07", endDate: "2026-02-28" },
                                { id: "24901", name: "이윤건", pin: "0003", userId: "", phone: "", age: 10, type: "책 읽기+글쓰기", readLvl: 3, writeLvl: 4, writeCnt: 12, status: "사용중", stopRes: "", regDate: "2025-09-07", endDate: "2026-02-28" },
                                { id: "24874", name: "심수연", pin: "0000", userId: "", phone: "", age: 38, type: "책 읽기+글쓰기", readLvl: 3, writeLvl: 4, writeCnt: 14, status: "사용중", stopRes: "", regDate: "2025-09-05", endDate: "2026-02-28" },
                                { id: "24215", name: "최서우", pin: "0001", userId: "", phone: "", age: 7, type: "책 읽기+글쓰기", readLvl: 1, writeLvl: 1, writeCnt: 26, status: "사용중", stopRes: "", regDate: "2025-08-18", endDate: "2026-02-28" },
                            ].map((student, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-all group border-b border-slate-50/50 last:border-0 font-medium">
                                    <td className="px-4 py-4 text-[14px] text-slate-500">{student.id}</td>
                                    <td className="px-4 py-4 text-[14px]">
                                        <Link href={`/agency/students/${student.id}`} className="text-[#002855] font-bold text-[15px] hover:text-blue-700 hover:underline transition-colors">
                                            {student.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-4 text-[14px] text-slate-400">{student.pin}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-400">{student.userId}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-500 font-semibold">{student.phone}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-500">{student.age}</td>
                                    <td className="px-4 py-4">
                                        <Badge className="bg-emerald-50 text-emerald-600 border-none shadow-none font-bold text-[11px] px-2 py-0.5 rounded-md">
                                            {student.type}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-[14px] text-slate-600 font-bold">{student.readLvl}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-600 font-bold">{student.writeLvl}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-600 font-bold">{student.writeCnt}</td>
                                    <td className="px-4 py-4">
                                        <Badge variant="outline" className={`font-bold text-[11px] px-2 py-0.5 rounded-md border-2 ${student.status === "사용중" ? "text-green-500 bg-white border-green-100" :
                                            student.status === "사용전" ? "text-red-500 bg-white border-red-100" :
                                                "text-slate-400 bg-slate-50 border-slate-100"
                                            }`}>
                                            {student.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-[14px] text-slate-400 font-semibold">{student.stopRes || "-"}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-500 font-semibold">{student.regDate}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-500 font-semibold">{student.endDate}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Bottom Summary & Pagination */}
                <div className="p-6 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-[13px] font-bold text-slate-500 order-2 md:order-1">
                        총 <span className="text-[#002855] font-black">9</span> 데이터
                    </div>
                    <div className="flex items-center gap-1.5 order-1 md:order-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 border-slate-200 text-slate-400 rounded-lg"><ChevronRight className="w-4 h-4 rotate-180" /></Button>
                        {[1].map((p) => (
                            <Button key={p} variant="secondary" className="w-8 h-8 p-0 rounded-lg font-bold text-sm bg-[#002855] text-white hover:bg-[#001d3d]">
                                {p}
                            </Button>
                        ))}
                        <Button variant="outline" size="icon" className="h-8 w-8 border-slate-200 text-slate-400 rounded-lg"><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                    <div className="order-3">
                        <Select defaultValue="50">
                            <SelectTrigger className="h-8 w-[80px] bg-slate-50 border-slate-100 rounded-lg text-xs font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="20">20 / 쪽</SelectItem>
                                <SelectItem value="50">50 / 쪽</SelectItem>
                                <SelectItem value="100">100 / 쪽</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    )
}
