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

  it("gives the studio its own page and panel colours", () => {
    expect(block(":root")).toContain("--studio-surface: #d9d8d4;")
    expect(block(":root")).toContain("--studio-panel: #edece9;")
    expect(css).toContain("--color-studio-surface: var(--studio-surface);")
    expect(css).toContain("--color-studio-panel: var(--studio-panel);")
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

  it("registers every custom size and tracking token with the class merger", async () => {
    const { cn } = await import("../src/lib/utils.ts")
    const theme = block("@theme inline")
    const sizes = [...theme.matchAll(/--text-([a-z-]+):/g)].map((match) => match[1]).filter((name) => !name.endsWith("-line-height"))
    const trackings = [...theme.matchAll(/--tracking-([a-z-]+):/g)].map((match) => match[1])
    for (const size of sizes) expect(cn(`text-${size}`, "text-accent"), size).toContain(`text-${size}`)
    for (const tracking of trackings) expect(cn(`tracking-${tracking}`, "tracking-wide"), tracking).toBe("tracking-wide")
  })

  // The studio's sticky phone header and fixed save bar must never cover a control the page scrolls to (Tab focus,
  // scrollIntoView): the page keeps their height clear, from the same tokens that size them.
  it("keeps the studio's header and save bar clear of what the page scrolls to", () => {
    expect(block(":root")).toContain("--studio-header: 3.75rem;")
    expect(block(":root")).toContain("--studio-save-bar: 4.25rem;")
    expect(block("html:has([data-studio-save-bar])")).toContain("scroll-padding-bottom: calc(var(--studio-save-bar) + 1rem);")
    expect(css).toMatch(/@media \(width < 64rem\) \{\s*html:has\(\[data-studio-header\]\) \{\s*scroll-padding-top: calc\(var\(--studio-header\) \+ 1rem\);/)
  })

  it("draws no jagged section edges", () => {
    expect(css).not.toContain("strata")
  })
})
