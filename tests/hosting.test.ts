import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const STUDIO_HOST = "studio.glowstonelb.com"

interface Header {
  key: string
  value: string
}

// Pages that are not prerendered (account, checkout, admin…) must load the app shell instead of a Vercel 404.
describe("vercel.json", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    outputDirectory: string
    rewrites: { source: string; destination: string }[]
    headers: { source: string; has?: { type: string; value: string }[]; headers: Header[] }[]
  }
  const headersFor = (source: string) => config.headers.find((h) => h.source === source && !h.has)?.headers ?? []

  it("serves the prerendered client build", () => {
    expect(config.outputDirectory).toBe("build/client")
  })

  it("falls back to the SPA shell for every other path", () => {
    expect(config.rewrites).toContainEqual({ source: "/(.*)", destination: "/__spa-fallback.html" })
  })

  it("caches fingerprinted build assets for a year", () => {
    expect(headersFor("/assets/(.*)")).toContainEqual({ key: "Cache-Control", value: "public, max-age=31536000, immutable" })
  })

  // Until launch (VITE_ALLOW_INDEXING=false): the same rule as the robots tag on every page, for every file served.
  it("asks search engines not to index anything", () => {
    expect(headersFor("/(.*)")).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" })
  })

  it("sends basic security headers on every response", () => {
    const keys = headersFor("/(.*)").map((h) => h.key)
    expect(keys).toEqual(
      expect.arrayContaining(["X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Permissions-Policy", "Strict-Transport-Security"]),
    )
  })

  // The studio is never indexed, even after launch removes the rule above (its own rule stays).
  it("asks search engines not to index the studio, with a rule of its own", () => {
    for (const source of ["/studio", "/studio/(.*)"]) {
      expect(headersFor(source)).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" })
    }
  })

  // Its subdomain likewise: every answer from that host, whatever happens to the site-wide rule at launch.
  it(`asks search engines not to index anything on ${STUDIO_HOST}`, () => {
    const rule = config.headers.find((h) => h.has?.some((c) => c.type === "host" && c.value === STUDIO_HOST))
    expect(rule?.source).toBe("/(.*)")
    expect(rule?.has).toEqual([{ type: "host", value: STUDIO_HOST }])
    expect(rule?.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" })
  })
})
