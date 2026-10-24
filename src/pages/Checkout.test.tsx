import { renderHook, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useLocation } from "react-router"
import { createMockAuth, DEMO_USER } from "@/features/auth/mock-auth"
import RequireAuth from "@/features/auth/RequireAuth"
import { CART_KEY, ORDER_KEY, resetCart, useCart } from "@/features/cart/cart"
import { DEMO_ORDERS_KEY, DEMO_REFUSE_KEY } from "@/features/orders/demo-api"
import { stubApi } from "@/test/catalog"
import { renderAt } from "@/test/render"
import Checkout from "./Checkout"

const QADISHA = 5 // $890, 4 left
const BATROUN = 3 // $180, 9 left
const NAHR = 2 // sold out
const SANNINE = 6 // $560, 2 left

function Probe() {
  const { pathname, search } = useLocation()
  return <p>landed: {pathname + search}</p>
}
const probes = [
  { path: "/sign-in", Component: Probe },
  { path: "/checkout/thanks/:id", Component: Probe },
]

function fillCart(lines: [number, number, number?][]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines.map(([productId, quantity, price]) => ({ productId, quantity, price }))))
  resetCart()
}

async function signedIn() {
  const auth = createMockAuth(localStorage)
  await auth.signIn(DEMO_USER.email, DEMO_USER.password)
  return auth
}

async function open(lines: [number, number, number?][] = [[QADISHA, 1], [BATROUN, 2]]) {
  fillCart(lines)
  stubApi()
  const user = userEvent.setup({ delay: null })
  renderAt(
    <RequireAuth>
      <Checkout />
    </RequireAuth>,
    "/checkout",
    { auth: await signedIn(), routes: probes },
  )
  await screen.findByRole("heading", { level: 1, name: "Checkout" })
  return user
}

async function fillAddress(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("City or town"), "Jounieh")
  await user.type(screen.getByLabelText("Street and building"), "Main road, Haddad bldg")
  await user.type(screen.getByLabelText("Floor / apartment (optional)"), "3rd floor")
}

const summary = () => screen.getByRole("complementary", { name: "Order summary" })
const lineOf = (name: string) => within(summary()).getByText(name).closest("li")!
const placeButton = () => screen.getByRole("button", { name: /^Place order$|^Placing your order…$/ })
const placed = () => JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY) ?? '{"orders":[]}').orders.map((o: { order: object }) => o.order)
const cart = () => renderHook(() => useCart()).result.current

describe("Checkout", () => {
  it("sends a guest to sign in and back to checkout, leaving the cart as it is", async () => {
    fillCart([[QADISHA, 1]])
    renderAt(
      <RequireAuth>
        <Checkout />
      </RequireAuth>,
      "/checkout",
      { auth: createMockAuth(null), routes: probes },
    )
    expect(await screen.findByText("landed: /sign-in?next=%2Fcheckout")).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([{ productId: QADISHA, quantity: 1 }])
  })

  it("says who is signed in, and has the account holder receive it by default, from GET /me", async () => {
    await open()
    expect(screen.getByText(DEMO_USER.email)).toBeInTheDocument()
    const me = await screen.findByRole("radio", { name: /Me/ })
    expect(me).toBeChecked()
    expect(me.closest("label")).toHaveTextContent("Nour Haddad · +961 71 234 567")
    expect(screen.queryByLabelText("Their full name")).not.toBeInTheDocument()
  })

  it("sums up the cart with the latest prices: free delivery, the far-off note, and cash on delivery only", async () => {
    await open()
    const summary = screen.getByRole("complementary", { name: "Order summary" })
    expect(await within(summary).findByText("Qadisha")).toBeInTheDocument()
    expect(within(summary).getByText("Qty 2")).toBeInTheDocument()
    expect(within(summary).getByText("$360")).toBeInTheDocument()
    expect(within(summary).getByText("Subtotal").nextSibling).toHaveTextContent("$1,250")
    expect(within(summary).getByText("Delivery").nextSibling).toHaveTextContent("Free delivery")
    expect(within(summary).getByText("Total").nextSibling).toHaveTextContent("$1,250")
    expect(within(summary).getByText(/For far-off areas, Omar may agree a small delivery fee/)).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Cash on delivery/ })).toBeChecked()
    expect(screen.getAllByRole("radiogroup", { name: "Payment" })[0].querySelectorAll("[role=radio], input[type=radio]")).toHaveLength(1)
  })

  it("asks for the city and the street first, focusing the first one missing", async () => {
    const user = await open()
    await within(screen.getByRole("complementary", { name: "Order summary" })).findByText("Qadisha")
    await user.click(screen.getByRole("button", { name: "Place order" }))
    expect(screen.getAllByText("Please fill this in.")).toHaveLength(2)
    expect(screen.getByLabelText("City or town")).toHaveFocus()
    expect(placed()).toEqual([])
    // Typing in a field takes its message away.
    await user.type(screen.getByLabelText("City or town"), "Jounieh")
    expect(screen.getAllByText("Please fill this in.")).toHaveLength(1)
    expect(screen.getByLabelText("City or town")).not.toHaveAttribute("aria-invalid")
  })

  it("for someone else, asks for their name and a Lebanese phone, and sends them as the recipient", async () => {
    const user = await open()
    await user.click(await screen.findByRole("radio", { name: /Someone else/ }))
    await fillAddress(user)
    await user.type(screen.getByLabelText("Their full name"), "Maya Saad")
    await user.type(screen.getByLabelText("Their phone"), "12")
    await user.click(screen.getByRole("button", { name: "Place order" }))
    expect(screen.getByText("Please enter a Lebanese number, like 71 234 567.")).toBeInTheDocument()
    await user.clear(screen.getByLabelText("Their phone"))
    await user.type(screen.getByLabelText("Their phone"), "03 123 456")
    await user.click(screen.getByRole("button", { name: "Place order" }))
    await screen.findByText(/landed: \/checkout\/thanks\//)
    expect(placed()[0].recipient).toEqual({ name: "Maya Saad", phone: "+9613123456", isAccountHolder: false })
  })

  // Rami, 2026-10-24: payment stays cash, but Omar arranges it with the buyer of a gift.
  it("says Omar will arrange the payment once it is a gift", async () => {
    const user = await open()
    expect(screen.queryByText("Omar will contact you to arrange the payment.")).not.toBeInTheDocument()
    await user.click(screen.getByRole("switch", { name: "This is a gift" }))
    expect(screen.getByText("Omar will contact you to arrange the payment.")).toBeInTheDocument()
  })

  // Backend QA, 2026-10-25: the payment box contradicted the gift note by asking for cash on arrival.
  it("words the payment box for a gift as the buyer paying, arranged on Omar's call", async () => {
    const user = await open()
    expect(screen.getByRole("radio", { name: /Cash on delivery/ })).toHaveAccessibleName(/Pay in cash when your piece arrives/)
    await user.click(screen.getByRole("switch", { name: "This is a gift" }))
    const payment = screen.getByRole("radio", { name: /Cash, arranged with Omar/ })
    expect(payment).toHaveAccessibleName(/You pay, not the recipient\. Omar will call you to arrange the payment before delivery\./)
    expect(screen.queryByText(/Pay in cash when your piece arrives/)).not.toBeInTheDocument()
  })

  it("offers a card message only for a gift, up to 200 characters, with a counter", async () => {
    const user = await open()
    expect(screen.queryByLabelText("Gift card message (optional)")).not.toBeInTheDocument()
    const gift = screen.getByRole("switch", { name: "This is a gift" })
    await user.click(gift)
    expect(gift).toBeChecked()
    const card = screen.getByLabelText("Gift card message (optional)")
    expect(card).toHaveAttribute("maxLength", "200")
    expect(screen.getByText("0 / 200")).toBeInTheDocument()
    await user.type(card, "For the new house.")
    expect(screen.getByText("18 / 200")).toBeInTheDocument()
    expect(screen.getByText("Prices are hidden on the delivery slip.")).toBeInTheDocument()
  })

  it("places the order with the prices shown, joins the address, empties the cart and opens the confirmation", async () => {
    const user = await open()
    await within(screen.getByRole("complementary", { name: "Order summary" })).findByText("Qadisha")
    await fillAddress(user)
    await user.type(screen.getByLabelText("Delivery notes (optional)"), "Call before coming")
    await user.click(screen.getByRole("switch", { name: "This is a gift" }))
    await user.type(screen.getByLabelText("Gift card message (optional)"), "For the new house.")
    await user.click(screen.getByRole("button", { name: "Place order" }))
    expect(await screen.findByText("landed: /checkout/thanks/1")).toBeInTheDocument()
    expect(placed()[0]).toMatchObject({
      number: "GS-0001",
      // The server keeps the lines in productId order.
      items: [
        { productId: BATROUN, quantity: 2, unitPrice: 180 },
        { productId: QADISHA, quantity: 1, unitPrice: 890 },
      ],
      recipient: { name: "Nour Haddad", phone: "+96171234567", isAccountHolder: true },
      city: "Jounieh",
      address: "Main road, Haddad bldg, 3rd floor",
      deliveryNotes: "Call before coming",
      isGift: true,
      giftMessage: "For the new house.",
    })
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([])
  })

  // Rami, 2026-10-24: prices always current.
  describe("current prices and stock", () => {
    it("shows each piece at its newest price, says which changed, and totals them", async () => {
      await open([
        [QADISHA, 1, 850],
        [BATROUN, 2, 180],
      ])
      await within(summary()).findByText("Qadisha")
      expect(lineOf("Qadisha")).toHaveTextContent("$890")
      expect(within(lineOf("Qadisha")).getByText("Price updated")).toBeInTheDocument()
      expect(within(lineOf("Batroun")).queryByText("Price updated")).not.toBeInTheDocument()
      expect(within(summary()).getByText("Total").nextSibling).toHaveTextContent("$1,250")
    })

    it("shows a sold-out or gone piece as such and keeps Place order disabled until it is removed", async () => {
      const user = await open([
        [NAHR, 1],
        [99, 1],
        [BATROUN, 1],
      ])
      await within(summary()).findByText("Batroun")
      expect(within(lineOf("Nahr")).getByText("Sold out")).toBeInTheDocument()
      expect(within(summary()).getByText("No longer available")).toBeInTheDocument()
      expect(placeButton()).toBeDisabled()
      expect(within(summary()).getByText("Remove the pieces that can't be ordered to place your order.")).toBeInTheDocument()
      expect(within(summary()).getByText("Total").nextSibling).toHaveTextContent("$180")
      await user.click(within(summary()).getByRole("button", { name: "Remove Nahr" }))
      expect(placeButton()).toBeDisabled()
      await user.click(within(summary()).getByRole("button", { name: "Remove A Glowstone piece" }))
      expect(placeButton()).toBeEnabled()
      await fillAddress(user)
      await user.click(placeButton())
      await screen.findByText(/landed: \/checkout\/thanks\//)
      expect(placed()[0].items.map((i: { productId: number }) => i.productId)).toEqual([BATROUN])
    })

    it("lowers a line to what is left, with a note", async () => {
      await open([[SANNINE, 3]])
      await within(summary()).findByText("Sannine")
      expect(lineOf("Sannine")).toHaveTextContent("Qty 2")
      expect(within(lineOf("Sannine")).getByText("Only 2 left in this edition, so your cart now holds 2.")).toBeInTheDocument()
      expect(cart().lines).toEqual([{ productId: SANNINE, quantity: 2, price: 560 }])
    })

    // Omar changed a price between checkout loading and the press: the server refuses it.
    it("on PRICE_CHANGED, refreshes the prices here, keeps the cart, and shows the API's words", async () => {
      const user = await open()
      await within(summary()).findByText("Qadisha")
      await fillAddress(user)
      stubApi((list) => list.map((piece) => (piece.id === QADISHA ? { ...piece, price: 950 } : piece)))
      await user.click(placeButton())
      expect(await within(summary()).findByRole("alert")).toHaveTextContent("The price of Qadisha has changed. Please check your cart.")
      await waitFor(() => expect(lineOf("Qadisha")).toHaveTextContent("$950"))
      expect(within(lineOf("Qadisha")).getByText("Price updated")).toBeInTheDocument()
      expect(within(summary()).getByText("Total").nextSibling).toHaveTextContent("$1,310")
      expect(cart().open).toBe(false)
      expect(cart().lines).toHaveLength(2)
      expect(placed()).toEqual([])
      // The customer sees the new total and presses again.
      await user.click(placeButton())
      await screen.findByText(/landed: \/checkout\/thanks\//)
      expect(placed()[0].items).toContainEqual(expect.objectContaining({ productId: QADISHA, quantity: 1, unitPrice: 950 }))
    })

    it("on UNAVAILABLE, refreshes here too and shows the API's words", async () => {
      const user = await open()
      await within(summary()).findByText("Qadisha")
      await fillAddress(user)
      stubApi((list) => list.map((piece) => (piece.id === QADISHA ? { ...piece, remaining: 0, soldOut: true } : piece)))
      await user.click(placeButton())
      expect(await within(summary()).findByRole("alert")).toHaveTextContent("Qadisha is sold out.")
      await waitFor(() => expect(within(lineOf("Qadisha")).getByText("Sold out")).toBeInTheDocument())
      expect(placeButton()).toBeDisabled()
      expect(cart().open).toBe(false)
    })
  })

  // Rami, 2026-10-24: no double orders, and the customer never has to press twice.
  describe("the order key and re-sends", () => {
    afterEach(() => vi.useRealTimers())

    it("sends a key with the order and drops it once the order is placed", async () => {
      const user = await open()
      await within(summary()).findByText("Qadisha")
      await fillAddress(user)
      await user.click(placeButton())
      await screen.findByText(/landed: \/checkout\/thanks\//)
      expect(placed()[0]).toBeTruthy()
      expect(JSON.parse(localStorage.getItem("glowstone.demo-orders")!).orders[0].requestId).toMatch(/^[0-9a-f-]{36}$/)
      expect(localStorage.getItem(ORDER_KEY)).toBeNull()
    })

    it("re-sends a lost order in the background with the same key: one order, the confirmation", async () => {
      const user = await open()
      await within(summary()).findByText("Qadisha")
      await fillAddress(user)
      localStorage.setItem(DEMO_REFUSE_KEY, "LOST")
      await user.click(placeButton())
      expect(await screen.findByText("landed: /checkout/thanks/1", {}, { timeout: 3000 })).toBeInTheDocument()
      expect(placed()).toHaveLength(1)
    })

    it("keeps saying it is placing while it re-sends, and when every try fails keeps the cart and the key", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = await open()
      await within(summary()).findByText("Qadisha")
      await fillAddress(user)
      localStorage.setItem(DEMO_REFUSE_KEY, "OFFLINE")
      await user.click(placeButton())
      expect(placeButton()).toHaveTextContent("Placing your order…")
      expect(placeButton()).toBeDisabled()
      await vi.advanceTimersByTimeAsync(13_000)
      const alert = await within(summary()).findByRole("alert")
      expect(alert).toHaveTextContent("We couldn't reach Glowstone. Your order may still go through; please check My orders or try again.")
      expect(within(alert).getByRole("link", { name: "My orders" })).toHaveAttribute("href", "/account")
      expect(cart().lines).toHaveLength(2)
      const key = JSON.parse(localStorage.getItem(ORDER_KEY)!).requestId
      // Pressing again is safe: the same key.
      localStorage.removeItem(DEMO_REFUSE_KEY)
      await user.click(placeButton())
      await screen.findByText(/landed: \/checkout\/thanks\//)
      expect(JSON.parse(localStorage.getItem("glowstone.demo-orders")!).orders[0].requestId).toBe(key)
    })

    it("makes a new key when the delivery details change", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = await open()
      await within(summary()).findByText("Qadisha")
      await fillAddress(user)
      localStorage.setItem(DEMO_REFUSE_KEY, "OFFLINE")
      await user.click(placeButton())
      await vi.advanceTimersByTimeAsync(13_000)
      await within(summary()).findByRole("alert")
      const first = JSON.parse(localStorage.getItem(ORDER_KEY)!).requestId
      localStorage.removeItem(DEMO_REFUSE_KEY)
      await user.type(screen.getByLabelText("City or town"), " North")
      await user.click(placeButton())
      await screen.findByText(/landed: \/checkout\/thanks\//)
      expect(JSON.parse(localStorage.getItem("glowstone.demo-orders")!).orders[0].requestId).not.toBe(first)
    })
  })

  it("on ORDER_LIMIT, shows the message with a way to contact Omar", async () => {
    const user = await open()
    await within(screen.getByRole("complementary", { name: "Order summary" })).findByText("Qadisha")
    await fillAddress(user)
    localStorage.setItem(DEMO_REFUSE_KEY, "ORDER_LIMIT")
    await user.click(screen.getByRole("button", { name: "Place order" }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("For larger orders, please contact Omar.")
    expect(within(alert).getByRole("link", { name: "Contact Omar" })).toHaveAttribute("href", "/contact")
    expect(cart().open).toBe(false)
  })

  it("shows a 400's own message", async () => {
    const user = await open()
    await within(screen.getByRole("complementary", { name: "Order summary" })).findByText("Qadisha")
    await fillAddress(user)
    localStorage.setItem(DEMO_REFUSE_KEY, "VALIDATION")
    await user.click(screen.getByRole("button", { name: "Place order" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Please enter the city (up to 100 characters).")
  })

  it("on a 403, shows the server's words", async () => {
    const user = await open()
    await within(screen.getByRole("complementary", { name: "Order summary" })).findByText("Qadisha")
    await fillAddress(user)
    localStorage.setItem(DEMO_REFUSE_KEY, "FORBIDDEN")
    await user.click(screen.getByRole("button", { name: "Place order" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Your account isn't ready yet. Please sign out and sign in again.")
    expect(placed()).toEqual([])
  })

  // API Gateway refused the token (expired, revoked): sign in again and come back, the cart as it was.
  it("on a 401, sends the customer to sign in and back to checkout, keeping the cart", async () => {
    const user = await open()
    await within(screen.getByRole("complementary", { name: "Order summary" })).findByText("Qadisha")
    await fillAddress(user)
    localStorage.setItem(DEMO_REFUSE_KEY, "UNAUTHORIZED")
    await user.click(screen.getByRole("button", { name: "Place order" }))
    expect(await screen.findByText("landed: /sign-in?next=%2Fcheckout")).toBeInTheDocument()
    expect(cart().lines).toHaveLength(2)
  })

  it("on a 401 while reading the customer, sends them to sign in and back", async () => {
    localStorage.setItem(DEMO_REFUSE_KEY, "UNAUTHORIZED")
    fillCart([[QADISHA, 1]])
    stubApi()
    renderAt(<Checkout />, "/checkout", { auth: await signedIn(), routes: probes })
    expect(await screen.findByText("landed: /sign-in?next=%2Fcheckout")).toBeInTheDocument()
  })

  it("on a 403 while reading the customer, shows the server's words and a way to sign out", async () => {
    localStorage.setItem(DEMO_REFUSE_KEY, "FORBIDDEN")
    fillCart([[QADISHA, 1]])
    stubApi()
    renderAt(<Checkout />, "/checkout", { auth: await signedIn(), routes: probes })
    expect(await screen.findByRole("alert")).toHaveTextContent("Your account isn't ready yet. Please sign out and sign in again.")
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument()
  })

  it("shows a piece deleted since checkout loaded as no longer available, with the API's words", async () => {
    const user = await open()
    await within(summary()).findByText("Qadisha")
    await fillAddress(user)
    // Qadisha is deleted between the page loading and the order.
    stubApi((list) => list.filter((piece) => piece.id !== QADISHA))
    await user.click(placeButton())
    expect(await within(summary()).findByRole("alert")).toHaveTextContent("One piece in your cart is no longer available.")
    expect(await within(summary()).findByText("No longer available")).toBeInTheDocument()
    expect(placeButton()).toBeDisabled()
  })

  it("shows the empty state when nothing can be ordered", async () => {
    await open([])
    expect(await screen.findByText("Your selection is empty.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View the collection/ })).toHaveAttribute("href", "/collection")
    expect(screen.queryByRole("button", { name: "Place order" })).not.toBeInTheDocument()
  })
})
