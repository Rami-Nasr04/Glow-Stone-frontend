// The only file that talks to Cognito: the admin pool, signed in with SRP (the library's default flow). Its tokens are
// kept under keys that include the studio's app client id, so they never meet the customer pool's.
import { AuthenticationDetails, CognitoUser, CognitoUserPool, type CognitoUserSession } from "amazon-cognito-identity-js"
import { AdminAuthError, type AdminAuthClient, type AdminAuthErrorCode, type SignInResult } from "./types"

interface CognitoAdminAuthOptions {
  userPoolId: string
  clientId: string
}

// Refresh this long before the access token (60 minutes) expires, so no call reaches the API with a dying token.
const REFRESH_MARGIN_MS = 2 * 60 * 1000

const nameOf = (error: unknown) => (error instanceof Error ? ((error as { code?: string }).code ?? error.name) : "")

function toAuthError(error: unknown): AdminAuthError {
  const name = nameOf(error)
  const message = error instanceof Error ? error.message : ""
  const codes: Record<string, AdminAuthErrorCode> = {
    UserNotFoundException: "wrong_credentials",
    PasswordResetRequiredException: "reset_required",
    TooManyRequestsException: "too_many_attempts",
    TooManyFailedAttemptsException: "too_many_attempts",
    LimitExceededException: "too_many_attempts",
    CodeMismatchException: "wrong_code",
    ExpiredCodeException: "expired_code",
  }
  if (name === "NotAuthorizedException") return new AdminAuthError(/attempts exceeded/i.test(message) ? "too_many_attempts" : "wrong_credentials")
  if (name === "InvalidPasswordException") return new AdminAuthError("invalid_password", message)
  return new AdminAuthError(codes[name] ?? "unavailable")
}

const emailOf = (session: CognitoUserSession) => String(session.getIdToken().payload.email ?? "")

export function createCognitoAdminAuth({ userPoolId, clientId }: CognitoAdminAuthOptions): AdminAuthClient {
  const pool = new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId })
  // The user waiting for a new password after a first sign-in with the temporary one (kept in memory only).
  let challenge: CognitoUser | null = null

  const userFor = (email: string) => new CognitoUser({ Username: email.trim(), Pool: pool })

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
  // refreshed (refresh token expired or revoked) is cleared.
  async function liveSession(): Promise<CognitoUserSession | null> {
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

  const authenticate = (email: string, password: string) =>
    new Promise<SignInResult>((resolve, reject) => {
      const user = userFor(email)
      challenge = null
      user.authenticateUser(new AuthenticationDetails({ Username: email.trim(), Password: password }), {
        onSuccess: (session) => resolve({ status: "signedIn", email: emailOf(session) || email.trim() }),
        onFailure: (error: unknown) => reject(toAuthError(error)),
        // Cognito sends the user's attributes too; they are never sent back (C.2).
        newPasswordRequired: () => {
          challenge = user
          resolve({ status: "newPasswordRequired" })
        },
      })
    })

  return {
    async currentAdmin() {
      const session = await liveSession()
      return session ? emailOf(session) : null
    },

    signIn: authenticate,

    completeNewPassword(password) {
      const user = challenge
      if (!user) return Promise.reject(new AdminAuthError("challenge_expired"))
      return new Promise((resolve, reject) =>
        user.completeNewPasswordChallenge(
          password,
          {},
          {
            onSuccess: (session) => {
              challenge = null
              resolve(emailOf(session) || user.getUsername())
            },
            onFailure: (error: unknown) => reject(toAuthError(error)),
          },
        ),
      )
    },

    // The same answer whether the account exists, still has its temporary password, or hit a limit: only a
    // network failure is admitted, because then no email went anywhere.
    startPasswordReset(email) {
      return new Promise((resolve, reject) =>
        userFor(email).forgotPassword({
          onSuccess: () => resolve(),
          inputVerificationCode: () => resolve(),
          onFailure: (error: unknown) => (nameOf(error) === "NetworkError" ? reject(new AdminAuthError("unavailable")) : resolve()),
        }),
      )
    },

    async finishPasswordReset(email, code, password) {
      await new Promise<void>((resolve, reject) =>
        userFor(email).confirmPassword(code.trim(), password, {
          onSuccess: () => resolve(),
          onFailure: (error: unknown) => reject(toAuthError(error)),
        }),
      )
      const result = await authenticate(email, password)
      if (result.status !== "signedIn") throw new AdminAuthError("unavailable")
      return result.email
    },

    async accessToken() {
      const session = await liveSession()
      return session ? session.getAccessToken().getJwtToken() : null
    },

    clearSession() {
      challenge = null
      pool.getCurrentUser()?.signOut()
    },

    async signOut() {
      challenge = null
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
  }
}
