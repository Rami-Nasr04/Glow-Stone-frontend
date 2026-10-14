import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import config from "../react-router.config.ts"

// GET /products answered with the live list saved on 2026-10-14.
const list = readFileSync("src/test/fixtures/products-list.json", "utf8")
function stubApi() {
  const fetch = vi.fn(async () => new Response(`{"success":true,"data":${list}}`))
  vi.stubGlobal("fetch", fetch)
  return fetch
}

// The build reads both addresses from the environment (.env locally, project settings on Vercel) and stops without them.
describe("the build", () => {
  const prerender = () => (config.prerender as () => Promise<string[]>)()

  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "https://api.test")
    vi.stubEnv("VITE_SITE_URL", "https://site.test")
    vi.stubEnv("VITE_ALLOW_INDEXING", "false")
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

  it("refuses a missing VITE_API_URL", async () => {
    vi.stubEnv("VITE_API_URL", "")
    await expect(prerender()).rejects.toThrow("VITE_API_URL is not set")
  })
})
