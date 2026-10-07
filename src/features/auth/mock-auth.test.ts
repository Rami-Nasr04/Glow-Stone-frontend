import { createMockAuth, DEMO_CODE, DEMO_USER } from "./mock-auth"
import { AuthError } from "./types"

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
}

const code = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return error instanceof AuthError ? error.code : "other"
  }
  return "ok"
}

const newcomer = { name: "Rana Khoury", email: "Rana@Example.com", phone: "+96171000000", password: "Cedar2026" }

describe("demo auth client", () => {
  it("signs the demo customer in and out", async () => {
    const auth = createMockAuth(null)
    expect(auth.mode).toBe("demo")
    expect(await auth.currentUser()).toBeNull()
    const user = await auth.signIn(DEMO_USER.email, DEMO_USER.password)
    expect(user).toMatchObject({ email: DEMO_USER.email, name: DEMO_USER.name })
    expect(await auth.currentUser()).toEqual(user)
    await auth.signOut()
    expect(await auth.currentUser()).toBeNull()
  })

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const auth = createMockAuth(null)
    expect(await code(auth.signIn(DEMO_USER.email, "Wrong2026"))).toBe("wrong_credentials")
    expect(await code(auth.signIn("nobody@example.com", "Wrong2026"))).toBe("wrong_credentials")
  })

  it("asks a new customer to verify the email before signing in", async () => {
    const auth = createMockAuth(null)
    await auth.signUp(newcomer)
    expect(await code(auth.signIn("rana@example.com", newcomer.password))).toBe("not_confirmed")
    expect(await code(auth.confirmSignUp("rana@example.com", "000000"))).toBe("wrong_code")
    await auth.confirmSignUp("RANA@example.com", DEMO_CODE)
    expect(await auth.signIn("rana@example.com", newcomer.password)).toMatchObject({ name: "Rana Khoury" })
  })

  it("refuses a second account for the same email", async () => {
    const auth = createMockAuth(null)
    expect(await code(auth.signUp({ ...newcomer, email: DEMO_USER.email.toUpperCase() }))).toBe("email_taken")
  })

  it("resets a password with the emailed code, and never reveals unknown emails", async () => {
    const auth = createMockAuth(null)
    expect(await code(auth.forgotPassword("nobody@example.com"))).toBe("ok")
    await auth.forgotPassword(DEMO_USER.email)
    expect(await code(auth.confirmForgotPassword(DEMO_USER.email, "000000", "Newstone1"))).toBe("wrong_code")
    await auth.confirmForgotPassword(DEMO_USER.email, DEMO_CODE, "Newstone1")
    expect(await code(auth.signIn(DEMO_USER.email, DEMO_USER.password))).toBe("wrong_credentials")
    expect(await code(auth.signIn(DEMO_USER.email, "Newstone1"))).toBe("ok")
  })

  it("remembers accounts and the session across reloads", async () => {
    const storage = memoryStorage()
    await createMockAuth(storage).signUp(newcomer)
    const reloaded = createMockAuth(storage)
    await reloaded.confirmSignUp(newcomer.email, DEMO_CODE)
    await reloaded.signIn(newcomer.email, newcomer.password)
    expect(await createMockAuth(storage).currentUser()).toMatchObject({ email: "rana@example.com" })
  })

  it("never keeps a password in readable form in the browser", async () => {
    const storage = memoryStorage()
    const auth = createMockAuth(storage)
    await auth.signUp(newcomer)
    await auth.confirmForgotPassword(newcomer.email, DEMO_CODE, "Granite2027")
    const saved = storage.getItem("glowstone.demo-auth") ?? ""
    expect(saved).not.toContain(newcomer.password)
    expect(saved).not.toContain("Granite2027")
    expect(saved).not.toContain(DEMO_USER.password)
    expect(await code(auth.signIn(newcomer.email, "Granite2027"))).toBe("ok")
  })

  it("still works when the browser blocks storage", async () => {
    const blocked = memoryStorage()
    blocked.getItem = () => {
      throw new Error("SecurityError")
    }
    blocked.setItem = () => {
      throw new Error("SecurityError")
    }
    const auth = createMockAuth(blocked)
    expect(await code(auth.signIn(DEMO_USER.email, DEMO_USER.password))).toBe("ok")
  })
})
