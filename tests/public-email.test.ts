import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Omar's public address is hello@glowstonelb.com (Rami, 2026-10-26); the Gmail behind it must never be shown.
// check:pages makes the same check on the built shop and studio.
const PRIVATE = "glowstone216"

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe("the public email address", () => {
  it("is never the Gmail behind it, anywhere the site is made from", () => {
    const sources = [...files("src"), ...files("public").filter((path) => !/\.(webp|png|jpe?g|woff2?)$/.test(path)), "vercel.json"]
    const leaks = sources.filter((path) => {
      try {
        return readFileSync(path, "utf8").includes(PRIVATE)
      } catch {
        return false
      }
    })
    expect(leaks).toEqual([])
  })
})
