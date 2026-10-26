import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import config from "../react-router.config.ts"

// GET /products answered with the live list saved on 2026-10-14.
const list = readFileSync("src/test/fixtures/products-list.json", "utf8")
function stubApi() {
  const fetch = vi.fn(async () => new Response(`{"success":true,"data":${list}}`))
  vi.stubGlobal("fetch", fetch)
  return fetch
}

// Runs buildEnd on a client folder holding `before` (paths may have folders), and returns the top-level files after.
async function runBuildEnd(before: Record<string, string>): Promise<Record<string, string>> {
  const dir = mkdtempSync(join(tmpdir(), "build-end-"))
  try {
    for (const [name, body] of Object.entries(before)) {
      mkdirSync(dirname(join(dir, "client", name)), { recursive: true })
      writeFileSync(join(dir, "client", name), body)
    }
    const buildEnd = config.buildEnd as (args: { reactRouterConfig: { buildDirectory: string } }) => Promise<void>
    await buildEnd({ reactRouterConfig: { buildDirectory: dir } })
    const client = join(dir, "client")
    return Object.fromEntries(
      readdirSync(client, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => [entry.name, readFileSync(join(client, entry.name), "utf8")]),
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// The build reads both addresses from the environment (.env locally, project settings on Vercel) and stops without them.
describe("the build", () => {
  const prerender = () => (config.prerender as () => Promise<string[]>)()

  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "https://api.test")
    vi.stubEnv("VITE_SITE_URL", "https://site.test")
    vi.stubEnv("VITE_ALLOW_INDEXING", "false")
    vi.stubEnv("VITE_ADMIN_USER_POOL_ID", "eu-central-1_Test123")
    vi.stubEnv("VITE_ADMIN_APP_CLIENT_ID", "testclient123")
    vi.stubEnv("VITE_CUSTOMER_USER_POOL_ID", "")
    vi.stubEnv("VITE_CUSTOMER_APP_CLIENT_ID", "")
    vi.stubEnv("VITE_ACCOUNTS_OPEN", "")
  })
  afterEach(() => vi.unstubAllEnvs())

  it("lists the pages from the API when every variable is set", async () => {
    stubApi()
    expect(await prerender()).toContain("/collection/5/qadisha")
  })

  it("refuses a missing VITE_SITE_URL before asking the API", async () => {
    const fetch = stubApi()
    vi.stubEnv("VITE_SITE_URL", "")
    await expect(prerender()).rejects.toThrow("VITE_SITE_URL is not set")
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each(["", "yes"])("refuses VITE_ALLOW_INDEXING=%j before asking the API", async (value) => {
    const fetch = stubApi()
    vi.stubEnv("VITE_ALLOW_INDEXING", value)
    await expect(prerender()).rejects.toThrow("VITE_ALLOW_INDEXING")
    expect(fetch).not.toHaveBeenCalled()
  })

  // The studio can't sign anyone in without them (Rami, 2026-10-16: the build requires both).
  it.each([
    ["VITE_ADMIN_USER_POOL_ID", "", "VITE_ADMIN_USER_POOL_ID is not set"],
    ["VITE_ADMIN_USER_POOL_ID", "6FRkxadSl", "VITE_ADMIN_USER_POOL_ID must look like"],
    ["VITE_ADMIN_APP_CLIENT_ID", "", "VITE_ADMIN_APP_CLIENT_ID is not set"],
    ["VITE_ADMIN_APP_CLIENT_ID", "not a client", "VITE_ADMIN_APP_CLIENT_ID must be an app client id"],
  ])("refuses %s=%j before asking the API", async (name, value, message) => {
    const fetch = stubApi()
    vi.stubEnv(name, value)
    await expect(prerender()).rejects.toThrow(message)
    expect(fetch).not.toHaveBeenCalled()
  })

  // The domain step: a studio-only project prerenders nothing and doesn't need the products list.
  it("prerenders nothing for a studio-only build, without asking the API", async () => {
    const fetch = stubApi()
    vi.stubEnv("VITE_SITE_PARTS", "studio")
    vi.stubEnv("VITE_STUDIO_BASE", "/")
    expect(await prerender()).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("builds a shop-only site without the studio's variables", async () => {
    stubApi()
    vi.stubEnv("VITE_SITE_PARTS", "shop")
    vi.stubEnv("VITE_ADMIN_USER_POOL_ID", "")
    vi.stubEnv("VITE_ADMIN_APP_CLIENT_ID", "")
    expect(await prerender()).toContain("/collection/5/qadisha")
  })

  it("refuses parts that would leave a broken site", async () => {
    vi.stubEnv("VITE_SITE_PARTS", "everything")
    await expect(prerender()).rejects.toThrow("VITE_SITE_PARTS")
    vi.stubEnv("VITE_SITE_PARTS", "studio")
    await expect(prerender()).rejects.toThrow("VITE_STUDIO_BASE=/")
  })

  // With nothing prerendered, React Router writes the app shell as index.html; vercel.json rewrites to
  // __spa-fallback.html, so the shell must carry that name. Every build also gets 404.html, the same shell: Vercel
  // answers an address with no file and no rewrite with it and status 404, and the app shows its 404 page.
  const SHUT = "User-agent: *\nDisallow: /\n"
  const HOME_ONLY = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://site.test/</loc></url>\n</urlset>\n'
  it.each([
    ["studio", "/", { "index.html": "app shell" }, { "__spa-fallback.html": "app shell", "404.html": "app shell", "robots.txt": SHUT }],
    [
      "",
      "",
      { "index.html": "home page", "__spa-fallback.html": "app shell" },
      { "index.html": "home page", "__spa-fallback.html": "app shell", "404.html": "app shell", "robots.txt": SHUT, "sitemap.xml": HOME_ONLY },
    ],
    [
      "shop",
      "",
      { "index.html": "home page", "__spa-fallback.html": "app shell" },
      { "index.html": "home page", "__spa-fallback.html": "app shell", "404.html": "app shell", "robots.txt": SHUT, "sitemap.xml": HOME_ONLY },
    ],
  ])("names the app shell for the rewrites and the 404, and writes robots.txt (VITE_SITE_PARTS=%j)", async (parts, base, before, after) => {
    vi.stubEnv("VITE_SITE_PARTS", parts)
    vi.stubEnv("VITE_STUDIO_BASE", base)
    expect(await runBuildEnd(before)).toEqual(after)
  })

  // Search engines (Rami, 2026-10-26): the shop opens to them only with VITE_ALLOW_INDEXING=true; the studio never.
  it("opens the shop to search engines and points them to a sitemap of every built page once indexing is on", async () => {
    vi.stubEnv("VITE_SITE_PARTS", "shop")
    vi.stubEnv("VITE_ALLOW_INDEXING", "true")
    const files = await runBuildEnd({
      "index.html": "home page",
      "__spa-fallback.html": "app shell",
      "collection/index.html": "collection",
      "collection/5/qadisha/index.html": "qadisha",
      "legal/terms/index.html": "terms",
    })
    expect(files["robots.txt"]).toBe("User-agent: *\nAllow: /\n\nSitemap: https://site.test/sitemap.xml\n")
    const locs = [...files["sitemap.xml"].matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
    expect(locs).toEqual(["https://site.test/", "https://site.test/collection", "https://site.test/collection/5/qadisha", "https://site.test/legal/terms"])
  })

  it("keeps the studio shut to search engines whatever VITE_ALLOW_INDEXING says", async () => {
    vi.stubEnv("VITE_SITE_PARTS", "studio")
    vi.stubEnv("VITE_STUDIO_BASE", "/")
    vi.stubEnv("VITE_ALLOW_INDEXING", "true")
    const files = await runBuildEnd({ "index.html": "app shell" })
    expect(files["robots.txt"]).toBe(SHUT)
    expect(files["sitemap.xml"]).toBeUndefined()
  })

  // The demo accounts keep accounts in the visitor's browser and say every code is 123456: a built site never opens them.
  it("refuses VITE_ACCOUNTS_OPEN=true without the customer pool, before asking the API", async () => {
    const fetch = stubApi()
    vi.stubEnv("VITE_ACCOUNTS_OPEN", "true")
    vi.stubEnv("VITE_CUSTOMER_USER_POOL_ID", "")
    vi.stubEnv("VITE_CUSTOMER_APP_CLIENT_ID", "")
    await expect(prerender()).rejects.toThrow("VITE_ACCOUNTS_OPEN=true needs VITE_CUSTOMER_USER_POOL_ID and VITE_CUSTOMER_APP_CLIENT_ID")
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    [{ VITE_CUSTOMER_USER_POOL_ID: "eu-central-1_Test123", VITE_CUSTOMER_APP_CLIENT_ID: "" }, "VITE_CUSTOMER_APP_CLIENT_ID is not set"],
    [{ VITE_CUSTOMER_USER_POOL_ID: "cSYvqogY8", VITE_CUSTOMER_APP_CLIENT_ID: "shopclient123" }, "VITE_CUSTOMER_USER_POOL_ID must look like"],
    [{ VITE_ACCOUNTS_OPEN: "yes" }, "VITE_ACCOUNTS_OPEN"],
  ])("refuses a bad customer pool setting %j before asking the API", async (vars, message) => {
    const fetch = stubApi()
    for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value)
    await expect(prerender()).rejects.toThrow(message)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("builds with the customer pool and accounts left closed (Vercel until Rami opens them)", async () => {
    stubApi()
    vi.stubEnv("VITE_CUSTOMER_USER_POOL_ID", "eu-central-1_Test123")
    vi.stubEnv("VITE_CUSTOMER_APP_CLIENT_ID", "shopclient123")
    vi.stubEnv("VITE_ACCOUNTS_OPEN", "")
    expect(await prerender()).toContain("/collection/5/qadisha")
  })

  it("refuses a missing VITE_API_URL", async () => {
    vi.stubEnv("VITE_API_URL", "")
    await expect(prerender()).rejects.toThrow("VITE_API_URL is not set")
  })

  // Vite replaces import.meta.env.VITE_X with its value alone; import.meta.env read whole becomes an object holding every
  // VITE_ variable, so the shop's bundle would carry the studio's admin pool and client ids.
  it("puts each environment variable in the app by its name, never import.meta.env whole", () => {
    const files = readdirSync("src", { recursive: true, encoding: "utf8" }).filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$|[\\/]test[\\/]/.test(file))
    const whole = files.flatMap((file) =>
      [...readFileSync(join("src", file), "utf8").matchAll(/import\.meta(?:\s+as\s+[^)]+\))?\s*\.env(\??\.[A-Z_]+)?/g)].filter((m) => !m[1]).map(() => file),
    )
    expect(whole).toEqual([])
  })
})
