import { lazyCognitoAuth } from "./client"
import { customerAuthSetup } from "./setup"
import { AuthError } from "./types"

// The real client is only loaded when it is needed; this records when that happens.
const loaded = vi.hoisted(() => ({ cognito: false, client: { signIn: vi.fn(), currentUser: vi.fn(), accessToken: vi.fn() } }))
vi.mock("./cognito", () => {
  loaded.cognito = true
  return { createCognitoAuth: () => ({ mode: "live", ...loaded.client }) }
})

const POOL = { poolId: "eu-central-1_Test123", clientId: "shopclient123" }
const BUILT = { dev: false, mode: "production", poolId: undefined, clientId: undefined, accountsOpen: undefined }

describe("choosing the customer sign-in", () => {
  it("uses the real pool when both ids are set", () => {
    expect(customerAuthSetup({ ...BUILT, ...POOL }).pool).toEqual({ userPoolId: "eu-central-1_Test123", clientId: "shopclient123" })
    expect(customerAuthSetup({ ...BUILT, dev: true, mode: "development", ...POOL }).pool).not.toBeNull()
  })

  it("uses the demo without the ids, in the tests, and with `npm run dev:demo`", () => {
    expect(customerAuthSetup({ ...BUILT, dev: true, mode: "development" }).pool).toBeNull()
    expect(customerAuthSetup({ ...BUILT, dev: true, mode: "test", ...POOL }).pool).toBeNull()
    expect(customerAuthSetup({ ...BUILT, dev: true, mode: "demo", ...POOL }).pool).toBeNull()
  })

  it("refuses half a pool or ids that aren't ids", () => {
    expect(() => customerAuthSetup({ ...BUILT, poolId: POOL.poolId })).toThrow("VITE_CUSTOMER_APP_CLIENT_ID")
    expect(() => customerAuthSetup({ ...BUILT, clientId: POOL.clientId })).toThrow("VITE_CUSTOMER_USER_POOL_ID")
    expect(() => customerAuthSetup({ ...BUILT, ...POOL, poolId: "cSYvqogY8" })).toThrow("VITE_CUSTOMER_USER_POOL_ID must look like")
  })
})

// Switching to the real pool must not open accounts, checkout and ordering on the live site: that waits for Rami's flag.
describe("opening customer accounts", () => {
  it("keeps them closed on a built site without VITE_ACCOUNTS_OPEN, even with the real pool", () => {
    expect(customerAuthSetup(BUILT).accountsOpen).toBe(false)
    expect(customerAuthSetup({ ...BUILT, ...POOL }).accountsOpen).toBe(false)
    expect(customerAuthSetup({ ...BUILT, ...POOL, accountsOpen: "" }).accountsOpen).toBe(false)
    expect(customerAuthSetup({ ...BUILT, ...POOL, accountsOpen: "false" }).accountsOpen).toBe(false)
  })

  it("opens them with VITE_ACCOUNTS_OPEN=true, and always on the dev server", () => {
    expect(customerAuthSetup({ ...BUILT, ...POOL, accountsOpen: "true" }).accountsOpen).toBe(true)
    expect(customerAuthSetup({ ...BUILT, dev: true, mode: "development" }).accountsOpen).toBe(true)
  })

  it("refuses a flag that is neither true nor false", () => {
    expect(() => customerAuthSetup({ ...BUILT, ...POOL, accountsOpen: "yes" })).toThrow("VITE_ACCOUNTS_OPEN")
  })

  // The demo keeps accounts in the visitor's browser and tells them every code is 123456: never on a real site.
  it("refuses to open the demo accounts on a built site", () => {
    expect(() => customerAuthSetup({ ...BUILT, accountsOpen: "true" })).toThrow("VITE_CUSTOMER_USER_POOL_ID")
  })
})

describe("a built site without the flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each(["sign-in", "sign-up", "verify", "forgot-password", "checkout", "order-placed", "account", "account-order"])(
    "shows the missing page at the %s route, with the real pool set",
    async (route) => {
      vi.stubEnv("DEV", false)
      vi.stubEnv("MODE", "production")
      vi.stubEnv("VITE_CUSTOMER_USER_POOL_ID", POOL.poolId)
      vi.stubEnv("VITE_CUSTOMER_APP_CLIENT_ID", POOL.clientId)
      vi.stubEnv("VITE_ACCOUNTS_OPEN", "")
      vi.resetModules()
      const [{ default: Page }, { default: NotFound }, { authClient }] = await Promise.all([
        import(`@/routes/${route}.tsx`),
        import("@/pages/NotFound"),
        import("./client"),
      ])
      expect(authClient.mode).toBe("live")
      expect(Page).toBe(NotFound)
    },
  )
})

describe("the real client, loaded when needed", () => {
  function storageWith(entries: Record<string, string>): Storage {
    return { getItem: (key: string) => entries[key] ?? null } as Storage
  }

  beforeEach(() => {
    loaded.cognito = false
    vi.resetModules()
  })

  // Most visitors never sign in: their pages don't download Cognito just to learn that.
  it("answers 'nobody' without loading Cognito when this browser has no session", async () => {
    const auth = lazyCognitoAuth({ userPoolId: POOL.poolId, clientId: POOL.clientId }, storageWith({}))
    expect(auth.mode).toBe("live")
    expect(await auth.currentUser()).toBeNull()
    expect(loaded.cognito).toBe(false)
  })

  it("loads Cognito to read a saved session", async () => {
    loaded.client.currentUser.mockResolvedValueOnce({ id: "sub-1", email: "sara@example.com", name: "Sara" })
    const storage = storageWith({ "CognitoIdentityServiceProvider.shopclient123.LastAuthUser": "sub-1" })
    const auth = lazyCognitoAuth({ userPoolId: POOL.poolId, clientId: POOL.clientId }, storage)
    expect(await auth.currentUser()).toEqual({ id: "sub-1", email: "sara@example.com", name: "Sara" })
    expect(loaded.cognito).toBe(true)
  })

  it("loads Cognito for every step that asks it something", async () => {
    loaded.client.signIn.mockResolvedValueOnce({ id: "sub-1", email: "sara@example.com", name: "Sara" })
    const auth = lazyCognitoAuth({ userPoolId: POOL.poolId, clientId: POOL.clientId }, storageWith({}))
    await auth.signIn("sara@example.com", "Stone2026")
    expect(loaded.client.signIn).toHaveBeenCalledWith("sara@example.com", "Stone2026")
  })

  it("passes the real client's refusals through", async () => {
    loaded.client.accessToken.mockRejectedValueOnce(new AuthError("unavailable"))
    const auth = lazyCognitoAuth({ userPoolId: POOL.poolId, clientId: POOL.clientId }, storageWith({}))
    await expect(auth.accessToken()).rejects.toMatchObject({ code: "unavailable" })
  })
})
