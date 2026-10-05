import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

interface Header {
  key: string
  value: string
}

// Pages that are not prerendered (account, checkout, admin…) must load the app shell instead of a Vercel 404.
describe("vercel.json", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    outputDirectory: string
    rewrites: { source: string; destination: string }[]
    headers: { source: string; headers: Header[] }[]
  }
  const headersFor = (source: string) => config.headers.find((h) => h.source === source)?.headers ?? []

  it("serves the prerendered client build", () => {
    expect(config.outputDirectory).toBe("build/client")
  })

  it("falls back to the SPA shell for every other path", () => {
    expect(config.rewrites).toContainEqual({ source: "/(.*)", destination: "/__spa-fallback.html" })
  })

  it("caches fingerprinted build assets for a year", () => {
    expect(headersFor("/assets/(.*)")).toContainEqual({ key: "Cache-Control", value: "public, max-age=31536000, immutable" })
  })

  it("sends basic security headers on every response", () => {
    const keys = headersFor("/(.*)").map((h) => h.key)
    expect(keys).toEqual(
      expect.arrayContaining(["X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Permissions-Policy", "Strict-Transport-Security"]),
    )
  })
})
