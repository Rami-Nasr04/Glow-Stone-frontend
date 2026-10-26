import type { RouteConfigEntry } from "@react-router/dev/routes"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { redirectFor, rewriteFor, type VercelConfig } from "../scripts/serve.ts"
import { localizedPath, PUBLISHED_LOCALES, STATIC_PAGES } from "../src/i18n/paths.ts"
import { siteRoutes } from "../src/routes.ts"

const SHOP_HOST = "glowstonelb.com"
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

// Pages that are not prerendered (sign-in, the studio) load the app shell; every other address is a real 404 (Vercel
// serves 404.html, the same shell, which shows the 404 page), except the studio's old addresses on the shop, which are
// redirected to its own host. Every published piece is prerendered (Publish rebuilds the site), so a piece's address
// that wasn't built is a 404 too; in the browser the shell still corrects an old name or a bare id to the piece.
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
  // A redirect may end in one named wildcard ("/:path*"), which serve.ts reads the way path-to-regexp does.
  it("writes every source in the subset both readers agree on", () => {
    const sources = [...config.rewrites, ...config.headers].map((rule) => rule.source)
    for (const source of sources) expect(source).toMatch(/^(\/([a-z0-9-]+|\((\.\*|\[0-9\]\+|\[\^\/\]\+|[a-z0-9-]+(\|[a-z0-9-]+)*)\)))*$|^\/\(\.\*\)$/)
    for (const { source } of config.redirects) expect(source).toMatch(/^(\/[a-z0-9-]+)+(\/:[a-z]+\*)?$/)
  })

  // The studio has its own project and host: on the shop, its old addresses send the visitor there (old bookmarks).
  it.each([
    ["/studio", "https://studio.glowstonelb.com/"],
    ["/studio/", "https://studio.glowstonelb.com/"],
    ["/studio/products/4", "https://studio.glowstonelb.com/products/4"],
    ["/studio/sign-in/new-password", "https://studio.glowstonelb.com/sign-in/new-password"],
  ])(`on the shop's address, %s answers 308 to %s`, (path, location) => {
    expect(redirectFor(config, path, SHOP_HOST)).toEqual({ status: 308, location })
  })

  it.each(["/studios", "/collection/studio", "/sign-in"])("on the shop's address, %s is not redirected", (path) => {
    expect(redirectFor(config, path, SHOP_HOST)).toBeUndefined()
  })

  // Which addresses on the shop get the app shell (the redirect answers /studio before any rewrite).
  it.each([
    ["/studio", false],
    ["/studio/products/5", false],
    ["/studio/sign-in/new-password", false],
    ["/sign-in", true],
    ["/sign-up", true],
    ["/verify", true],
    ["/forgot-password", true],
    ["/checkout", true],
    ["/checkout/thanks/7", true],
    ["/account", true],
    ["/account/orders/7", true],
    ["/checkout/thanks/seven", false],
    ["/collection/99", false],
    ["/collection/99/x", false],
    ["/collection/5/an-old-name", false],
    ["/nothing-here", false],
    ["/collection/abc", false],
    ["/collection/5/qadisha/extra", false],
    ["/legal/unknown", false],
    ["/ar", false],
    ["/ar/collection", false],
  ])("on the shop's address, %s gets the app shell: %s", (path, shell) => {
    expect(rewriteFor(config, path, SHOP_HOST) !== undefined).toBe(shell)
  })

  // Drift guard: a new shop page that isn't prerendered must get its rewrite, or it would answer 404; in every published
  // locale, so publishing Arabic or French fails here until their rewrites are added. (The shop's project builds the
  // shop alone, VITE_SITE_PARTS=shop.)
  it("rewrites every shop page the routes answer that the build doesn't prerender", () => {
    const sample = (path: string) => path.replace(/:id/g, "5").replace(/:name\?/g, "qadisha").replace(/:doc/g, "terms")
    const pages = addresses(siteRoutes(["shop"], "/studio"))
      .filter((path) => !path.endsWith("*"))
      .flatMap((path) =>
        path.startsWith("/:lang?") ? PUBLISHED_LOCALES.map((locale) => localizedPath(locale, path.replace("/:lang?", "") || "/")) : [path],
      )
      .map(sample)
    const built = new Set(PUBLISHED_LOCALES.flatMap((locale) => [...STATIC_PAGES, "/collection/5/qadisha"].map((page) => localizedPath(locale, page))))
    for (const page of pages.filter((path) => !built.has(path))) {
      expect(rewriteFor(config, page, SHOP_HOST), page).toBeDefined()
    }
    for (const page of pages) expect(redirectFor(config, page, SHOP_HOST), page).toBeUndefined()
  })

  // And every studio page, on the studio's host (its project builds the studio alone, at the root).
  it(`rewrites every studio page on ${STUDIO_HOST}`, () => {
    const pages = addresses(siteRoutes(["studio"], "/")).map((path) => path.replace(/:id/g, "5").replace(/\*$/, "nothing-here"))
    expect(pages.length).toBeGreaterThan(5)
    for (const page of pages) expect(rewriteFor(config, page, STUDIO_HOST)?.destination, page).toBe(SHELL)
    // The shop's redirect of /studio never answers on the studio's own host, so it can't loop.
    for (const page of [...pages, "/studio", "/studio/products/4"]) expect(redirectFor(config, page, STUDIO_HOST), page).toBeUndefined()
  })

  // The studio's own project (VITE_SITE_PARTS=studio, VITE_STUDIO_BASE=/) answers every address with the app shell.
  it.each(["/", "/products/5", "/sign-in/new-password", "/collection", "/nothing-here"])(`on ${STUDIO_HOST}, %s gets the app shell`, (path) => {
    expect(rewriteFor(config, path, STUDIO_HOST)?.destination).toBe(SHELL)
  })

  it("caches fingerprinted build assets for a year", () => {
    expect(headersFor("/assets/(.*)")).toContainEqual({ key: "Cache-Control", value: "public, max-age=31536000, immutable" })
  })

  // The shop's indexing follows VITE_ALLOW_INDEXING alone, through each page's robots tag and the robots.txt the build
  // writes: a header here can't read it, and would keep the site shut after launch (Rami, 2026-10-26).
  it("sets no robots header on the shop", () => {
    for (const rule of config.headers.filter((h) => !h.has)) expect(rule.headers.map((h) => h.key)).not.toContain("X-Robots-Tag")
  })

  it("sends basic security headers on every response", () => {
    const keys = headersFor("/(.*)").map((h) => h.key)
    expect(keys).toEqual(
      expect.arrayContaining(["X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Permissions-Policy", "Strict-Transport-Security"]),
    )
  })

  // The shop no longer serves the studio, so only the redirects name its old path.
  it("has no rewrite or header rule left for the shop's old /studio path", () => {
    const sources = [...config.rewrites, ...config.headers].map((rule) => rule.source)
    expect(sources.filter((source) => source.startsWith("/studio"))).toEqual([])
  })

  // The studio is never indexed: every answer from its host, whatever happens to the site-wide rule at launch.
  it(`asks search engines not to index anything on ${STUDIO_HOST}`, () => {
    const rule = config.headers.find((h) => h.has?.some((c) => c.type === "host" && c.value === STUDIO_HOST))
    expect(rule?.source).toBe("/(.*)")
    expect(rule?.has).toEqual([{ type: "host", value: STUDIO_HOST }])
    expect(rule?.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" })
  })
})
