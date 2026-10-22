import { subscribe } from "./subscribe"

const answer = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status })

describe("subscribe (POST /subscribers)", () => {
  it("posts the email, rejoin and the trap field as JSON", async () => {
    const fetch = vi.fn(async () => answer(204))
    vi.stubGlobal("fetch", fetch)
    await expect(subscribe({ email: "sara@example.com", rejoin: true, website: "" })).resolves.toEqual({ ok: true })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://api.test/subscribers")
    expect(init.method).toBe("POST")
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json")
    expect(JSON.parse(String(init.body))).toEqual({ email: "sara@example.com", rejoin: true, website: "" })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("reads a 400 as a bad email, with the API's message (the live answer: code VALIDATION)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => answer(400, { success: false, error: { code: "VALIDATION", message: "Please enter a valid email." } })))
    await expect(subscribe({ email: "x", rejoin: true, website: "" })).resolves.toEqual({ ok: false, reason: "invalid", message: "Please enter a valid email." })
  })

  it("decides by the status, not the code: any 400 shows the API's own message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => answer(400, { success: false, error: { code: "SOMETHING_NEW", message: "Email must be at most 254 characters." } })))
    await expect(subscribe({ email: "x", rejoin: true, website: "" })).resolves.toEqual({ ok: false, reason: "invalid", message: "Email must be at most 254 characters." })
  })

  it("reads a 400 without a readable message as a bad email all the same", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("oops", { status: 400 })))
    await expect(subscribe({ email: "x", rejoin: true, website: "" })).resolves.toEqual({ ok: false, reason: "invalid" })
  })

  it("reads a 429 as too many tries", async () => {
    // API Gateway's own body, not the envelope.
    vi.stubGlobal("fetch", vi.fn(async () => answer(429, { message: "Too Many Requests" })))
    await expect(subscribe({ email: "a@b.co", rejoin: true, website: "" })).resolves.toEqual({ ok: false, reason: "busy" })
  })

  it.each([
    ["the network fails", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["the server fails", () => Promise.resolve(answer(500))],
    ["the API isn't there yet", () => Promise.resolve(answer(404))],
  ])("never throws: %s → failed", async (_, reply) => {
    vi.stubGlobal("fetch", vi.fn(reply))
    await expect(subscribe({ email: "a@b.co", rejoin: false, website: "" })).resolves.toEqual({ ok: false, reason: "failed" })
  })

  it("gives up after the time limit", async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      "fetch",
      vi.fn((_: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)))),
    )
    const result = subscribe({ email: "a@b.co", rejoin: false, website: "" }, { timeoutMs: 5000 })
    await vi.advanceTimersByTimeAsync(5000)
    await expect(result).resolves.toEqual({ ok: false, reason: "failed" })
    vi.useRealTimers()
  })
})
