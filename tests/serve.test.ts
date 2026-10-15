import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { type IncomingHttpHeaders, request } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createSiteServer, type VercelConfig } from "../scripts/serve.ts"

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig

// A miniature build: the same file layout the prerender writes.
const FILES: Record<string, string> = {
  "index.html": "home page",
  "collection/index.html": "collection page",
  "collection/5/qadisha/index.html": "qadisha page",
  "collection/5/qadisha.data": "qadisha data",
  "__spa-fallback.html": "app shell",
  "assets/app-abc123.js": "console.log(1)",
  "secret.txt": "outside the site",
}

let root: string
let base: string
let server: ReturnType<typeof createSiteServer>

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), "serve-test-"))
  root = join(dir, "client")
  for (const [path, body] of Object.entries(FILES)) {
    const file = path === "secret.txt" ? join(dir, path) : join(root, path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, body)
  }
  server = createSiteServer(root, config)
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
  rmSync(dirname(root), { recursive: true, force: true })
})

// node:http, not fetch: the test setup stubs fetch so no test reaches the network.
function get(path: string): Promise<{ status: number; body: string; headers: IncomingHttpHeaders }> {
  return new Promise((done, fail) => {
    request(base + path, (res) => {
      let body = ""
      res.setEncoding("utf8")
      res.on("data", (chunk: string) => (body += chunk))
      res.on("end", () => done({ status: res.statusCode ?? 0, body, headers: res.headers }))
    })
      .on("error", fail)
      .end()
  })
}

describe("local site server (same rules as Vercel)", () => {
  it.each([
    ["/", "home page"],
    ["/collection", "collection page"],
    ["/collection/", "collection page"],
    ["/collection/index.html", "collection page"],
    ["/collection?sort=new", "collection page"],
    ["/collection/5/qadisha", "qadisha page"],
    ["/collection/5/qadisha/", "qadisha page"],
    ["/collection/5/qadisha.data", "qadisha data"],
  ])("serves %s from its own file, without a redirect", async (path, body) => {
    const res = await get(path)
    expect(res.status).toBe(200)
    expect(res.body).toBe(body)
  })

  it.each(["/nothing-here", "/studio", "/sign-in", "/collection/99/x", "/assets/missing.js", "/%E0%A4%A"])(
    "answers %s with the app shell and status 200, like the rewrite in vercel.json",
    async (path) => {
      const res = await get(path)
      expect(res.status).toBe(200)
      expect(res.body).toBe("app shell")
    },
  )

  it("never serves a file from outside the build folder", async () => {
    const res = await get("/..%2fsecret.txt")
    expect(res.body).toBe("app shell")
  })

  it("labels pages as UTF-8 HTML", async () => {
    expect((await get("/collection")).headers["content-type"]).toBe("text/html; charset=utf-8")
  })

  it("sends every header vercel.json sets for all paths", async () => {
    const res = await get("/collection")
    const all = config.headers.find((h) => h.source === "/(.*)")?.headers ?? []
    expect(all.length).toBeGreaterThan(0)
    for (const { key, value } of all) expect(res.headers[key.toLowerCase()]).toBe(value)
  })

  it("caches build assets for a year and revalidates everything else", async () => {
    expect((await get("/assets/app-abc123.js")).headers["cache-control"]).toBe("public, max-age=31536000, immutable")
    expect((await get("/collection")).headers["cache-control"]).toBe("public, max-age=0, must-revalidate")
  })
})
