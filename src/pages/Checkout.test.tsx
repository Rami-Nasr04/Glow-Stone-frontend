import { renderHook, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useLocation } from "react-router"
import { createMockAuth, DEMO_USER } from "@/features/auth/mock-auth"
import RequireAuth from "@/features/auth/RequireAuth"
import { CART_KEY, resetCart, useCart } from "@/features/cart/cart"
import { DEMO_ORDERS_KEY, DEMO_REFUSE_KEY } from "@/features/orders/demo-api"
import { stubApi } from "@/test/catalog"
import { renderAt } from "@/test/render"
import Checkout from "./Checkout"

const QADISHA = 5 // $890, 4 left
const BATROUN = 3 // $180, 9 left
const NAHR = 2 // sold out

function Probe() {
  const { pathname, search } = useLocation()
  return <p>landed: {pathname + search}</p>
}
const probes = [
  { path: "/sign-in", Component: Probe },
  { path: "/checkout/thanks/:id", Component: Probe },
]

function fillCart(lines: [number, number][]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines.map(([productId, quantity]) => ({ productId, quantity }))))
  resetCart()
}

async function signedIn() {
  const auth = createMockAuth(localStorage)
  await auth.signIn(DEMO_USER.email, DEMO_USER.password)
  return auth
}

async function open(lines: [number, number][] = [[QADISHA, 1], [BATROUN, 2]]) {
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

  it("leaves out a line that can't be ordered any more, and says so", async () => {
    const user = await open([
      [NAHR, 1],
      [BATROUN, 1],
    ])
    const summary = screen.getByRole("complementary", { name: "Order summary" })
    expect(await within(summary).findByText("Batroun")).toBeInTheDocument()
    expect(within(summary).queryByText("Nahr")).not.toBeInTheDocument()
    expect(within(summary).getByText(/can no longer be ordered/)).toBeInTheDocument()
    await fillAddress(user)
    await user.click(screen.getByRole("button", { name: "Place order" }))
    await screen.findByText(/landed: \/checkout\/thanks\//)
    expect(placed()[0].items.map((i: { productId: number }) => i.productId)).toEqual([BATROUN])
    // The cart is emptied after an order, the line that couldn't be ordered too.
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([])
  })

  it.each(["PRICE_CHANGED", "UNAVAILABLE"])("on %s, sends the customer back to the cart with the server's words on that piece", async (code) => {
    const user = await open()
    await within(screen.getByRole("complementary", { name: "Order summary" })).findByText("Qadisha")
    await fillAddress(user)
    localStorage.setItem(DEMO_REFUSE_KEY, code)
    await user.click(screen.getByRole("button", { name: "Place order" }))
    await waitFor(() => expect(cart().open).toBe(true))
    expect(cart().notice).toMatchObject({ kind: "server", productId: QADISHA, message: expect.stringContaining("Qadisha") })
    expect(placed()).toEqual([])
    expect(screen.getByRole("heading", { level: 1, name: "Checkout" })).toBeInTheDocument()
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

  it("names a piece that no longer exists on its cart line", async () => {
    const user = await open()
    await within(screen.getByRole("complementary", { name: "Order summary" })).findByText("Qadisha")
    await fillAddress(user)
    // Qadisha is deleted between the page loading and the order.
    stubApi((list) => list.filter((piece) => piece.id !== QADISHA))
    await user.click(screen.getByRole("button", { name: "Place order" }))
    await waitFor(() => expect(cart().open).toBe(true))
    expect(cart().notice).toEqual({ kind: "server", productId: QADISHA, message: "One piece in your cart is no longer available." })
  })

  it("shows the empty state when nothing can be ordered", async () => {
    await open([])
    expect(await screen.findByText("Your selection is empty.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View the collection/ })).toHaveAttribute("href", "/collection")
    expect(screen.queryByRole("button", { name: "Place order" })).not.toBeInTheDocument()
  })
})
