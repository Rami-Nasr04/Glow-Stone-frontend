import { AdminAuthError, type AdminAuthClient, type SignInResult } from "@/features/studio/auth/types"
import type { AdminProduct } from "@/features/catalog/types"
import { productOf } from "./catalog"

// A piece as GET /admin/products/{id} answers it: the public fields plus status and updatedAt.
export function adminProductOf(id: number, changes: Partial<AdminProduct> = {}): AdminProduct {
  return { ...productOf(id), status: "published", updatedAt: "2026-10-14T09:00:00.000Z", ...changes }
}

/** A JSON answer in the API's envelope. */
export function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), { status, headers: { "Content-Type": "application/json" } })
}

/** An error answer in the API's envelope. */
export function failure(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), { status, headers: { "Content-Type": "application/json" } })
}

/** API Gateway's own 401: not the envelope. */
export function unauthorized(): Response {
  return new Response('{"message":"Unauthorized"}', { status: 401, headers: { "Content-Type": "application/json" } })
}

export interface FakeAdminAuthOptions {
  /** Signed in as this email from the start. */
  signedInAs?: string | null
  /** The first sign-in asks for a new password. */
  temporaryPassword?: boolean
}

/** An in-memory AdminAuthClient: every password is right except "wrong". */
export function fakeAdminAuth({ signedInAs = null, temporaryPassword = false }: FakeAdminAuthOptions = {}) {
  let email = signedInAs
  let pending: string | null = null
  const client = {
    currentAdmin: vi.fn(async () => email),
    signIn: vi.fn(async (address: string, password: string): Promise<SignInResult> => {
      if (password === "wrong") throw new AdminAuthError("wrong_credentials")
      if (temporaryPassword) {
        pending = address.trim()
        return { status: "newPasswordRequired" }
      }
      email = address.trim()
      return { status: "signedIn", email }
    }),
    completeNewPassword: vi.fn(async () => {
      if (!pending) throw new AdminAuthError("challenge_expired")
      email = pending
      pending = null
      return email
    }),
    startPasswordReset: vi.fn(async () => {}),
    finishPasswordReset: vi.fn(async (address: string) => {
      email = address.trim()
      return email
    }),
    accessToken: vi.fn(async () => (email ? "access-1" : null)),
    clearSession: vi.fn(() => {
      email = null
    }),
    signOut: vi.fn(async () => {
      email = null
    }),
  } satisfies AdminAuthClient
  return client
}
