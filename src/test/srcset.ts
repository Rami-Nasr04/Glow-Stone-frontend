// Which srcset width a browser picks for an <img>, from its `sizes` and a screen: the first `sizes` entry whose media
// condition matches gives the CSS width; times the pixel ratio, that's the width needed; the browser takes the
// smallest candidate at least that wide (the widest when none is). That's what Edge did in the 2026-10-16 measurement.
export interface TestScreen {
  width: number
  height: number
  dpr: number
}

// Splits on commas outside parentheses: "clamp(280px, 25vw, 360px)" stays whole.
function topLevel(text: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") depth++
    else if (text[i] === ")") depth--
    else if (depth === 0 && text.startsWith(separator, i)) {
      parts.push(text.slice(start, i).trim())
      start = i + separator.length
    }
  }
  parts.push(text.slice(start).trim())
  return parts
}

function length(text: string, screen: TestScreen): number {
  const value = text.trim()
  const fn = /^(min|max|clamp|calc)\((.*)\)$/.exec(value)
  if (fn) {
    const [name, inner] = [fn[1], fn[2]]
    if (name === "calc") {
      const [a, b] = inner.split("*").map((part) => part.trim())
      return length(a, screen) * Number(b)
    }
    const args = topLevel(inner, ",").map((arg) => length(arg, screen))
    if (name === "min") return Math.min(...args)
    if (name === "max") return Math.max(...args)
    return Math.min(Math.max(args[0], args[1]), args[2])
  }
  const unit = /^([\d.]+)(px|vw|svh|vh|rem)$/.exec(value)
  if (!unit) throw new Error(`Unknown length in sizes: ${value}`)
  const n = Number(unit[1])
  if (unit[2] === "px") return n
  if (unit[2] === "rem") return n * 16
  if (unit[2] === "vw") return (n * screen.width) / 100
  return (n * screen.height) / 100
}

function matches(condition: string, screen: TestScreen): boolean {
  return topLevel(condition, " and ").every((part) => {
    const feature = /^\((min-width|max-width|min-resolution|orientation):\s*([\w.]+)\)$/.exec(part.trim())
    if (!feature) throw new Error(`Unknown media condition in sizes: ${part}`)
    const [, name, value] = feature
    if (name === "min-width") return screen.width >= parseFloat(value)
    if (name === "max-width") return screen.width <= parseFloat(value)
    if (name === "min-resolution") return screen.dpr >= parseFloat(value)
    return value === "landscape" ? screen.width > screen.height : screen.width <= screen.height
  })
}

// "(a) and (b) 50vw" → condition "(a) and (b)", length "50vw"; a bare length → null.
function splitMedia(entry: string): { condition: string; length: string } | null {
  if (!entry.startsWith("(")) return null
  let i = 0
  for (;;) {
    let depth = 0
    let end = i
    for (; end < entry.length; end++) {
      if (entry[end] === "(") depth++
      else if (entry[end] === ")" && --depth === 0) break
    }
    if (!entry.startsWith(" and ", end + 1)) return { condition: entry.slice(0, end + 1), length: entry.slice(end + 1).trim() }
    i = end + 6
  }
}

/** The CSS width `sizes` gives on this screen. */
export function sizesWidth(sizes: string, screen: TestScreen): number {
  for (const entry of topLevel(sizes, ",")) {
    const split = splitMedia(entry)
    if (!split) return length(entry, screen)
    if (matches(split.condition, screen)) return length(split.length, screen)
  }
  throw new Error(`sizes has no default: ${sizes}`)
}

/** The srcset width this screen downloads. */
export function chosenWidth(img: HTMLImageElement, screen: TestScreen): number {
  const widths = (img.getAttribute("srcset") ?? "")
    .split(",")
    .map((candidate) => Number(/(\d+)w$/.exec(candidate.trim())?.[1]))
    .sort((a, b) => a - b)
  const needed = sizesWidth(img.getAttribute("sizes") ?? "100vw", screen) * screen.dpr
  return widths.find((width) => width >= needed) ?? widths[widths.length - 1]
}
