import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// Guards theme rules that only show up visually. Reads the stylesheet from disk (Vitest empties CSS imports).
const css = readFileSync("src/index.css", "utf8")
const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`)
  return css.slice(start, css.indexOf("}", start))
}

describe("theme", () => {
  it("keeps the 11px minimum for labels", () => {
    expect(block(":root")).toContain("--text-label-value: 0.6875rem;")
  })

  it("defines no dark theme", () => {
    expect(css).not.toMatch(/\.dark\s*\{|@custom-variant dark/)
  })
})
