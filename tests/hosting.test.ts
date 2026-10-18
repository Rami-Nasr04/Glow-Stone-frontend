import type { RouteConfigEntry } from "@react-router/dev/routes"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { rewriteFor, type VercelConfig } from "../scripts/serve.ts"
import { STUDIO_BASE } from "../src/config/studio.ts"
import { localizedPath, PUBLISHED_LOCALES, STATIC_PAGES } from "../src/i18n/paths.ts"
import { siteRoutes } from "../src/routes.ts"

const STUDIO_HOST = "studio.glowstonelb.com"
const SHELL = "/__spa-fallback.html"

// Every full address a route config answers, e.g. "/:lang?/sign-in".
function addresses(entries: RouteConfigEntry[], parent = ""): string[] {
  return entries.flatMap((entry) => {
    const path = entry.path === undefined ? parent : `${parent.replace(/\/$/, "")}/${entry.path.replace(/^\//, "")}`
    const own = entry.index ? [parent || "/"] : entry.path !== undefined && !entry.children?.length ? [path] : []
    return [...own, ...addresses(entry.children ?? [], path)]
  })
}

// Pages that are not prerendered (sign-in, the studio, a piece published since the build) load the app shell; every
// other address is a real 404 (Vercel serves 404.html, the same shell, which shows the 404 page).
describe("vercel.json", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig
  const headersFor = (source: string) => config.headers.find((h) => h.source === source && !h.has)?.headers ?? []

  it("serves the prerendered client build", () => {
    expect(config.outputDirectory).toBe("build/client")
  })

  it("rewrites only to the app shell, and never every address on the shop's hosts", () => {
    for (const rewrite of config.rewrites) expect(rewrite.destination).toBe(SHELL)
    expect(config.rewrites.filter((r) => r.source === "/(.*)" && !r.has)).toEqual([])
  })

  // serve.ts reads a source as an anchored regular expression; Vercel reads it with path-to-regexp. The two agree on
  // plain paths and unnamed groups, so a source may hold nothing else (no ":name", no "\d", no "?" or "*" outside a group).
  it("writes every source in the subset both readers agree on", () => {
    const sources = [...config.rewrites, ...config.headers].map((rule) => rule.source)
    for (const source of sources) expect(source).toMatch(/^(\/([a-z0-9-]+|\((\.\*|\[0-9\]\+|\[\^\/\]\+|[a-z0-9-]+(\|[a-z0-9-]+)*)\)))*$|^\/\(\.\*\)$/)
  })

  it.each([
    ["/studio", true],
    ["/studio/products/5", true],
    ["/studio/sign-in/new-password", true],
    ["/sign-in", true],
    ["/sign-up", true],
    ["/verify", true],
    ["/forgot-password", true],
    ["/collection/99", true],
    ["/collection/99/a-piece-published-since", true],
    ["/nothing-here", false],
    ["/collection/abc", false],
    ["/collection/5/qadisha/extra", false],
    ["/legal/unknown", false],
    ["/ar", false],
    ["/ar/collection", false],
  ])("on the shop's address, %s gets the app shell: %s", (path, shell) => {
    expect(rewriteFor(config, path, "glow-stone-frontend.vercel.app") !== undefined).toBe(shell)
  })

  // Drift guard: a new shop or studio page that isn't prerendered must get its rewrite, or it would answer 404; in every
  // published locale, so publishing Arabic or French fails here until their rewrites are added.
  it("rewrites every page the routes answer that the build doesn't prerender", () => {
    const sample = (path: string) => path.replace(/:id/g, "5").replace(/:name\?/g, "qadisha").replace(/:doc/g, "terms")
    const pages = addresses(siteRoutes(["shop", "studio"], STUDIO_BASE))
      .filter((path) => !path.endsWith("*"))
      .flatMap((path) =>
        path.startsWith("/:lang?") ? PUBLISHED_LOCALES.map((locale) => localizedPath(locale, path.replace("/:lang?", "") || "/")) : [path],
      )
      .map(sample)
    const built = new Set(PUBLISHED_LOCALES.flatMap((locale) => [...STATIC_PAGES, "/collection/5/qadisha"].map((page) => localizedPath(locale, page))))
    for (const page of pages.filter((path) => !built.has(path))) {
      expect(rewriteFor(config, page, "glow-stone-frontend.vercel.app"), page).toBeDefined()
    }
  })

  // The studio's own project (VITE_SITE_PARTS=studio, VITE_STUDIO_BASE=/) answers every address with the app shell.
  it.each(["/", "/products/5", "/sign-in/new-password", "/collection", "/nothing-here"])(`on ${STUDIO_HOST}, %s gets the app shell`, (path) => {
    expect(rewriteFor(config, path, STUDIO_HOST)?.destination).toBe(SHELL)
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
