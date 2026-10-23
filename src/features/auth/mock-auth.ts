import { AuthError, type AuthClient, type AuthUser } from "./types"

// The demo accounts (tests, `npm run dev:demo`, or the dev server without the customer pool ids): accounts live in
// this browser only, and every emailed code is DEMO_CODE.
export const DEMO_CODE = "123456"
export const DEMO_USER = { email: "demo@glowstone.test", password: "Stone2026", name: "Nour Haddad", phone: "+96171234567" }

interface StoredUser {
  id: string
  name: string
  email: string
  phone: string
  /** SHA-256 of the password: visitors may type a real one, so it is never kept readable. */
  passwordHash: string
  confirmed: boolean
}

interface DemoState {
  users: StoredUser[]
  session: string | null
}

const STORAGE_KEY = "glowstone.demo-auth"

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

async function hash(password: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`glowstone-demo:${password}`))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/** Who a demo access token belongs to, as the demo orders API reads it (the real API reads the Cognito token). */
export interface DemoCustomer {
  id: string
  email: string
  name: string
  phone: string
}

const TOKEN_PREFIX = "demo."

/** The customer a demo token names, or null for anything that isn't one. */
export function readDemoToken(token: string): DemoCustomer | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null
  try {
    const value = JSON.parse(decodeURIComponent(token.slice(TOKEN_PREFIX.length))) as Partial<DemoCustomer>
    return typeof value.id === "string" && typeof value.email === "string" && typeof value.name === "string" && typeof value.phone === "string"
      ? { id: value.id, email: value.email, name: value.name, phone: value.phone }
      : null
  } catch {
    return null
  }
}

export function createMockAuth(storage: Storage | null = browserStorage()): AuthClient {
  let state: DemoState | null = null

  const load = async (): Promise<DemoState> => {
    if (state) return state
    try {
      const saved = storage?.getItem(STORAGE_KEY)
      if (saved) state = JSON.parse(saved) as DemoState
    } catch {
      state = null
    }
    if (!state) {
      const { password, ...demo } = DEMO_USER
      state = { users: [{ ...demo, id: "demo-user", passwordHash: await hash(password), confirmed: true }], session: null }
    }
    return state
  }

  const save = (next: DemoState) => {
    state = next
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Private windows can block storage; the demo then lasts until the tab closes.
    }
  }

  const find = async (email: string) => (await load()).users.find((user) => user.email === email.trim().toLowerCase())
  const update = async (id: string, change: Partial<StoredUser>) => {
    const current = await load()
    save({ ...current, users: current.users.map((user) => (user.id === id ? { ...user, ...change } : user)) })
  }
  const toUser = ({ id, email, name }: StoredUser): AuthUser => ({ id, email, name })

  return {
    mode: "demo",
    async currentUser() {
      const { users, session } = await load()
      const user = users.find((candidate) => candidate.id === session)
      return user ? toUser(user) : null
    },
    async signIn(email, password) {
      const user = await find(email)
      if (!user || user.passwordHash !== (await hash(password))) throw new AuthError("wrong_credentials")
      if (!user.confirmed) throw new AuthError("not_confirmed")
      save({ ...(await load()), session: user.id })
      return toUser(user)
    },
    async signUp({ password, ...input }) {
      if (await find(input.email)) throw new AuthError("email_taken")
      const user: StoredUser = {
        ...input,
        email: input.email.trim().toLowerCase(),
        id: crypto.randomUUID(),
        passwordHash: await hash(password),
        confirmed: false,
      }
      const current = await load()
      save({ ...current, users: [...current.users, user] })
    },
    async confirmSignUp(email, code) {
      const user = await find(email)
      if (!user || code !== DEMO_CODE) throw new AuthError("wrong_code")
      await update(user.id, { confirmed: true })
    },
    async resendCode() {
      // Nothing to send in the demo: the code is always DEMO_CODE.
    },
    async forgotPassword() {
      // Nothing to send in the demo: the code is always DEMO_CODE.
    },
    async confirmForgotPassword(email, code, password) {
      const user = await find(email)
      if (!user || code !== DEMO_CODE) throw new AuthError("wrong_code")
      await update(user.id, { passwordHash: await hash(password), confirmed: true })
    },
    async signOut() {
      save({ ...(await load()), session: null })
    },
    async accessToken() {
      const { users, session } = await load()
      const user = users.find((candidate) => candidate.id === session)
      if (!user) throw new AuthError("unavailable")
      const { id, email, name, phone } = user
      return TOKEN_PREFIX + encodeURIComponent(JSON.stringify({ id, email, name, phone }))
    },
  }
}
