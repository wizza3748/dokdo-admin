"use client"

import * as React from "react"
import { Search, RotateCcw, ExternalLink, Send, Calendar as CalendarIcon, X, ChevronRight, ChevronLeft } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

// --- Types ---
type SendMode = "수동" | "자동"
type SendStatus = "발송대기" | "발송완료" | "발송실패"
type StudyType = "책 읽기" | "글쓰기"
type OrgType = "B2B" | "B2C"

interface SendRecord {
    id: string
    orgType: OrgType
    orgName: string
    studentName: string
    baseDate: string
    sendMode: SendMode
    sendStatus: SendStatus
    sentAt: string | null
    studyType: StudyType[]
    level: number
    firstCount: number
    retryCount: number
    previewUrl: string
}

// --- Mock Data ---
const today = format(new Date(), "yyyy-MM-dd")
const d1 = "2026-04-06"
const d2 = "2026-04-05"
const d3 = "2026-04-04"
const d4 = "2026-04-03"
const d5 = "2026-04-02"
const d6 = "2026-04-01"
const d7 = "2026-03-31"

const MOCK_RECORDS: SendRecord[] = [
    // ── 오늘 ──────────────────────────────────────────
    { id: "1",  orgType: "B2C", orgName: "B2C",     studentName: "김민준", baseDate: today, sendMode: "수동", sendStatus: "발송대기", sentAt: null,                   studyType: ["책 읽기", "글쓰기"], level: 3, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/1" },
    { id: "2",  orgType: "B2C", orgName: "B2C",     studentName: "이서연", baseDate: today, sendMode: "자동", sendStatus: "발송완료", sentAt: `${today} 21:00:05`,    studyType: ["글쓰기", "책 읽기"], level: 4, firstCount: 1, retryCount: 1, previewUrl: "/preview/exploration/2" },
    { id: "3",  orgType: "B2B", orgName: "독도학원", studentName: "박지호", baseDate: today, sendMode: "자동", sendStatus: "발송완료", sentAt: `${today} 21:00:10`,    studyType: ["책 읽기"], level: 5, firstCount: 3, retryCount: 0, previewUrl: "/preview/exploration/3" },
    { id: "4",  orgType: "B2B", orgName: "한빛학원", studentName: "최수아", baseDate: today, sendMode: "자동", sendStatus: "발송실패", sentAt: null,                   studyType: ["글쓰기"], level: 2, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/4" },
    { id: "5",  orgType: "B2C", orgName: "B2C",     studentName: "윤재원", baseDate: today, sendMode: "수동", sendStatus: "발송대기", sentAt: null,                   studyType: ["글쓰기"], level: 1, firstCount: 0, retryCount: 1, previewUrl: "/preview/exploration/5" },
    { id: "6",  orgType: "B2B", orgName: "미래학원", studentName: "한소희", baseDate: today, sendMode: "자동", sendStatus: "발송완료", sentAt: `${today} 21:00:22`,    studyType: ["책 읽기"], level: 6, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/6" },
    { id: "7",  orgType: "B2B", orgName: "독도학원", studentName: "장우진", baseDate: today, sendMode: "자동", sendStatus: "발송대기", sentAt: null,                   studyType: ["글쓰기"], level: 3, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/7" },
    { id: "8",  orgType: "B2C", orgName: "B2C",     studentName: "오지훈", baseDate: today, sendMode: "수동", sendStatus: "발송실패", sentAt: null,                   studyType: ["책 읽기"], level: 2, firstCount: 1, retryCount: 1, previewUrl: "/preview/exploration/8" },
    { id: "9",  orgType: "B2B", orgName: "별빛학원", studentName: "김나연", baseDate: today, sendMode: "자동", sendStatus: "발송완료", sentAt: `${today} 21:00:33`,    studyType: ["책 읽기"], level: 4, firstCount: 2, retryCount: 1, previewUrl: "/preview/exploration/9" },
    { id: "10", orgType: "B2B", orgName: "한빛학원", studentName: "이준혁", baseDate: today, sendMode: "자동", sendStatus: "발송완료", sentAt: `${today} 21:00:41`,    studyType: ["글쓰기"], level: 5, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/10" },

    // ── d1 (04-06) ────────────────────────────────────
    { id: "11", orgType: "B2C", orgName: "B2C",     studentName: "정도현", baseDate: d1, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d1} 15:23:44`, studyType: ["책 읽기"], level: 3, firstCount: 1, retryCount: 2, previewUrl: "/preview/exploration/11" },
    { id: "12", orgType: "B2B", orgName: "독도학원", studentName: "강하은", baseDate: d1, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d1} 21:00:02`, studyType: ["글쓰기"], level: 6, firstCount: 2, retryCount: 1, previewUrl: "/preview/exploration/12" },
    { id: "13", orgType: "B2C", orgName: "B2C",     studentName: "박수빈", baseDate: d1, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d1} 21:00:08`, studyType: ["책 읽기"], level: 2, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/13" },
    { id: "14", orgType: "B2B", orgName: "미래학원", studentName: "이정우", baseDate: d1, sendMode: "자동", sendStatus: "발송실패", sentAt: null,               studyType: ["글쓰기"], level: 4, firstCount: 0, retryCount: 1, previewUrl: "/preview/exploration/14" },
    { id: "15", orgType: "B2C", orgName: "B2C",     studentName: "최민서", baseDate: d1, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d1} 09:12:30`, studyType: ["글쓰기"], level: 1, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/15" },
    { id: "16", orgType: "B2B", orgName: "별빛학원", studentName: "김도윤", baseDate: d1, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d1} 21:00:14`, studyType: ["책 읽기"], level: 5, firstCount: 3, retryCount: 0, previewUrl: "/preview/exploration/16" },
    { id: "17", orgType: "B2B", orgName: "한빛학원", studentName: "조예은", baseDate: d1, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d1} 21:00:19`, studyType: ["글쓰기"], level: 3, firstCount: 1, retryCount: 1, previewUrl: "/preview/exploration/17" },
    { id: "18", orgType: "B2C", orgName: "B2C",     studentName: "신유찬", baseDate: d1, sendMode: "수동", sendStatus: "발송실패", sentAt: null,               studyType: ["책 읽기"], level: 4, firstCount: 0, retryCount: 2, previewUrl: "/preview/exploration/18" },

    // ── d2 (04-05) ────────────────────────────────────
    { id: "19", orgType: "B2C", orgName: "B2C",     studentName: "윤재원", baseDate: d2, sendMode: "수동", sendStatus: "발송실패", sentAt: null,               studyType: ["책 읽기"], level: 2, firstCount: 0, retryCount: 1, previewUrl: "/preview/exploration/19" },
    { id: "20", orgType: "B2B", orgName: "독도학원", studentName: "박지호", baseDate: d2, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d2} 21:00:05`, studyType: ["책 읽기"], level: 5, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/20" },
    { id: "21", orgType: "B2B", orgName: "미래학원", studentName: "한소희", baseDate: d2, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d2} 21:00:11`, studyType: ["글쓰기"], level: 6, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/21" },
    { id: "22", orgType: "B2C", orgName: "B2C",     studentName: "이서연", baseDate: d2, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d2} 21:00:17`, studyType: ["글쓰기"], level: 4, firstCount: 2, retryCount: 1, previewUrl: "/preview/exploration/22" },
    { id: "23", orgType: "B2B", orgName: "별빛학원", studentName: "장우진", baseDate: d2, sendMode: "자동", sendStatus: "발송실패", sentAt: null,               studyType: ["책 읽기"], level: 3, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/23" },
    { id: "24", orgType: "B2C", orgName: "B2C",     studentName: "김민준", baseDate: d2, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d2} 16:45:22`, studyType: ["책 읽기"], level: 3, firstCount: 1, retryCount: 2, previewUrl: "/preview/exploration/24" },
    { id: "25", orgType: "B2B", orgName: "한빛학원", studentName: "최수아", baseDate: d2, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d2} 21:00:28`, studyType: ["글쓰기"], level: 2, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/25" },
    { id: "26", orgType: "B2C", orgName: "B2C",     studentName: "오지훈", baseDate: d2, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d2} 14:33:10`, studyType: ["글쓰기"], level: 1, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/26" },

    // ── d3 (04-04) ────────────────────────────────────
    { id: "27", orgType: "B2B", orgName: "독도학원", studentName: "강하은", baseDate: d3, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d3} 21:00:03`, studyType: ["글쓰기"], level: 6, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/27" },
    { id: "28", orgType: "B2C", orgName: "B2C",     studentName: "박수빈", baseDate: d3, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d3} 21:00:09`, studyType: ["책 읽기"], level: 2, firstCount: 1, retryCount: 1, previewUrl: "/preview/exploration/28" },
    { id: "29", orgType: "B2B", orgName: "미래학원", studentName: "이정우", baseDate: d3, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d3} 21:00:15`, studyType: ["글쓰기"], level: 4, firstCount: 3, retryCount: 0, previewUrl: "/preview/exploration/29" },
    { id: "30", orgType: "B2C", orgName: "B2C",     studentName: "최민서", baseDate: d3, sendMode: "수동", sendStatus: "발송실패", sentAt: null,               studyType: ["글쓰기"], level: 1, firstCount: 0, retryCount: 1, previewUrl: "/preview/exploration/30" },
    { id: "31", orgType: "B2B", orgName: "별빛학원", studentName: "김나연", baseDate: d3, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d3} 21:00:20`, studyType: ["책 읽기"], level: 4, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/31" },
    { id: "32", orgType: "B2B", orgName: "한빛학원", studentName: "이준혁", baseDate: d3, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d3} 21:00:26`, studyType: ["책 읽기"], level: 5, firstCount: 1, retryCount: 1, previewUrl: "/preview/exploration/32" },
    { id: "33", orgType: "B2C", orgName: "B2C",     studentName: "신유찬", baseDate: d3, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d3} 11:20:44`, studyType: ["책 읽기"], level: 4, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/33" },
    { id: "34", orgType: "B2C", orgName: "B2C",     studentName: "정도현", baseDate: d3, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d3} 21:00:33`, studyType: ["글쓰기"], level: 3, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/34" },

    // ── d4 (04-03) ────────────────────────────────────
    { id: "35", orgType: "B2B", orgName: "독도학원", studentName: "박지호", baseDate: d4, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d4} 21:00:04`, studyType: ["책 읽기"], level: 5, firstCount: 3, retryCount: 0, previewUrl: "/preview/exploration/35" },
    { id: "36", orgType: "B2C", orgName: "B2C",     studentName: "이서연", baseDate: d4, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d4} 21:00:08`, studyType: ["글쓰기", "책 읽기"], level: 4, firstCount: 1, retryCount: 1, previewUrl: "/preview/exploration/36" },
    { id: "37", orgType: "B2B", orgName: "미래학원", studentName: "한소희", baseDate: d4, sendMode: "자동", sendStatus: "발송실패", sentAt: null,               studyType: ["책 읽기"], level: 6, firstCount: 0, retryCount: 1, previewUrl: "/preview/exploration/37" },
    { id: "38", orgType: "B2C", orgName: "B2C",     studentName: "김민준", baseDate: d4, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d4} 17:05:33`, studyType: ["책 읽기", "글쓰기"], level: 3, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/38" },
    { id: "39", orgType: "B2B", orgName: "별빛학원", studentName: "장우진", baseDate: d4, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d4} 21:00:16`, studyType: ["글쓰기"], level: 3, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/39" },
    { id: "40", orgType: "B2B", orgName: "한빛학원", studentName: "조예은", baseDate: d4, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d4} 21:00:22`, studyType: ["글쓰기"], level: 3, firstCount: 2, retryCount: 1, previewUrl: "/preview/exploration/40" },
    { id: "41", orgType: "B2C", orgName: "B2C",     studentName: "오지훈", baseDate: d4, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d4} 13:44:55`, studyType: ["글쓰기"], level: 1, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/41" },
    { id: "42", orgType: "B2C", orgName: "B2C",     studentName: "윤재원", baseDate: d4, sendMode: "수동", sendStatus: "발송실패", sentAt: null,               studyType: ["책 읽기"], level: 2, firstCount: 0, retryCount: 2, previewUrl: "/preview/exploration/42" },

    // ── d5 (04-02) ────────────────────────────────────
    { id: "43", orgType: "B2B", orgName: "독도학원", studentName: "강하은", baseDate: d5, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d5} 21:00:06`, studyType: ["글쓰기"], level: 6, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/43" },
    { id: "44", orgType: "B2C", orgName: "B2C",     studentName: "박수빈", baseDate: d5, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d5} 21:00:12`, studyType: ["책 읽기"], level: 2, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/44" },
    { id: "45", orgType: "B2B", orgName: "미래학원", studentName: "이정우", baseDate: d5, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d5} 21:00:18`, studyType: ["글쓰기"], level: 4, firstCount: 3, retryCount: 1, previewUrl: "/preview/exploration/45" },
    { id: "46", orgType: "B2C", orgName: "B2C",     studentName: "최민서", baseDate: d5, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d5} 10:30:22`, studyType: ["책 읽기"], level: 1, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/46" },
    { id: "47", orgType: "B2B", orgName: "별빛학원", studentName: "김나연", baseDate: d5, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d5} 21:00:24`, studyType: ["책 읽기"], level: 4, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/47" },
    { id: "48", orgType: "B2B", orgName: "한빛학원", studentName: "이준혁", baseDate: d5, sendMode: "자동", sendStatus: "발송실패", sentAt: null,               studyType: ["책 읽기"], level: 5, firstCount: 0, retryCount: 1, previewUrl: "/preview/exploration/48" },
    { id: "49", orgType: "B2C", orgName: "B2C",     studentName: "신유찬", baseDate: d5, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d5} 16:10:38`, studyType: ["글쓰기"], level: 4, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/49" },
    { id: "50", orgType: "B2C", orgName: "B2C",     studentName: "정도현", baseDate: d5, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d5} 21:00:31`, studyType: ["글쓰기"], level: 3, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/50" },

    // ── d6 (04-01) ────────────────────────────────────
    { id: "51", orgType: "B2B", orgName: "독도학원", studentName: "박지호", baseDate: d6, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d6} 21:00:07`, studyType: ["책 읽기"], level: 5, firstCount: 3, retryCount: 0, previewUrl: "/preview/exploration/51" },
    { id: "52", orgType: "B2C", orgName: "B2C",     studentName: "이서연", baseDate: d6, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d6} 21:00:13`, studyType: ["글쓰기", "책 읽기"], level: 4, firstCount: 1, retryCount: 1, previewUrl: "/preview/exploration/52" },
    { id: "53", orgType: "B2B", orgName: "미래학원", studentName: "한소희", baseDate: d6, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d6} 21:00:19`, studyType: ["글쓰기"], level: 6, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/53" },
    { id: "54", orgType: "B2C", orgName: "B2C",     studentName: "김민준", baseDate: d6, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d6} 14:22:55`, studyType: ["책 읽기", "글쓰기"], level: 3, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/54" },
    { id: "55", orgType: "B2B", orgName: "별빛학원", studentName: "장우진", baseDate: d6, sendMode: "자동", sendStatus: "발송실패", sentAt: null,               studyType: ["책 읽기"], level: 3, firstCount: 0, retryCount: 1, previewUrl: "/preview/exploration/55" },
    { id: "56", orgType: "B2B", orgName: "한빛학원", studentName: "조예은", baseDate: d6, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d6} 21:00:25`, studyType: ["글쓰기"], level: 3, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/56" },
    { id: "57", orgType: "B2C", orgName: "B2C",     studentName: "오지훈", baseDate: d6, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d6} 11:55:40`, studyType: ["책 읽기"], level: 1, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/57" },
    { id: "58", orgType: "B2C", orgName: "B2C",     studentName: "윤재원", baseDate: d6, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d6} 21:00:32`, studyType: ["글쓰기"], level: 2, firstCount: 1, retryCount: 1, previewUrl: "/preview/exploration/58" },

    // ── d7 (03-31) ────────────────────────────────────
    { id: "59", orgType: "B2B", orgName: "독도학원", studentName: "강하은", baseDate: d7, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d7} 21:00:02`, studyType: ["글쓰기"], level: 6, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/59" },
    { id: "60", orgType: "B2C", orgName: "B2C",     studentName: "박수빈", baseDate: d7, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d7} 21:00:09`, studyType: ["책 읽기"], level: 2, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/60" },
    { id: "61", orgType: "B2B", orgName: "미래학원", studentName: "이정우", baseDate: d7, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d7} 21:00:15`, studyType: ["글쓰기"], level: 4, firstCount: 3, retryCount: 0, previewUrl: "/preview/exploration/61" },
    { id: "62", orgType: "B2C", orgName: "B2C",     studentName: "최민서", baseDate: d7, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d7} 09:45:11`, studyType: ["책 읽기"], level: 1, firstCount: 1, retryCount: 1, previewUrl: "/preview/exploration/62" },
    { id: "63", orgType: "B2B", orgName: "별빛학원", studentName: "김나연", baseDate: d7, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d7} 21:00:21`, studyType: ["책 읽기"], level: 4, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/63" },
    { id: "64", orgType: "B2B", orgName: "한빛학원", studentName: "이준혁", baseDate: d7, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d7} 21:00:27`, studyType: ["글쓰기"], level: 5, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/64" },
    { id: "65", orgType: "B2C", orgName: "B2C",     studentName: "신유찬", baseDate: d7, sendMode: "수동", sendStatus: "발송실패", sentAt: null,               studyType: ["글쓰기"], level: 4, firstCount: 0, retryCount: 2, previewUrl: "/preview/exploration/65" },
    { id: "66", orgType: "B2C", orgName: "B2C",     studentName: "정도현", baseDate: d7, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d7} 21:00:34`, studyType: ["책 읽기", "글쓰기"], level: 3, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/66" },
    { id: "67", orgType: "B2B", orgName: "독도학원", studentName: "장우진", baseDate: d7, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d7} 21:00:40`, studyType: ["책 읽기"], level: 3, firstCount: 1, retryCount: 1, previewUrl: "/preview/exploration/67" },
    { id: "68", orgType: "B2C", orgName: "B2C",     studentName: "오지훈", baseDate: d7, sendMode: "수동", sendStatus: "발송완료", sentAt: `${d7} 15:30:55`, studyType: ["글쓰기"], level: 1, firstCount: 1, retryCount: 0, previewUrl: "/preview/exploration/68" },
    { id: "69", orgType: "B2B", orgName: "미래학원", studentName: "조예은", baseDate: d7, sendMode: "자동", sendStatus: "발송실패", sentAt: null,               studyType: ["글쓰기"], level: 3, firstCount: 0, retryCount: 1, previewUrl: "/preview/exploration/69" },
    { id: "70", orgType: "B2B", orgName: "한빛학원", studentName: "김도윤", baseDate: d7, sendMode: "자동", sendStatus: "발송완료", sentAt: `${d7} 21:00:47`, studyType: ["책 읽기"], level: 5, firstCount: 2, retryCount: 0, previewUrl: "/preview/exploration/70" },
]

// 발송 가능 여부 판단
function canShowSendButton(record: SendRecord): boolean {
    if (record.orgType === "B2B") return false
    if (record.sendMode === "자동") return false
    if (record.sendStatus === "발송완료") return false
    if (record.baseDate !== today) return false
    return record.sendStatus === "발송대기" || record.sendStatus === "발송실패"
}

// 발송 요약 계산
function calcSummary(records: SendRecord[]) {
    const calc = (list: SendRecord[]) => ({
        pending: list.filter(r => r.sendStatus === "발송대기").length,
        done: list.filter(r => r.sendStatus === "발송완료").length,
        failed: list.filter(r => r.sendStatus === "발송실패").length,
        total: list.length,
    })
    return {
        all: calc(records),
        b2b: calc(records.filter(r => r.orgType === "B2B")),
        b2c: calc(records.filter(r => r.orgType === "B2C")),
    }
}

// 상태 뱃지 스타일
function getStatusStyle(status: SendStatus) {
    if (status === "발송완료") return "text-emerald-600"
    if (status === "발송실패") return "text-red-500"
    return "text-slate-400"
}

function getStatusDot(status: SendStatus) {
    if (status === "발송완료") return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
    if (status === "발송실패") return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
    return "bg-slate-300"
}

export default function ExplorationSendStatusPage() {
    const [filter, setFilter] = React.useState({
        baseDate: undefined as Date | { from: Date; to: Date } | undefined,
        studyType: "전체",
        sendStatus: "전체",
        sendMode: "전체",
        orgTypeFilter: "전체" as "전체" | "B2B" | "B2C",
        orgName: "",
    })
    const [appliedFilter, setAppliedFilter] = React.useState(filter)
    const [allRecords, setAllRecords] = React.useState<SendRecord[]>(MOCK_RECORDS)
    const [selectedPreviewUrl, setSelectedPreviewUrl] = React.useState("")
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)

    // 페이지네이션
    const PAGE_SIZE = 20
    const [currentPage, setCurrentPage] = React.useState(1)

    // ESC 키로 미리보기 닫기
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsPreviewOpen(false)
        }
        window.addEventListener("keydown", handleEsc)
        return () => window.removeEventListener("keydown", handleEsc)
    }, [])

    // 필터링된 목록
    const filteredRecords = React.useMemo(() => {
        let list = [...allRecords]

        if (appliedFilter.studyType !== "전체") {
            list = list.filter(r => r.studyType.includes(appliedFilter.studyType as StudyType))
        }
        if (appliedFilter.sendStatus !== "전체") {
            list = list.filter(r => r.sendStatus === appliedFilter.sendStatus)
        }
        if (appliedFilter.sendMode !== "전체") {
            list = list.filter(r => r.sendMode === appliedFilter.sendMode)
        }
        if (appliedFilter.orgTypeFilter !== "전체") {
            list = list.filter(r => r.orgType === appliedFilter.orgTypeFilter)
        }
        if (appliedFilter.orgTypeFilter !== "B2C" && appliedFilter.orgName.trim()) {
            list = list.filter(r => r.orgName.includes(appliedFilter.orgName.trim()))
        }
        if (appliedFilter.baseDate) {
            if (typeof appliedFilter.baseDate === "object" && "from" in appliedFilter.baseDate) {
                const from = format(appliedFilter.baseDate.from, "yyyy-MM-dd")
                const to = appliedFilter.baseDate.to
                    ? format(appliedFilter.baseDate.to, "yyyy-MM-dd")
                    : from
                list = list.filter(r => r.baseDate >= from && r.baseDate <= to)
            } else {
                const d = format(appliedFilter.baseDate as Date, "yyyy-MM-dd")
                list = list.filter(r => r.baseDate === d)
            }
        }

        // 정렬: 기준일 내림차순 → 동일 기준일 내 발송시각 내림차순
        return list.sort((a, b) => {
            if (b.baseDate !== a.baseDate) return b.baseDate.localeCompare(a.baseDate)
            if (a.sentAt && b.sentAt) return b.sentAt.localeCompare(a.sentAt)
            if (a.sentAt) return -1
            if (b.sentAt) return 1
            return 0
        })
    }, [allRecords, appliedFilter])

    const summary = React.useMemo(() => calcSummary(filteredRecords), [filteredRecords])

    // 페이지네이션 계산
    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
    const pagedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const handleSearch = () => {
        setAppliedFilter({ ...filter })
        setCurrentPage(1)
    }

    const handleReset = () => {
        const reset = {
            baseDate: undefined,
            studyType: "전체",
            sendStatus: "전체",
            sendMode: "전체",
            orgTypeFilter: "전체" as const,
            orgName: "",
        }
        setFilter(reset)
        setAppliedFilter(reset)
        setCurrentPage(1)
    }

    const handleSend = (record: SendRecord) => {
        const confirmed = window.confirm("해당 학생의 부모님에게 탐험 결과를 발송하시겠어요?")
        if (!confirmed) return

        const now = format(new Date(), "yyyy-MM-dd HH:mm:ss")
        setAllRecords(prev =>
            prev.map(r =>
                r.id === record.id
                    ? { ...r, sendStatus: "발송완료", sentAt: now }
                    : r
            )
        )
        alert(`${record.studentName} 학생의 탐험 결과가 부모님에게 발송되었습니다.`)
    }

    const dateLabel = React.useMemo(() => {
        if (!filter.baseDate) return null
        if (typeof filter.baseDate === "object" && "from" in filter.baseDate) {
            const from = format(filter.baseDate.from, "yyyy.MM.dd")
            const to = filter.baseDate.to ? format(filter.baseDate.to, "yyyy.MM.dd") : from
            return `${from} - ${to}`
        }
        return format(filter.baseDate as Date, "yyyy.MM.dd")
    }, [filter.baseDate])

    return (
        <div className="flex flex-col gap-6 p-4 pb-12">
            {/* 브레드크럼 */}
            <div className="flex items-center gap-2 text-[14px]">
                <span className="text-slate-400 font-medium">[본사관리자]</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-slate-400 font-medium">탐험관리</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-slate-800 font-black">탐험결과발송 현황</span>
            </div>

            {/* ── 검색 필터 영역 ── */}
            <Card className="p-5 border border-slate-100 shadow-sm bg-slate-50/50">
                <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">

                        {/* 기준일 */}
                        <div className="flex items-center gap-3">
                            <Label className="text-sm font-semibold w-16 shrink-0 text-right text-slate-600">기준일</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-[240px] h-9 justify-start text-left text-[13px] font-bold border-slate-200 bg-white rounded-lg shadow-sm",
                                            !filter.baseDate && "text-slate-400 font-medium"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                        {dateLabel ?? <span>날짜를 선택하세요</span>}
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
                            <Label className="text-sm font-semibold w-16 shrink-0 text-right text-slate-600">학습타입</Label>
                            <div className="flex p-1 border border-slate-200 rounded-lg bg-white items-center shadow-sm">
                                {["전체", "책 읽기", "글쓰기"].map((type, idx) => (
                                    <React.Fragment key={type}>
                                        {idx > 0 && <div className="w-[1px] h-3 bg-slate-200 mx-1" />}
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "h-7 rounded-md px-3 text-[12px] transition-all",
                                                filter.studyType === type
                                                    ? "bg-[#002855] text-white shadow-sm font-semibold hover:bg-[#001d3d] hover:text-white"
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
                            <Label className="text-sm font-semibold w-16 shrink-0 text-right text-slate-600">발송상태</Label>
                            <div className="flex p-1 border border-slate-200 rounded-lg bg-white items-center shadow-sm">
                                {["전체", "발송대기", "발송완료", "발송실패"].map((status, idx) => (
                                    <React.Fragment key={status}>
                                        {idx > 0 && <div className="w-[1px] h-3 bg-slate-200 mx-1" />}
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "h-7 rounded-md px-3 text-[12px] transition-all",
                                                filter.sendStatus === status
                                                    ? "bg-[#002855] text-white shadow-sm font-semibold hover:bg-[#001d3d] hover:text-white"
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

                        {/* 발송모드 */}
                        <div className="flex items-center gap-3">
                            <Label className="text-sm font-semibold w-16 shrink-0 text-right text-slate-600">발송모드</Label>
                            <div className="flex p-1 border border-slate-200 rounded-lg bg-white items-center shadow-sm">
                                {["전체", "수동", "자동"].map((mode, idx) => (
                                    <React.Fragment key={mode}>
                                        {idx > 0 && <div className="w-[1px] h-3 bg-slate-200 mx-1" />}
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "h-7 rounded-md px-3 text-[12px] transition-all",
                                                filter.sendMode === mode
                                                    ? "bg-[#002855] text-white shadow-sm font-semibold hover:bg-[#001d3d] hover:text-white"
                                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                                            )}
                                            onClick={() => setFilter(prev => ({ ...prev, sendMode: mode }))}
                                        >
                                            {mode}
                                        </Button>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* 운영유형 */}
                        <div className="flex items-center gap-3">
                            <Label className="text-sm font-semibold w-16 shrink-0 text-right text-slate-600">운영유형</Label>
                            <div className="flex p-1 border border-slate-200 rounded-lg bg-white items-center shadow-sm">
                                {["전체", "B2B", "B2C"].map((type, idx) => (
                                    <React.Fragment key={type}>
                                        {idx > 0 && <div className="w-[1px] h-3 bg-slate-200 mx-1" />}
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "h-7 rounded-md px-3 text-[12px] transition-all",
                                                filter.orgTypeFilter === type
                                                    ? "bg-[#002855] text-white shadow-sm font-semibold hover:bg-[#001d3d] hover:text-white"
                                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                                            )}
                                            onClick={() => setFilter(prev => ({ ...prev, orgTypeFilter: type as any }))}
                                        >
                                            {type}
                                        </Button>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* 기관명 */}
                        <div className="flex items-center gap-3">
                            <Label className="text-sm font-semibold w-16 shrink-0 text-right text-slate-600">기관명</Label>
                            <Input
                                placeholder="기관명 검색"
                                value={filter.orgName}
                                onChange={(e) => setFilter(prev => ({ ...prev, orgName: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
                                disabled={filter.orgTypeFilter === "B2C"}
                                className="w-[200px] h-9 text-[13px] border-slate-200 bg-white rounded-lg shadow-sm disabled:opacity-50 disabled:bg-slate-50"
                            />
                        </div>

                        {/* 버튼 영역 */}
                        <div className="flex items-center gap-2 ml-auto">
                            <Button
                                variant="outline"
                                className="h-9 px-4 border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 font-semibold text-[13px]"
                                onClick={handleReset}
                            >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                초기화
                            </Button>
                            <Button
                                className="h-9 px-6 bg-[#002855] hover:bg-[#001d3d] text-white rounded-lg shadow-sm font-bold text-[13px] transition-all"
                                onClick={handleSearch}
                            >
                                <Search className="w-3.5 h-3.5 mr-1.5" />
                                검색하기
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* ── 발송 요약 영역 ── */}
            <Card className="border border-slate-100 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        <TableRow className="hover:bg-transparent border-b-slate-100">
                            <TableHead className="w-[100px] font-bold text-slate-500 text-center py-3">구분</TableHead>
                            <TableHead className="font-bold text-slate-500 text-center py-3">발송대기</TableHead>
                            <TableHead className="font-bold text-slate-500 text-center py-3">발송완료</TableHead>
                            <TableHead className="font-bold text-slate-500 text-center py-3">발송실패</TableHead>
                            <TableHead className="font-bold text-slate-500 text-center py-3">전체 발송건수</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(
                            [
                                { label: "전체", data: summary.all },
                                { label: "B2B", data: summary.b2b },
                                { label: "B2C", data: summary.b2c },
                            ] as const
                        ).map(({ label, data }) => (
                            <TableRow key={label} className="hover:bg-transparent border-b-slate-50">
                                <TableCell className="text-center font-bold text-slate-600 py-4">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-xs font-bold",
                                        label === "전체" ? "bg-slate-100 text-slate-600" :
                                            label === "B2B" ? "bg-blue-50 text-blue-700" :
                                                "bg-purple-50 text-purple-700"
                                    )}>
                                        {label}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="font-semibold text-slate-400 text-sm">{data.pending.toLocaleString()}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="font-bold text-emerald-600 text-sm">{data.done.toLocaleString()}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="font-bold text-red-500 text-sm">{data.failed.toLocaleString()}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="font-bold text-slate-700 text-sm">{data.total.toLocaleString()}</span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* ── 발송 목록 영역 ── */}
            <Card className="border border-slate-100 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-b-slate-100">
                            <TableHead className="font-semibold text-slate-400 py-4 pl-6">기관</TableHead>
                            <TableHead className="font-semibold text-slate-400">학생명</TableHead>
                            <TableHead className="font-semibold text-slate-400">기준일</TableHead>
                            <TableHead className="font-semibold text-slate-400">발송모드</TableHead>
                            <TableHead className="font-semibold text-slate-400">발송상태</TableHead>
                            <TableHead className="font-semibold text-slate-400">발송시각</TableHead>
                            <TableHead className="font-semibold text-slate-400">학습타입</TableHead>
                            <TableHead className="text-center font-semibold text-slate-400">레벨</TableHead>
                            <TableHead className="text-center font-semibold text-slate-400">첫 탐험</TableHead>
                            <TableHead className="text-center font-semibold text-slate-400">재탐험</TableHead>
                            <TableHead className="text-center font-semibold text-slate-400 w-[100px]">발송</TableHead>
                            <TableHead className="text-center font-semibold text-slate-400 w-[100px] pr-6">미리보기</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={12} className="h-40 text-center text-slate-300 font-bold">
                                    조회된 데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            pagedRecords.map((record) => {
                                const showSend = canShowSendButton(record)
                                return (
                                    <TableRow
                                        key={record.id}
                                        className="group hover:bg-slate-50/50 border-b-slate-50 transition-colors"
                                    >
                                        {/* 기관 */}
                                        <TableCell className="py-5 pl-6">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-md text-[11px] font-bold",
                                                record.orgType === "B2B"
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "bg-purple-50 text-purple-700"
                                            )}>
                                                {record.orgType === "B2B" ? record.orgName : "B2C"}
                                            </span>
                                        </TableCell>

                                        {/* 학생명 */}
                                        <TableCell className="font-semibold text-slate-700">{record.studentName}</TableCell>

                                        {/* 기준일 */}
                                        <TableCell className="font-medium text-slate-600 text-sm">
                                            {record.baseDate}
                                            {record.baseDate === today && (
                                                <span className="ml-1.5 text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">오늘</span>
                                            )}
                                        </TableCell>

                                        {/* 발송모드 */}
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "font-semibold text-[10px] px-2 py-0.5",
                                                record.sendMode === "자동"
                                                    ? "text-emerald-500 border-emerald-100 bg-emerald-50"
                                                    : "text-slate-400 border-slate-200"
                                            )}>
                                                {record.sendMode}
                                            </Badge>
                                        </TableCell>

                                        {/* 발송상태 */}
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn("size-1.5 rounded-full", getStatusDot(record.sendStatus))} />
                                                <span className={cn("text-sm font-semibold", getStatusStyle(record.sendStatus))}>
                                                    {record.sendStatus}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* 발송시각 */}
                                        <TableCell className={cn(
                                            "text-xs font-bold",
                                            record.sendStatus === "발송완료" ? "text-slate-500" : "text-slate-200"
                                        )}>
                                            {record.sendStatus === "발송완료" ? record.sentAt : "-"}
                                        </TableCell>

                                        {/* 학습타입 */}
                                        <TableCell>
                                            <div className="flex flex-col gap-1.5 items-start">
                                                {record.studyType.map(type => (
                                                    <span key={type} className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                        </TableCell>

                                        {/* 레벨 */}
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center">
                                                <div className={cn(
                                                    "flex items-center justify-center size-8 rounded-lg text-sm font-bold border",
                                                    record.studyType[0] === "책 읽기"
                                                        ? "bg-blue-50 text-blue-700 border-blue-100"
                                                        : "bg-amber-50 text-amber-700 border-amber-100"
                                                )}>
                                                    {record.level}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* 첫 탐험 */}
                                        <TableCell className="text-center">
                                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                                                {record.firstCount}
                                            </span>
                                        </TableCell>

                                        {/* 재탐험 */}
                                        <TableCell className="text-center">
                                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-semibold">
                                                {record.retryCount}
                                            </span>
                                        </TableCell>

                                        {/* 발송 버튼 */}
                                        <TableCell className="text-center">
                                            {showSend && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-100 transition-all rounded-lg gap-1.5 text-xs"
                                                    onClick={() => handleSend(record)}
                                                >
                                                    <Send className="w-3 h-3" />
                                                    발송
                                                </Button>
                                            )}
                                        </TableCell>

                                        {/* 미리보기 버튼 */}
                                        <TableCell className="text-center pr-6">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 px-3 text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all rounded-lg gap-1.5 font-bold text-xs"
                                                onClick={() => {
                                                    setSelectedPreviewUrl(record.previewUrl)
                                                    setIsPreviewOpen(true)
                                                }}
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                미리보기
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
                        {/* 좌측: 총 건수 */}
                        <span className="text-xs text-slate-400 font-medium">
                            총 <span className="font-bold text-slate-600">{filteredRecords.length.toLocaleString()}</span>건
                            &nbsp;·&nbsp;
                            <span className="font-bold text-slate-600">{currentPage}</span> / {totalPages} 페이지
                        </span>

                        {/* 중앙: 페이지 버튼 */}
                        <div className="flex items-center gap-1">
                            {/* 이전 */}
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {/* 페이지 번호 */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => {
                                    if (totalPages <= 7) return true
                                    if (p === 1 || p === totalPages) return true
                                    if (Math.abs(p - currentPage) <= 2) return true
                                    return false
                                })
                                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
                                        acc.push("...")
                                    }
                                    acc.push(p)
                                    return acc
                                }, [])
                                .map((item, idx) =>
                                    item === "..." ? (
                                        <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-300 text-xs font-bold">…</span>
                                    ) : (
                                        <button
                                            key={item}
                                            onClick={() => setCurrentPage(item as number)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                                                currentPage === item
                                                    ? "bg-[#002855] text-white shadow-sm"
                                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                            )}
                                        >
                                            {item}
                                        </button>
                                    )
                                )
                            }

                            {/* 다음 */}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* 우측: 여백 (대칭) */}
                        <div className="w-[120px]" />
                    </div>
                )}
            </Card>

            {/* ── 미리보기 모달 ── */}
            {isPreviewOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 px-4"
                    onClick={() => setIsPreviewOpen(false)}
                >
                    <Card
                        className="w-full max-w-[500px] bg-white rounded-[32px] shadow-2xl overflow-hidden border-none flex flex-col max-h-[92vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 모달 헤더 */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 shrink-0">
                            <h3 className="font-black text-slate-800 tracking-tight">탐험 결과 미리보기</h3>
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

                        {/* 모달 바디 - iPhone 프레임 */}
                        <div className="flex-1 bg-slate-50 relative flex justify-center py-8 overflow-hidden">
                            <div className="relative w-[420px] h-[780px] bg-[#1a1a1a] rounded-[54px] p-3 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[3px] border-[#333] flex flex-col overflow-hidden shrink-0 my-auto">
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-[20px] z-30 flex items-center justify-center">
                                    <div className="size-1 rounded-full bg-[#222] mr-6" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#222]" />
                                </div>
                                <div className="w-full h-full bg-white rounded-[42px] overflow-hidden relative shadow-inner">
                                    <div className="w-full h-full overflow-y-auto overflow-x-hidden bg-white">
                                        <iframe
                                            src={selectedPreviewUrl}
                                            className="w-[390px] h-[3500px] border-none"
                                            title="Preview Content"
                                            style={{ width: "390px", height: "3500px", display: "block", margin: "0 auto", overflow: "hidden" }}
                                            scrolling="no"
                                        />
                                    </div>
                                </div>
                                <div className="absolute top-[120px] -left-[1px] w-[3px] h-[60px] bg-gradient-to-b from-[#555] to-[#222] rounded-r-md z-10" />
                                <div className="absolute top-[190px] -left-[1px] w-[3px] h-[60px] bg-gradient-to-b from-[#555] to-[#222] rounded-r-md z-10" />
                                <div className="absolute top-[160px] -right-[1px] w-[3px] h-[100px] bg-gradient-to-b from-[#555] to-[#222] rounded-l-md z-10" />
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
