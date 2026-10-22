import { lebanesePhone } from "@/features/auth/rules"
import { readDemoToken, type DemoCustomer } from "@/features/auth/mock-auth"
import type { ProductSummary } from "@/features/catalog/types"
import { MAX_PIECES } from "@/features/cart/cart"
import type { Order, OrderSummary, PlaceOrderInput } from "./types"

// Stand-in for the customers and orders routes while the customer pool isn't live (the demo accounts): the contract's
// shapes, rules and messages, answered in this browser. Prices and stock come from the real GET /products; the real
// stock is never changed. Orders are kept in localStorage, per demo customer.

export const DEMO_ORDERS_KEY = "glowstone.demo-orders"
/** Set to a refusal code (UNAVAILABLE, PRICE_CHANGED, ORDER_LIMIT, VALIDATION) to have the next order refused with it. */
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
const LIMITS = { city: 100, address: 300, deliveryNotes: 500, giftMessage: 200 } as const

function validate(input: PlaceOrderInput) {
  const bad = (message: string): never => {
    throw new Refusal(400, "VALIDATION", message)
  }
  if (!Array.isArray(input.items) || input.items.length === 0) bad("items must hold at least one piece")
  if (new Set(input.items.map((item) => item.productId)).size !== input.items.length) bad("each piece may appear only once")
  for (const item of input.items) if (!Number.isInteger(item.quantity) || item.quantity < 1) bad("quantity must be at least 1")
  for (const key of ["city", "address"] as const) {
    if (typeof input[key] !== "string" || !input[key].trim()) bad(`${key} is required`)
    if (input[key].length > LIMITS[key]) bad(`${key} must be at most ${LIMITS[key]} characters`)
  }
  if (input.deliveryNotes && input.deliveryNotes.length > LIMITS.deliveryNotes) bad(`deliveryNotes must be at most ${LIMITS.deliveryNotes} characters`)
  if (input.giftMessage && !input.isGift) bad("giftMessage is only allowed for a gift")
  if (input.giftMessage && input.giftMessage.length > LIMITS.giftMessage) bad(`giftMessage must be at most ${LIMITS.giftMessage} characters`)
  if (input.recipient) {
    if (!input.recipient.name?.trim()) bad("recipient name is required")
    if (!lebanesePhone(input.recipient.phone ?? "")) bad("Please enter a Lebanese number, like 71 234 567.")
  }
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
    image: order.items[0]?.image ?? null,
  })

  async function place(customer: DemoCustomer, input: PlaceOrderInput): Promise<Order> {
    const forced = storage?.getItem(DEMO_REFUSE_KEY)
    if (forced) storage?.removeItem(DEMO_REFUSE_KEY)
    validate(input)
    const listed = new Map((await products()).map((piece) => [piece.id, piece]))
    const first = input.items[0]
    const named = listed.get(first.productId)?.name ?? "This piece"
    if (forced === "UNAVAILABLE") throw new Refusal(409, "UNAVAILABLE", `${named} has only 1 left.`, first.productId)
    if (forced === "PRICE_CHANGED") throw new Refusal(409, "PRICE_CHANGED", `The price of ${named} has changed. Please check your cart.`, first.productId)
    if (forced === "ORDER_LIMIT") throw new Refusal(409, "ORDER_LIMIT", "For larger orders, please contact Omar.")
    if (forced === "VALIDATION") throw new Refusal(400, "VALIDATION", "city is required")
    for (const item of input.items) {
      const piece = listed.get(item.productId)
      if (!piece) throw new Refusal(409, "UNAVAILABLE", "This piece is no longer available.", item.productId)
      if (piece.remaining === 0) throw new Refusal(409, "UNAVAILABLE", `${piece.name} is sold out.`, item.productId)
      if (piece.remaining < item.quantity) throw new Refusal(409, "UNAVAILABLE", `${piece.name} has only ${piece.remaining} left.`, item.productId)
      if (piece.price !== item.unitPrice) throw new Refusal(409, "PRICE_CHANGED", `The price of ${piece.name} has changed. Please check your cart.`, item.productId)
    }
    const stored = load()
    const pending = stored.orders.filter((o) => o.customerId === customer.id && o.order.status === "pending").map((o) => o.order)
    const pieces = (items: { quantity: number }[]) => items.reduce((sum, item) => sum + item.quantity, 0)
    if (pending.reduce((sum, o) => sum + pieces(o.items), 0) + pieces(input.items) > MAX_PIECES) {
      throw new Refusal(409, "ORDER_LIMIT", "For larger orders, please contact Omar.")
    }
    const items = input.items.map((item) => {
      const piece = listed.get(item.productId)!
      return { productId: piece.id, name: piece.name, quantity: item.quantity, unitPrice: piece.price, lineTotal: piece.price * item.quantity, image: piece.images[0] ?? null }
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
        ? { name: input.recipient.name.trim(), phone: lebanesePhone(input.recipient.phone)!, isAccountHolder: false }
        : { name: customer.name, phone: customer.phone, isAccountHolder: true },
      city: input.city.trim(),
      address: input.address.trim(),
      deliveryNotes: input.deliveryNotes?.trim() || null,
      isGift: input.isGift,
      giftMessage: input.isGift ? input.giftMessage?.trim() || null : null,
      canCancel: true,
    }
    save({ orders: [...stored.orders, { customerId: customer.id, order }] })
    return order
  }

  function own(customer: DemoCustomer, id: number): Order {
    const found = load().orders.find((o) => o.order.id === id && o.customerId === customer.id)
    if (!found) throw new Refusal(404, "NOT_FOUND", "Order not found.")
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
    try {
      if (!customer) throw new Refusal(401, "UNAUTHORIZED", "Please sign in.")
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
