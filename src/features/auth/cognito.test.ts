import { AuthError, type AuthErrorCode } from "./types"

// A stand-in for amazon-cognito-identity-js: each test says how "Cognito" answers through `cognito`. No test reaches
// the real customer pool.
interface Callbacks {
  onSuccess: (value?: unknown) => void
  onFailure: (error: Error) => void
  newPasswordRequired?: (attributes: unknown, required: unknown) => void
  inputVerificationCode?: (data: unknown) => void
}
type NodeCallback = (error: Error | null, value?: unknown) => void

const cognito = vi.hoisted(() => ({
  /** The signed-in customer the pool remembers: the email they signed in with. */
  current: null as string | null,
  signUp: vi.fn((_email: string, _password: string, _attributes: { Name: string; Value: string }[], cb: NodeCallback): void =>
    cb(null, { userConfirmed: false }),
  ),
  confirm: vi.fn((_email: string, _code: string, cb: NodeCallback): void => cb(null, "SUCCESS")),
  resend: vi.fn((_email: string, cb: NodeCallback): void => cb(null, {})),
  authenticate: (_email: string, _password: string, cb: Callbacks): void => cb.onSuccess(),
  forgotPassword: vi.fn((_email: string, cb: Callbacks): void => cb.onSuccess()),
  confirmPassword: vi.fn((_email: string, _code: string, _password: string, cb: Callbacks): void => cb.onSuccess()),
  /** Seconds since 1970 when the access token expires. */
  accessExpires: 0,
  accessToken: "access-1",
  getSessionFails: false,
  refreshFails: false,
  refreshLater: false,
  refreshSession: vi.fn(),
  revoke: vi.fn((cb: (error?: Error) => void) => cb()),
  cleared: vi.fn(),
  pools: [] as { UserPoolId: string; ClientId: string }[],
  forceAlias: null as boolean | null,
}))

function cognitoError(name: string, message = name): Error {
  return Object.assign(new Error(message), { name, code: name })
}

vi.mock("amazon-cognito-identity-js", () => {
  const session = () => ({
    getAccessToken: () => ({ getJwtToken: () => cognito.accessToken, getExpiration: () => cognito.accessExpires }),
    getIdToken: () => ({ getJwtToken: () => "id-token", payload: { sub: "sub-1", email: cognito.current, name: "Sara Khoury" } }),
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
    confirmRegistration(code: string, forceAlias: boolean, cb: NodeCallback) {
      cognito.forceAlias = forceAlias
      cognito.confirm(this.username, code, cb)
    }
    resendConfirmationCode(cb: NodeCallback) {
      cognito.resend(this.username, cb)
    }
    forgotPassword(cb: Callbacks) {
      cognito.forgotPassword(this.username, cb)
    }
    confirmPassword(code: string, password: string, cb: Callbacks) {
      cognito.confirmPassword(this.username, code, password, cb)
    }
    getSession(cb: NodeCallback) {
      if (cognito.getSessionFails) cb(cognitoError("NotAuthorizedException", "Refresh Token has expired"))
      else cb(null, session())
    }
    refreshSession(_token: unknown, cb: NodeCallback) {
      cognito.refreshSession()
      const answer = () => {
        if (cognito.refreshFails) return cb(cognitoError("NotAuthorizedException", "Refresh Token has been revoked"))
        cognito.accessToken = "access-2"
        cognito.accessExpires = Math.floor(Date.now() / 1000) + 3600
        cb(null, session())
      }
      if (cognito.refreshLater) setTimeout(answer, 5)
      else answer()
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
    constructor(data: { UserPoolId: string; ClientId: string }) {
      cognito.pools.push(data)
    }
    getCurrentUser() {
      return cognito.current ? new CognitoUser({ Username: cognito.current }) : null
    }
    signUp(username: string, password: string, attributes: { Name: string; Value: string }[], _validation: unknown, cb: NodeCallback) {
      cognito.signUp(username, password, attributes, cb)
    }
  }
  class CognitoUserAttribute {
    readonly Name: string
    readonly Value: string
    constructor({ Name, Value }: { Name: string; Value: string }) {
      this.Name = Name
      this.Value = Value
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
  return { CognitoUser, CognitoUserPool, CognitoUserAttribute, AuthenticationDetails }
})

const { createCognitoAuth } = await import("./cognito")

const EMAIL = "sara@example.com"
const SARA = { id: "sub-1", email: EMAIL, name: "Sara Khoury" }
const nowSeconds = () => Math.floor(Date.now() / 1000)

function client() {
  return createCognitoAuth({ userPoolId: "eu-central-1_Test123", clientId: "shopclient123" })
}

async function failureOf(promise: Promise<unknown>): Promise<{ code: AuthErrorCode; message: string }> {
  try {
    await promise
  } catch (error) {
    if (error instanceof AuthError) return { code: error.code, message: error.message }
    throw error
  }
  throw new Error("expected an AuthError")
}
const codeOf = async (promise: Promise<unknown>) => (await failureOf(promise)).code

beforeEach(() => {
  cognito.current = null
  cognito.accessToken = "access-1"
  cognito.accessExpires = nowSeconds() + 3600
  cognito.getSessionFails = false
  cognito.refreshFails = false
  cognito.refreshLater = false
  cognito.authenticate = (_email, _password, cb) => cb.onSuccess()
  cognito.pools = []
  vi.clearAllMocks()
})

describe("the shop's Cognito client", () => {
  it("uses the customer pool and the shop's app client, and says it is live", () => {
    const auth = client()
    expect(auth.mode).toBe("live")
    expect(cognito.pools).toEqual([{ UserPoolId: "eu-central-1_Test123", ClientId: "shopclient123" }])
  })

  describe("signing up", () => {
    it("sends the email, the trimmed name and the phone as Cognito attributes", async () => {
      await client().signUp({ name: "  Sara Khoury ", email: " Sara@Example.com ", phone: "+96171234567", password: "Stone2026" })
      expect(cognito.signUp).toHaveBeenCalledWith(
        EMAIL,
        "Stone2026",
        [
          { Name: "email", Value: EMAIL },
          { Name: "name", Value: "Sara Khoury" },
          { Name: "phone_number", Value: "+96171234567" },
        ],
        expect.any(Function),
      )
    })

    it("knows an email that already has an account", async () => {
      cognito.signUp.mockImplementationOnce((_e, _p, _a, cb) => cb(cognitoError("UsernameExistsException", "An account with the given email already exists.")))
      expect(await codeOf(client().signUp({ name: "Sara", email: EMAIL, phone: "+96171234567", password: "Stone2026" }))).toBe("email_taken")
    })

    // The pre-sign-up check answers in our words, wrapped in Cognito's: only ours is shown.
    it.each([
      ["PreSignUp failed with error Please enter a valid email..", "Please enter a valid email."],
      ["PreSignUp failed with error Please enter your name (up to 100 characters)..", "Please enter your name (up to 100 characters)."],
      ["PreSignUp failed with error Please enter a Lebanese number, like 71 234 567..", "Please enter a Lebanese number, like 71 234 567."],
      ["PreSignUp failed with error Please enter a valid email.", "Please enter a valid email."],
    ])("shows only the pre-sign-up check's own words for %j", async (message, ours) => {
      cognito.signUp.mockImplementationOnce((_e, _p, _a, cb) => cb(cognitoError("UserLambdaValidationException", message)))
      expect(await failureOf(client().signUp({ name: "Sara", email: EMAIL, phone: "+96171234567", password: "Stone2026" }))).toEqual({
        code: "rejected",
        message: ours,
      })
    })

    // A crash in the check also comes back as UserLambdaValidationException, with the crash's own words.
    it.each(["PreSignUp failed with error Cannot read properties of undefined (reading 'trim').", "Something else entirely"])(
      "never shows a pre-sign-up failure that isn't one of the three refusals (%j)",
      async (message) => {
        cognito.signUp.mockImplementationOnce((_e, _p, _a, cb) => cb(cognitoError("UserLambdaValidationException", message)))
        expect(await codeOf(client().signUp({ name: "Sara", email: EMAIL, phone: "+96171234567", password: "Stone2026" }))).toBe("unavailable")
      },
    )

    it("tells a password the pool refuses, too many attempts and a network failure apart", async () => {
      const input = { name: "Sara", email: EMAIL, phone: "+96171234567", password: "Stone2026" }
      cognito.signUp.mockImplementationOnce((_e, _p, _a, cb) => cb(cognitoError("InvalidPasswordException", "Password did not conform with policy")))
      expect(await codeOf(client().signUp(input))).toBe("weak_password")
      cognito.signUp.mockImplementationOnce((_e, _p, _a, cb) => cb(cognitoError("TooManyRequestsException")))
      expect(await codeOf(client().signUp(input))).toBe("too_many_attempts")
      cognito.signUp.mockImplementationOnce((_e, _p, _a, cb) => cb(cognitoError("NetworkError", "Network error")))
      expect(await codeOf(client().signUp(input))).toBe("network")
      cognito.signUp.mockImplementationOnce((_e, _p, _a, cb) => cb(cognitoError("InternalErrorException")))
      expect(await codeOf(client().signUp(input))).toBe("unavailable")
    })
  })

  describe("confirming the email", () => {
    it("confirms with the code, trimmed, without taking the email from another account", async () => {
      await client().confirmSignUp(` ${EMAIL.toUpperCase()} `, " 123456 ")
      expect(cognito.confirm).toHaveBeenCalledWith(EMAIL, "123456", expect.any(Function))
      expect(cognito.forceAlias).toBe(false)
    })

    it("tells a wrong code from an expired one", async () => {
      cognito.confirm.mockImplementationOnce((_e, _c, cb) => cb(cognitoError("CodeMismatchException")))
      expect(await codeOf(client().confirmSignUp(EMAIL, "000000"))).toBe("wrong_code")
      cognito.confirm.mockImplementationOnce((_e, _c, cb) => cb(cognitoError("ExpiredCodeException")))
      expect(await codeOf(client().confirmSignUp(EMAIL, "000000"))).toBe("expired_code")
      cognito.confirm.mockImplementationOnce((_e, _c, cb) => cb(cognitoError("LimitExceededException")))
      expect(await codeOf(client().confirmSignUp(EMAIL, "000000"))).toBe("too_many_attempts")
    })

    // Verified in another tab, or the link clicked twice: the account is ready, so this step has done its job.
    it("takes an account that is already confirmed as done", async () => {
      cognito.confirm.mockImplementationOnce((_e, _c, cb) => cb(cognitoError("NotAuthorizedException", "User cannot be confirmed. Current status is CONFIRMED")))
      await expect(client().confirmSignUp(EMAIL, "123456")).resolves.toBeUndefined()
    })

    it("resends the code", async () => {
      await client().resendCode(` ${EMAIL} `)
      expect(cognito.resend).toHaveBeenCalledWith(EMAIL, expect.any(Function))
      cognito.resend.mockImplementationOnce((_e, cb) => cb(cognitoError("LimitExceededException")))
      expect(await codeOf(client().resendCode(EMAIL))).toBe("too_many_attempts")
    })
  })

  describe("signing in", () => {
    it("signs in with SRP and reads the customer from the ID token", async () => {
      const auth = client()
      expect(await auth.signIn(` ${EMAIL} `, "Stone2026")).toEqual(SARA)
      expect(await auth.currentUser()).toEqual(SARA)
    })

    it("answers a wrong password and an unknown email the same way", async () => {
      cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("NotAuthorizedException", "Incorrect username or password."))
      expect(await codeOf(client().signIn(EMAIL, "wrong"))).toBe("wrong_credentials")
      cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("UserNotFoundException", "User does not exist."))
      expect(await codeOf(client().signIn("nobody@example.com", "wrong"))).toBe("wrong_credentials")
    })

    it("sends an unconfirmed account to the code step", async () => {
      cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("UserNotConfirmedException", "User is not confirmed."))
      expect(await codeOf(client().signIn(EMAIL, "Stone2026"))).toBe("not_confirmed")
    })

    it("tells too many attempts and a network failure apart", async () => {
      cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("NotAuthorizedException", "Password attempts exceeded"))
      expect(await codeOf(client().signIn(EMAIL, "x"))).toBe("too_many_attempts")
      cognito.authenticate = (_e, _p, cb) => cb.onFailure(cognitoError("NetworkError", "Network error"))
      expect(await codeOf(client().signIn(EMAIL, "x"))).toBe("network")
    })

    // Customers create their own accounts, so Cognito never asks them for a new password; if it ever did, nobody is
    // signed in.
    it("doesn't half sign in when Cognito asks for a new password", async () => {
      cognito.authenticate = (_e, _p, cb) => cb.newPasswordRequired?.({}, [])
      const auth = client()
      expect(await codeOf(auth.signIn(EMAIL, "Stone2026"))).toBe("unavailable")
      expect(await auth.currentUser()).toBeNull()
    })
  })

  describe("resetting the password", () => {
    // Prevent-user-existence is on in the pool: the page says "if an account exists" whatever happens.
    it("answers a reset request the same way whether or not the account exists", async () => {
      const outcomes: ((cb: Callbacks) => void)[] = [
        (cb) => cb.onSuccess(),
        (cb) => cb.inputVerificationCode?.({}),
        (cb) => cb.onFailure(cognitoError("UserNotFoundException")),
        (cb) => cb.onFailure(cognitoError("InvalidParameterException", "Cannot reset password for the user as there is no registered/verified email")),
      ]
      for (const outcome of outcomes) {
        cognito.forgotPassword.mockImplementationOnce((_email, cb) => outcome(cb))
        await expect(client().forgotPassword(EMAIL)).resolves.toBeUndefined()
      }
    })

    it("admits too many requests and a network failure, which say nothing about the account", async () => {
      cognito.forgotPassword.mockImplementationOnce((_email, cb) => cb.onFailure(cognitoError("LimitExceededException")))
      expect(await codeOf(client().forgotPassword(EMAIL))).toBe("too_many_attempts")
      cognito.forgotPassword.mockImplementationOnce((_email, cb) => cb.onFailure(cognitoError("NetworkError", "Network error")))
      expect(await codeOf(client().forgotPassword(EMAIL))).toBe("network")
    })

    it("sets the new password with the code", async () => {
      await client().confirmForgotPassword(` ${EMAIL} `, " 123456 ", "NewStone2026")
      expect(cognito.confirmPassword).toHaveBeenCalledWith(EMAIL, "123456", "NewStone2026", expect.anything())
    })

    it("explains a wrong or expired code and a refused password", async () => {
      cognito.confirmPassword.mockImplementationOnce((_e, _c, _p, cb) => cb.onFailure(cognitoError("CodeMismatchException")))
      expect(await codeOf(client().confirmForgotPassword(EMAIL, "000000", "NewStone2026"))).toBe("wrong_code")
      cognito.confirmPassword.mockImplementationOnce((_e, _c, _p, cb) => cb.onFailure(cognitoError("ExpiredCodeException")))
      expect(await codeOf(client().confirmForgotPassword(EMAIL, "000000", "NewStone2026"))).toBe("expired_code")
      cognito.confirmPassword.mockImplementationOnce((_e, _c, _p, cb) => cb.onFailure(cognitoError("InvalidPasswordException")))
      expect(await codeOf(client().confirmForgotPassword(EMAIL, "123456", "short"))).toBe("weak_password")
    })
  })

  describe("the session", () => {
    // The API takes the access token and refuses the ID token.
    it("hands over the access token, not the ID token", async () => {
      cognito.current = EMAIL
      expect(await client().accessToken()).toBe("access-1")
      expect(cognito.refreshSession).not.toHaveBeenCalled()
    })

    it("refuses to hand over a token when nobody is signed in", async () => {
      expect(await codeOf(client().accessToken())).toBe("unavailable")
    })

    it("refreshes itself when the access token expires within 2 minutes", async () => {
      cognito.current = EMAIL
      cognito.accessExpires = nowSeconds() + 90
      expect(await client().accessToken()).toBe("access-2")
      expect(cognito.refreshSession).toHaveBeenCalledTimes(1)
    })

    it("refreshes once for calls made together", async () => {
      cognito.current = EMAIL
      cognito.accessExpires = nowSeconds() + 90
      cognito.refreshLater = true
      const auth = client()
      expect(await Promise.all([auth.accessToken(), auth.accessToken(), auth.currentUser()])).toEqual(["access-2", "access-2", SARA])
      expect(cognito.refreshSession).toHaveBeenCalledTimes(1)
    })

    it("ends the session when the refresh fails (refresh token expired after 30 days, or revoked)", async () => {
      cognito.current = EMAIL
      cognito.accessExpires = nowSeconds() + 30
      cognito.refreshFails = true
      const auth = client()
      expect(await auth.currentUser()).toBeNull()
      expect(cognito.cleared).toHaveBeenCalled()
    })

    it("ends the session when the saved one can't be read", async () => {
      cognito.current = EMAIL
      cognito.getSessionFails = true
      expect(await client().currentUser()).toBeNull()
      expect(cognito.cleared).toHaveBeenCalled()
    })

    it("signs out by revoking the refresh token and clearing what this browser keeps", async () => {
      cognito.current = EMAIL
      const auth = client()
      await auth.signOut()
      expect(cognito.revoke).toHaveBeenCalledTimes(1)
      expect(await auth.currentUser()).toBeNull()
    })

    it("still clears this browser when revoking fails", async () => {
      cognito.current = EMAIL
      cognito.revoke.mockImplementationOnce((cb) => cb(new Error("offline")))
      await client().signOut()
      expect(cognito.current).toBeNull()
    })
  })
})
