import type { ProductImage } from "@/features/catalog/types"
import { type Me, type Order, OrderError, type OrderItem, type OrdersClient, ORDER_STATUSES, type OrderStatus, type OrderSummary } from "./types"

// The customers and orders routes, exactly as the contract shows them. Every answer is read field by field: a shape
// that doesn't match is an INVALID_ANSWER, never half an order on screen. Refusals keep the API's own message.

type Json = Record<string, unknown>

class Unreadable extends Error {}

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value)

function fail(what: string): never {
  throw new Unreadable(what)
}

const text = (row: Json, key: string) => (typeof row[key] === "string" ? (row[key] as string) : fail(key))
const textOrNull = (row: Json, key: string) => (row[key] === null || row[key] === undefined ? null : text(row, key))
const money = (row: Json, key: string) => (typeof row[key] === "number" && Number.isFinite(row[key]) && (row[key] as number) >= 0 ? (row[key] as number) : fail(key))
const count = (row: Json, key: string) => (Number.isInteger(row[key]) && (row[key] as number) >= 0 ? (row[key] as number) : fail(key))
const flag = (row: Json, key: string) => (typeof row[key] === "boolean" ? (row[key] as boolean) : fail(key))

function status(row: Json): OrderStatus {
  const value = row.status
  return ORDER_STATUSES.find((s) => s === value) ?? fail("status")
}

function photo(value: unknown): ProductImage | null {
  if (value === null || value === undefined) return null
  if (!isObject(value)) fail("image")
  return { url: text(value, "url"), width: count(value, "width"), height: count(value, "height") }
}

function readMe(value: unknown): Me {
  if (!isObject(value)) fail("me")
  return { email: text(value, "email"), name: text(value, "name"), phone: text(value, "phone") }
}

function readSummary(value: unknown): OrderSummary {
  if (!isObject(value)) fail("order")
  return {
    id: count(value, "id"),
    number: text(value, "number"),
    status: status(value),
    createdAt: text(value, "createdAt"),
    itemCount: count(value, "itemCount"),
    total: money(value, "total"),
    image: photo(value.image),
  }
}

function readItem(value: unknown): OrderItem {
  if (!isObject(value)) fail("item")
  return {
    productId: count(value, "productId"),
    name: text(value, "name"),
    quantity: count(value, "quantity"),
    unitPrice: money(value, "unitPrice"),
    lineTotal: money(value, "lineTotal"),
    image: photo(value.image),
  }
}

function readOrder(value: unknown): Order {
  if (!isObject(value)) fail("order")
  if (!Array.isArray(value.items)) fail("items")
  const recipient = isObject(value.recipient) ? value.recipient : fail("recipient")
  return {
    id: count(value, "id"),
    number: text(value, "number"),
    status: status(value),
    createdAt: text(value, "createdAt"),
    items: value.items.map(readItem),
    subtotal: money(value, "subtotal"),
    deliveryFee: money(value, "deliveryFee"),
    total: money(value, "total"),
    recipient: { name: text(recipient, "name"), phone: text(recipient, "phone"), isAccountHolder: flag(recipient, "isAccountHolder") },
    city: text(value, "city"),
    address: text(value, "address"),
    deliveryNotes: textOrNull(value, "deliveryNotes"),
    isGift: flag(value, "isGift"),
    giftMessage: textOrNull(value, "giftMessage"),
    canCancel: flag(value, "canCancel"),
  }
}

/** The routes over `fetchImpl` (the browser's fetch, or the demo API while the customer pool isn't live). */
export function createHttpOrders(base: string, token: () => Promise<string>, fetchImpl: typeof fetch = (...args) => fetch(...args)): OrdersClient {
  // The envelope's data; a refusal becomes an OrderError with the API's code and message.
  async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<{ status: number; data: unknown }> {
    let bearer: string
    try {
      bearer = await token()
    } catch {
      throw new OrderError(401, "UNAUTHORIZED", "Please sign in again.")
    }
    const headers: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${bearer}` }
    if (body !== undefined) headers["Content-Type"] = "application/json"
    let response: Response
    try {
      response = await fetchImpl(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    } catch {
      throw new OrderError(0, "NETWORK", "No answer from the server.")
    }
    const json: unknown = await response.json().catch(() => null)
    if (!isObject(json)) throw new OrderError(response.status, "INVALID_ANSWER", `${method} ${path}: ${response.status}`)
    if (response.ok && json.success === true) return { status: response.status, data: json.data }
    const error = isObject(json.error) ? json.error : {}
    if (typeof error.code !== "string" || typeof error.message !== "string") throw new OrderError(response.status, "INVALID_ANSWER", `${method} ${path}: ${response.status}`)
    const productId = Number.isInteger(error.productId) ? (error.productId as number) : null
    throw new OrderError(response.status, error.code, error.message, productId)
  }

  async function read<T>(method: "GET" | "POST", path: string, reader: (data: unknown) => T, body?: unknown): Promise<T> {
    const { status, data } = await call(method, path, body)
    try {
      return reader(data)
    } catch (error) {
      if (error instanceof Unreadable) throw new OrderError(status, "INVALID_ANSWER", `${method} ${path}: ${error.message}`)
      throw error
    }
  }

  return {
    me: () => read("GET", "/me", readMe),
    place: (input) => read("POST", "/orders", readOrder, input),
    list: () => read("GET", "/me/orders", (data) => (Array.isArray(data) ? data.map(readSummary) : fail("list"))),
    async get(id) {
      try {
        return await read("GET", `/me/orders/${id}`, readOrder)
      } catch (error) {
        if (error instanceof OrderError && error.status === 404) return null
        throw error
      }
    },
    cancel: (id) => read("POST", `/me/orders/${id}/cancel`, readOrder),
  }
}

