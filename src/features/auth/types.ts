// Provisional until B3: the customer pool (Cognito) and the customers table are being designed now.
// F3-live implements AuthClient with Cognito; the screens only ever see this interface.

export interface AuthUser {
  /** The Cognito `sub`, also the customers.id. */
  id: string
  email: string
  name: string
}

export interface SignUpInput {
  name: string
  email: string
  /** E.164, e.g. "+96171234567" (see lebanesePhone). */
  phone: string
  password: string
}

export type AuthErrorCode = "wrong_credentials" | "not_confirmed" | "email_taken" | "wrong_code" | "too_many_attempts" | "unavailable"

export class AuthError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode) {
    super(code)
    this.name = "AuthError"
    this.code = code
  }
}

export interface AuthClient {
  /** "demo" keeps accounts in this browser and every code is 123456; the pages say so. */
  readonly mode: "demo" | "live"
  currentUser(): Promise<AuthUser | null>
  signIn(email: string, password: string): Promise<AuthUser>
  /** Creates the account and emails a 6-digit code. */
  signUp(input: SignUpInput): Promise<void>
  confirmSignUp(email: string, code: string): Promise<void>
  resendCode(email: string): Promise<void>
  /** Emails a reset code; resolves even for unknown emails, so accounts can't be discovered. */
  forgotPassword(email: string): Promise<void>
  confirmForgotPassword(email: string, code: string, password: string): Promise<void>
  signOut(): Promise<void>
}
