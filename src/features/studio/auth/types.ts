// What the studio's screens and API client see of the admin sign-in. Only cognito.ts talks to Cognito.

export type SignInResult = { status: "signedIn"; email: string } | { status: "newPasswordRequired" }

export type AdminAuthErrorCode =
  | "wrong_credentials"
  | "reset_required"
  | "too_many_attempts"
  | "invalid_password"
  | "wrong_code"
  | "expired_code"
  | "challenge_expired"
  | "unavailable"

export class AdminAuthError extends Error {
  readonly code: AdminAuthErrorCode

  /** For invalid_password, Cognito's own message, shown as it is. */
  constructor(code: AdminAuthErrorCode, message: string = code) {
    super(message)
    this.name = "AdminAuthError"
    this.code = code
  }
}

export interface AdminAuthClient {
  /** The signed-in admin's email, or null. Refreshes an expired session; a session that can't be read is cleared. */
  currentAdmin(): Promise<string | null>
  signIn(email: string, password: string): Promise<SignInResult>
  /** After "newPasswordRequired": sets the password and signs in. Resolves with the email. */
  completeNewPassword(password: string): Promise<string>
  /** Emails a reset code. Resolves the same way whether or not the account exists. */
  startPasswordReset(email: string): Promise<void>
  /** Sets the new password with the emailed code, then signs in. Resolves with the email. */
  finishPasswordReset(email: string, code: string, password: string): Promise<string>
  /** The access token for the API, refreshed when it expires within 2 minutes; null when there is no session. */
  accessToken(): Promise<string | null>
  /** Ends the session here, without asking Cognito (the API already refused the token). */
  clearSession(): void
  /** Revokes the refresh token and clears everything this browser keeps for the studio. */
  signOut(): Promise<void>
}
