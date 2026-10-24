import { screen, within } from "@testing-library/react"
import { demoCustomer, placeOrder } from "@/test/orders"
import { renderAt } from "@/test/render"
import OrderPlaced from "./OrderPlaced"

describe("OrderPlaced (the confirmation)", () => {
  it("thanks the customer with the order number, Omar's call, the next steps and the summary", async () => {
    const { auth, orders } = await demoCustomer()
    const order = await placeOrder(orders, { isGift: true, giftMessage: "For the new house." })
    renderAt(<p />, `/checkout/thanks/${order.id}`, { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    expect(await screen.findByRole("heading", { level: 1, name: "Thank you." })).toBeInTheDocument()
    expect(screen.getByText("Order GS-0001")).toBeInTheDocument()
    expect(screen.getByText("Omar will call you to confirm your order and arrange the payment. The recipient pays nothing.")).toBeInTheDocument()
    const steps = screen.getByRole("list", { name: "Next steps" })
    expect(within(steps).getAllByRole("listitem").map((li) => li.querySelector("h2")?.textContent)).toEqual(["Confirmation call", "Preparation", "Delivery", "Payment"])
    const summary = screen.getByRole("region", { name: "Summary" })
    expect(within(summary).getByText("Qadisha")).toBeInTheDocument()
    expect(within(summary).getByText("$360")).toBeInTheDocument()
    expect(within(summary).getByText("Total · Cash, arranged with Omar").nextSibling).toHaveTextContent("$1,250")
    const deliverTo = screen.getByRole("region", { name: "Deliver to" })
    expect(deliverTo).toHaveTextContent("Nour Haddad · +961 71 234 567")
    expect(deliverTo).toHaveTextContent("Main road, Haddad bldg, 3rd floor, Jounieh")
    expect(deliverTo).toHaveTextContent("Call before coming")
    expect(screen.getByRole("region", { name: "Gift" })).toHaveTextContent("“For the new house.”")
    expect(screen.getByText("Prices are hidden on the delivery slip.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View my orders/ })).toHaveAttribute("href", "/account")
    expect(screen.getByRole("link", { name: /Continue browsing/ })).toHaveAttribute("href", "/collection")
  })

  it("says Omar will arrange the payment for a gift order, and nothing of the kind otherwise", async () => {
    const { auth, orders } = await demoCustomer()
    const gift = await placeOrder(orders, { isGift: true, giftMessage: "For the new house." })
    const plain = await placeOrder(orders, { items: [{ productId: 1, quantity: 1, unitPrice: 420 }] })
    const view = renderAt(<p />, `/checkout/thanks/${gift.id}`, { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    expect(await screen.findByRole("region", { name: "Gift" })).toHaveTextContent("Omar will contact you to arrange the payment.")
    view.unmount()
    renderAt(<p />, `/checkout/thanks/${plain.id}`, { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    await screen.findByRole("heading", { level: 1 })
    expect(screen.queryByText("Omar will contact you to arrange the payment.")).not.toBeInTheDocument()
  })

  // Backend QA, 2026-10-25: a gift's buyer pays, as arranged on Omar's call, never the recipient on arrival.
  it("words the call, the payment step and the total for a gift as the buyer paying, and keeps cash on arrival otherwise", async () => {
    const { auth, orders } = await demoCustomer()
    const gift = await placeOrder(orders, { isGift: true, giftMessage: "For the new house." })
    const plain = await placeOrder(orders, { items: [{ productId: 1, quantity: 1, unitPrice: 420 }] })
    const steps = () => within(screen.getByRole("list", { name: "Next steps" })).getAllByRole("listitem")
    const view = renderAt(<p />, `/checkout/thanks/${gift.id}`, { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    expect(await screen.findByText("Omar will call you to confirm your order and arrange the payment. The recipient pays nothing.")).toBeInTheDocument()
    expect(steps()[3]).toHaveTextContent("Payment")
    expect(steps()[3]).toHaveTextContent("You pay, not the recipient, as arranged on Omar's call.")
    expect(screen.getByText("Total · Cash, arranged with Omar")).toBeInTheDocument()
    expect(screen.queryByText(/Nothing is due until|Pay in cash when|Cash on delivery/)).not.toBeInTheDocument()
    view.unmount()
    renderAt(<p />, `/checkout/thanks/${plain.id}`, { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    expect(await screen.findByText("Omar will call you to confirm your order. Nothing is due until your piece arrives.")).toBeInTheDocument()
    expect(steps()[3]).toHaveTextContent("Pay on arrival")
    expect(screen.getByText("Total · Cash on delivery")).toBeInTheDocument()
  })

  it("says so when the order isn't the customer's", async () => {
    const { auth } = await demoCustomer()
    renderAt(<p />, "/checkout/thanks/42", { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    expect(await screen.findByText("This order couldn't be found.")).toBeInTheDocument()
  })
})
