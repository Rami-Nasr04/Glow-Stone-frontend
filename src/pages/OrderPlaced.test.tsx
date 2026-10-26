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
    expect(screen.getByText("Omar will call you within 2 business days to confirm your order. You then pay by Whish or OMT; the recipient pays nothing.")).toBeInTheDocument()
    const steps = screen.getByRole("list", { name: "Next steps" })
    expect(within(steps).getAllByRole("listitem").map((li) => li.querySelector("h2")?.textContent)).toEqual(["Confirmation call", "Preparation", "Delivery", "Payment"])
    const summary = screen.getByRole("region", { name: "Summary" })
    expect(within(summary).getByText("Qadisha")).toBeInTheDocument()
    expect(within(summary).getByText("$360")).toBeInTheDocument()
    expect(within(summary).getByText("Total · Whish or OMT, from you").nextSibling).toHaveTextContent("$1,250")
    const deliverTo = screen.getByRole("region", { name: "Deliver to" })
    expect(deliverTo).toHaveTextContent("Nour Haddad · +961 71 234 567")
    expect(deliverTo).toHaveTextContent("Main road, Haddad bldg, 3rd floor, Jounieh")
    expect(deliverTo).toHaveTextContent("Call before coming")
    expect(screen.getByRole("region", { name: "Gift" })).toHaveTextContent("“For the new house.”")
    expect(screen.getByText("Prices are hidden on the delivery slip.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View my orders/ })).toHaveAttribute("href", "/account")
    expect(screen.getByRole("link", { name: /Continue browsing/ })).toHaveAttribute("href", "/collection")
  })

  it("says how the buyer pays a gift order, and nothing of the kind otherwise", async () => {
    const { auth, orders } = await demoCustomer()
    const gift = await placeOrder(orders, { isGift: true, giftMessage: "For the new house." })
    const plain = await placeOrder(orders, { items: [{ productId: 1, quantity: 1, unitPrice: 420 }] })
    const view = renderAt(<p />, `/checkout/thanks/${gift.id}`, { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    expect(await screen.findByRole("region", { name: "Gift" })).toHaveTextContent("You pay by Whish or OMT once Omar has called and confirmed the order. The recipient pays nothing.")
    view.unmount()
    renderAt(<p />, `/checkout/thanks/${plain.id}`, { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    await screen.findByRole("heading", { level: 1 })
    expect(screen.queryByText("You pay by Whish or OMT once Omar has called and confirmed the order. The recipient pays nothing.")).not.toBeInTheDocument()
  })

  // Backend QA, 2026-10-25: a gift's buyer pays, as arranged on Omar's call, never the recipient on arrival.
  it("words the call, the payment step and the total for a gift as the buyer paying, and keeps cash on arrival otherwise", async () => {
    const { auth, orders } = await demoCustomer()
    const gift = await placeOrder(orders, { isGift: true, giftMessage: "For the new house." })
    const plain = await placeOrder(orders, { items: [{ productId: 1, quantity: 1, unitPrice: 420 }] })
    const steps = () => within(screen.getByRole("list", { name: "Next steps" })).getAllByRole("listitem")
    const view = renderAt(<p />, `/checkout/thanks/${gift.id}`, { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    expect(await screen.findByText("Omar will call you within 2 business days to confirm your order. You then pay by Whish or OMT; the recipient pays nothing.")).toBeInTheDocument()
    expect(steps()[3]).toHaveTextContent("Payment")
    expect(steps()[3]).toHaveTextContent("You pay by Whish or OMT once Omar has confirmed the order.")
    expect(screen.getByText("Total · Whish or OMT, from you")).toBeInTheDocument()
    expect(screen.queryByText(/Nothing is due until|Pay in cash|on delivery/)).not.toBeInTheDocument()
    view.unmount()
    renderAt(<p />, `/checkout/thanks/${plain.id}`, { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    expect(await screen.findByText("Omar will call you within 2 business days to confirm your order. Nothing is due until your piece arrives.")).toBeInTheDocument()
    expect(steps()[3]).toHaveTextContent("Pay on arrival")
    // Omar's answers, 2026-10-26: the call within 2 business days, delivery in about a week, the courier on the day.
    expect(steps()[0]).toHaveTextContent("Within 2 business days, Omar calls to confirm the piece and the address.")
    expect(steps()[2]).toHaveTextContent(
      "Free delivery all over Lebanon, usually in about a week. On the day, the courier calls or WhatsApps the phone number given with the order.",
    )
    expect(screen.queryByText(/Placeholder/)).not.toBeInTheDocument()
    expect(screen.getByText("Total · Cash on delivery")).toBeInTheDocument()
  })

  it("says so when the order isn't the customer's", async () => {
    const { auth } = await demoCustomer()
    renderAt(<p />, "/checkout/thanks/42", { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    expect(await screen.findByText("This order couldn't be found.")).toBeInTheDocument()
  })
})
