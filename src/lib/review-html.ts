/** Keep only supported formatting and raster images; discard executable attributes. */
export function safeReviewHtml(value: string) {
  return value.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, name: string) => {
    const lower = name.toLowerCase()
    if (lower === "img" && !tag.startsWith("</")) {
      const src = tag.match(/\bsrc\s*=\s*["']([^"']*)["']/i)?.[1] ?? ""
      if (!/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(src)) return ""
      return `<img src="${src}" alt="첨부 이미지" />`
    }
    return ["strong", "b", "em", "i", "u", "s", "br", "p", "div"].includes(lower) ? (tag.startsWith("</") ? `</${lower}>` : `<${lower}>`) : ""
  })
}
