// GET /products and GET /products/{id}, as agreed with the backend. Every answer is checked
// field by field: during the build a bad answer throws and the build stops, so the site never goes out with an empty
// or half-read catalog. Also loaded by the build config in Node (react-router.config.ts), so no "@/" imports here.
import type { Product, ProductImage, ProductSummary } from "./types.ts"

type Json = Record<string, unknown>

class Invalid extends Error {}

function fail(message: string): never {
  throw new Invalid(message)
}

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value)
const isWhole = (value: unknown): value is number => Number.isInteger(value)

function text(row: Json, key: string): string {
  const value = row[key]
  return typeof value === "string" && value.trim() !== "" ? value : fail(`${key} must be text`)
}

function textOrNull(row: Json, key: string): string | null {
  const value = row[key]
  return value === null || typeof value === "string" ? value : fail(`${key} must be text or null`)
}

function number(row: Json, key: string): number {
  const value = row[key]
  return typeof value === "number" && Number.isFinite(value) ? value : fail(`${key} must be a number`)
}

function numberOrNull(row: Json, key: string): number | null {
  const value = row[key]
  return value === null || (typeof value === "number" && Number.isFinite(value)) ? value : fail(`${key} must be a number or null`)
}

function whole(row: Json, key: string): number {
  const value = row[key]
  return isWhole(value) && value >= 0 ? value : fail(`${key} must be a whole number`)
}

function positive(row: Json, key: string, label = key): number {
  const value = row[key]
  return isWhole(value) && value > 0 ? value : fail(`${label} must be a positive whole number`)
}

function flag(row: Json, key: string): boolean {
  const value = row[key]
  return typeof value === "boolean" ? value : fail(`${key} must be true or false`)
}

function image(value: unknown, i: number): ProductImage {
  const label = `images[${i}]`
  if (!isObject(value)) fail(`${label} must be an object`)
  const url = value.url
  if (typeof url !== "string" || !/^https:\/\/[^\s/]+\/\S+$/.test(url)) fail(`${label}.url must be an https address`)
  return { url, width: positive(value, "width", `${label}.width`), height: positive(value, "height", `${label}.height`) }
}

function summary(value: unknown): ProductSummary {
  if (!isObject(value)) fail("must be an object")
  const createdAt = text(value, "createdAt")
  if (Number.isNaN(Date.parse(createdAt))) fail("createdAt must be a date")
  const remaining = whole(value, "remaining")
  const soldOut = flag(value, "soldOut")
  if (soldOut !== (remaining === 0)) fail("soldOut must equal remaining === 0")
  if (!Array.isArray(value.images)) fail("images must be a list")
  return {
    id: positive(value, "id"),
    name: text(value, "name"),
    stoneType: text(value, "stoneType"),
    color: text(value, "color"),
    price: number(value, "price"),
    bottles: whole(value, "bottles"),
    heightCm: numberOrNull(value, "heightCm"),
    widthCm: numberOrNull(value, "widthCm"),
    depthCm: numberOrNull(value, "depthCm"),
    weightKg: numberOrNull(value, "weightKg"),
    editionSize: whole(value, "editionSize"),
    remaining,
    soldOut,
    featured: flag(value, "featured"),
    summary: textOrNull(value, "summary"),
    createdAt,
    images: value.images.map(image),
  }
}

function product(value: unknown): Product {
  const piece = summary(value)
  return { ...piece, story: textOrNull(value as Json, "story") }
}

function idOf(value: unknown): string {
  return isObject(value) && (typeof value.id === "number" || typeof value.id === "string") ? ` (id ${value.id})` : ""
}

/** The API's base address from VITE_API_URL, without a trailing slash. */
export function requireApiUrl(value: string | undefined): string {
  const url = value?.trim().replace(/\/+$/, "")
  if (!url) throw new Error("VITE_API_URL is not set (see .env.example).")
  if (!/^https?:\/\/\S+$/.test(url)) throw new Error("VITE_API_URL must be an http(s) address.")
  return url
}

// The envelope's data, or null for a 404 when `missingIsNull`. Anything else that isn't a good answer throws.
async function get(base: string, path: string, missingIsNull: boolean, signal?: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${requireApiUrl(base)}${path}`, { headers: { Accept: "application/json" }, signal })
  } catch (error) {
    throw new Error(`GET ${path}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
  if (response.status === 404 && missingIsNull) return null
  let body: unknown
  try {
    body = await response.json()
  } catch {
    if (!response.ok) throw new Error(`GET ${path}: ${response.status}`)
    throw new Error(`GET ${path}: the answer is not JSON`)
  }
  if (!response.ok) {
    const error = isObject(body) && isObject(body.error) ? body.error : {}
    throw new Error(`GET ${path}: ${[response.status, error.code, error.message].filter(Boolean).join(" ")}`)
  }
  if (!isObject(body) || body.success !== true) throw new Error(`GET ${path}: success is not true`)
  return body.data
}

function checked<T>(path: string, read: () => T): T {
  try {
    return read()
  } catch (error) {
    if (error instanceof Invalid) throw new Error(`GET ${path}: ${error.message}`)
    throw error
  }
}

/** GET /products: every published piece, newest first, each with its first 2 photos. */
export async function fetchProducts(base: string, signal?: AbortSignal): Promise<ProductSummary[]> {
  const path = "/products"
  const data = await get(base, path, false, signal)
  return checked(path, () => {
    if (!Array.isArray(data)) fail("data must be a list")
    if (data.length === 0) fail("no published products")
    const seen = new Set<number>()
    return data.map((row, i) => {
      let piece: ProductSummary
      try {
        piece = summary(row)
      } catch (error) {
        if (error instanceof Invalid) fail(`product ${i + 1}${idOf(row)}: ${error.message}`)
        throw error
      }
      if (seen.has(piece.id)) fail(`id ${piece.id} appears twice`)
      seen.add(piece.id)
      return piece
    })
  })
}

/** GET /products/{id}: one published piece with all its photos, or null when it is unknown or a draft. */
export async function fetchProduct(base: string, id: number, signal?: AbortSignal): Promise<Product | null> {
  const path = `/products/${id}`
  const data = await get(base, path, true, signal)
  if (data === null) return null
  return checked(path, () => {
    const piece = product(data)
    if (piece.id !== id) fail(`answered with id ${piece.id}`)
    return piece
  })
}
