import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Launch (Rami, 2026-11-02): no "[Placeholder" text is left in anything the shop or the studio shows. check:pages makes
// the same check on every built file.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe("placeholders", () => {
  it("are gone from every source file the site is built from (tests and comments about them aside)", () => {
    const sources = files("src").filter((path) => /\.(ts|tsx|json|css)$/.test(path) && !/\.test\.tsx?$/.test(path))
    const left = sources.filter((path) => readFileSync(path, "utf8").includes('"[Placeholder'))
    expect(left).toEqual([])
  })
})
