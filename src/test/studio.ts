import { AdminAuthError, type AdminAuthClient, type SignInResult } from "@/features/studio/auth/types"
import type { AdminProduct, AdminProductImage } from "@/features/catalog/types"
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

/** Where the stub's upload slots send files. */
export const STORAGE_URL = "https://uploads.test/"

/**
 * Stubs fetch with the admin products API over these pieces: GET list and one (404 when unknown), POST (201, new id
 * 99), PATCH (merged), and the photo calls (slot, storage's 204, confirm at the end with id 9001…, order, delete).
 * `answer` can take over any call first, e.g. to send a 401 or a 400, and may wait.
 */
export function stubAdminApi(
  pieces: AdminProduct[],
  answer: (method: string, path: string, body: unknown) => Answer | Promise<Answer> = () => undefined,
) {
  let store = [...pieces]
  let slots = 0
  let photoIds = 9000
  const save = (piece: AdminProduct) => {
    store = store.map((p) => (p.id === piece.id ? piece : p))
    return piece
  }
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? "GET"
    const address = String(url)
    const path = address === STORAGE_URL ? STORAGE_URL : new URL(address).pathname
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body
    const forced = await answer(method, path, body)
    if (forced) return forced
    if (path === STORAGE_URL) return new Response(null, { status: 204 })
    const [, rawId, rest = ""] = /^\/admin\/products(?:\/(\d+))?(\/.*)?$/.exec(path) ?? []
    const id = Number(rawId)
    if (method === "POST" && !rawId) {
      const created = { ...adminProductOf(1), ...(body as object), id: 99, images: [], soldOut: (body as AdminProduct).remaining === 0 }
      store = [created, ...store]
      return ok(created, 201)
    }
    if (!id) return ok(store)
    const piece = store.find((p) => p.id === id)
    if (!piece) return failure(404, "NOT_FOUND", "Product not found")
    const closeUp = (images: AdminProductImage[]) => images.map((image, i) => ({ ...image, position: i + 1 }))
    if (rest === "/photos/upload") {
      slots++
      return ok({ uploadId: `upload-${slots}`, url: STORAGE_URL, fields: { key: `incoming/${id}/upload-${slots}`, policy: "cG9saWN5" } })
    }
    if (rest === "/photos") {
      const photo = { url: `https://cdn.test/products/${id}/new${++photoIds}`, width: 2880, height: 4318, id: photoIds, position: piece.images.length + 1 }
      save({ ...piece, images: [...piece.images, photo] })
      return ok(photo, 201)
    }
    if (rest === "/photos/order") {
      const ids = (body as { imageIds: number[] }).imageIds
      const same = ids.length === piece.images.length && piece.images.every((image) => ids.includes(image.id))
      if (!same) return failure(400, "VALIDATION", "Send every photo of this piece exactly once.")
      const images = closeUp(ids.map((imageId) => piece.images.find((image) => image.id === imageId) as AdminProductImage))
      return ok(save({ ...piece, images }).images)
    }
    const photoId = Number(/^\/photos\/(\d+)$/.exec(rest)?.[1])
    if (method === "DELETE" && photoId) {
      if (!piece.images.some((image) => image.id === photoId)) return failure(404, "NOT_FOUND", "Photo not found")
      save({ ...piece, images: closeUp(piece.images.filter((image) => image.id !== photoId)) })
      return new Response(null, { status: 204 })
    }
    if (method === "PATCH") return ok(save({ ...piece, ...(body as object) }))
    return ok(piece)
  })
  vi.stubGlobal("fetch", fetch)
  return fetch
}

/** The JSON bodies of every call with this method (a form upload's body is left as it is). */
export function bodiesOf(fetch: ReturnType<typeof stubAdminApi>, method: string): unknown[] {
  return fetch.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([, init]) => (typeof init?.body === "string" ? JSON.parse(init.body) : init?.body))
}

/** "METHOD path" for every call, in order. */
export function callsOf(fetch: ReturnType<typeof stubAdminApi>): string[] {
  return fetch.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${String(url) === STORAGE_URL ? STORAGE_URL : new URL(String(url)).pathname}`)
}
