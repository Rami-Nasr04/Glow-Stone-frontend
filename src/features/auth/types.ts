// What the shop's screens see of the customer sign-in: the Cognito client (cognito.ts) or the demo (mock-auth.ts).

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

export type AuthErrorCode =
  | "wrong_credentials"
  | "not_confirmed"
  | "email_taken"
  | "wrong_code"
  | "expired_code"
  | "weak_password"
  /** The pool's pre-sign-up check refused the email, name or phone; the message is its own words. */
  | "rejected"
  | "too_many_attempts"
  /** No answer: the customer's connection, most likely. */
  | "network"
  | "unavailable"

export class AuthError extends Error {
  readonly code: AuthErrorCode

  /** For "rejected", the words to show; otherwise the code. */
  constructor(code: AuthErrorCode, message: string = code) {
    super(message)
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
  /** The signed-in customer's access token for the API (`Authorization: Bearer …`); throws when signed out. */
  accessToken(): Promise<string>
}
