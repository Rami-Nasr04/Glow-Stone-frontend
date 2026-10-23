import { createHttpOrders } from "./api"
import { OrderError, type Order, type PlaceOrderInput } from "./types"

const BASE = "https://api.test"
const image = { url: "https://cdn.test/products/5/abcdefghij12", width: 2048, height: 3072 }

// The contract's examples, as the API answers them.
const ORDER: Order = {
  id: 7,
  number: "GS-0007",
  status: "pending",
  createdAt: "2026-11-06T14:03:00Z",
  items: [{ productId: 5, name: "Qadisha", stoneType: "Limestone", color: "Sand", quantity: 2, unitPrice: 890, lineTotal: 1780, image }],
  subtotal: 1780,
  deliveryFee: 0,
  total: 1780,
  recipient: { name: "Sara Khoury", phone: "+96171234567", isAccountHolder: true },
  city: "Jounieh",
  address: "Main road, Haddad bldg, 3rd floor",
  deliveryNotes: "Call before coming",
  isGift: false,
  giftMessage: null,
  canCancel: true,
}
const INPUT: PlaceOrderInput = {
  items: [{ productId: 5, quantity: 2, unitPrice: 890 }],
  recipient: null,
  city: "Jounieh",
  address: "Main road, Haddad bldg, 3rd floor",
  deliveryNotes: "Call before coming",
  isGift: false,
  giftMessage: null,
}

const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, data }), { status })
const refusal = (status: number, code: string, message: string, extra: object = {}) =>
  new Response(JSON.stringify({ success: false, error: { code, message, ...extra } }), { status })

function client(answer: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fetch = vi.fn(async (url: string, init: RequestInit) => answer(url, init))
  return { orders: createHttpOrders(BASE, async () => "token-1", fetch as unknown as typeof globalThis.fetch), fetch }
}

const error = (promise: Promise<unknown>) => promise.then(() => null, (e: unknown) => e as OrderError)

describe("orders API client", () => {
  it("sends the customer's access token on every route", async () => {
    const { orders, fetch } = client(() => ok({ email: "sara@example.com", name: "Sara Khoury", phone: "+96171234567" }))
    await orders.me()
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe("https://api.test/me")
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-1")
  })

  it("GET /me reads the customer", async () => {
    const { orders } = client(() => ok({ email: "sara@example.com", name: "Sara Khoury", phone: "+96171234567" }))
    await expect(orders.me()).resolves.toEqual({ email: "sara@example.com", name: "Sara Khoury", phone: "+96171234567" })
  })

  it("POST /orders sends the order as JSON and reads the 201 order", async () => {
    const { orders, fetch } = client(() => ok(ORDER, 201))
    await expect(orders.place(INPUT)).resolves.toEqual(ORDER)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe("https://api.test/orders")
    expect(init.method).toBe("POST")
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json")
    expect(JSON.parse(String(init.body))).toEqual(INPUT)
  })

  // Optional texts: "" (or only spaces) is null, as the API stores it; the required ones go trimmed.
  it("sends empty optional texts as null and trims the rest", async () => {
    const { orders, fetch } = client(() => ok(ORDER, 201))
    await orders.place({
      ...INPUT,
      recipient: { name: "  Maya Saad ", phone: "+9613123456" },
      city: " Jounieh ",
      address: " Main road ",
      deliveryNotes: "   ",
      isGift: true,
      giftMessage: "",
    })
    expect(JSON.parse(String(fetch.mock.calls[0][1].body))).toEqual({
      ...INPUT,
      recipient: { name: "Maya Saad", phone: "+9613123456" },
      city: "Jounieh",
      address: "Main road",
      deliveryNotes: null,
      isGift: true,
      giftMessage: null,
    })
  })

  it("never sends a card message without the gift", async () => {
    const { orders, fetch } = client(() => ok(ORDER, 201))
    await orders.place({ ...INPUT, isGift: false, giftMessage: "Hi" })
    expect(JSON.parse(String(fetch.mock.calls[0][1].body))).toMatchObject({ isGift: false, giftMessage: null })
  })

  it.each([
    [400, "VALIDATION", "Please enter the city (up to 100 characters)."],
    [409, "UNAVAILABLE", "Qadisha has only 2 left."],
    [409, "PRICE_CHANGED", "The price of Qadisha has changed. Please check your cart."],
    [409, "ORDER_LIMIT", "For larger orders, please contact Omar."],
    [403, "FORBIDDEN", "Your account isn't ready yet. Please sign out and sign in again."],
  ])("a %i %s refusal keeps the status, the code and the API's message as it is", async (status, code, message) => {
    const { orders } = client(() => refusal(status, code, message))
    const e = await error(orders.place(INPUT))
    expect(e).toBeInstanceOf(OrderError)
    expect(e).toMatchObject({ status, code, message, productId: null })
  })

  // API Gateway refuses the token itself: its own body, not the envelope. The status is what counts.
  it.each([
    ["API Gateway's own body", () => new Response('{"message":"Unauthorized"}', { status: 401 })],
    ["no body", () => new Response(null, { status: 401 })],
    ["the envelope", () => refusal(401, "UNAUTHORIZED", "Please sign in.")],
  ])("a 401 with %s means signing in again", async (_, answer) => {
    expect(await error(client(answer).orders.list())).toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })

  it("asks to sign in again when there is no token to send, without calling the API", async () => {
    const fetch = vi.fn()
    const orders = createHttpOrders(BASE, () => Promise.reject(new Error("signed out")), fetch as unknown as typeof globalThis.fetch)
    expect(await error(orders.me())).toMatchObject({ status: 401, code: "UNAUTHORIZED" })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("keeps the piece a refusal names, when the API sends it", async () => {
    const { orders } = client(() => refusal(409, "UNAVAILABLE", "Nahr is sold out.", { productId: 2 }))
    expect(await error(orders.place(INPUT))).toMatchObject({ code: "UNAVAILABLE", productId: 2 })
  })

  it("names a piece that no longer exists by its id only", async () => {
    const { orders } = client(() => refusal(409, "UNAVAILABLE", "One piece in your cart is no longer available.", { productId: 9 }))
    expect(await error(orders.place(INPUT))).toMatchObject({ code: "UNAVAILABLE", message: "One piece in your cart is no longer available.", productId: 9 })
  })

  it("GET /me/orders reads the list, with each order's pieces", async () => {
    const row = {
      id: 7,
      number: "GS-0007",
      status: "pending",
      createdAt: "2026-11-06T14:03:00Z",
      itemCount: 3,
      total: 2070,
      items: [
        { name: "Qadisha", quantity: 2 },
        { name: "Arz", quantity: 1 },
      ],
      image,
    }
    const { orders, fetch } = client(() => ok([row, { ...row, id: 6, image: null }]))
    await expect(orders.list()).resolves.toEqual([row, { ...row, id: 6, image: null }])
    expect(fetch.mock.calls[0][0]).toBe("https://api.test/me/orders")
  })

  it("GET /me/orders/{id} reads one order, and a 404 is no order", async () => {
    const { orders, fetch } = client((url) => (url.endsWith("/7") ? ok(ORDER) : refusal(404, "NOT_FOUND", "Order not found.")))
    await expect(orders.get(7)).resolves.toEqual(ORDER)
    await expect(orders.get(8)).resolves.toBeNull()
    expect(fetch.mock.calls[0][0]).toBe("https://api.test/me/orders/7")
  })

  it("POST /me/orders/{id}/cancel reads the cancelled order, and a 409 keeps the message", async () => {
    const { orders, fetch } = client((url) =>
      url.includes("/7/") ? ok({ ...ORDER, status: "cancelled", canCancel: false }) : refusal(409, "CONFLICT", "This order can no longer be cancelled. Please contact Omar."),
    )
    await expect(orders.cancel(7)).resolves.toMatchObject({ status: "cancelled", canCancel: false })
    expect(fetch.mock.calls[0][0]).toBe("https://api.test/me/orders/7/cancel")
    expect(fetch.mock.calls[0][1].method).toBe("POST")
    expect(await error(orders.cancel(8))).toMatchObject({ status: 409, code: "CONFLICT", message: "This order can no longer be cancelled. Please contact Omar." })
  })

  it("says NETWORK when no answer comes", async () => {
    const { orders } = client(() => Promise.reject(new TypeError("Failed to fetch")))
    expect(await error(orders.list())).toMatchObject({ status: 0, code: "NETWORK" })
  })

  it("says INVALID_ANSWER for an answer it can't read, or a status without the envelope", async () => {
    expect(await error(client(() => ok({ id: "seven" })).orders.get(7))).toMatchObject({ code: "INVALID_ANSWER" })
    expect(await error(client(() => ok([{ ...ORDER, status: "lost" }])).orders.list())).toMatchObject({ code: "INVALID_ANSWER" })
    const row = { id: 7, number: "GS-0007", status: "pending", createdAt: "2026-11-06T14:03:00Z", itemCount: 1, total: 890, image: null }
    expect(await error(client(() => ok([row])).orders.list())).toMatchObject({ code: "INVALID_ANSWER" })
    const { stoneType: _, ...noStone } = ORDER.items[0]
    expect(await error(client(() => ok({ ...ORDER, items: [noStone] })).orders.get(7))).toMatchObject({ code: "INVALID_ANSWER" })
    expect(await error(client(() => new Response("<html>", { status: 502 })).orders.me())).toMatchObject({ status: 502, code: "INVALID_ANSWER" })
  })

  it("asks for the token on each call (it may have been refreshed)", async () => {
    const token = vi.fn(async () => "fresh")
    const fetch = vi.fn(async () => ok([]))
    const orders = createHttpOrders(BASE, token, fetch as unknown as typeof globalThis.fetch)
    await orders.list()
    await orders.list()
    expect(token).toHaveBeenCalledTimes(2)
  })
})
