import { PRODUCTS } from "@/test/catalog"
import { createHttpOrders } from "./api"
import { createDemoFetch, DEMO_ORDERS_KEY, DEMO_REFUSE_KEY } from "./demo-api"
import { OrderError, type PlaceOrderInput } from "./types"

const SARA = { id: "u-sara", email: "sara@example.com", name: "Sara Khoury", phone: "+96171234567" }
const token = (who = SARA) => "demo." + encodeURIComponent(JSON.stringify(who))
// Qadisha (5): $890, 4 left · Sannine (6): $560, 2 left · Nahr (2): sold out · Batroun (3): $180, 9 left
const order = (change: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
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
    expect(placed.items[0]).toMatchObject({ productId: 5, name: "Qadisha", quantity: 2, unitPrice: 890, lineTotal: 1780 })
    expect(placed.items[0].image?.url).toMatch(/^https:\/\//)
    expect((await demo().place(order({ items: [{ productId: 3, quantity: 1, unitPrice: 180 }] }))).number).toBe("GS-0002")
  })

  it("keeps someone else as the recipient", async () => {
    const placed = await demo().place(order({ recipient: { name: "Maya", phone: "03 123 456" }, isGift: true, giftMessage: "For the new house." }))
    // The server keeps the phone in the sign-up's form.
    expect(placed.recipient).toEqual({ name: "Maya", phone: "+9613123456", isAccountHolder: false })
    expect(placed).toMatchObject({ isGift: true, giftMessage: "For the new house." })
  })

  it.each([
    ["no city", order({ city: " " }), "city is required"],
    ["no address", order({ address: "" }), "address is required"],
    ["a city too long", order({ city: "x".repeat(101) }), "city must be at most 100 characters"],
    ["an address too long", order({ address: "x".repeat(301) }), "address must be at most 300 characters"],
    ["notes too long", order({ deliveryNotes: "x".repeat(501) }), "deliveryNotes must be at most 500 characters"],
    ["a card without a gift", order({ giftMessage: "Hi" }), "giftMessage is only allowed for a gift"],
    ["a card too long", order({ isGift: true, giftMessage: "x".repeat(201) }), "giftMessage must be at most 200 characters"],
    ["a recipient's bad phone", order({ recipient: { name: "Maya", phone: "+3312" } }), "Please enter a Lebanese number, like 71 234 567."],
    ["a recipient without a name", order({ recipient: { name: " ", phone: "+96103123456" } }), "recipient name is required"],
    ["no items", order({ items: [] }), "items must hold at least one piece"],
    ["a piece twice", order({ items: [{ productId: 5, quantity: 1, unitPrice: 890 }, { productId: 5, quantity: 1, unitPrice: 890 }] }), "each piece may appear only once"],
    ["a quantity of 0", order({ items: [{ productId: 5, quantity: 0, unitPrice: 890 }] }), "quantity must be at least 1"],
  ])("400 VALIDATION for %s, saving nothing", async (_, input, message) => {
    expect(await refusal(demo().place(input))).toMatchObject({ status: 400, code: "VALIDATION", message })
    expect(await demo().list()).toEqual([])
  })

  it.each([
    ["a piece no longer in the collection", [{ productId: 99, quantity: 1, unitPrice: 100 }], "This piece is no longer available.", 99],
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
    expect(list.map((o) => [o.number, o.itemCount, o.total])).toEqual([
      ["GS-0002", 3, 1960],
      ["GS-0001", 1, 180],
    ])
    expect(list[0].image?.url).toMatch(/products\/5\//)
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

  it("can be told to refuse the next order with a given code, to show each refusal in the browser", async () => {
    localStorage.setItem(DEMO_REFUSE_KEY, "PRICE_CHANGED")
    expect(await refusal(demo().place(order()))).toMatchObject({ code: "PRICE_CHANGED", productId: 5 })
    expect(localStorage.getItem(DEMO_REFUSE_KEY)).toBeNull()
    await expect(demo().place(order())).resolves.toBeTruthy()
    expect(JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY)!).orders).toHaveLength(1)
  })
})
