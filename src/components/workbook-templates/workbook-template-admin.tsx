"use client"

import * as React from "react"
import Link from "next/link"
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Eye,
  FilePenLine,
  GripVertical,
  ListFilter,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react"

import {
  CONNECTED_BOOKS,
  DEFAULT_GUIDES,
  WORKBOOK_TEMPLATES,
  type WorkbookQuestion,
  type WorkbookTemplateRecord,
} from "@/lib/workbook-templates"

const primaryButton = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0877ea] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0567cf]"
const secondaryButton = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
const inputClass = "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"

function StatusSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-[88px] cursor-pointer rounded-full border text-xs font-bold transition ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-slate-100 text-slate-500"}`}
    >
      <span className={`absolute top-1 h-[18px] w-[18px] rounded-full bg-white shadow transition ${checked ? "right-1" : "left-1"}`} />
      <span className={checked ? "mr-5" : "ml-5"}>{checked ? "검수완료" : "미검수"}</span>
    </button>
  )
}

function Dialog({ title, children, footer, onClose, width = "max-w-[640px]" }: { title: string; children: React.ReactNode; footer?: React.ReactNode; onClose: () => void; width?: string }) {
  React.useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-5" role="dialog" aria-modal="true">
      <div className={`max-h-[90vh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${width}`}>
        <div className="flex h-16 items-center justify-between border-b border-dashed border-slate-200 px-6">
          <h2 className="text-xl font-extrabold text-slate-700">{title}</h2>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="닫기"><X className="h-6 w-6" /></button>
        </div>
        <div className="max-h-[calc(90vh-128px)] overflow-y-auto p-6">{children}</div>
        {footer && <div className="flex min-h-16 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">{footer}</div>}
      </div>
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return <div className="fixed bottom-7 left-1/2 z-[150] -translate-x-1/2 rounded-lg bg-slate-800 px-5 py-3 text-sm font-bold text-white shadow-xl">{message}</div>
}

export function WorkbookTemplateList() {
  const [keyword, setKeyword] = React.useState("")
  const [level, setLevel] = React.useState("")
  const [filtersOpen, setFiltersOpen] = React.useState(true)
  const [page, setPage] = React.useState(1)

  const filtered = React.useMemo(() => WORKBOOK_TEMPLATES.filter((template) => {
    const matchesKeyword = template.name.toLowerCase().includes(keyword.trim().toLowerCase())
    const matchesLevel = !level || template.levels.includes(Number(level))
    return matchesKeyword && matchesLevel
  }), [keyword, level])
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20))
  const rows = filtered.slice((page - 1) * 20, page * 20)

  const reset = () => { setKeyword(""); setLevel(""); setPage(1) }

  return (
    <div className="space-y-3 text-slate-700">
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[110px_1fr_110px_1fr_auto] items-center gap-x-3 gap-y-3">
          <label className="text-center text-sm font-bold">템플릿명</label>
          <input className={inputClass} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="템플릿명 검색" onKeyDown={(event) => event.key === "Enter" && setPage(1)} />
          {filtersOpen && <><label className="text-center text-sm font-bold">대상 레벨</label><select className={`${inputClass} cursor-pointer`} value={level} onChange={(event) => { setLevel(event.target.value); setPage(1) }}><option value="">레벨 선택</option>{[1,2,3,4,5,6].map((item) => <option key={item} value={item}>{item}레벨</option>)}</select></>}
          <div className="col-start-5 row-start-1 flex gap-2">
            <button type="button" onClick={reset} className={secondaryButton}>초기화</button>
            <button type="button" onClick={() => setPage(1)} className={primaryButton}><Search className="h-4 w-4" />검색</button>
            <button type="button" onClick={() => setFiltersOpen((open) => !open)} className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-blue-600">{filtersOpen ? "접기" : "펼치기"}<ChevronDown className={`h-4 w-4 transition ${filtersOpen ? "rotate-180" : ""}`} /></button>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-slate-800">워크북 템플릿 목록</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin/exploration/workbook-templates/create" className={primaryButton}><Plus className="h-4 w-4" />신규 등록</Link>
            {[Search, RefreshCw, Maximize2, ListFilter].map((Icon, index) => <button key={index} type="button" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"><Icon className="h-4 w-4" /></button>)}
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full table-fixed text-center text-[13px]">
            <thead className="h-12 bg-slate-50 font-bold text-slate-600"><tr><th className="w-16">번호</th><th className="w-[28%]">템플릿명</th><th>대상 레벨</th><th>항목 수</th><th>책 읽기 연결 회차 수</th><th>검수 상태</th><th>최근 수정일</th><th className="w-20">관리</th></tr></thead>
            <tbody>{rows.map((template) => <tr key={template.id} className="h-12 border-t border-slate-200 hover:bg-blue-50/40"><td>{template.id}</td><td className="truncate px-3 text-left"><Link className="cursor-pointer font-semibold text-blue-600 hover:underline" href={`/admin/exploration/workbook-templates/${template.id}`}>{template.name}</Link></td><td>{template.levels.map((item) => `${item}레벨`).join(", ")}</td><td>{template.questions.length}</td><td>{template.connections}</td><td><span className={`font-semibold ${template.reviewed ? "text-blue-600" : "text-slate-400"}`}>{template.reviewed ? "검수완료" : "미검수"}</span></td><td>{template.updatedAt}</td><td><Link href={`/admin/exploration/workbook-templates/${template.id}`} className="inline-grid h-8 w-8 cursor-pointer place-items-center rounded-full text-blue-600 hover:bg-blue-100" aria-label="수정"><FilePenLine className="h-4 w-4" /></Link></td></tr>)}</tbody>
          </table>
          {rows.length === 0 && <div className="py-20 text-center text-sm text-slate-400">검색 결과가 없습니다.</div>}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>총 {filtered.length} 레코드</span><div className="flex items-center gap-1"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} className="cursor-pointer p-2"><ChevronLeft className="h-4 w-4" /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button type="button" key={item} onClick={() => setPage(item)} className={`h-8 w-8 cursor-pointer rounded-md font-bold ${page === item ? "bg-blue-600 text-white" : "hover:bg-slate-100"}`}>{item}</button>)}<button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="cursor-pointer p-2"><ChevronRight className="h-4 w-4" /></button></div></div>
      </section>
    </div>
  )
}

function QuestionDialog({ question, onClose, onConfirm, onDelete }: { question?: WorkbookQuestion; onClose: () => void; onConfirm: (value: Omit<WorkbookQuestion, "id">) => void; onDelete?: () => void }) {
  const [title, setTitle] = React.useState(question?.title ?? "")
  const [description, setDescription] = React.useState(question?.description ?? "")
  const [example, setExample] = React.useState(question?.example ?? "")
  return <Dialog title={question ? "질문 항목 수정" : "질문 항목 추가"} onClose={onClose} footer={<>{onDelete && <button type="button" onClick={onDelete} className={`${secondaryButton} mr-auto text-rose-500`}><Trash2 className="h-4 w-4" />삭제</button>}<button type="button" onClick={onClose} className={secondaryButton}>취소</button><button type="button" disabled={!title.trim()} onClick={() => title.trim() && onConfirm({ title: title.trim(), description, example })} className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-40`}>확인</button></>}>
    <div className="space-y-5 text-sm"><label className="block font-bold">질문 항목명 <span className="text-rose-500">*</span><input value={title} onChange={(event) => setTitle(event.target.value)} className={`${inputClass} mt-2`} placeholder="질문 항목명을 입력해 주세요." /></label><label className="block font-bold">설명<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 min-h-28 w-full resize-none rounded-md border border-slate-200 p-3 font-normal outline-none focus:border-blue-400" placeholder="학생에게 보여줄 설명을 입력해 주세요." /></label><label className="block font-bold">예시<textarea value={example} onChange={(event) => setExample(event.target.value)} className="mt-2 min-h-24 w-full resize-none rounded-md border border-slate-200 p-3 font-normal outline-none focus:border-blue-400" placeholder="답변 예시를 입력해 주세요." /></label></div>
  </Dialog>
}

function TemplatePreview({ template, onClose }: { template: WorkbookTemplateRecord; onClose: () => void }) {
  return <Dialog title="워크북 템플릿 미리보기" onClose={onClose} width="max-w-[920px]" footer={<button type="button" onClick={onClose} className={primaryButton}>확인</button>}>
    <div className="rounded-xl bg-[#f4f7f9] p-7"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-extrabold text-white">1</span><div><p className="text-xs text-slate-400">학생용 워크북 미리보기</p><h3 className="text-xl font-extrabold text-slate-800">{template.studentTitle || "학생용 제목"}</h3></div></div><div className="rounded-xl border border-slate-200 bg-white p-7">{template.questions.length ? template.questions.map((question, index) => <div key={question.id} className="mb-7 last:mb-0"><h4 className="font-extrabold">{index + 1}. {question.title}</h4><p className="mt-1 text-sm text-slate-600">{question.description}</p>{question.example && <div className="mt-3 rounded-lg bg-[#f5f2e9] p-3 text-sm"><b>예시</b> {question.example}</div>}<div className="mt-3 h-24 rounded-md border border-slate-200 bg-white p-3 text-sm italic text-slate-300">여기에 답변을 작성해 주세요.</div></div>) : <div className="py-16 text-center text-slate-400">등록된 질문 항목이 없습니다.</div>}</div></div>
  </Dialog>
}

export function WorkbookTemplateForm({ templateId }: { templateId?: number }) {
  const source = WORKBOOK_TEMPLATES.find((item) => item.id === templateId)
  const isEdit = Boolean(source)
  const [name, setName] = React.useState(source?.name ?? "")
  const [studentTitle, setStudentTitle] = React.useState(source?.studentTitle ?? "")
  const [levels, setLevels] = React.useState<number[]>(source?.levels ?? [])
  const [description, setDescription] = React.useState(source?.description ?? "")
  const [rewriteMode, setRewriteMode] = React.useState<"items" | "continuous">(source?.rewriteMode ?? "items")
  const [questions, setQuestions] = React.useState<WorkbookQuestion[]>(source?.questions ?? [])
  const [guides, setGuides] = React.useState(DEFAULT_GUIDES)
  const [reviewed, setReviewed] = React.useState(source?.reviewed ?? false)
  const [questionModal, setQuestionModal] = React.useState<{ index?: number } | null>(null)
  const [connectionsOpen, setConnectionsOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [toast, setToast] = React.useState("")
  const dragIndex = React.useRef<number | null>(null)

  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 1800) }
  const updateQuestion = (value: Omit<WorkbookQuestion, "id">) => {
    if (questionModal?.index !== undefined) setQuestions((current) => current.map((item, index) => index === questionModal.index ? { ...item, ...value } : item))
    else setQuestions((current) => [...current, { id: Date.now(), ...value }])
    setQuestionModal(null)
  }
  const deleteQuestion = (index: number) => { setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index)); setQuestionModal(null) }
  const dropQuestion = (toIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === toIndex) return
    setQuestions((current) => { const next = [...current]; const [moved] = next.splice(dragIndex.current!, 1); next.splice(toIndex, 0, moved); return next })
    dragIndex.current = null
  }
  const previewTemplate: WorkbookTemplateRecord = { id: source?.id ?? 0, name, studentTitle, levels, questions, connections: source?.connections ?? 0, reviewed, updatedAt: "2026-09-01", description, rewriteMode }

  return <div className="space-y-4 pb-20 text-slate-700">
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-lg font-extrabold">{isEdit ? `${name} 상세 정보` : "워크북 템플릿 등록"}</h1>
      {isEdit && <div className="mb-6 overflow-hidden rounded-lg border border-slate-200"><button type="button" onClick={() => setConnectionsOpen((open) => !open)} className="flex w-full cursor-pointer items-center gap-3 bg-white px-4 py-4 text-left font-bold hover:bg-slate-50"><ChevronRight className={`h-4 w-4 transition ${connectionsOpen ? "rotate-90" : ""}`} /><span>도서 연결 현황 ({source?.connections}개 회차 연결됨)</span></button>{connectionsOpen && <div className="border-t border-slate-200 p-5"><div className="overflow-hidden rounded-lg border border-slate-200"><table className="w-full text-center text-sm"><thead className="h-11 bg-slate-50"><tr><th>고유번호</th><th>도서 제목</th><th>도서 레벨</th><th>학습 회차</th><th>검수 상태</th><th>바로가기</th></tr></thead><tbody>{CONNECTED_BOOKS.map(([id,title,level,round]) => <tr key={id} className="h-12 border-t border-slate-200"><td>{id}</td><td className="font-semibold">{title}</td><td>{level}레벨</td><td>{round}회차</td><td className="text-blue-600">검수완료</td><td><Link href={`/admin/exploration/reading/${id}/workbook/1456`} className="cursor-pointer font-bold text-blue-600 hover:underline">열기</Link></td></tr>)}</tbody></table></div></div>}</div>}
      <h2 className="mb-5 border-b border-slate-200 pb-4 text-base font-extrabold">기본 정보</h2>
      <div className="grid grid-cols-[150px_1fr_150px_1fr] items-center gap-x-4 gap-y-4 text-sm">
      {isEdit && <><label className="text-right font-bold">템플릿 ID</label><input className={`${inputClass} bg-slate-50`} value={source?.id ?? ""} disabled /></>}
      <label className="text-right font-bold">템플릿명 <span className="text-rose-500">*</span></label><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="관리용 템플릿명을 입력해 주세요." />
      <label className="text-right font-bold">대상 레벨 <span className="text-rose-500">*</span></label><div className="flex flex-wrap gap-2">{[1,2,3,4,5,6].map((level) => <button type="button" key={level} onClick={() => setLevels((current) => current.includes(level) ? current.filter((item) => item !== level) : [...current, level].sort())} className={`h-9 cursor-pointer rounded-md border px-3 text-xs font-bold ${levels.includes(level) ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-500"}`}>{levels.includes(level) && <Check className="mr-1 inline h-3 w-3" />}{level}레벨</button>)}</div>
      <label className="text-right font-bold">학생용 제목 <span className="text-rose-500">*</span></label><input className={inputClass} value={studentTitle} onChange={(event) => setStudentTitle(event.target.value)} placeholder="학생 화면에 표시할 제목" />
      <label className="text-right font-bold">설명</label><textarea className="min-h-20 rounded-md border border-slate-200 p-3 outline-none focus:border-blue-400" value={description} onChange={(event) => setDescription(event.target.value)} />
      <label className="text-right font-bold">고쳐쓰기 모드</label><div className="flex gap-6">{([['items','항목별 보기'],['continuous','이어보기']] as const).map(([value,label]) => <label key={value} className="flex cursor-pointer items-center gap-2"><input type="radio" checked={rewriteMode === value} onChange={() => setRewriteMode(value)} className="h-4 w-4 accent-blue-600" />{label}</label>)}</div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6"><h2 className="mb-5 text-base font-extrabold">공통안내</h2><div className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-4 text-sm">{([['writing','차례대로 쓰기'],['rewrite','고쳐쓰기'],['complete','나의 글 완성']] as const).map(([key,label]) => <React.Fragment key={key}><label className="pt-3 text-right font-bold">{label}</label><textarea value={guides[key]} onChange={(event) => setGuides((current) => ({ ...current, [key]: event.target.value }))} className="min-h-20 rounded-md border border-slate-200 p-3 outline-none focus:border-blue-400" /></React.Fragment>)}</div></div>

      <div className="mt-8 border-t border-slate-200 pt-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-extrabold">질문 항목</h2><p className="mt-1 text-xs text-slate-400">드래그하여 학생에게 보일 질문 순서를 변경할 수 있습니다.</p></div><button type="button" onClick={() => setQuestionModal({})} className={primaryButton}><CirclePlus className="h-4 w-4" />질문 항목 추가</button></div>
      <div className="space-y-2">{questions.map((question,index) => <div key={question.id} draggable onDragStart={() => { dragIndex.current = index }} onDragOver={(event) => event.preventDefault()} onDrop={() => dropQuestion(index)} className="flex min-h-20 items-center rounded-lg border border-slate-200 bg-white px-3 transition hover:border-blue-300"><GripVertical className="mr-2 h-5 w-5 cursor-grab text-slate-300" /><span className="mr-4 text-sm font-bold">{index + 1}.</span><div className="min-w-0 flex-1"><p className="font-bold">{question.title}</p><p className="mt-1 truncate text-xs text-slate-500">{question.description}</p></div><button type="button" onClick={() => setQuestionModal({ index })} className="cursor-pointer rounded-md border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50">수정</button><button type="button" onClick={() => deleteQuestion(index)} className="ml-2 cursor-pointer rounded-md p-2 text-rose-500 hover:bg-rose-50" aria-label="삭제"><Trash2 className="h-4 w-4" /></button></div>)}{questions.length === 0 && <button type="button" onClick={() => setQuestionModal({})} className="w-full cursor-pointer rounded-lg border border-dashed border-slate-300 py-16 text-sm text-slate-400 hover:border-blue-400 hover:text-blue-600"><Plus className="mx-auto mb-2 h-7 w-7" />첫 질문 항목을 추가해 주세요.</button>}</div>
      </div>
    </section>

    <div className="fixed bottom-0 left-[var(--sidebar-width)] right-0 z-30 flex h-20 items-center justify-between border-t border-slate-200 bg-white px-8 shadow-[0_-4px_18px_rgba(15,23,42,.06)]"><Link href="/admin/exploration/workbook-templates" className={secondaryButton}>목록</Link><div className="flex items-center gap-3"><span className="text-sm font-bold">검수 상태:</span><StatusSwitch checked={reviewed} onChange={setReviewed} /><span className="mx-2 h-7 w-px bg-slate-200" />{isEdit && <button type="button" onClick={() => showToast("프로토타입에서는 삭제 결과만 표시합니다.")} className={`${secondaryButton} text-rose-500`}>삭제</button>}{isEdit ? <Link href={`/online-workbook/preview/${source!.id}`} target="_blank" rel="noopener noreferrer" className={secondaryButton}><Eye className="h-4 w-4" />미리보기</Link> : <button type="button" onClick={() => setPreviewOpen(true)} className={secondaryButton}><Eye className="h-4 w-4" />미리보기</button>}<button type="button" onClick={() => showToast("워크북 템플릿이 저장되었습니다.")} className={primaryButton}>저장</button></div></div>
    {questionModal && <QuestionDialog question={questionModal.index !== undefined ? questions[questionModal.index] : undefined} onClose={() => setQuestionModal(null)} onConfirm={updateQuestion} onDelete={questionModal.index !== undefined ? () => deleteQuestion(questionModal.index!) : undefined} />}
    {previewOpen && <TemplatePreview template={previewTemplate} onClose={() => setPreviewOpen(false)} />}
    {toast && <Toast message={toast} />}
  </div>
}

type TemplateGuides = { writing: string; rewrite: string; complete: string }
type SelectedTemplate = WorkbookTemplateRecord & {
  displayMode: "items" | "continuous"
  open: boolean
  guides: TemplateGuides
  enabledQuestionIds: number[]
  openQuestionIds: number[]
}

const QUIZ_GUIDES: TemplateGuides = {
  writing: "※ 안내에 따라 퀴즈를 작성해 보세요.",
  rewrite: "※ 지금까지 쓴 글을 항목별로 모아 보여줍니다.\n각 항목의 내용을 다시 확인하고, 필요한 내용을 보충하거나 문장을 더 알맞게 다듬어 보세요.",
  complete: DEFAULT_GUIDES.complete,
}

function createSelectedTemplate(template: WorkbookTemplateRecord, displayMode?: "items" | "continuous"): SelectedTemplate {
  return {
    ...template,
    displayMode: displayMode ?? template.rewriteMode,
    open: false,
    guides: template.id === 33 ? { ...QUIZ_GUIDES } : { ...DEFAULT_GUIDES },
    enabledQuestionIds: template.questions.map((question) => question.id),
    openQuestionIds: [],
  }
}

function TemplateSelectionDialog({ selectedIds, onClose, onConfirm }: { selectedIds: number[]; onClose: () => void; onConfirm: (templates: WorkbookTemplateRecord[]) => void }) {
  const [checked, setChecked] = React.useState<number[]>(selectedIds)
  const [keyword, setKeyword] = React.useState("")
  const [level, setLevel] = React.useState("")
  const candidates = WORKBOOK_TEMPLATES.filter((template) => template.reviewed && template.name.includes(keyword) && (!level || template.levels.includes(Number(level))))
  return <Dialog title="워크북 템플릿 선택" onClose={onClose} width="max-w-[980px]" footer={<><span className="mr-auto text-sm font-bold text-blue-600">{checked.length}개 선택</span><button type="button" onClick={onClose} className={secondaryButton}>취소</button><button type="button" onClick={() => onConfirm(WORKBOOK_TEMPLATES.filter((template) => checked.includes(template.id)))} className={primaryButton}>확인</button></>}>
    <p className="mb-4 text-sm text-slate-500">검수 완료된 워크북 템플릿만 선택할 수 있습니다. 현재 선택된 템플릿은 {selectedIds.length}개입니다.</p><div className="mb-4 grid grid-cols-[100px_1fr_100px_220px_auto] items-center gap-2 rounded-lg bg-slate-50 p-4"><label className="text-center text-sm font-bold">템플릿명</label><input className={inputClass} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="템플릿명 검색" /><label className="text-center text-sm font-bold">대상 레벨</label><select className={`${inputClass} cursor-pointer`} value={level} onChange={(event) => setLevel(event.target.value)}><option value="">레벨 선택</option>{[1,2,3,4,5,6].map((item) => <option key={item} value={item}>{item}레벨</option>)}</select><button type="button" onClick={() => {setKeyword("");setLevel("")}} className={secondaryButton}>초기화</button></div>
    <div className="max-h-[430px] overflow-auto rounded-lg border border-slate-200"><table className="w-full text-center text-sm"><thead className="sticky top-0 h-11 bg-slate-50"><tr><th className="w-12"></th><th className="w-16">번호</th><th className="text-left">템플릿명</th><th className="text-left">학생용 제목</th><th>대상 레벨</th><th>항목 수</th></tr></thead><tbody>{candidates.map((template) => <tr key={template.id} onClick={() => setChecked((current) => current.includes(template.id) ? current.filter((id) => id !== template.id) : [...current, template.id])} className="h-12 cursor-pointer border-t border-slate-200 hover:bg-blue-50/50"><td><input type="checkbox" readOnly checked={checked.includes(template.id)} className="h-4 w-4 accent-blue-600" /></td><td>{template.id}</td><td className="text-left font-semibold text-blue-600">{template.name}</td><td className="text-left">{template.studentTitle}</td><td>{template.levels.join(", ")}</td><td>{template.questions.length}</td></tr>)}</tbody></table></div>
  </Dialog>
}

function TemplateSettingsDetails({ template, onChange }: { template: SelectedTemplate; onChange: (template: SelectedTemplate) => void }) {
  const questionDragIndex = React.useRef<number | null>(null)
  const updateQuestion = (questionId: number, patch: Partial<WorkbookQuestion>) => onChange({ ...template, questions: template.questions.map((question) => question.id === questionId ? { ...question, ...patch } : question) })
  const dropQuestion = (toIndex: number) => {
    if (questionDragIndex.current === null || questionDragIndex.current === toIndex) return
    const next = [...template.questions]
    const [moved] = next.splice(questionDragIndex.current, 1)
    next.splice(toIndex, 0, moved)
    questionDragIndex.current = null
    onChange({ ...template, questions: next })
  }

  return <div className="border-t border-slate-200 bg-slate-50 px-5 py-5 text-sm">
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h4 className="mb-5 border-b border-slate-200 pb-4 text-base font-extrabold">기본 정보</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <label className="font-bold">템플릿명<input disabled value={template.name} className={`${inputClass} mt-2 bg-slate-100 text-slate-400`} /></label>
        <label className="font-bold">대상 레벨<input disabled value={template.levels.join(", ")} className={`${inputClass} mt-2 bg-slate-100 text-slate-400`} /></label>
        <label className="col-span-2 font-bold">학생용 제목<input disabled value={template.studentTitle} className={`${inputClass} mt-2 bg-slate-100 text-slate-400`} /></label>
        <label className="col-span-2 font-bold">템플릿 설명<textarea disabled value={template.description} className="mt-2 min-h-20 w-full resize-none rounded-md border border-slate-200 bg-slate-100 p-3 font-normal text-slate-400" /></label>
      </div>
    </section>

    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5">
      <h4 className="mb-5 border-b border-slate-200 pb-4 text-base font-extrabold">공통 안내</h4>
      <div className="space-y-4">
        {([['writing','차례대로 쓰기'],['rewrite','고쳐 쓰기'],['complete','나의 글 완성']] as const).map(([key,label]) => <label key={key} className="block font-bold">{label}<textarea value={template.guides[key]} onChange={(event) => onChange({ ...template, guides: { ...template.guides, [key]: event.target.value } })} className="mt-2 min-h-16 w-full resize-y rounded-md border border-slate-200 bg-white p-3 font-normal leading-6 outline-none focus:border-blue-400" /></label>)}
      </div>
    </section>

    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5">
      <h4 className="mb-4 border-b border-slate-200 pb-4 text-base font-extrabold">질문 항목</h4>
      <div className="space-y-3">{template.questions.map((question,index) => {
        const enabled = template.enabledQuestionIds.includes(question.id)
        const open = template.openQuestionIds.includes(question.id)
        return <div key={question.id} draggable onDragStart={() => { questionDragIndex.current = index }} onDragOver={(event) => event.preventDefault()} onDrop={() => dropQuestion(index)} className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="flex min-h-14 items-center px-4"><GripVertical className="mr-3 h-4 w-4 cursor-grab text-slate-400" /><span className="mr-3 font-semibold">{index + 1}.</span><span className="min-w-0 flex-1 truncate font-bold">{question.title}</span><span className="mr-2 text-xs text-slate-400">OFF</span><button type="button" aria-label={`${question.title} 사용 여부`} aria-pressed={enabled} onClick={() => onChange({ ...template, enabledQuestionIds: enabled ? template.enabledQuestionIds.filter((id) => id !== question.id) : [...template.enabledQuestionIds, question.id] })} className={`relative h-6 w-10 cursor-pointer rounded-full transition ${enabled ? "bg-blue-600" : "bg-slate-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${enabled ? "left-5" : "left-1"}`} /></button><span className="ml-2 mr-4 text-xs text-slate-500">ON</span><button type="button" aria-label={`${question.title} 상세`} onClick={() => onChange({ ...template, openQuestionIds: open ? template.openQuestionIds.filter((id) => id !== question.id) : [...template.openQuestionIds, question.id] })} className="cursor-pointer rounded-md p-2 hover:bg-slate-100"><ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} /></button></div>
          {open && <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-5"><label className="block font-bold">질문명<input value={question.title} onChange={(event) => updateQuestion(question.id,{ title:event.target.value })} className={`${inputClass} mt-2`} placeholder="질문명을 입력하세요" /></label><label className="block font-bold">질문 설명<textarea value={question.description} onChange={(event) => updateQuestion(question.id,{ description:event.target.value })} className="mt-2 min-h-20 w-full resize-y rounded-md border border-slate-200 bg-white p-3 font-normal outline-none focus:border-blue-400" placeholder="질문 설명을 입력하세요" /></label><label className="block font-bold">질문 예시<textarea value={question.example ?? ""} onChange={(event) => updateQuestion(question.id,{ example:event.target.value })} className="mt-2 min-h-20 w-full resize-y rounded-md border border-slate-200 bg-white p-3 font-normal outline-none focus:border-blue-400" placeholder="질문 예시를 입력하세요" /></label></div>}
        </div>
      })}</div>
    </section>
  </div>
}

export function WorkbookRoundSettings() {
  const initialIds = [33,1,14,34,35]
  const [templates, setTemplates] = React.useState<SelectedTemplate[]>(initialIds.map((id,index) => createSelectedTemplate(WORKBOOK_TEMPLATES.find((item) => item.id === id)!, index === 1 || index === 2 ? "continuous" : "items")))
  const [priorityId, setPriorityId] = React.useState(templates[0].id)
  const [reviewed, setReviewed] = React.useState(true)
  const [selectionOpen, setSelectionOpen] = React.useState(false)
  const [toast, setToast] = React.useState("")
  const dragIndex = React.useRef<number | null>(null)
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 1800) }
  const dropTemplate = (toIndex: number) => { if (dragIndex.current === null || dragIndex.current === toIndex) return; setTemplates((current) => { const next=[...current]; const [moved]=next.splice(dragIndex.current!,1); next.splice(toIndex,0,moved); return next }); dragIndex.current=null }

  return <div className="space-y-5 pb-24 text-slate-700">
    <section className="rounded-xl bg-gradient-to-r from-[#647ce8] to-[#7648aa] px-8 py-7 text-white shadow-sm"><h1 className="text-2xl font-extrabold">온라인 워크북</h1><p className="mt-2 text-sm text-blue-100">회차별 온라인 워크북을 설정하고 관리할 수 있습니다.</p></section>
    <section className="rounded-xl bg-white p-7 shadow-sm"><h2 className="mb-5 border-b border-slate-200 pb-4 text-lg font-extrabold">회차 정보</h2><div className="grid grid-cols-3 gap-5">{[["레벨","4레벨"],["도서 제목","대한이는 왜 소한이네 집에 갔을까?"],["회차","3회차"]].map(([label,value]) => <div key={label} className="rounded-xl border border-slate-200 py-5 text-center"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-lg font-extrabold text-slate-700">{value}</p></div>)}</div></section>
    <section className="rounded-xl bg-white p-7 shadow-sm"><div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-extrabold">워크북 템플릿 목록</h2><button type="button" onClick={() => setSelectionOpen(true)} className={primaryButton}><Plus className="h-4 w-4" />워크북 템플릿 선택하기</button></div><div className="space-y-4">{templates.map((template,index) => <div key={template.id} draggable={!template.open} onDragStart={() => {dragIndex.current=index}} onDragOver={(event) => event.preventDefault()} onDrop={() => dropTemplate(index)} className={`overflow-hidden rounded-xl border bg-white ${template.open ? "border-blue-400" : "border-slate-200"}`}><div className="flex h-16 items-center px-4"><GripVertical className="mr-3 h-5 w-5 cursor-grab text-slate-400" /><span className="mr-4 font-bold">{index+1}.</span><span className="min-w-0 flex-1 truncate font-bold text-blue-600">{template.name}</span><select value={template.displayMode} onChange={(event) => setTemplates((current) => current.map((item) => item.id === template.id ? {...item,displayMode:event.target.value as SelectedTemplate['displayMode']} : item))} className="mr-4 h-9 cursor-pointer rounded-md border border-slate-200 px-3 text-sm"><option value="items">항목별보기</option><option value="continuous">이어보기</option></select><label className="mr-8 flex cursor-pointer items-center gap-2 text-sm"><input type="radio" checked={priorityId === template.id} onChange={() => setPriorityId(template.id)} className="h-5 w-5 accent-blue-600" />1순위</label><button type="button" onClick={() => setTemplates((current) => current.map((item) => item.id===template.id?{...item,open:!item.open}:item))} className="mr-5 cursor-pointer p-2" aria-label={`${template.name} 상세`}><ChevronDown className={`h-5 w-5 transition ${template.open?'rotate-180':''}`} /></button><button type="button" onClick={() => setTemplates((current) => current.filter((item) => item.id !== template.id))} className="cursor-pointer p-2 text-rose-500" aria-label={`${template.name} 삭제`}><Trash2 className="h-5 w-5" /></button></div>{template.open && <TemplateSettingsDetails template={template} onChange={(updated) => setTemplates((current) => current.map((item) => item.id === template.id ? updated : item))} />}</div>)}{templates.length===0&&<div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">워크북 템플릿을 선택해 주세요.</div>}</div></section>
    <div className="fixed bottom-0 left-[var(--sidebar-width)] right-0 z-30 flex h-20 items-center justify-between border-t border-slate-200 bg-white px-8 shadow-[0_-4px_18px_rgba(15,23,42,.06)]"><Link href="/admin/exploration/workbook-templates" className={secondaryButton}>목록</Link><div className="flex items-center gap-3"><span className="text-sm font-bold">검수 상태:</span><StatusSwitch checked={reviewed} onChange={setReviewed}/><span className="mx-2 h-7 w-px bg-slate-200"/><button type="button" onClick={() => showToast("변경 사항이 취소되었습니다.")} className={secondaryButton}>취소</button><Link href="/online-workbook/preview/230" target="_blank" rel="noopener noreferrer" className={secondaryButton}><Eye className="h-4 w-4"/>미리보기</Link><button type="button" onClick={() => showToast("온라인 워크북 설정이 저장되었습니다.")} className={primaryButton}>저장</button></div></div>
    {selectionOpen&&<TemplateSelectionDialog selectedIds={templates.map((item)=>item.id)} onClose={()=>setSelectionOpen(false)} onConfirm={(selected)=>{setTemplates(selected.map((item)=>templates.find((current)=>current.id===item.id)??createSelectedTemplate(item)));setSelectionOpen(false)}}/>}
    {toast&&<Toast message={toast}/>} 
  </div>
}
