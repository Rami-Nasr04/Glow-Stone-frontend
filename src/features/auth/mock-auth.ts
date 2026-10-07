import { AuthError, type AuthClient, type AuthUser, type SignUpInput } from "./types"

// Stand-in for the customer pool until B3: accounts live in this browser only, and every emailed code is DEMO_CODE.
export const DEMO_CODE = "123456"
export const DEMO_USER = { email: "demo@glowstone.test", password: "Stone2026", name: "Nour Haddad", phone: "+96171234567" }

interface StoredUser extends SignUpInput {
  id: string
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

export function createMockAuth(storage: Storage | null = browserStorage()): AuthClient {
  let state: DemoState | null = null

  const load = (): DemoState => {
    if (state) return state
    try {
      const saved = storage?.getItem(STORAGE_KEY)
      if (saved) state = JSON.parse(saved) as DemoState
    } catch {
      state = null
    }
    state ??= { users: [{ ...DEMO_USER, id: "demo-user", confirmed: true }], session: null }
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

  const find = (email: string) => load().users.find((user) => user.email === email.trim().toLowerCase())
  const update = (id: string, change: Partial<StoredUser>) =>
    save({ ...load(), users: load().users.map((user) => (user.id === id ? { ...user, ...change } : user)) })
  const toUser = ({ id, email, name }: StoredUser): AuthUser => ({ id, email, name })

  return {
    mode: "demo",
    async currentUser() {
      const { users, session } = load()
      const user = users.find((candidate) => candidate.id === session)
      return user ? toUser(user) : null
    },
    async signIn(email, password) {
      const user = find(email)
      if (!user || user.password !== password) throw new AuthError("wrong_credentials")
      if (!user.confirmed) throw new AuthError("not_confirmed")
      save({ ...load(), session: user.id })
      return toUser(user)
    },
    async signUp(input) {
      if (find(input.email)) throw new AuthError("email_taken")
      const user: StoredUser = { ...input, email: input.email.trim().toLowerCase(), id: crypto.randomUUID(), confirmed: false }
      save({ ...load(), users: [...load().users, user] })
    },
    async confirmSignUp(email, code) {
      const user = find(email)
      if (!user || code !== DEMO_CODE) throw new AuthError("wrong_code")
      update(user.id, { confirmed: true })
    },
    async resendCode() {
      // Nothing to send in the demo: the code is always DEMO_CODE.
    },
    async forgotPassword() {
      // Nothing to send in the demo: the code is always DEMO_CODE.
    },
    async confirmForgotPassword(email, code, password) {
      const user = find(email)
      if (!user || code !== DEMO_CODE) throw new AuthError("wrong_code")
      update(user.id, { password, confirmed: true })
    },
    async signOut() {
      save({ ...load(), session: null })
    },
  }
}
