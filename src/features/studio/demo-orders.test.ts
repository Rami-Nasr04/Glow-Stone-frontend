import { createAdminApi, type AdminApi, StudioError } from "./admin-api"
import { createStudioDemoFetch, STUDIO_DEMO_KEY, STUDIO_DEMO_REFUSE_KEY, studioDemoOn } from "./demo-orders"

const BASE = "https://api.test"

function setup(storage: Storage = window.localStorage) {
  const real = vi.fn(async () => new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }))
  const onUnauthorized = vi.fn()
  const api = createAdminApi({ baseUrl: BASE, accessToken: async () => "access-1", onUnauthorized, fetch: createStudioDemoFetch({ storage, real }) })
  return { api, real, onUnauthorized }
}

async function caught(promise: Promise<unknown>): Promise<StudioError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof StudioError) return error
    throw error
  }
  throw new Error("expected a StudioError")
}

async function firstWith(api: AdminApi, status: string) {
  const row = (await api.listOrders()).find((order) => order.status === status)
  if (!row) throw new Error(`no ${status} order in the demo`)
  return row
}

beforeEach(() => window.localStorage.clear())

describe("the studio's demo orders (npm run dev:demo)", () => {
  it("starts with made-up orders in every status, newest first, and keeps them in this browser", async () => {
    const { api } = setup()
    const orders = await api.listOrders()
    expect(new Set(orders.map((order) => order.status))).toEqual(new Set(["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"]))
    const times = orders.map((order) => Date.parse(order.createdAt))
    expect(times).toEqual([...times].sort((a, b) => b - a))
    expect(orders.some((order) => order.isGift)).toBe(true)
    expect(window.localStorage.getItem(STUDIO_DEMO_KEY)).not.toBeNull()
  })

  it("answers one order with the admin's fields worked out from its status", async () => {
    const { api } = setup()
    const pending = await api.getOrder((await firstWith(api, "pending")).id)
    expect(pending).toMatchObject({ nextStatus: "confirmed", canCancel: true, canEditFee: true })
    const delivered = await api.getOrder((await firstWith(api, "delivered")).id)
    expect(delivered).toMatchObject({ nextStatus: null, canCancel: false, canEditFee: false })
    expect(delivered.total).toBe(delivered.subtotal + delivered.deliveryFee)
  })

  it("has a gift for someone else among its orders", async () => {
    const { api } = setup()
    const rows = (await api.listOrders()).filter((row) => row.isGift)
    const gifts = await Promise.all(rows.map((row) => api.getOrder(row.id)))
    expect(gifts.some((gift) => !gift.recipient.isAccountHolder && gift.giftMessage)).toBe(true)
  })

  it("moves an order one step at a time, as the backend does", async () => {
    const { api } = setup()
    const { id } = await firstWith(api, "pending")
    expect(await api.advanceOrder(id, "confirmed")).toMatchObject({ status: "confirmed", nextStatus: "out_for_delivery", canEditFee: false })
    expect((await api.listOrders()).find((row) => row.id === id)?.status).toBe("confirmed")
  })

  it.each([
    ["pending", "out_for_delivery", "Confirm the order first."],
    ["pending", "delivered", "Confirm the order first."],
    ["confirmed", "delivered", "Send the order out for delivery first."],
    ["confirmed", "confirmed", "This order is already confirmed."],
    ["delivered", "out_for_delivery", "This order is already out for delivery."],
    ["delivered", "delivered", "This order is already delivered."],
    ["cancelled", "confirmed", "This order was cancelled."],
  ] as const)("refuses a %s order going to %s: 409 %j", async (from, to, message) => {
    const { api } = setup()
    const { id } = await firstWith(api, from)
    expect(await caught(api.advanceOrder(id, to))).toMatchObject({ status: 409, code: "CONFLICT", message })
  })

  it("cancels any order before delivery, and refuses the rest in the backend's words", async () => {
    const { api } = setup()
    const { id } = await firstWith(api, "out_for_delivery")
    expect(await api.cancelOrder(id)).toMatchObject({ status: "cancelled", nextStatus: null, canCancel: false })
    expect(await caught(api.cancelOrder(id))).toMatchObject({ status: 409, message: "This order is already cancelled." })
    const delivered = await firstWith(api, "delivered")
    expect(await caught(api.cancelOrder(delivered.id))).toMatchObject({ status: 409, message: "A delivered order can't be cancelled." })
  })

  it("changes the fee of a pending order and works the total out again, to the cent", async () => {
    const { api } = setup()
    const { id } = await firstWith(api, "pending")
    const order = await api.setDeliveryFee(id, 15.5)
    expect(order.deliveryFee).toBe(15.5)
    expect(order.total).toBe(Math.round((order.subtotal + 15.5) * 100) / 100)
  })

  it("refuses the fee once the order is confirmed, and a bad amount before anything else", async () => {
    const { api } = setup()
    const confirmed = await firstWith(api, "confirmed")
    expect(await caught(api.setDeliveryFee(confirmed.id, 10))).toMatchObject({
      status: 409,
      message: "The delivery fee can only change before the order is confirmed.",
    })
    const bad = "The delivery fee must be between 0 and 10,000, with at most 2 decimals."
    for (const fee of [-1, 10_000.01, 1.005]) {
      expect(await caught(api.setDeliveryFee(confirmed.id, fee))).toMatchObject({ status: 400, code: "VALIDATION", message: bad })
    }
  })

  it("says Order not found for an id that doesn't exist or isn't a number", async () => {
    const { api } = setup()
    expect(await caught(api.getOrder(999))).toMatchObject({ status: 404, code: "NOT_FOUND", message: "Order not found" })
    expect(await caught(api.getOrder(Number.NaN))).toMatchObject({ status: 404, message: "Order not found" })
  })

  it("lists the customers with their order counts and answers one with their orders", async () => {
    const { api } = setup()
    const customers = await api.listCustomers()
    const orders = await api.listOrders()
    for (const customer of customers) {
      expect(customer.orderCount).toBe(orders.filter((order) => order.customer.id === customer.id).length)
    }
    const detail = await api.getCustomer(customers[0].id)
    expect(detail.orders.every((order) => order.customer.id === customers[0].id)).toBe(true)
    expect(await caught(api.getCustomer("not-a-uuid"))).toMatchObject({ status: 404, message: "Customer not found" })
  })

  it("sees what another tab changed, because every call reads the store again", async () => {
    const first = setup()
    const second = setup()
    const { id } = await firstWith(first.api, "pending")
    await first.api.advanceOrder(id, "confirmed")
    expect(await caught(second.api.advanceOrder(id, "confirmed"))).toMatchObject({ message: "This order is already confirmed." })
  })

  it("answers the next call with a 401 once, when asked, to show the sign-in path", async () => {
    const { api, onUnauthorized } = setup()
    window.localStorage.setItem(STUDIO_DEMO_REFUSE_KEY, "UNAUTHORIZED")
    expect((await caught(api.listOrders())).status).toBe(401)
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(await api.listOrders()).not.toHaveLength(0)
  })

  it("leaves every other route to the real API (products stay real)", async () => {
    const { api, real } = setup()
    await api.listProducts()
    expect(real).toHaveBeenCalledWith(`${BASE}/admin/products`, expect.objectContaining({ method: "GET" }))
  })

  it("starts again from the seeded orders when its key is removed", async () => {
    const { api } = setup()
    const { id } = await firstWith(api, "pending")
    await api.cancelOrder(id)
    window.localStorage.removeItem(STUDIO_DEMO_KEY)
    expect((await api.getOrder(id)).status).toBe("pending")
  })
})

describe("when the studio uses the demo orders", () => {
  it("only on the dev server started with npm run dev:demo, never in a build or with npm run dev", () => {
    expect(studioDemoOn({ dev: true, mode: "demo" })).toBe(true)
    expect(studioDemoOn({ dev: true, mode: "development" })).toBe(false)
    expect(studioDemoOn({ dev: false, mode: "demo" })).toBe(false)
    expect(studioDemoOn({ dev: false, mode: "production" })).toBe(false)
  })
})
