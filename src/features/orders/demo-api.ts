import { readDemoToken, type DemoCustomer } from "@/features/auth/mock-auth"
import type { ProductSummary } from "@/features/catalog/types"
import { MAX_PIECES } from "@/features/cart/cart"
import type { Order, OrderSummary, PlaceOrderInput } from "./types"

// Stand-in for the customers and orders routes for the demo accounts (tests, `npm run dev:demo`): the contract's
// shapes, rules, order of checks and messages, answered in this browser. Prices and stock come from the real
// GET /products; the real stock is never changed. Orders are kept in localStorage, per demo customer.

export const DEMO_ORDERS_KEY = "glowstone.demo-orders"
/** Set to a refusal code to have the next order refused with it (UNAVAILABLE, PRICE_CHANGED, ORDER_LIMIT, VALIDATION),
 * or the next call of any route (UNAUTHORIZED, FORBIDDEN). */
export const DEMO_REFUSE_KEY = "glowstone.demo-orders.refuse"

interface StoredOrder {
  customerId: string
  order: Order
}

interface Stored {
  orders: StoredOrder[]
}

interface DemoOptions {
  storage: Storage | null
  products: () => Promise<ProductSummary[]>
  now?: () => Date
}

class Refusal extends Error {
  readonly status: number
  readonly code: string
  readonly productId?: number

  constructor(status: number, code: string, message: string, productId?: number) {
    super(message)
    this.status = status
    this.code = code
    this.productId = productId
  }
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
// API Gateway's own answer to a missing or bad token: not the envelope.
const unauthorized = () => new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

// The API's words (POST /orders refusals and the 403).
const MESSAGES = {
  emptyCart: "Your cart is empty.",
  pieceTwice: "Each piece can only be in the order once.",
  recipientName: "Please enter the recipient's name (up to 100 characters).",
  phone: "Please enter a Lebanese number, like 71 234 567.",
  city: "Please enter the city (up to 100 characters).",
  address: "Please enter the address (up to 300 characters).",
  deliveryNotes: "Delivery notes can be up to 500 characters.",
  giftMessage: "The card message can be up to 200 characters.",
  giftOnly: "Card messages are only for gifts.",
  limit: "For larger orders, please contact Omar.",
  gone: "One piece in your cart is no longer available.",
  forbidden: "Your account isn't ready yet. Please sign out and sign in again.",
} as const
const LEBANESE_PHONE = /^\+961\d{7,8}$/

// The order as the API reads it: trimmed, "" (or only spaces) as null for the optional texts; the first broken rule,
// in the API's order of fields, refuses it.
function validate(input: PlaceOrderInput): PlaceOrderInput {
  const bad = (message: string): never => {
    throw new Refusal(400, "VALIDATION", message)
  }
  const required = (value: unknown, max: number, message: string) => {
    const text = typeof value === "string" ? value.trim() : bad(message)
    return text && text.length <= max ? text : bad(message)
  }
  const optional = (value: unknown, max: number, message: string) => {
    if (value === null || value === undefined) return null
    const text = typeof value === "string" ? value.trim() : bad(message)
    return text.length <= max ? text || null : bad(message)
  }
  if (!Array.isArray(input.items) || input.items.length === 0) bad(MESSAGES.emptyCart)
  if (new Set(input.items.map((item) => item.productId)).size !== input.items.length) bad(MESSAGES.pieceTwice)
  for (const item of input.items) if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) bad("Invalid quantity.")
  const recipient = input.recipient
    ? { name: required(input.recipient.name, 100, MESSAGES.recipientName), phone: LEBANESE_PHONE.test(input.recipient.phone) ? input.recipient.phone : bad(MESSAGES.phone) }
    : null
  const order: PlaceOrderInput = {
    items: input.items,
    recipient,
    city: required(input.city, 100, MESSAGES.city),
    address: required(input.address, 300, MESSAGES.address),
    deliveryNotes: optional(input.deliveryNotes, 500, MESSAGES.deliveryNotes),
    isGift: input.isGift,
    giftMessage: optional(input.giftMessage, 200, MESSAGES.giftMessage),
  }
  if (order.giftMessage !== null && !order.isGift) bad(MESSAGES.giftOnly)
  return order
}

export function createDemoFetch({ storage, products, now = () => new Date() }: DemoOptions): typeof fetch {
  const load = (): Stored => {
    try {
      const raw = storage?.getItem(DEMO_ORDERS_KEY)
      return raw ? (JSON.parse(raw) as Stored) : { orders: [] }
    } catch {
      return { orders: [] }
    }
  }
  const save = (stored: Stored) => {
    try {
      storage?.setItem(DEMO_ORDERS_KEY, JSON.stringify(stored))
    } catch {
      // Blocked storage: the demo order lasts for this answer only.
    }
  }
  const summary = (order: Order): OrderSummary => ({
    id: order.id,
    number: order.number,
    status: order.status,
    createdAt: order.createdAt,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: order.total,
    items: order.items.map(({ name, quantity }) => ({ name, quantity })),
    image: order.items[0]?.image ?? null,
  })

  async function place(customer: DemoCustomer, body: PlaceOrderInput): Promise<Order> {
    const forced = storage?.getItem(DEMO_REFUSE_KEY)
    if (forced) storage?.removeItem(DEMO_REFUSE_KEY)
    const input = validate(body)
    const listed = new Map((await products()).map((piece) => [piece.id, piece]))
    const first = input.items[0]
    const named = listed.get(first.productId)?.name ?? "This piece"
    if (forced === "UNAVAILABLE") throw new Refusal(409, "UNAVAILABLE", `${named} has only 1 left.`, first.productId)
    if (forced === "PRICE_CHANGED") throw new Refusal(409, "PRICE_CHANGED", `The price of ${named} has changed. Please check your cart.`, first.productId)
    if (forced === "ORDER_LIMIT") throw new Refusal(409, "ORDER_LIMIT", MESSAGES.limit)
    if (forced === "VALIDATION") throw new Refusal(400, "VALIDATION", MESSAGES.city)
    // The API's order: the 5-piece limit with the customer's pending orders, then each piece by productId.
    const stored = load()
    const pending = stored.orders.filter((o) => o.customerId === customer.id && o.order.status === "pending").map((o) => o.order)
    const pieces = (items: { quantity: number }[]) => items.reduce((sum, item) => sum + item.quantity, 0)
    if (pending.reduce((sum, o) => sum + pieces(o.items), 0) + pieces(input.items) > MAX_PIECES) {
      throw new Refusal(409, "ORDER_LIMIT", MESSAGES.limit)
    }
    const sorted = [...input.items].sort((a, b) => a.productId - b.productId)
    for (const item of sorted) {
      const piece = listed.get(item.productId)
      if (!piece) throw new Refusal(409, "UNAVAILABLE", MESSAGES.gone, item.productId)
      if (piece.remaining === 0) throw new Refusal(409, "UNAVAILABLE", `${piece.name} is sold out.`, item.productId)
      if (piece.remaining < item.quantity) throw new Refusal(409, "UNAVAILABLE", `${piece.name} has only ${piece.remaining} left.`, item.productId)
      if (piece.price !== item.unitPrice) throw new Refusal(409, "PRICE_CHANGED", `The price of ${piece.name} has changed. Please check your cart.`, item.productId)
    }
    const items = sorted.map((item) => {
      const piece = listed.get(item.productId)!
      return {
        productId: piece.id,
        name: piece.name,
        stoneType: piece.stoneType,
        color: piece.color,
        quantity: item.quantity,
        unitPrice: piece.price,
        lineTotal: piece.price * item.quantity,
        image: piece.images[0] ?? null,
      }
    })
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const id = stored.orders.reduce((top, o) => Math.max(top, o.order.id), 0) + 1
    const order: Order = {
      id,
      number: `GS-${String(id).padStart(4, "0")}`,
      status: "pending",
      createdAt: now().toISOString(),
      items,
      subtotal,
      deliveryFee: 0,
      total: subtotal,
      recipient: input.recipient
        ? { ...input.recipient, isAccountHolder: false }
        : { name: customer.name, phone: customer.phone, isAccountHolder: true },
      city: input.city,
      address: input.address,
      deliveryNotes: input.deliveryNotes,
      isGift: input.isGift,
      giftMessage: input.giftMessage,
      canCancel: true,
    }
    save({ orders: [...stored.orders, { customerId: customer.id, order }] })
    return order
  }

  function own(customer: DemoCustomer, id: number): Order {
    const found = load().orders.find((o) => o.order.id === id && o.customerId === customer.id)
    if (!found) throw new Refusal(404, "NOT_FOUND", "Order not found")
    return found.order
  }

  function cancel(customer: DemoCustomer, id: number): Order {
    const order = own(customer, id)
    if (order.status !== "pending") throw new Refusal(409, "CONFLICT", "This order can no longer be cancelled. Please contact Omar.")
    const cancelled: Order = { ...order, status: "cancelled", canCancel: false }
    const stored = load()
    save({ orders: stored.orders.map((o) => (o.order.id === id ? { ...o, order: cancelled } : o)) })
    return cancelled
  }

  return async (input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? "GET"
    const bearer = new Headers(init?.headers).get("Authorization")?.replace(/^Bearer /, "") ?? ""
    const customer = readDemoToken(bearer)
    if (!customer) return unauthorized()
    const forced = storage?.getItem(DEMO_REFUSE_KEY)
    if (forced === "UNAUTHORIZED" || forced === "FORBIDDEN") {
      storage?.removeItem(DEMO_REFUSE_KEY)
      if (forced === "UNAUTHORIZED") return unauthorized()
      return json(403, { success: false, error: { code: "FORBIDDEN", message: MESSAGES.forbidden } })
    }
    try {
      const path = url.pathname
      const orderId = /^\/me\/orders\/(\d+)(\/cancel)?$/.exec(path)
      let data: unknown
      let status = 200
      if (method === "GET" && path === "/me") data = { email: customer.email, name: customer.name, phone: customer.phone }
      else if (method === "POST" && path === "/orders") {
        data = await place(customer, JSON.parse(String(init?.body)) as PlaceOrderInput)
        status = 201
      } else if (method === "GET" && path === "/me/orders") {
        data = load()
          .orders.filter((o) => o.customerId === customer.id)
          .map((o) => o.order)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
          .map(summary)
      } else if (orderId && method === "GET" && !orderId[2]) data = own(customer, Number(orderId[1]))
      else if (orderId && method === "POST" && orderId[2]) data = cancel(customer, Number(orderId[1]))
      else throw new Refusal(404, "NOT_FOUND", "Not found.")
      return json(status, { success: true, data })
    } catch (error) {
      if (!(error instanceof Refusal)) throw error
      return json(error.status, { success: false, error: { code: error.code, message: error.message, ...(error.productId === undefined ? {} : { productId: error.productId }) } })
    }
  }
}
