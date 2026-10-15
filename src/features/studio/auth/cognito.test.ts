import { AdminAuthError } from "./types"

// A stand-in for amazon-cognito-identity-js: each test says how "Cognito" answers through `cognito`.
interface Callbacks {
  onSuccess: (value?: unknown) => void
  onFailure: (error: Error) => void
  newPasswordRequired?: (attributes: unknown, required: unknown) => void
  inputVerificationCode?: (data: unknown) => void
}

const cognito = vi.hoisted(() => ({
  /** The signed-in user the pool remembers, by email. */
  current: null as string | null,
  /** What authenticateUser does. */
  authenticate: (_email: string, _password: string, cb: Callbacks): void => cb.onFailure(new Error("not set")),
  completeNewPassword: vi.fn((_password: string, _attributes: unknown, cb: Callbacks): void => cb.onSuccess()),
  forgotPassword: (_email: string, cb: Callbacks): void => cb.onSuccess(),
  confirmPassword: (_code: string, _password: string, cb: Callbacks): void => cb.onSuccess(),
  /** Seconds since 1970 when the access token expires. */
  accessExpires: 0,
  accessToken: "access-1",
  getSessionFails: false,
  refreshFails: false,
  refreshSession: vi.fn(),
  revoke: vi.fn((cb: (error?: Error) => void) => cb()),
  cleared: vi.fn(),
}))

function cognitoError(name: string, message = name): Error {
  return Object.assign(new Error(message), { name, code: name })
}

vi.mock("amazon-cognito-identity-js", () => {
  const session = () => ({
    getAccessToken: () => ({ getJwtToken: () => cognito.accessToken, getExpiration: () => cognito.accessExpires }),
    getIdToken: () => ({ payload: { email: cognito.current } }),
    getRefreshToken: () => ({ getToken: () => "refresh-1" }),
  })
  class CognitoUser {
    readonly username: string
    constructor({ Username }: { Username: string }) {
      this.username = Username
    }
    authenticateUser(details: { username: string; password: string }, cb: Callbacks) {
      cognito.authenticate(details.username, details.password, {
        ...cb,
        onSuccess: () => {
          cognito.current = details.username
          cb.onSuccess(session())
        },
      })
    }
    completeNewPasswordChallenge(password: string, attributes: unknown, cb: Callbacks) {
      cognito.completeNewPassword(password, attributes, {
        ...cb,
        onSuccess: () => {
          cognito.current = this.username
          cb.onSuccess(session())
        },
      })
    }
    forgotPassword(cb: Callbacks) {
      cognito.forgotPassword(this.username, cb)
    }
    confirmPassword(code: string, password: string, cb: Callbacks) {
      cognito.confirmPassword(code, password, cb)
    }
    getSession(cb: (error: Error | null, value?: unknown) => void) {
      if (cognito.getSessionFails) cb(cognitoError("NotAuthorizedException", "Refresh Token has expired"))
      else cb(null, session())
    }
    refreshSession(_token: unknown, cb: (error: Error | null, value?: unknown) => void) {
      cognito.refreshSession()
      if (cognito.refreshFails) return cb(cognitoError("NotAuthorizedException", "Refresh Token has been revoked"))
      cognito.accessToken = "access-2"
      cognito.accessExpires = Math.floor(Date.now() / 1000) + 3600
      cb(null, session())
    }
    signOut(cb?: (error?: Error) => void) {
      if (!cb) {
        cognito.cleared()
        cognito.current = null
        return
      }
      cognito.revoke((error) => {
        cognito.cleared()
        cognito.current = null
        cb(error)
      })
    }
  }
  class CognitoUserPool {
    readonly clientId: string
    constructor({ ClientId }: { UserPoolId: string; ClientId: string }) {
      this.clientId = ClientId
    }
    getCurrentUser() {
      return cognito.current ? new CognitoUser({ Username: cognito.current }) : null
    }
  }
  class AuthenticationDetails {
    readonly username: string
    readonly password: string
    constructor({ Username, Password }: { Username: string; Password: string }) {
      this.username = Username
      this.password = Password
    }
  }
  return { CognitoUser, CognitoUserPool, AuthenticationDetails }
})

const { createCognitoAdminAuth } = await import("./cognito")

const EMAIL = "omar@example.com"
const nowSeconds = () => Math.floor(Date.now() / 1000)

function client() {
  return createCognitoAdminAuth({ userPoolId: "eu-central-1_Test123", clientId: "testclient123" })
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    if (error instanceof AdminAuthError) return error.code
    throw error
  }
  throw new Error("expected an AdminAuthError")
}

beforeEach(() => {
  cognito.current = null
  cognito.accessToken = "access-1"
  cognito.accessExpires = nowSeconds() + 3600
  cognito.getSessionFails = false
  cognito.refreshFails = false
  cognito.authenticate = (_email, _password, cb) => cb.onSuccess()
  cognito.forgotPassword = (_email, cb) => cb.onSuccess()
  cognito.confirmPassword = (_code, _password, cb) => cb.onSuccess()
  vi.clearAllMocks()
})

describe("the studio's Cognito client", () => {
  it("signs in with email and password and remembers the admin", async () => {
    const auth = client()
    expect(await auth.signIn(` ${EMAIL} `, "Correct-Horse-9")).toEqual({ status: "signedIn", email: EMAIL })
    expect(await auth.currentAdmin()).toBe(EMAIL)
    expect(await auth.accessToken()).toBe("access-1")
  })

  it("answers a wrong password and an unknown email the same way", async () => {
    cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("NotAuthorizedException", "Incorrect username or password."))
    expect(await codeOf(client().signIn(EMAIL, "wrong"))).toBe("wrong_credentials")
    cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("UserNotFoundException", "User does not exist."))
    expect(await codeOf(client().signIn("nobody@example.com", "wrong"))).toBe("wrong_credentials")
  })

  it("tells apart too many attempts and a required reset", async () => {
    cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("NotAuthorizedException", "Password attempts exceeded"))
    expect(await codeOf(client().signIn(EMAIL, "x"))).toBe("too_many_attempts")
    cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("TooManyRequestsException"))
    expect(await codeOf(client().signIn(EMAIL, "x"))).toBe("too_many_attempts")
    cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("PasswordResetRequiredException"))
    expect(await codeOf(client().signIn(EMAIL, "x"))).toBe("reset_required")
    cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("NetworkError", "Network error"))
    expect(await codeOf(client().signIn(EMAIL, "x"))).toBe("unavailable")
  })

  it("asks for a new password on the first sign-in, and never sends Cognito's attributes back", async () => {
    cognito.authenticate = (_e, _p, cb) => cb.newPasswordRequired?.({ email: EMAIL, email_verified: "true" }, [])
    const auth = client()
    expect(await auth.signIn(EMAIL, "Temporary-1")).toEqual({ status: "newPasswordRequired" })
    expect(await auth.currentAdmin()).toBeNull()
    expect(await auth.completeNewPassword("A-New-Password-1")).toBe(EMAIL)
    expect(cognito.completeNewPassword).toHaveBeenCalledWith("A-New-Password-1", {}, expect.anything())
    expect(await auth.currentAdmin()).toBe(EMAIL)
  })

  it("shows Cognito's own message when it refuses the new password", async () => {
    cognito.authenticate = (_e, _p, cb) => cb.newPasswordRequired?.({}, [])
    cognito.completeNewPassword.mockImplementationOnce((_p, _a, cb) =>
      cb.onFailure(cognitoError("InvalidPasswordException", "Password does not conform to policy: Password must have symbol characters")),
    )
    const auth = client()
    await auth.signIn(EMAIL, "Temporary-1")
    const error = await auth.completeNewPassword("A-New-Password-1").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AdminAuthError)
    expect(error).toMatchObject({ code: "invalid_password", message: "Password does not conform to policy: Password must have symbol characters" })
  })

  it("can't finish the new-password step once its sign-in is gone", async () => {
    expect(await codeOf(client().completeNewPassword("A-New-Password-1"))).toBe("challenge_expired")
  })

  it("answers a reset request the same way whatever Cognito says", async () => {
    const outcomes: ((cb: Callbacks) => void)[] = [
      (cb) => cb.onSuccess(),
      (cb) => cb.inputVerificationCode?.({}),
      (cb) => cb.onFailure(cognitoError("UserNotFoundException")),
      (cb) => cb.onFailure(cognitoError("NotAuthorizedException", "User password cannot be reset in the current state.")),
      (cb) => cb.onFailure(cognitoError("LimitExceededException")),
      (cb) => cb.onFailure(cognitoError("InvalidParameterException", "Cannot reset password for the user as there is no registered/verified email")),
    ]
    for (const outcome of outcomes) {
      cognito.forgotPassword = (_email, cb) => outcome(cb)
      await expect(client().startPasswordReset(EMAIL)).resolves.toBeUndefined()
    }
  })

  it("only admits that a reset request failed when the network did", async () => {
    cognito.forgotPassword = (_email, cb) => cb.onFailure(cognitoError("NetworkError", "Network error"))
    expect(await codeOf(client().startPasswordReset(EMAIL))).toBe("unavailable")
  })

  it("finishes a reset and signs the admin in", async () => {
    const auth = client()
    expect(await auth.finishPasswordReset(EMAIL, "123456", "A-New-Password-1")).toBe(EMAIL)
    expect(await auth.currentAdmin()).toBe(EMAIL)
  })

  it("explains a wrong or expired code, and a refused password", async () => {
    cognito.confirmPassword = (_c, _p, cb) => cb.onFailure(cognitoError("CodeMismatchException"))
    expect(await codeOf(client().finishPasswordReset(EMAIL, "000000", "A-New-Password-1"))).toBe("wrong_code")
    cognito.confirmPassword = (_c, _p, cb) => cb.onFailure(cognitoError("ExpiredCodeException"))
    expect(await codeOf(client().finishPasswordReset(EMAIL, "000000", "A-New-Password-1"))).toBe("expired_code")
    cognito.confirmPassword = (_c, _p, cb) => cb.onFailure(cognitoError("InvalidPasswordException", "Password not long enough"))
    expect(await codeOf(client().finishPasswordReset(EMAIL, "123456", "short"))).toBe("invalid_password")
  })

  it("leaves a fresh access token alone", async () => {
    cognito.current = EMAIL
    expect(await client().accessToken()).toBe("access-1")
    expect(cognito.refreshSession).not.toHaveBeenCalled()
  })

  it("refreshes the access token quietly when it expires within 2 minutes", async () => {
    cognito.current = EMAIL
    cognito.accessExpires = nowSeconds() + 90
    expect(await client().accessToken()).toBe("access-2")
    expect(cognito.refreshSession).toHaveBeenCalledTimes(1)
  })

  it("ends the session when the refresh fails", async () => {
    cognito.current = EMAIL
    cognito.accessExpires = nowSeconds() + 30
    cognito.refreshFails = true
    const auth = client()
    expect(await auth.accessToken()).toBeNull()
    expect(cognito.cleared).toHaveBeenCalled()
    expect(await auth.currentAdmin()).toBeNull()
  })

  it("ends the session when the saved one can't be read", async () => {
    cognito.current = EMAIL
    cognito.getSessionFails = true
    expect(await client().currentAdmin()).toBeNull()
    expect(cognito.cleared).toHaveBeenCalled()
  })

  it("signs out by revoking the refresh token and clearing what this browser keeps", async () => {
    cognito.current = EMAIL
    const auth = client()
    await auth.signOut()
    expect(cognito.revoke).toHaveBeenCalledTimes(1)
    expect(cognito.cleared).toHaveBeenCalled()
    expect(await auth.currentAdmin()).toBeNull()
  })

  it("still clears this browser when revoking fails", async () => {
    cognito.current = EMAIL
    cognito.revoke.mockImplementationOnce((cb) => cb(new Error("offline")))
    await client().signOut()
    expect(cognito.current).toBeNull()
  })

  it("clears the session without asking Cognito when the API refused the token", async () => {
    cognito.current = EMAIL
    const auth = client()
    auth.clearSession()
    expect(cognito.revoke).not.toHaveBeenCalled()
    expect(await auth.currentAdmin()).toBeNull()
  })
})
