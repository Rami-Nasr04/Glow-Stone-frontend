// The studio's calls to the admin products API (GET/POST /admin/products, GET/PATCH /admin/products/{id}), with the
// admin's access token. Answers are read through the envelope; a 401 is judged by its status alone, because API
// Gateway answers it with its own {"message":"Unauthorized"}.
import { readAdminProduct } from "@/features/catalog/api"
import type { AdminProduct, ProductInput } from "@/features/catalog/types"

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

export type StudioErrorCode = "VALIDATION" | "CONFLICT" | "NOT_FOUND" | "UNAUTHORIZED" | "NETWORK" | "UNAVAILABLE" | "UNEXPECTED"

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

export interface AdminApi {
  listProducts(): Promise<AdminProduct[]>
  getProduct(id: number): Promise<AdminProduct>
  createProduct(input: ProductInput): Promise<AdminProduct>
  updateProduct(id: number, changes: Partial<ProductInput>): Promise<AdminProduct>
}

interface AdminApiOptions {
  baseUrl: string
  /** The current access token (refreshed when needed), or null when there is no session. */
  accessToken: () => Promise<string | null>
  /** Called on any 401, before the error is thrown: the session is over. */
  onUnauthorized: () => void
}

const KNOWN_CODES: readonly StudioErrorCode[] = ["VALIDATION", "CONFLICT", "NOT_FOUND"]

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

  function piece(data: unknown): AdminProduct {
    try {
      return readAdminProduct(data)
    } catch (error) {
      throw unexpected(error instanceof Error ? error.message : String(error))
    }
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
  }
}
