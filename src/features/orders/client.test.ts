import { createMockAuth, DEMO_USER } from "@/features/auth/mock-auth"
import type { AuthClient } from "@/features/auth/types"
import { stubApi } from "@/test/catalog"
import { ordersFor } from "./client"

// The real customer pool talks to the real routes with its access token; the demo accounts to the demo API.
describe("choosing the orders API", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("sends the real pool's access token to the API's /me", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.test")
    const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true, data: { email: "sara@example.com", name: "Sara", phone: "+96171234567" } })))
    vi.stubGlobal("fetch", fetch)
    const live = { ...createMockAuth(null), mode: "live", accessToken: async () => "access-1" } as AuthClient
    await expect(ordersFor(live).me()).resolves.toMatchObject({ email: "sara@example.com" })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://api.test/me")
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer access-1")
  })

  it("answers the demo accounts in this browser, never calling the API's orders routes", async () => {
    const fetch = stubApi()
    const auth = createMockAuth(null)
    await auth.signIn(DEMO_USER.email, DEMO_USER.password)
    await expect(ordersFor(auth).me()).resolves.toMatchObject({ email: DEMO_USER.email })
    await expect(ordersFor(auth).list()).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})
