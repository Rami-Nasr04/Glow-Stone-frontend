import type { AdminCustomer, AdminOrder, AdminOrderLine, AdminOrderSummary, ForwardStatus, OrderStatus } from "./orders.ts"

// Stand-in for the admin orders and customers routes on `npm run dev:demo`: the backend's shapes, order of checks and
// words, answered in this browser from made-up orders (every person here is invented). The admin still signs in with
// the real admin pool, and every other route (products, photos, publish) goes to the real API. Nothing here changes
// real stock: cancelling a demo order only changes the demo.

export const STUDIO_DEMO_KEY = "glowstone.studio-demo"
/** Set to UNAUTHORIZED to have the next orders or customers call answered with a 401, once. */
export const STUDIO_DEMO_REFUSE_KEY = "glowstone.studio-demo.refuse"

/** The demo answers only on the dev server started with `npm run dev:demo` (Vite's mode "demo"); never in a build. */
export function studioDemoOn({ dev, mode }: { dev: boolean; mode: string }): boolean {
  return dev && mode === "demo"
}

// The backend's words (admin order service and schemas).
export const DEMO_MESSAGES = {
  orderNotFound: "Order not found",
  customerNotFound: "Customer not found",
  wasCancelled: "This order was cancelled.",
  deliveredNoCancel: "A delivered order can't be cancelled.",
  alreadyCancelled: "This order is already cancelled.",
  feeOnlyPending: "The delivery fee can only change before the order is confirmed.",
  badStep: "Choose confirmed, out for delivery or delivered.",
  badFee: "The delivery fee must be between 0 and 10,000, with at most 2 decimals.",
} as const

const FLOW: readonly OrderStatus[] = ["pending", "confirmed", "out_for_delivery", "delivered"]
const NEXT: Record<OrderStatus, ForwardStatus | null> = {
  pending: "confirmed",
  confirmed: "out_for_delivery",
  out_for_delivery: "delivered",
  delivered: null,
  cancelled: null,
}
const LABEL: Record<ForwardStatus, string> = { confirmed: "confirmed", out_for_delivery: "out for delivery", delivered: "delivered" }
const DO_FIRST: Record<ForwardStatus, string> = {
  confirmed: "Confirm the order first.",
  out_for_delivery: "Send the order out for delivery first.",
  delivered: "Mark the order delivered first.",
}
const CUSTOMER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface DemoCustomer {
  id: string
  email: string
  name: string
  phone: string
  createdAt: string
}

/** What the demo keeps per order; everything else is worked out on each answer, as the backend does. */
interface DemoOrder {
  id: number
  status: OrderStatus
  createdAt: string
  customerId: string
  items: Omit<AdminOrderLine, "lineTotal">[]
  deliveryFee: number
  recipient: AdminOrder["recipient"]
  city: string
  address: string
  deliveryNotes: string | null
  isGift: boolean
  giftMessage: string | null
}

interface Store {
  customers: DemoCustomer[]
  orders: DemoOrder[]
}

const SARA = "1b5c7a2e-4d3f-4a1b-9c8d-2e6f0a1b3c4d"
const KARIM = "2c6d8b3f-5e4a-4b2c-8d9e-3f7a1b2c4d5e"
const MAYA = "3d7e9c4a-6f5b-4c3d-9e0f-4a8b2c3d5e6f"
const ELIE = "4e8f0d5b-7a6c-4d4e-8f1a-5b9c3d4e6f7a"

const piece = (productId: number, name: string, color: string, unitPrice: number, quantity = 1) => ({
  productId,
  name,
  stoneType: "Limestone",
  color,
  quantity,
  unitPrice,
  image: null,
})

function seed(): Store {
  const customers: DemoCustomer[] = [
    { id: ELIE, email: "elie@example.com", name: "Elie Mansour", phone: "+9613123456", createdAt: "2026-10-20T09:15:00Z" },
    { id: MAYA, email: "maya@example.com", name: "Maya Haddad", phone: "+96181222333", createdAt: "2026-10-16T17:40:00Z" },
    { id: KARIM, email: "karim@example.com", name: "Karim Nassar", phone: "+96176543210", createdAt: "2026-10-14T11:05:00Z" },
    { id: SARA, email: "sara@example.com", name: "Sara Khoury", phone: "+96171234567", createdAt: "2026-10-12T08:30:00Z" },
  ]
  const self = (id: string) => {
    const found = customers.find((customer) => customer.id === id)!
    return { name: found.name, phone: found.phone, isAccountHolder: true }
  }
  const order = (id: number, status: OrderStatus, createdAt: string, customerId: string, rest: Partial<DemoOrder> & Pick<DemoOrder, "items">) => ({
    id,
    status,
    createdAt,
    customerId,
    deliveryFee: 0,
    recipient: self(customerId),
    city: "Jounieh",
    address: "Main road, Haddad bldg, 3rd floor",
    deliveryNotes: null,
    isGift: false,
    giftMessage: null,
    ...rest,
  })
  const orders: DemoOrder[] = [
    order(8, "pending", "2026-10-24T07:40:00Z", SARA, {
      items: [piece(2, "Arz", "Cream", 290), piece(5, "Qadisha", "Sand", 890, 2)],
      deliveryNotes: "Call before coming; the building has no lift.",
    }),
    order(7, "pending", "2026-10-23T18:12:00Z", KARIM, {
      items: [piece(6, "Sannine", "Ivory", 560)],
      isGift: true,
      giftMessage: "Happy birthday, Rima. Open it with your favourite bottle.",
      recipient: { name: "Rima Saad", phone: "+96170111222", isAccountHolder: false },
      city: "Batroun",
      address: "Old souk, the blue door after the bakery",
    }),
    order(6, "pending", "2026-10-22T10:05:00Z", MAYA, {
      items: [piece(3, "Batroun", "Honey", 1120)],
      isGift: true,
      recipient: { name: "Nadim Haddad", phone: "+9613998877", isAccountHolder: false },
      city: "Zahle",
      address: "Boulevard, Massabki bldg, 5th floor",
      deliveryFee: 12.5,
    }),
    order(5, "confirmed", "2026-10-20T13:30:00Z", ELIE, { items: [piece(4, "Nahr", "Grey", 640)], city: "Byblos", address: "Port road, Abi Saab bldg", deliveryFee: 10 }),
    order(4, "out_for_delivery", "2026-10-18T09:00:00Z", SARA, { items: [piece(3, "Batroun", "Honey", 1120)] }),
    order(3, "delivered", "2026-10-15T16:45:00Z", KARIM, { items: [piece(4, "Nahr", "Grey", 640, 2)], city: "Beirut", address: "Gemmayze, Pasteur street, 2nd floor" }),
    order(2, "cancelled", "2026-10-14T12:20:00Z", MAYA, { items: [piece(2, "Arz", "Cream", 290)], city: "Zahle", address: "Boulevard, Massabki bldg, 5th floor" }),
    order(1, "delivered", "2026-10-13T08:10:00Z", SARA, { items: [piece(5, "Qadisha", "Sand", 890)] }),
  ]
  return { customers, orders }
}

const cents = (amount: number) => Math.round(amount * 100)

function lines(order: DemoOrder): AdminOrderLine[] {
  return [...order.items].sort((a, b) => a.productId - b.productId).map((line) => ({ ...line, lineTotal: (cents(line.unitPrice) * line.quantity) / 100 }))
}

function subtotalOf(order: DemoOrder): number {
  return lines(order).reduce((sum, line) => sum + cents(line.lineTotal), 0) / 100
}

const numberOf = (id: number) => `GS-${String(id).padStart(4, "0")}`

function summaryOf(order: DemoOrder, store: Store): AdminOrderSummary {
  const customer = store.customers.find((c) => c.id === order.customerId)!
  return {
    id: order.id,
    number: numberOf(order.id),
    status: order.status,
    createdAt: order.createdAt,
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
    city: order.city,
    itemCount: order.items.reduce((sum, line) => sum + line.quantity, 0),
    total: (cents(subtotalOf(order)) + cents(order.deliveryFee)) / 100,
    isGift: order.isGift,
  }
}

function fullOf(order: DemoOrder, store: Store): AdminOrder {
  const customer = store.customers.find((c) => c.id === order.customerId)!
  const subtotal = subtotalOf(order)
  return {
    id: order.id,
    number: numberOf(order.id),
    status: order.status,
    createdAt: order.createdAt,
    items: lines(order),
    subtotal,
    deliveryFee: order.deliveryFee,
    total: (cents(subtotal) + cents(order.deliveryFee)) / 100,
    recipient: order.recipient,
    city: order.city,
    address: order.address,
    deliveryNotes: order.deliveryNotes,
    isGift: order.isGift,
    giftMessage: order.giftMessage,
    canCancel: order.status !== "delivered" && order.status !== "cancelled",
    customer: { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone },
    nextStatus: NEXT[order.status],
    canEditFee: order.status === "pending",
  }
}

const newestFirst = (a: DemoOrder, b: DemoOrder) => Date.parse(b.createdAt) - Date.parse(a.createdAt)

class Refusal extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
const ok = (data: unknown) => json(200, { success: true, data })
// API Gateway's own answer to a missing or bad token: not the envelope.
const unauthorized = () => json(401, { message: "Unauthorized" })

interface DemoOptions {
  storage: Storage | null
  /** Every route that isn't an order or customer route. */
  real: typeof fetch
}

const ROUTE = /\/admin\/(orders|customers)(?:\/([^/?]+))?(?:\/(status|cancel))?\/?(?:\?.*)?$/

export function createStudioDemoFetch({ storage, real }: DemoOptions): typeof fetch {
  let memory: Store | null = null
  const load = (): Store => {
    const saved = storage?.getItem(STUDIO_DEMO_KEY)
    if (saved) {
      try {
        return JSON.parse(saved) as Store
      } catch {
        // A broken store starts again from the seed.
      }
    }
    if (!storage && memory) return memory
    const fresh = seed()
    save(fresh)
    return fresh
  }
  const save = (store: Store) => {
    memory = store
    storage?.setItem(STUDIO_DEMO_KEY, JSON.stringify(store))
  }

  // A path id that can't be an order is a 404 before the body is looked at, as on the backend.
  function idFrom(raw: string | undefined): number {
    const id = raw !== undefined && /^\d{1,9}$/.test(raw) ? Number(raw) : 0
    if (id < 1) throw new Refusal(404, "NOT_FOUND", DEMO_MESSAGES.orderNotFound)
    return id
  }

  function orderAt(store: Store, raw: string | undefined): DemoOrder {
    const id = idFrom(raw)
    const found = store.orders.find((order) => order.id === id)
    if (!found) throw new Refusal(404, "NOT_FOUND", DEMO_MESSAGES.orderNotFound)
    return found
  }

  function step(store: Store, raw: string | undefined, body: unknown): AdminOrder {
    idFrom(raw)
    if (!isOnly(body, "status")) throw new Refusal(400, "VALIDATION", DEMO_MESSAGES.badStep)
    const wanted = (body as { status: unknown }).status
    if (wanted !== "confirmed" && wanted !== "out_for_delivery" && wanted !== "delivered") throw new Refusal(400, "VALIDATION", DEMO_MESSAGES.badStep)
    const order = orderAt(store, raw)
    if (order.status === "cancelled") throw new Refusal(409, "CONFLICT", DEMO_MESSAGES.wasCancelled)
    const next = NEXT[order.status]
    if (next !== wanted) {
      if (FLOW.indexOf(order.status) >= FLOW.indexOf(wanted)) throw new Refusal(409, "CONFLICT", `This order is already ${LABEL[wanted]}.`)
      throw new Refusal(409, "CONFLICT", DO_FIRST[next!])
    }
    order.status = wanted
    save(store)
    return fullOf(order, store)
  }

  function cancel(store: Store, raw: string | undefined): AdminOrder {
    const order = orderAt(store, raw)
    if (order.status === "delivered") throw new Refusal(409, "CONFLICT", DEMO_MESSAGES.deliveredNoCancel)
    if (order.status === "cancelled") throw new Refusal(409, "CONFLICT", DEMO_MESSAGES.alreadyCancelled)
    order.status = "cancelled"
    save(store)
    return fullOf(order, store)
  }

  function fee(store: Store, raw: string | undefined, body: unknown): AdminOrder {
    idFrom(raw)
    const amount = isOnly(body, "deliveryFee") ? (body as { deliveryFee: unknown }).deliveryFee : null
    const good = typeof amount === "number" && amount >= 0 && amount <= 10_000 && Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6
    if (!good) throw new Refusal(400, "VALIDATION", DEMO_MESSAGES.badFee)
    const order = orderAt(store, raw)
    if (order.status !== "pending") throw new Refusal(409, "CONFLICT", DEMO_MESSAGES.feeOnlyPending)
    order.deliveryFee = amount
    save(store)
    return fullOf(order, store)
  }

  function customerList(store: Store): AdminCustomer[] {
    return [...store.customers]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((c) => ({ ...c, orderCount: store.orders.filter((order) => order.customerId === c.id).length }))
  }

  function customer(store: Store, raw: string | undefined) {
    const id = raw === undefined ? "" : decodeURIComponent(raw)
    const found = CUSTOMER_ID.test(id) ? store.customers.find((c) => c.id === id) : undefined
    if (!found) throw new Refusal(404, "NOT_FOUND", DEMO_MESSAGES.customerNotFound)
    const orders = store.orders.filter((order) => order.customerId === found.id).sort(newestFirst)
    return { ...found, orders: orders.map((order) => summaryOf(order, store)) }
  }

  return async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    const match = ROUTE.exec(new URL(url).pathname)
    if (!match) return real(input, init)
    const headers = new Headers(init?.headers)
    if (!headers.get("Authorization")?.startsWith("Bearer ")) return unauthorized()
    if (storage?.getItem(STUDIO_DEMO_REFUSE_KEY) === "UNAUTHORIZED") {
      storage.removeItem(STUDIO_DEMO_REFUSE_KEY)
      return unauthorized()
    }
    const method = (init?.method ?? "GET").toUpperCase()
    const [, collection, id, action] = match
    let body: unknown = null
    try {
      body = typeof init?.body === "string" ? JSON.parse(init.body) : null
    } catch {
      body = null
    }
    try {
      const store = load()
      if (collection === "orders") {
        if (method === "GET" && id === undefined) return ok([...store.orders].sort(newestFirst).map((order) => summaryOf(order, store)))
        if (method === "GET" && action === undefined) return ok(fullOf(orderAt(store, id), store))
        if (method === "POST" && action === "status") return ok(step(store, id, body))
        if (method === "POST" && action === "cancel") return ok(cancel(store, id))
        if (method === "PATCH" && action === undefined && id !== undefined) return ok(fee(store, id, body))
      } else if (action === undefined && method === "GET") {
        return ok(id === undefined ? customerList(store) : customer(store, id))
      }
      throw new Refusal(404, "NOT_FOUND", "Not found")
    } catch (error) {
      if (error instanceof Refusal) return json(error.status, { success: false, error: { code: error.code, message: error.message } })
      throw error
    }
  }
}

// The backend's schemas are strict: the one expected key and nothing else.
function isOnly(body: unknown, key: string): boolean {
  return typeof body === "object" && body !== null && !Array.isArray(body) && Object.keys(body).length === 1 && key in body
}
