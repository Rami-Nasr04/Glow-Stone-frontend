import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useLocation } from "react-router"
import RequireAuth from "@/features/auth/RequireAuth"
import { DEMO_REFUSE_KEY } from "@/features/orders/demo-api"
import { demoCustomer, placeOrder } from "@/test/orders"
import { renderAt } from "@/test/render"
import Account from "./Account"
import AccountOrder from "./AccountOrder"

function Probe() {
  const { pathname, search } = useLocation()
  return <p>landed: {pathname + search}</p>
}

describe("Account", () => {
  it("greets the customer and lists their orders: number, date, status, items and total", async () => {
    const { auth, orders } = await demoCustomer()
    await placeOrder(orders, { items: [{ productId: 3, quantity: 1, unitPrice: 180 }] })
    const second = await placeOrder(orders, { items: [{ productId: 5, quantity: 1, unitPrice: 890 }, { productId: 3, quantity: 2, unitPrice: 180 }] })
    await orders.cancel(second.id)
    renderAt(<Account />, "/account", { auth })
    expect(await screen.findByRole("heading", { level: 1, name: "Hello, Nour." })).toBeInTheDocument()
    const rows = await screen.findAllByRole("link", { name: /^Order GS-/ })
    expect(rows.map((r) => r.getAttribute("href"))).toEqual(["/account/orders/2", "/account/orders/1"])
    expect(rows[0]).toHaveTextContent("GS-0002")
    // The prototype's row: each piece by name, "× n" when there are several.
    expect(rows[0]).toHaveTextContent("Batroun × 2, Qadisha")
    expect(rows[0]).toHaveTextContent("$1,250")
    expect(rows[0]).toHaveTextContent("Cancelled")
    expect(rows[1]).toHaveTextContent("Batroun")
    expect(rows[1]).toHaveTextContent("Pending")
    expect(rows[1]).toHaveTextContent(/\d{1,2} [A-Z][a-z]+ 20\d\d/)
  })

  it("on a 401, sends the customer to sign in and back to the account", async () => {
    const { auth } = await demoCustomer()
    localStorage.setItem(DEMO_REFUSE_KEY, "UNAUTHORIZED")
    renderAt(<Account />, "/account", { auth, routes: [{ path: "/sign-in", Component: Probe }] })
    expect(await screen.findByText("landed: /sign-in?next=%2Faccount")).toBeInTheDocument()
  })

  it("on a 403, signs out to sign-in and back here, inside RequireAuth as the route has it", async () => {
    const { auth } = await demoCustomer()
    localStorage.setItem(DEMO_REFUSE_KEY, "FORBIDDEN")
    const user = userEvent.setup({ delay: null })
    const slow = () => new Promise((done) => setTimeout(() => done(null), 50))
    renderAt(
      <RequireAuth>
        <Account />
      </RequireAuth>,
      "/account",
      { auth, routes: [{ path: "/sign-in", Component: Probe, loader: slow }] },
    )
    await user.click(await screen.findByRole("button", { name: "Sign out" }))
    expect(await screen.findByText("landed: /sign-in?next=%2Faccount")).toBeInTheDocument()
    expect(await auth.currentUser()).toBeNull()
  })

  it("on a 403, shows the server's words and signs out from there", async () => {
    const { auth } = await demoCustomer()
    localStorage.setItem(DEMO_REFUSE_KEY, "FORBIDDEN")
    const user = userEvent.setup({ delay: null })
    renderAt(<Account />, "/account", { auth, routes: [{ path: "/sign-in", Component: Probe }] })
    expect(await screen.findByRole("alert")).toHaveTextContent("Your account isn't ready yet. Please sign out and sign in again.")
    await user.click(screen.getByRole("button", { name: "Sign out" }))
    expect(await screen.findByText("landed: /sign-in?next=%2Faccount")).toBeInTheDocument()
    expect(await auth.currentUser()).toBeNull()
  })

  it("says when there are no orders yet", async () => {
    const { auth } = await demoCustomer()
    renderAt(<Account />, "/account", { auth })
    expect(await screen.findByText("No orders yet.")).toBeInTheDocument()
  })

  it("shows the profile from GET /me, read only", async () => {
    const { auth } = await demoCustomer()
    const user = userEvent.setup({ delay: null })
    renderAt(<Account />, "/account", { auth })
    await user.click(await screen.findByRole("tab", { name: "Profile" }))
    const profile = screen.getByRole("tabpanel", { name: "Profile" })
    expect(within(profile).getByText("Nour Haddad")).toBeInTheDocument()
    expect(within(profile).getByText("demo@glowstone.test")).toBeInTheDocument()
    expect(within(profile).getByText("+961 71 234 567")).toBeInTheDocument()
    expect(within(profile).queryByRole("textbox")).not.toBeInTheDocument()
  })

  // The route wraps the page in RequireAuth, which sends a signed-out visitor to sign in: going home must win.
  it("signs out and goes home, not to sign-in, inside RequireAuth as the route has it", async () => {
    const { auth } = await demoCustomer()
    const user = userEvent.setup({ delay: null })
    renderAt(
      <RequireAuth>
        <Account />
      </RequireAuth>,
      "/account",
      {
        auth,
        routes: [
          // Like the real home route, whose code loads first: the navigation finishes a moment later.
          { path: "/", Component: Probe, loader: () => new Promise((done) => setTimeout(() => done(null), 50)) },
          { path: "/sign-in", Component: Probe },
        ],
      },
    )
    await user.click(await screen.findByRole("button", { name: "Sign out" }))
    expect(await screen.findByText("landed: /")).toBeInTheDocument()
    expect(await auth.currentUser()).toBeNull()
  })

  it("signs out and goes home", async () => {
    const { auth } = await demoCustomer()
    const user = userEvent.setup({ delay: null })
    renderAt(<Account />, "/account", { auth, routes: [{ path: "/", Component: Probe }] })
    await user.click(await screen.findByRole("button", { name: "Sign out" }))
    expect(await screen.findByText("landed: /")).toBeInTheDocument()
    expect(await auth.currentUser()).toBeNull()
  })
})

describe("AccountOrder", () => {
  it("ticks the timeline up to the current status, with only the order date, and shows what, where and how much", async () => {
    const { auth, orders } = await demoCustomer()
    const order = await placeOrder(orders, { recipient: { name: "Maya Saad", phone: "+9613123456" }, isGift: true, giftMessage: "For the new house." })
    renderAt(<p />, `/account/orders/${order.id}`, { auth, routes: [{ path: "/account/orders/:id", Component: AccountOrder }] })
    expect(await screen.findByRole("heading", { level: 1, name: "Order GS-0001" })).toBeInTheDocument()
    const steps = within(screen.getByRole("list", { name: "Progress" })).getAllByRole("listitem")
    expect(steps.map((s) => s.querySelector("h3")?.textContent)).toEqual(["Order placed · now", "Confirmed by phone", "Out for delivery", "Delivered"])
    expect(steps[0]).toHaveAttribute("data-done", "true")
    expect(steps[1]).toHaveAttribute("data-done", "false")
    expect(steps[0]).toHaveTextContent(/\d{1,2} [A-Z][a-z]+ 20\d\d/)
    expect(steps[1]).not.toHaveTextContent(/20\d\d/)
    expect(screen.getByRole("region", { name: "Summary" })).toHaveTextContent("$1,250")
    // Each line: the piece, its stone and colour, and how many.
    expect(screen.getByText("Limestone · Cream · Qty 1")).toBeInTheDocument()
    expect(screen.getByText("Limestone · Taupe · Qty 2")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Deliver to" })).toHaveTextContent("Maya Saad · +961 3 123 456")
    expect(screen.getByRole("region", { name: "Gift" })).toHaveTextContent("“For the new house.”")
    expect(screen.getByRole("region", { name: "Gift" })).toHaveTextContent("You pay by Whish or OMT once Omar has called and confirmed the order. The recipient pays nothing.")
    expect(screen.getByRole("link", { name: /All orders/ })).toHaveAttribute("href", "/account")
  })

  it("on a 401 while cancelling, sends the customer to sign in and back to the order", async () => {
    const { auth, orders } = await demoCustomer()
    const order = await placeOrder(orders)
    const user = userEvent.setup({ delay: null })
    renderAt(<p />, `/account/orders/${order.id}`, {
      auth,
      routes: [
        { path: "/account/orders/:id", Component: AccountOrder },
        { path: "/sign-in", Component: Probe },
      ],
    })
    await user.click(await screen.findByRole("button", { name: "Cancel order" }))
    localStorage.setItem(DEMO_REFUSE_KEY, "UNAUTHORIZED")
    await user.click(screen.getByRole("button", { name: "Yes, cancel it" }))
    expect(await screen.findByText(`landed: /sign-in?next=${encodeURIComponent(`/account/orders/${order.id}`)}`)).toBeInTheDocument()
    expect(await orders.get(order.id)).toMatchObject({ status: "pending" })
  })

  it("cancels a pending order after asking, and the timeline turns to cancelled", async () => {
    const { auth, orders } = await demoCustomer()
    const order = await placeOrder(orders)
    const user = userEvent.setup({ delay: null })
    renderAt(<p />, `/account/orders/${order.id}`, { auth, routes: [{ path: "/account/orders/:id", Component: AccountOrder }] })
    await user.click(await screen.findByRole("button", { name: "Cancel order" }))
    expect(screen.getByText("Cancel this order? Its pieces go back to the collection.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Keep it" }))
    expect(await orders.get(order.id)).toMatchObject({ status: "pending" })
    await user.click(screen.getByRole("button", { name: "Cancel order" }))
    await user.click(screen.getByRole("button", { name: "Yes, cancel it" }))
    expect(await screen.findByText("Your order has been cancelled.")).toBeInTheDocument()
    const steps = within(screen.getByRole("list", { name: "Progress" })).getAllByRole("listitem")
    expect(steps.map((s) => s.querySelector("h3")?.textContent)).toEqual(["Order placed", "Cancelled · now"])
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument()
  })

  it("on a 409, shows the server's message and the order as it is now", async () => {
    const { auth, orders } = await demoCustomer()
    const order = await placeOrder(orders)
    const user = userEvent.setup({ delay: null })
    renderAt(<p />, `/account/orders/${order.id}`, { auth, routes: [{ path: "/account/orders/:id", Component: AccountOrder }] })
    await user.click(await screen.findByRole("button", { name: "Cancel order" }))
    await orders.cancel(order.id) // cancelled meanwhile (on another device, or by Omar)
    await user.click(screen.getByRole("button", { name: "Yes, cancel it" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("This order can no longer be cancelled. Please contact Omar.")
    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument())
  })

  it("offers no cancel once the order isn't pending", async () => {
    const { auth, orders } = await demoCustomer()
    const order = await placeOrder(orders)
    await orders.cancel(order.id)
    renderAt(<p />, `/account/orders/${order.id}`, { auth, routes: [{ path: "/account/orders/:id", Component: AccountOrder }] })
    await screen.findByRole("heading", { level: 1, name: "Order GS-0001" })
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument()
  })

  it("says so for an order that isn't the customer's", async () => {
    const { auth } = await demoCustomer()
    renderAt(<p />, "/account/orders/9", { auth, routes: [{ path: "/account/orders/:id", Component: AccountOrder }] })
    expect(await screen.findByText("This order couldn't be found.")).toBeInTheDocument()
  })
})
