import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// The pieces are granite (Rami, 2026-11-02): no fixed text calls them limestone. Text built from a piece takes its
// stone from the data (stoneType).
describe("the site's own words", () => {
  it("never call the stone limestone, nor say Lebanese granite", () => {
    const copy = readFileSync("src/i18n/messages/en.ts", "utf8") + readFileSync("src/i18n/messages/edition.ts", "utf8")
    expect(copy).not.toMatch(/limestone/i)
    expect(copy).not.toMatch(/Lebanese granite/i)
  })
})
