import { unsubscribe } from "./unsubscribe"

const answer = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status })
const INVALID = "This unsubscribe link isn't valid. Write to hello@glowstonelb.com and we'll take you off the list."

// The email's link (contract "Announcements", 2026-11-03): a simple CORS request, the token in the query.
describe("unsubscribe (POST /subscribers/unsubscribe?t=…)", () => {
  it("posts the token in the address, with no body and no headers of its own", async () => {
    const fetch = vi.fn(async () => answer(204))
    vi.stubGlobal("fetch", fetch)
    await expect(unsubscribe("a b&c")).resolves.toEqual({ ok: true })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://api.test/subscribers/unsubscribe?t=a%20b%26c")
    expect(init.method).toBe("POST")
    expect(init.body).toBeUndefined()
    expect(init.headers).toBeUndefined()
  })

  it("reads a 400 as an invalid link, with the API's message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => answer(400, { success: false, error: { code: "VALIDATION", message: INVALID } })))
    await expect(unsubscribe("bad")).resolves.toEqual({ ok: false, reason: "invalid", message: INVALID })
  })

  it("reads a 400 without a readable message as an invalid link all the same", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("oops", { status: 400 })))
    await expect(unsubscribe("bad")).resolves.toEqual({ ok: false, reason: "invalid" })
  })

  it.each([
    ["the network fails", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["the API is down", () => Promise.resolve(answer(502))],
  ])("reads it as a failure when %s", async (_, response) => {
    vi.stubGlobal("fetch", vi.fn(response))
    await expect(unsubscribe("t")).resolves.toEqual({ ok: false, reason: "failed" })
  })
})
