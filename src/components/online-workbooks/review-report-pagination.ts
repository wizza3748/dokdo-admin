export type ReportPagePart = { section: number; html?: string; continuation?: boolean }

type Boundary = { node: Node; offset: number }

// Use DOM ranges so links, rich text, images and line breaks survive a page break.
function breakPositions(root: HTMLElement) {
  const result: Boundary[] = [{ node: root, offset: 0 }]
  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent ?? ""
      for (const match of value.matchAll(/\S+\s*|\s+/gu)) {
        const end = match.index + match[0].length
        // Long unspaced text can also wrap in the report.
        if (match[0].length > 80) {
          let pos = match.index
          for (const ch of match[0]) {
            pos += ch.length
            result.push({ node, offset: pos })
          }
        } else result.push({ node, offset: end })
      }
    } else if (node instanceof Element) {
      if (node.matches("h2,h3,h4,header")) return
      if (node.matches("br,img")) {
        const parent = node.parentNode!
        result.push({ node: parent, offset: Array.prototype.indexOf.call(parent.childNodes, node) + 1 })
      } else node.childNodes.forEach(visit)
    }
  }
  root.childNodes.forEach(visit)
  result.push({ node: root, offset: root.childNodes.length })
  return result
}

function fragmentBetween(root: HTMLElement, start: Boundary, end: Boundary): DocumentFragment {
  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)
  let result = range.cloneContents()
  let ancestor = range.commonAncestorContainer
  if (ancestor.nodeType !== Node.ELEMENT_NODE) ancestor = ancestor.parentNode!
  while (ancestor !== root && root.contains(ancestor)) {
    const wrapper = ancestor.cloneNode(false)
    wrapper.appendChild(result)
    result = document.createDocumentFragment()
    result.appendChild(wrapper)
    ancestor = ancestor.parentNode!
  }
  return result
}

function splitColumn(source: HTMLElement, probe: HTMLElement, firstHeight: number, laterHeight: number): string[] {
  if (source.getBoundingClientRect().height <= firstHeight) return [source.innerHTML]
  const stops = breakPositions(source)
  const chunks: string[] = []
  let start = 0
  while (start < stops.length - 1) {
    let low = start + 1, high = stops.length - 1
    const budget = chunks.length ? laterHeight : firstHeight
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      probe.replaceChildren(fragmentBetween(source, stops[start], stops[middle]))
      if (probe.getBoundingClientRect().height <= budget) low = middle
      else high = middle - 1
    }
    probe.replaceChildren(fragmentBetween(source, stops[start], stops[low]))
    if (probe.textContent?.trim() || probe.querySelector("img,br")) chunks.push(probe.innerHTML)
    start = low
  }
  return chunks.length ? chunks : [""]
}

// The family guide has five groups. Keep an area's row span together and repeat
// the column headings, with the total and its note only on the final sheet.
function splitGuide(source: HTMLElement, probe: HTMLElement, firstHeight: number, laterHeight: number) {
  const table = source.querySelector("table")!
  const groups = Array.from(table.tBodies)
  const parts: string[] = []
  let begin = 0
  while (begin < groups.length) {
    let accepted = "", next = begin
    for (let end = begin + 1; end <= groups.length; end++) {
      probe.innerHTML = source.innerHTML
      const candidate = probe.querySelector("table")!
      Array.from(candidate.tBodies).forEach((group, i) => { if (i < begin || i >= end) group.remove() })
      if (end !== groups.length) {
        candidate.tFoot?.remove()
        probe.querySelector("[data-guide-note]")?.remove()
      }
      if (end > begin + 1 && probe.getBoundingClientRect().height > (parts.length ? laterHeight : firstHeight)) break
      accepted = probe.innerHTML
      next = end
    }
    parts.push(accepted)
    begin = next
  }
  return parts
}

/** Lay out the read-only report at the same A4 text width used for printing. */
export function paginateReport(stage: HTMLElement): ReportPagePart[] {
  const pages: ReportPagePart[] = []
  const sheets = Array.from(stage.children) as HTMLElement[]
  const pageHeight = stage.getBoundingClientRect().height
  for (const [section, sheet] of sheets.entries()) {
    const body = sheet.querySelector<HTMLElement>("[data-page-body]")!
    const firstHeight = pageHeight - (body.getBoundingClientRect().top - sheet.getBoundingClientRect().top)
    if (body.getBoundingClientRect().height <= firstHeight) {
      pages.push({ section })
      continue
    }
    const probe = sheet.cloneNode(true) as HTMLElement
    stage.appendChild(probe)
    try {
      const header = sheet.querySelector("header")!
      const headerHeight = header.getBoundingClientRect().bottom - sheet.getBoundingClientRect().top + parseFloat(getComputedStyle(header).marginBottom)
      const laterHeight = pageHeight - headerHeight
      const probeBody = probe.querySelector<HTMLElement>("[data-page-body]")!
      const sources = Array.from(body.querySelectorAll<HTMLElement>("[data-report-flow]"))
      if (!sources.length) {
        splitGuide(body, probeBody, firstHeight, laterHeight).forEach((html, i) => pages.push({ section, html, continuation: i > 0 }))
        continue
      }
      const targets = Array.from(probeBody.querySelectorAll<HTMLElement>("[data-report-flow]"))
      const chunks = sources.map((source, i) => {
        const inset = source.getBoundingClientRect().top - body.getBoundingClientRect().top
        return splitColumn(source, targets[i], firstHeight - inset, laterHeight - inset)
      })
      const count = Math.max(...chunks.map(column => column.length))
      for (let index = 0; index < count; index++) {
        targets.forEach((col, i) => {
          col.innerHTML = chunks[i][index] ?? ""
          col.toggleAttribute("data-empty-column", !col.innerHTML)
        })
        pages.push({ section, html: probeBody.innerHTML, continuation: index > 0 })
      }
    } finally { probe.remove() }
  }
  return pages
}
