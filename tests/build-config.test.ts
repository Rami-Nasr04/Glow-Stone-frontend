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
    vi.stubEnv("VITE_ADMIN_USER_POOL_ID", "eu-central-1_Test123")
    vi.stubEnv("VITE_ADMIN_APP_CLIENT_ID", "testclient123")
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

  it("refuses a missing VITE_API_URL", async () => {
    vi.stubEnv("VITE_API_URL", "")
    await expect(prerender()).rejects.toThrow("VITE_API_URL is not set")
  })
})
