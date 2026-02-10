"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search,
    RotateCcw,
    Download,
    Edit2,
    Settings,
    RotateCw,
    Info
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

export default function B2CStudentListPage() {
    return (
        <div className="flex flex-col gap-6 p-4 min-w-0">
            {/* Multi-layered Filter Section */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.02)] flex flex-col gap-5">
                {/* Row 1: Search & Service Status */}
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
                                    <SelectItem value="name">학생 이름</SelectItem>
                                    <SelectItem value="id">아이디</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative w-[300px]">
                                <Input placeholder="검색어를 입력해주세요" className="h-10 bg-slate-50 border-slate-100 rounded-xl pl-4 pr-10 focus:bg-white transition-all text-xs font-medium" />
                            </div>
                        </div>
                    </div>

                    {/* Service Status */}
                    <div className="flex items-center gap-3 ml-auto lg:ml-0">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0 whitespace-nowrap">서비스 상태</span>
                        <div className="flex gap-1.5 p-1 bg-slate-50/50 border border-slate-100 rounded-xl">
                            {["전체", "사용중", "서비스 만료", "탈퇴"].map((status) => (
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

                {/* Row 2: RegDate & Referral Search */}
                <div className="flex flex-wrap items-center gap-x-12 gap-y-4 pt-2 border-t border-slate-50">
                    {/* Reg Date */}
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0 whitespace-nowrap">검색</span>
                        <div className="flex items-center gap-2">
                            <Select defaultValue="regDate">
                                <SelectTrigger className="w-[100px] h-10 bg-slate-50 border-slate-100 rounded-xl font-semibold text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="regDate">가입일</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                                <div className="relative w-[140px]">
                                    <Input type="date" className="h-10 bg-slate-50 border-slate-100 rounded-xl px-3 text-xs font-medium" />
                                </div>
                                <span className="text-slate-300">~</span>
                                <div className="relative w-[140px]">
                                    <Input type="date" className="h-10 bg-slate-50 border-slate-100 rounded-xl px-3 text-xs font-medium" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Referral Search */}
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-slate-500 shrink-0 whitespace-nowrap">추천인 검색</span>
                        <Select defaultValue="all">
                            <SelectTrigger className="w-[180px] h-10 bg-slate-50 border-slate-100 rounded-xl font-semibold text-xs">
                                <SelectValue placeholder="선택해주세요" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">선택해주세요</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 ml-auto">
                        <Button variant="outline" className="h-10 px-6 border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all text-xs">초기화</Button>
                        <Button className="h-10 px-8 bg-[#002855] hover:bg-[#001d3d] text-white font-bold rounded-xl shadow-lg shadow-blue-900/10 transition-all text-xs">검색</Button>
                    </div>
                </div>
            </div>

            {/* Table Action Bar */}
            <div className="flex justify-between items-center px-2 mt-2">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#002855] rounded-full" />
                    학생 목록
                </h3>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9 px-4 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold rounded-lg transition-all text-[13px] flex items-center gap-2">
                        엑셀다운로드
                    </Button>
                    <div className="flex items-center gap-1 ml-4 border-l border-slate-100 pl-4 text-slate-300">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100"><RotateCw className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100"><Info className="w-4 h-4" /></Button>
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
                                    { label: "고유번호", width: "w-[100px]" },
                                    { label: "학생 이름", width: "w-[120px]" },
                                    { label: "학부모 이름", width: "w-[120px]" },
                                    { label: "아이디", width: "w-[140px]" },
                                    { label: "만 나이", width: "w-[80px]" },
                                    { label: "연락처", width: "w-[150px]" },
                                    { label: "학습타입", width: "w-[150px]" },
                                    { label: "서비스상태", width: "w-[100px]" },
                                    { label: "서비스종료일", width: "w-[120px]" },
                                    { label: "가입일", width: "w-[120px]" },
                                    { label: "추천인", width: "w-[180px]" },
                                    { label: "편집", width: "w-[80px]" }
                                ].map((col, idx) => (
                                    <th key={idx} className={`px-4 py-5 font-semibold text-slate-400 text-[13px] uppercase tracking-wider ${col.width}`}>
                                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600 transition-colors">
                                            {col.label}
                                            {col.label !== "편집" && col.label !== "학습타입" && col.label !== "서비스상태" && col.label !== "아이디" && col.label !== "학부모 이름" && col.label !== "연락처" && (
                                                <div className="flex flex-col">
                                                    <RotateCcw className="w-2.5 h-2.5 -rotate-90 -mb-1 opacity-50" />
                                                    <RotateCcw className="w-2.5 h-2.5 rotate-90 opacity-50" />
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {[
                                { id: "26775", name: "이서연", parent: "신민선", userId: "tsalstjs83", age: 10, phone: "01045038375", type: "책 읽기+글쓰기", status: "사용전", endDate: "-", regDate: "2026-02-05", ref: "-" },
                                { id: "26762", name: "구현모", parent: "김하영", userId: "blossom0818", age: 9, phone: "01033872262", type: "책 읽기+글쓰기", status: "사용전", endDate: "-", regDate: "2026-02-03", ref: "DD뽀이맘260123" },
                                { id: "26761", name: "권수윤", parent: "소명기", userId: "mk6126", age: 7, phone: "01038290126", type: "책 읽기+글쓰기", status: "사용전", endDate: "-", regDate: "2026-02-02", ref: "DD뽀이맘260123" },
                                { id: "26760", name: "김민한", parent: "류신지", userId: "psw1212", age: 12, phone: "01090162254", type: "책 읽기+글쓰기", status: "사용전", endDate: "2026-03-03", regDate: "2026-02-02", ref: "-" },
                                { id: "26759", name: "예지윤", parent: "권윤수", userId: "ing4487", age: 9, phone: "01031090152", type: "책 읽기+글쓰기", status: "사용중", endDate: "2027-02-01", regDate: "2026-02-02", ref: "-" },
                                { id: "26757", name: "이서연", parent: "금새빈", userId: "rmyjhl17", age: 6, phone: "01077583146", type: "책 읽기+글쓰기", status: "서비스 만료", endDate: "2026-02-04", regDate: "2026-02-02", ref: "DD뽀이맘260123" },
                                { id: "26756", name: "강규원", parent: "이민선", userId: "komdi83", age: 9, phone: "01066645668", type: "책 읽기+글쓰기", status: "사용전", endDate: "-", regDate: "2026-02-02", ref: "DD뽀이맘260123" },
                                { id: "26754", name: "이유주", parent: "신정원", userId: "uju8278", age: 10, phone: "01053108278", type: "책 읽기+글쓰기", status: "사용전", endDate: "-", regDate: "2026-02-02", ref: "-" },
                                { id: "26753", name: "이유민", parent: "신정원", userId: "uan8278", age: 10, phone: "01053108278", type: "책 읽기+글쓰기", status: "서비스 만료", endDate: "2026-02-04", regDate: "2026-02-02", ref: "DD뽀이맘260123" },
                                { id: "26751", name: "박지인", parent: "학부모", userId: "seop0211", age: 35, phone: "01063658450", type: "책 읽기+글쓰기", status: "사용전", endDate: "-", regDate: "2026-02-02", ref: "-" },
                            ].map((student, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-all group border-b border-slate-50/50 last:border-0 font-medium">
                                    <td className="px-4 py-4 text-[14px] text-slate-500">{student.id}</td>
                                    <td className="px-4 py-4 text-[14px]">
                                        <Link href={`/admin/b2c/students/${student.id}`} className="text-[#002855] font-semibold text-[15px] hover:text-blue-700 hover:underline transition-colors">
                                            {student.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-4 text-[14px] text-slate-600">{student.parent}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-400">{student.userId}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-500">{student.age}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-500">{student.phone}</td>
                                    <td className="px-4 py-4">
                                        <Badge className="bg-emerald-50 text-emerald-600 border-none shadow-none font-semibold text-[11px] px-2 py-0.5 rounded-md">
                                            {student.type}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge variant="outline" className={`font-semibold text-[11px] px-2 py-0.5 rounded-md border-2 ${student.status === "사용중" ? "text-green-500 bg-white border-green-100" :
                                            student.status === "사용전" ? "text-red-500 bg-white border-red-100" :
                                                student.status === "서비스 만료" ? "text-slate-400 bg-slate-50 border-slate-100" :
                                                    "text-slate-300 bg-white border-slate-50"
                                            }`}>
                                            {student.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-[14px] text-slate-500 font-semibold">{student.endDate}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-500 font-semibold">{student.regDate}</td>
                                    <td className="px-4 py-4 text-[14px] text-slate-500 font-medium">{student.ref}</td>
                                    <td className="px-4 py-4">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-200 group-hover:text-blue-600 hover:bg-blue-50 transition-all">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Bottom Pagination Placeholder */}
                <div className="p-6 border-t border-slate-50 flex justify-center">
                    <div className="flex items-center gap-1.5 font-bold">
                        <Button variant="secondary" className="w-8 h-8 p-0 rounded-lg bg-[#002855] text-white">1</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
