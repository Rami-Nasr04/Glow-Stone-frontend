import { PRODUCTS } from "@/test/catalog"
import { createHttpOrders } from "./api"
import { createDemoFetch, DEMO_ORDERS_KEY, DEMO_REFUSE_KEY } from "./demo-api"
import { OrderError, type PlaceOrderInput } from "./types"

const SARA = { id: "u-sara", email: "sara@example.com", name: "Sara Khoury", phone: "+96171234567" }
const token = (who = SARA) => "demo." + encodeURIComponent(JSON.stringify(who))
// Qadisha (5): $890, 4 left · Sannine (6): $560, 2 left · Nahr (2): sold out · Batroun (3): $180, 9 left
let keys = 0
const order = (change: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
  // A new attempt each time unless a test keeps the key.
  requestId: `00000000-0000-4000-8000-${String(++keys).padStart(12, "0")}`,
  items: [{ productId: 5, quantity: 2, unitPrice: 890 }],
  recipient: null,
  city: "Jounieh",
  address: "Main road, Haddad bldg, 3rd floor",
  deliveryNotes: null,
  isGift: false,
  giftMessage: null,
  ...change,
})

function demo(who = SARA, products = PRODUCTS) {
  const fetch = createDemoFetch({ storage: localStorage, products: async () => products, now: () => new Date("2026-11-06T14:03:00Z") })
  return createHttpOrders("https://demo.invalid", async () => token(who), fetch)
}

const refusal = (promise: Promise<unknown>) => promise.then(() => null, (e: unknown) => e as OrderError)

beforeEach(() => localStorage.clear())

describe("demo orders API (the contract, in this browser)", () => {
  it("knows the customer from the token, and refuses without one", async () => {
    await expect(demo().me()).resolves.toEqual({ email: SARA.email, name: SARA.name, phone: SARA.phone })
    const fetch = createDemoFetch({ storage: localStorage, products: async () => PRODUCTS })
    const anonymous = createHttpOrders("https://demo.invalid", async () => "not-a-demo-token", fetch)
    expect(await refusal(anonymous.me())).toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })

  // Like API Gateway: its own body, not the envelope.
  it("refuses a missing token the way API Gateway does", async () => {
    const fetch = createDemoFetch({ storage: localStorage, products: async () => PRODUCTS })
    const answer = await fetch("https://demo.invalid/me/orders", { headers: { Authorization: "Bearer nothing" } })
    expect(answer.status).toBe(401)
    expect(await answer.json()).toEqual({ message: "Unauthorized" })
  })

  it("places an order with the server's totals, the account holder as recipient, and a GS number", async () => {
    const placed = await demo().place(order({ items: [{ productId: 5, quantity: 2, unitPrice: 890 }, { productId: 3, quantity: 1, unitPrice: 180 }] }))
    expect(placed).toMatchObject({
      id: 1,
      number: "GS-0001",
      status: "pending",
      createdAt: "2026-11-06T14:03:00.000Z",
      subtotal: 1960,
      deliveryFee: 0,
      total: 1960,
      recipient: { name: "Sara Khoury", phone: "+96171234567", isAccountHolder: true },
      canCancel: true,
    })
    // Lines in productId order, with each piece's stone and colour.
    expect(placed.items.map((item) => item.productId)).toEqual([3, 5])
    expect(placed.items[1]).toMatchObject({ productId: 5, name: "Qadisha", stoneType: "Limestone", color: "Cream", quantity: 2, unitPrice: 890, lineTotal: 1780 })
    expect(placed.items[1].image?.url).toMatch(/^https:\/\//)
    expect((await demo().place(order({ items: [{ productId: 3, quantity: 1, unitPrice: 180 }] }))).number).toBe("GS-0002")
  })

  it("keeps someone else as the recipient", async () => {
    const placed = await demo().place(order({ recipient: { name: " Maya ", phone: "+9613123456" }, isGift: true, giftMessage: "For the new house." }))
    expect(placed.recipient).toEqual({ name: "Maya", phone: "+9613123456", isAccountHolder: false })
    expect(placed).toMatchObject({ isGift: true, giftMessage: "For the new house." })
  })

  it.each([
    ["no city", order({ city: " " }), "Please enter the city (up to 100 characters)."],
    ["no address", order({ address: "" }), "Please enter the address (up to 300 characters)."],
    ["a city too long", order({ city: "x".repeat(101) }), "Please enter the city (up to 100 characters)."],
    ["an address too long", order({ address: "x".repeat(301) }), "Please enter the address (up to 300 characters)."],
    ["notes too long", order({ deliveryNotes: "x".repeat(501) }), "Delivery notes can be up to 500 characters."],
    ["a card too long", order({ isGift: true, giftMessage: "x".repeat(201) }), "The card message can be up to 200 characters."],
    // The API takes the phone only in the sign-up's form (+961 and 7 or 8 digits); the shop sends it that way.
    ["a recipient's bad phone", order({ recipient: { name: "Maya", phone: "+3312" } }), "Please enter a Lebanese number, like 71 234 567."],
    ["a recipient's phone as typed", order({ recipient: { name: "Maya", phone: "03 123 456" } }), "Please enter a Lebanese number, like 71 234 567."],
    ["a recipient without a name", order({ recipient: { name: " ", phone: "+9613123456" } }), "Please enter the recipient's name (up to 100 characters)."],
    ["no items", order({ items: [] }), "Your cart is empty."],
    ["a piece twice", order({ items: [{ productId: 5, quantity: 1, unitPrice: 890 }, { productId: 5, quantity: 1, unitPrice: 890 }] }), "Each piece can only be in the order once."],
  ])("400 VALIDATION for %s, saving nothing", async (_, input, message) => {
    expect(await refusal(demo().place(input))).toMatchObject({ status: 400, code: "VALIDATION", message })
    expect(await demo().list()).toEqual([])
  })

  // The shop's client never sends one (it drops a card without the gift), so this asks the demo directly.
  it("400 VALIDATION for a card without a gift", async () => {
    const fetch = createDemoFetch({ storage: localStorage, products: async () => PRODUCTS })
    const answer = await fetch("https://demo.invalid/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
      body: JSON.stringify(order({ giftMessage: "Hi" })),
    })
    expect(answer.status).toBe(400)
    expect(await answer.json()).toEqual({ success: false, error: { code: "VALIDATION", message: "Card messages are only for gifts." } })
  })

  it.each([
    ["a piece no longer in the collection", [{ productId: 99, quantity: 1, unitPrice: 100 }], "One piece in your cart is no longer available.", 99],
    ["a sold-out piece", [{ productId: 2, quantity: 1, unitPrice: 290 }], "Nahr is sold out.", 2],
    ["more than are left", [{ productId: 6, quantity: 3, unitPrice: 560 }], "Sannine has only 2 left.", 6],
  ])("409 UNAVAILABLE for %s, naming the piece", async (_, items, message, productId) => {
    expect(await refusal(demo().place(order({ items })))).toMatchObject({ status: 409, code: "UNAVAILABLE", message, productId })
  })

  it("409 PRICE_CHANGED when the price the cart showed isn't today's", async () => {
    expect(await refusal(demo().place(order({ items: [{ productId: 5, quantity: 1, unitPrice: 850 }] })))).toMatchObject({
      status: 409,
      code: "PRICE_CHANGED",
      message: "The price of Qadisha has changed. Please check your cart.",
      productId: 5,
    })
  })

  // The API checks the limit first, then the pieces in productId order, and reports the first problem.
  it("checks the 5-piece limit before the pieces, then the pieces in productId order", async () => {
    expect(await refusal(demo().place(order({ items: [{ productId: 2, quantity: 6, unitPrice: 290 }] })))).toMatchObject({ code: "ORDER_LIMIT" })
    const items = [
      { productId: 6, quantity: 1, unitPrice: 1 },
      { productId: 2, quantity: 1, unitPrice: 290 },
    ]
    expect(await refusal(demo().place(order({ items })))).toMatchObject({ code: "UNAVAILABLE", productId: 2 })
  })

  it("409 ORDER_LIMIT when this order and the customer's pending ones pass 5 pieces; cancelled ones don't count", async () => {
    const first = await demo().place(order({ items: [{ productId: 3, quantity: 4, unitPrice: 180 }] }))
    expect(await refusal(demo().place(order({ items: [{ productId: 5, quantity: 2, unitPrice: 890 }] })))).toMatchObject({
      status: 409,
      code: "ORDER_LIMIT",
      message: "For larger orders, please contact Omar.",
    })
    await demo().cancel(first.id)
    await expect(demo().place(order({ items: [{ productId: 5, quantity: 2, unitPrice: 890 }] }))).resolves.toMatchObject({ number: "GS-0002" })
    // Another customer's pending orders are theirs alone.
    await expect(demo({ ...SARA, id: "u-other" }).place(order({ items: [{ productId: 3, quantity: 5, unitPrice: 180 }] }))).resolves.toBeTruthy()
  })

  it("lists the customer's own orders, newest first, with the item count and the first cover", async () => {
    await demo().place(order({ items: [{ productId: 3, quantity: 1, unitPrice: 180 }] }))
    await demo().place(order({ items: [{ productId: 5, quantity: 2, unitPrice: 890 }, { productId: 3, quantity: 1, unitPrice: 180 }] }))
    await demo({ ...SARA, id: "u-other" }).place(order({ items: [{ productId: 3, quantity: 1, unitPrice: 180 }] }))
    const list = await demo().list()
    expect(list.map((o) => [o.number, o.itemCount, o.total, o.items])).toEqual([
      [
        "GS-0002",
        3,
        1960,
        [
          { name: "Batroun", quantity: 1 },
          { name: "Qadisha", quantity: 2 },
        ],
      ],
      ["GS-0001", 1, 180, [{ name: "Batroun", quantity: 1 }]],
    ])
    // The first line's cover (lines in productId order).
    expect(list[0].image?.url).toMatch(/products\/3\//)
  })

  it("shows one order to its customer only (404 for anyone else)", async () => {
    const placed = await demo().place(order())
    await expect(demo().get(placed.id)).resolves.toMatchObject({ number: "GS-0001" })
    await expect(demo({ ...SARA, id: "u-other" }).get(placed.id)).resolves.toBeNull()
    await expect(demo().get(42)).resolves.toBeNull()
  })

  it("cancels a pending order once; a second time is a 409 CONFLICT", async () => {
    const placed = await demo().place(order())
    await expect(demo().cancel(placed.id)).resolves.toMatchObject({ status: "cancelled", canCancel: false })
    expect(await refusal(demo().cancel(placed.id))).toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "This order can no longer be cancelled. Please contact Omar.",
    })
    expect(await refusal(demo({ ...SARA, id: "u-other" }).cancel(placed.id))).toMatchObject({ status: 404 })
  })

  // The order key (contract: requestId).
  describe("the order key", () => {
    it("answers the same key with the order already made: 201, no second order", async () => {
      const first = order()
      const placed = await demo().place(first)
      await expect(demo().place(first)).resolves.toEqual(placed)
      expect(await demo().list()).toHaveLength(1)
    })

    it("answers a repeat as the order is now, even cancelled since, and never counts its pieces again", async () => {
      const first = order({ items: [{ productId: 3, quantity: 5, unitPrice: 180 }] })
      const placed = await demo().place(first)
      await expect(demo().place(first)).resolves.toMatchObject({ id: placed.id })
      await demo().cancel(placed.id)
      await expect(demo().place(first)).resolves.toMatchObject({ id: placed.id, status: "cancelled" })
    })

    it("refuses the same key with a different order: 422 REQUEST_REUSED, nothing saved", async () => {
      const first = order()
      await demo().place(first)
      expect(await refusal(demo().place({ ...first, city: "Byblos" }))).toMatchObject({
        status: 422,
        code: "REQUEST_REUSED",
        message: "Please check your cart and try again.",
      })
      expect(await demo().list()).toHaveLength(1)
    })

    it("keeps each customer's keys apart", async () => {
      const first = order()
      await demo().place(first)
      await expect(demo({ ...SARA, id: "u-other" }).place(first)).resolves.toMatchObject({ number: "GS-0002" })
    })

    it("keeps no key for a refused order: the same key works once the cart is fixed", async () => {
      const first = order({ items: [{ productId: 5, quantity: 1, unitPrice: 850 }] })
      expect(await refusal(demo().place(first))).toMatchObject({ code: "PRICE_CHANGED" })
      await expect(demo().place({ ...first, items: [{ productId: 5, quantity: 1, unitPrice: 890 }] })).resolves.toBeTruthy()
    })

    it.each([undefined, "not-a-uuid"])("refuses a missing or broken key (%j) with 400", async (requestId) => {
      expect(await refusal(demo().place({ ...order(), requestId: requestId as string }))).toMatchObject({
        status: 400,
        code: "VALIDATION",
        message: "Please check your cart and try again.",
      })
    })

    // To show the background re-send in the browser: the order is saved, then the answer is lost once.
    it("can be told to lose the answer to the next order, which a re-send then gets", async () => {
      localStorage.setItem(DEMO_REFUSE_KEY, "LOST")
      const fetch = createDemoFetch({ storage: localStorage, products: async () => PRODUCTS, now: () => new Date("2026-11-06T14:03:00Z") })
      const orders = createHttpOrders("https://demo.invalid", async () => token(), fetch, { sleep: async () => undefined })
      const placed = await orders.place(order())
      expect(placed).toMatchObject({ number: "GS-0001" })
      expect(await demo().list()).toHaveLength(1)
    })

    it("can be told to lose every answer, without saving, until the key is removed", async () => {
      localStorage.setItem(DEMO_REFUSE_KEY, "OFFLINE")
      const fetch = createDemoFetch({ storage: localStorage, products: async () => PRODUCTS })
      const orders = createHttpOrders("https://demo.invalid", async () => token(), fetch, { sleep: async () => undefined })
      expect(await refusal(orders.place(order()))).toMatchObject({ code: "NETWORK" })
      expect(localStorage.getItem(DEMO_REFUSE_KEY)).toBe("OFFLINE")
      localStorage.removeItem(DEMO_REFUSE_KEY)
      expect(await demo().list()).toEqual([])
    })
  })

  it("can be told to refuse the next order with a given code, to show each refusal in the browser", async () => {
    localStorage.setItem(DEMO_REFUSE_KEY, "PRICE_CHANGED")
    expect(await refusal(demo().place(order()))).toMatchObject({ code: "PRICE_CHANGED", productId: 5 })
    expect(localStorage.getItem(DEMO_REFUSE_KEY)).toBeNull()
    await expect(demo().place(order())).resolves.toBeTruthy()
    expect(JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY)!).orders).toHaveLength(1)
  })

  // The two refusals of a signed-in customer that any route can give, to show each page's answer in the browser.
  it("can be told to answer the next call of any route with 401 or 403", async () => {
    localStorage.setItem(DEMO_REFUSE_KEY, "FORBIDDEN")
    expect(await refusal(demo().list())).toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "Your account isn't ready yet. Please sign out and sign in again.",
    })
    localStorage.setItem(DEMO_REFUSE_KEY, "UNAUTHORIZED")
    expect(await refusal(demo().me())).toMatchObject({ status: 401, code: "UNAUTHORIZED" })
    await expect(demo().me()).resolves.toMatchObject({ email: SARA.email })
  })
})
