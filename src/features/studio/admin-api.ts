// The studio's calls to the admin products API (GET/POST /admin/products, GET/PATCH/DELETE /admin/products/{id}, the
// photo calls under /admin/products/{id}/photos, and POST /admin/publish), with the admin's access token. Answers are read through the
// envelope; a 401 is judged by its status alone, because API Gateway answers it with its own {"message":"Unauthorized"}.
import { readAdminPhoto, readAdminPhotos, readAdminProduct } from "@/features/catalog/api"
import type { AdminProduct, AdminProductImage, ProductInput } from "@/features/catalog/types"

/** Every key the API takes; anything else is refused by the API, so it is never sent. */
export const PRODUCT_INPUT_KEYS = [
  "name",
  "stoneType",
  "color",
  "price",
  "bottles",
  "heightCm",
  "widthCm",
  "depthCm",
  "weightKg",
  "editionSize",
  "remaining",
  "status",
  "featured",
  "summary",
  "story",
] as const satisfies readonly (keyof ProductInput)[]

export type ProductField = (typeof PRODUCT_INPUT_KEYS)[number]

export type StudioErrorCode = "VALIDATION" | "CONFLICT" | "NOT_FOUND" | "PUBLISH_FAILED" | "UNAUTHORIZED" | "NETWORK" | "UNAVAILABLE" | "UNEXPECTED" | "STORAGE"

export class StudioError extends Error {
  readonly status: number
  readonly code: StudioErrorCode
  /** The form field the message belongs to, when the API names one. */
  readonly field?: ProductField

  constructor(status: number, code: StudioErrorCode, message: string, field?: ProductField) {
    super(message)
    this.name = "StudioError"
    this.status = status
    this.code = code
    this.field = field
  }
}

/** Permission to upload one photo straight to storage (a form POST), valid for 5 minutes. */
export interface UploadSlot {
  uploadId: string
  url: string
  /** Sent first, in this order, before Content-Type and the file. */
  fields: Record<string, string>
}

export interface AdminApi {
  listProducts(): Promise<AdminProduct[]>
  getProduct(id: number): Promise<AdminProduct>
  createProduct(input: ProductInput): Promise<AdminProduct>
  updateProduct(id: number, changes: Partial<ProductInput>): Promise<AdminProduct>
  requestUpload(id: number): Promise<UploadSlot>
  /** The uploaded photo, added at the end of the piece's photos. */
  confirmUpload(id: number, uploadId: string): Promise<AdminProductImage>
  /** imageIds = every photo of the piece, exactly once, in the new order. */
  reorderPhotos(id: number, imageIds: number[]): Promise<AdminProductImage[]>
  deletePhoto(id: number, imageId: number): Promise<void>
  /** Drafts only: the piece, its photos and their files. */
  deleteProduct(id: number): Promise<void>
  /** Asks for the shop to be rebuilt; it updates about 2 minutes later, with nothing to follow. */
  publish(): Promise<void>
}

interface AdminApiOptions {
  baseUrl: string
  /** The current access token (refreshed when needed), or null when there is no session. */
  accessToken: () => Promise<string | null>
  /** Called on any 401, before the error is thrown: the session is over. */
  onUnauthorized: () => void
}

const KNOWN_CODES: readonly StudioErrorCode[] = ["VALIDATION", "CONFLICT", "NOT_FOUND", "PUBLISH_FAILED"]

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

/** Only the keys the API takes, in its order. */
export function pickInput(values: Partial<ProductInput>): Partial<ProductInput> {
  const picked: Record<string, unknown> = {}
  for (const key of PRODUCT_INPUT_KEYS) if (key in values && values[key] !== undefined) picked[key] = values[key]
  return picked as Partial<ProductInput>
}

// "price must be more than 0" belongs to price; "Unrecognized key…" and "Send at least one field…" to the whole form.
function fieldOf(message: string): ProductField | undefined {
  const first = /^(\w+) /.exec(message)?.[1]
  return PRODUCT_INPUT_KEYS.find((key) => key === first)
}

function unexpected(message: string): StudioError {
  return new StudioError(0, "UNEXPECTED", message)
}

export function createAdminApi({ baseUrl, accessToken, onUnauthorized }: AdminApiOptions): AdminApi {
  const ended = () => {
    onUnauthorized()
    return new StudioError(401, "UNAUTHORIZED", "Unauthorized")
  }

  async function call(method: string, path: string, body?: unknown): Promise<{ status: number; data: unknown }> {
    const token = await accessToken()
    if (!token) throw ended()
    const headers: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${token}` }
    if (body !== undefined) headers["Content-Type"] = "application/json"
    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    } catch (error) {
      throw new StudioError(0, "NETWORK", error instanceof Error ? error.message : String(error))
    }
    if (response.status === 401) throw ended()
    if (response.status === 204) return { status: 204, data: undefined }
    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      if (!response.ok) throw new StudioError(response.status, "UNAVAILABLE", `${method} ${path}: ${response.status}`)
      throw unexpected(`${method} ${path}: the answer is not JSON`)
    }
    if (!response.ok) {
      const error = isObject(parsed) && isObject(parsed.error) ? parsed.error : {}
      const message = typeof error.message === "string" ? error.message : `${method} ${path}: ${response.status}`
      const code = KNOWN_CODES.find((known) => known === error.code) ?? "UNAVAILABLE"
      const field = code === "CONFLICT" ? "name" : code === "VALIDATION" ? fieldOf(message) : undefined
      throw new StudioError(response.status, code, message, field)
    }
    if (!isObject(parsed) || parsed.success !== true) throw unexpected(`${method} ${path}: success is not true`)
    return { status: response.status, data: parsed.data }
  }

  // The catalog readers throw plain errors; here they become UNEXPECTED.
  function read<T>(reader: (data: unknown) => T, data: unknown): T {
    try {
      return reader(data)
    } catch (error) {
      throw unexpected(error instanceof Error ? error.message : String(error))
    }
  }
  const piece = (data: unknown) => read(readAdminProduct, data)

  function slotOf(data: unknown): UploadSlot {
    const path = "POST …/photos/upload"
    if (!isObject(data)) throw unexpected(`${path}: data must be an object`)
    const { uploadId, url, fields } = data
    if (typeof uploadId !== "string" || uploadId === "") throw unexpected(`${path}: uploadId must be text`)
    if (typeof url !== "string" || !url.startsWith("https://")) throw unexpected(`${path}: url must be an https address`)
    if (!isObject(fields) || !Object.values(fields).every((value) => typeof value === "string")) {
      throw unexpected(`${path}: fields must be text values`)
    }
    return { uploadId, url, fields: fields as Record<string, string> }
  }

  return {
    async listProducts() {
      const { data } = await call("GET", "/admin/products")
      if (!Array.isArray(data)) throw unexpected("GET /admin/products: data must be a list")
      return data.map(piece)
    },
    async getProduct(id) {
      return piece((await call("GET", `/admin/products/${id}`)).data)
    },
    async createProduct(input) {
      const { status, data } = await call("POST", "/admin/products", pickInput(input))
      if (status !== 201) throw unexpected(`POST /admin/products answered ${status}, not 201`)
      return piece(data)
    },
    async updateProduct(id, changes) {
      return piece((await call("PATCH", `/admin/products/${id}`, pickInput(changes))).data)
    },
    async requestUpload(id) {
      return slotOf((await call("POST", `/admin/products/${id}/photos/upload`)).data)
    },
    async confirmUpload(id, uploadId) {
      const path = `/admin/products/${id}/photos`
      const { status, data } = await call("POST", path, { uploadId })
      if (status !== 201) throw unexpected(`POST ${path} answered ${status}, not 201`)
      return read(readAdminPhoto, data)
    },
    async reorderPhotos(id, imageIds) {
      return read(readAdminPhotos, (await call("PUT", `/admin/products/${id}/photos/order`, { imageIds })).data)
    },
    async deletePhoto(id, imageId) {
      await call("DELETE", `/admin/products/${id}/photos/${imageId}`)
    },
    async deleteProduct(id) {
      const path = `/admin/products/${id}`
      const { status } = await call("DELETE", path)
      if (status !== 204) throw unexpected(`DELETE ${path} answered ${status}, not 204`)
    },
    async publish() {
      const { status, data } = await call("POST", "/admin/publish")
      if (status !== 202 || !isObject(data) || data.started !== true) throw unexpected(`POST /admin/publish answered ${status} without started: true`)
    },
  }
}
