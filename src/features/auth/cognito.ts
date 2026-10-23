// The shop's only file that talks to Cognito: the customer pool, signed in with SRP (the library's default flow). Its
// tokens are kept under keys that include the shop's app client id, so they never meet the studio's.
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
  type ISignUpResult,
} from "amazon-cognito-identity-js"
import { AuthError, type AuthClient, type AuthErrorCode, type AuthUser } from "./types"

interface CognitoAuthOptions {
  userPoolId: string
  clientId: string
}

// Refresh this long before the access token (60 minutes) expires, so no call reaches the API with a dying token.
const REFRESH_MARGIN_MS = 2 * 60 * 1000

// The pool's pre-sign-up check refuses with one of these, wrapped as "PreSignUp failed with error <ours>.". Anything
// else under that name is the check failing (its own error text), which is never shown.
const PRE_SIGN_UP = "PreSignUp failed with error "
const PRE_SIGN_UP_REFUSALS = [
  "Please enter a valid email.",
  "Please enter your name (up to 100 characters).",
  "Please enter a Lebanese number, like 71 234 567.",
]

const nameOf = (error: unknown) => (error instanceof Error ? ((error as { code?: string }).code ?? error.name) : "")

function refusal(message: string): string | null {
  if (!message.startsWith(PRE_SIGN_UP)) return null
  const ours = message.slice(PRE_SIGN_UP.length).replace(/\.+$/, "")
  return PRE_SIGN_UP_REFUSALS.find((known) => known.replace(/\.$/, "") === ours) ?? null
}

function toAuthError(error: unknown): AuthError {
  const name = nameOf(error)
  const message = error instanceof Error ? error.message : ""
  const codes: Record<string, AuthErrorCode> = {
    NetworkError: "network",
    UserNotFoundException: "wrong_credentials",
    UserNotConfirmedException: "not_confirmed",
    UsernameExistsException: "email_taken",
    AliasExistsException: "email_taken",
    CodeMismatchException: "wrong_code",
    ExpiredCodeException: "expired_code",
    InvalidPasswordException: "weak_password",
    TooManyRequestsException: "too_many_attempts",
    TooManyFailedAttemptsException: "too_many_attempts",
    LimitExceededException: "too_many_attempts",
  }
  if (name === "NotAuthorizedException") return new AuthError(/attempts exceeded/i.test(message) ? "too_many_attempts" : "wrong_credentials")
  if (name === "UserLambdaValidationException") {
    const ours = refusal(message)
    return ours ? new AuthError("rejected", ours) : new AuthError("unavailable")
  }
  return new AuthError(codes[name] ?? "unavailable")
}

const normalEmail = (email: string) => email.trim().toLowerCase()

function userOf(session: CognitoUserSession): AuthUser {
  const { sub, email, name } = session.getIdToken().payload
  return { id: String(sub ?? ""), email: String(email ?? ""), name: String(name ?? "") }
}

export function createCognitoAuth({ userPoolId, clientId }: CognitoAuthOptions): AuthClient {
  const pool = new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId })

  const userFor = (email: string) => new CognitoUser({ Username: normalEmail(email), Pool: pool })

  // The library's callbacks, as a promise that rejects with the shop's AuthError.
  const ask = <T>(run: (done: (error: unknown, value?: T) => void) => void) =>
    new Promise<T>((resolve, reject) => run((error, value) => (error ? reject(toAuthError(error)) : resolve(value as T))))

  const readSession = (user: CognitoUser) =>
    new Promise<CognitoUserSession>((resolve, reject) =>
      user.getSession((error: Error | null, session: CognitoUserSession | null) => (error || !session ? reject(error) : resolve(session))),
    )

  const refresh = (user: CognitoUser, session: CognitoUserSession) =>
    new Promise<CognitoUserSession>((resolve, reject) =>
      user.refreshSession(session.getRefreshToken(), (error: Error | null, fresh: CognitoUserSession | null) =>
        error || !fresh ? reject(error) : resolve(fresh),
      ),
    )

  // The saved session, refreshed when its access token is about to expire. A session that can't be read or
  // refreshed (refresh token past its 30 days, or revoked) is cleared. Calls made together share one reading.
  let reading: Promise<CognitoUserSession | null> | null = null
  function liveSession(): Promise<CognitoUserSession | null> {
    reading ??= readLiveSession().finally(() => {
      reading = null
    })
    return reading
  }

  async function readLiveSession(): Promise<CognitoUserSession | null> {
    const user = pool.getCurrentUser()
    if (!user) return null
    try {
      const session = await readSession(user)
      const expiresAt = session.getAccessToken().getExpiration() * 1000
      return expiresAt - Date.now() < REFRESH_MARGIN_MS ? await refresh(user, session) : session
    } catch {
      user.signOut()
      return null
    }
  }

  return {
    mode: "live",

    async currentUser() {
      const session = await liveSession()
      return session ? userOf(session) : null
    },

    signIn(email, password) {
      return new Promise((resolve, reject) =>
        userFor(email).authenticateUser(new AuthenticationDetails({ Username: normalEmail(email), Password: password }), {
          onSuccess: (session) => resolve(userOf(session)),
          onFailure: (error: unknown) => reject(toAuthError(error)),
          // Customers make their own passwords, so this never happens to them; if it did, nobody is signed in.
          newPasswordRequired: () => reject(new AuthError("unavailable")),
        }),
      )
    },

    async signUp({ name, email, phone, password }) {
      const attributes = [
        new CognitoUserAttribute({ Name: "email", Value: normalEmail(email) }),
        new CognitoUserAttribute({ Name: "name", Value: name.trim() }),
        new CognitoUserAttribute({ Name: "phone_number", Value: phone }),
      ]
      await ask<ISignUpResult>((done) => pool.signUp(normalEmail(email), password, attributes, [], done))
    },

    confirmSignUp(email, code) {
      return new Promise((resolve, reject) =>
        // Never force the email over to this account: it must not take a verified email from another one.
        userFor(email).confirmRegistration(code.trim(), false, (error: unknown) => {
          // Already confirmed (another tab, or a second try): the account is ready, which is all this step is for.
          if (!error || (nameOf(error) === "NotAuthorizedException" && /status is CONFIRMED/i.test((error as Error).message))) resolve()
          else reject(toAuthError(error))
        }),
      )
    },

    async resendCode(email) {
      await ask((done) => userFor(email).resendConfirmationCode(done))
    },

    // The same answer whether or not the account exists (the pool hides that too). Only failures that say nothing about
    // the account are admitted: no answer at all, or too many requests.
    forgotPassword(email) {
      return new Promise((resolve, reject) =>
        userFor(email).forgotPassword({
          onSuccess: () => resolve(),
          inputVerificationCode: () => resolve(),
          onFailure: (error: unknown) => {
            const failure = toAuthError(error)
            if (failure.code === "network" || failure.code === "too_many_attempts") reject(failure)
            else resolve()
          },
        }),
      )
    },

    confirmForgotPassword(email, code, password) {
      return new Promise((resolve, reject) =>
        userFor(email).confirmPassword(code.trim(), password, {
          onSuccess: () => resolve(),
          onFailure: (error: unknown) => reject(toAuthError(error)),
        }),
      )
    },

    async signOut() {
      const user = pool.getCurrentUser()
      if (!user) return
      // With a callback the library revokes the refresh token first; if that fails, clear this browser anyway.
      await new Promise<void>((resolve) =>
        user.signOut((error?: Error) => {
          if (error) user.signOut()
          resolve()
        }),
      )
    },

    // The access token: the API refuses the ID token.
    async accessToken() {
      const session = await liveSession()
      if (!session) throw new AuthError("unavailable")
      return session.getAccessToken().getJwtToken()
    },
  }
}
