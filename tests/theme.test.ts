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

  it("defines the hero portrait variant with the same media query as the hero picture", async () => {
    const { HERO_PORTRAIT_MEDIA } = await import("../src/components/home/home-config.ts")
    // Block form: the one-line form splits the comma-separated media list into a broken selector.
    expect(css).toMatch(/@custom-variant upright \{\s*@media ([^{]+)\{\s*@slot;/)
    expect(css.match(/@custom-variant upright \{\s*@media ([^{]+)\{/)?.[1].trim()).toBe(HERO_PORTRAIT_MEDIA)
  })

  it("puts the stone grain on the page background", () => {
    expect(block(":root")).toContain("--grain: url(")
    expect(css).toMatch(/body \{[^}]*background-image: var\(--grain\)/)
  })

  it("draws no jagged section edges", () => {
    expect(css).not.toContain("strata")
  })
})
