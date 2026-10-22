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
    expect(screen.getByText("Omar will call you to confirm your order. Nothing is due until your piece arrives.")).toBeInTheDocument()
    const steps = screen.getByRole("list", { name: "Next steps" })
    expect(within(steps).getAllByRole("listitem").map((li) => li.querySelector("h2")?.textContent)).toEqual(["Confirmation call", "Preparation", "Delivery", "Pay on arrival"])
    const summary = screen.getByRole("region", { name: "Summary" })
    expect(within(summary).getByText("Qadisha")).toBeInTheDocument()
    expect(within(summary).getByText("$360")).toBeInTheDocument()
    expect(within(summary).getByText("Total · Cash on delivery").nextSibling).toHaveTextContent("$1,250")
    const deliverTo = screen.getByRole("region", { name: "Deliver to" })
    expect(deliverTo).toHaveTextContent("Nour Haddad · +961 71 234 567")
    expect(deliverTo).toHaveTextContent("Main road, Haddad bldg, 3rd floor, Jounieh")
    expect(deliverTo).toHaveTextContent("Call before coming")
    expect(screen.getByRole("region", { name: "Gift" })).toHaveTextContent("“For the new house.”")
    expect(screen.getByText("Prices are hidden on the delivery slip.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View my orders/ })).toHaveAttribute("href", "/account")
    expect(screen.getByRole("link", { name: /Continue browsing/ })).toHaveAttribute("href", "/collection")
  })

  it("says so when the order isn't the customer's", async () => {
    const { auth } = await demoCustomer()
    renderAt(<p />, "/checkout/thanks/42", { auth, routes: [{ path: "/checkout/thanks/:id", Component: OrderPlaced }] })
    expect(await screen.findByText("This order couldn't be found.")).toBeInTheDocument()
  })
})
