import { AdminAuthError, type AdminAuthClient, type SignInResult } from "@/features/studio/auth/types"
import type { AdminProduct } from "@/features/catalog/types"
import { productOf } from "./catalog"

// A piece as GET /admin/products/{id} answers it: the public fields plus status and updatedAt, and each photo with its
// id (the piece's id × 100 + its place) and position.
export function adminProductOf(id: number, changes: Partial<AdminProduct> = {}): AdminProduct {
  const piece = productOf(id)
  const images = piece.images.map((image, i) => ({ ...image, id: id * 100 + i + 1, position: i + 1 }))
  return { ...piece, images, status: "published", updatedAt: "2026-10-14T09:00:00.000Z", ...changes }
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

type Answer = Response | undefined

/**
 * Stubs fetch with the admin products API over these pieces: GET list and one (404 when unknown), POST (201, new id
 * 99) and PATCH (merged). `answer` can take over any call first, e.g. to send a 401 or a 400.
 */
export function stubAdminApi(pieces: AdminProduct[], answer: (method: string, path: string, body: unknown) => Answer = () => undefined) {
  let store = [...pieces]
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? "GET"
    const path = new URL(String(url)).pathname
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined
    const forced = answer(method, path, body)
    if (forced) return forced
    const id = Number(/^\/admin\/products\/(\d+)$/.exec(path)?.[1])
    if (method === "POST") {
      const created = { ...adminProductOf(1), ...(body as object), id: 99, images: [], soldOut: (body as AdminProduct).remaining === 0 }
      store = [created, ...store]
      return ok(created, 201)
    }
    if (!id) return ok(store)
    const piece = store.find((p) => p.id === id)
    if (!piece) return failure(404, "NOT_FOUND", "Product not found")
    if (method === "PATCH") {
      const changed = { ...piece, ...(body as object) }
      store = store.map((p) => (p.id === id ? changed : p))
      return ok(changed)
    }
    return ok(piece)
  })
  vi.stubGlobal("fetch", fetch)
  return fetch
}

/** The bodies of every call with this method. */
export function bodiesOf(fetch: ReturnType<typeof stubAdminApi>, method: string): unknown[] {
  return fetch.mock.calls.filter(([, init]) => (init?.method ?? "GET") === method).map(([, init]) => JSON.parse(String(init?.body)))
}
