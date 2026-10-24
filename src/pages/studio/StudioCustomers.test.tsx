import { screen, within } from "@testing-library/react"
import { STUDIO_COPY } from "@/features/studio/copy"
import { renderStudioAt } from "@/test/render-studio"
import { failure, fakeAdminAuth, ok, setupUser } from "@/test/studio"
import { adminCustomerDetailOf, adminCustomerOf, orderSummaryOf } from "@/test/studio-orders"
import StudioCustomer from "./StudioCustomer"
import StudioCustomers from "./StudioCustomers"

const t = STUDIO_COPY.customers
const auth = () => fakeAdminAuth({ signedInAs: "omar@example.com" })

function answer(response: () => Response) {
  const fetch = vi.fn(async (_url: string | URL | Request) => response())
  vi.stubGlobal("fetch", fetch)
  return fetch
}

const KARIM = "2c6d8b3f-5e4a-4b2c-8d9e-3f7a1b2c4d5e"

describe("the studio's customers list", () => {
  it("lists every customer, newest first, with name, email, phone, when they joined and their order count", async () => {
    answer(() =>
      ok([
        adminCustomerOf(KARIM, { name: "Karim Nassar", email: "karim@example.com", phone: "+96176543210", createdAt: "2026-10-14T11:05:00Z", orderCount: 1 }),
        adminCustomerOf("1b5c7a2e-4d3f-4a1b-9c8d-2e6f0a1b3c4d", { orderCount: 0 }),
      ]),
    )
    renderStudioAt(<StudioCustomers />, "/studio/customers", { auth: auth() })
    const rows = within(await screen.findByRole("list", { name: t.title })).getAllByRole("listitem")
    const first = rows[0]
    expect(within(first).getByRole("link")).toHaveAttribute("href", `/studio/customers/${KARIM}`)
    for (const text of ["Karim Nassar", "karim@example.com", "+961 76 543 210", "14 Oct 2026", "1 order"]) {
      expect(within(first).getAllByText(text).length).toBeGreaterThan(0)
    }
    expect(within(rows[1]).getAllByText("No orders").length).toBeGreaterThan(0)
    expect(screen.queryByText(/spent/i)).not.toBeInTheDocument()
  })

  it("says when there are no customers yet", async () => {
    answer(() => ok([]))
    renderStudioAt(<StudioCustomers />, "/studio/customers", { auth: auth() })
    expect(await screen.findByText(t.empty)).toBeInTheDocument()
  })

  it("says when the customers couldn't be loaded, and tries again", async () => {
    const fetch = answer(() => failure(500, "INTERNAL", "Something went wrong"))
    renderStudioAt(<StudioCustomers />, "/studio/customers", { auth: auth() })
    expect(await screen.findByRole("alert")).toHaveTextContent(t.loadFailed)
    fetch.mockImplementation(async () => ok([adminCustomerOf(KARIM)]))
    await setupUser().click(screen.getByRole("button", { name: t.retry }))
    expect(await screen.findByRole("list", { name: t.title })).toBeInTheDocument()
  })
})

describe("one customer in the studio", () => {
  function renderCustomer(response: () => Response) {
    const fetch = answer(response)
    renderStudioAt(<StudioCustomer />, `/studio/customers/${KARIM}`, { auth: auth(), pattern: "/studio/customers/:id" })
    return fetch
  }

  it("shows how to reach them and their orders, newest first, each linked", async () => {
    const fetch = renderCustomer(() =>
      ok(adminCustomerDetailOf(KARIM, [orderSummaryOf(8, { status: "confirmed" }), orderSummaryOf(3, { status: "delivered" })], { name: "Karim Nassar", phone: "+96176543210" })),
    )
    expect(await screen.findByRole("heading", { level: 1, name: "Karim Nassar" })).toBeInTheDocument()
    expect(String(fetch.mock.calls[0][0])).toMatch(new RegExp(`/admin/customers/${KARIM}$`))
    expect(screen.getByText("Customer since 30 Oct 2026")).toBeInTheDocument()
    expect(screen.getByText("+961 76 543 210")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "sara@example.com" })).toHaveAttribute("href", "mailto:sara@example.com")
    expect(screen.getByRole("link", { name: STUDIO_COPY.order.call })).toHaveAttribute("href", "tel:+96176543210")
    expect(screen.getByRole("link", { name: STUDIO_COPY.order.whatsapp })).toHaveAttribute("href", "https://wa.me/96176543210")
    const history = within(screen.getByRole("list", { name: t.history })).getAllByRole("listitem")
    expect(history.map((row) => within(row).getByRole("link").getAttribute("href"))).toEqual(["/studio/orders/8", "/studio/orders/3"])
    expect(screen.getByText("2 orders")).toBeInTheDocument()
    expect(screen.queryByText(/spent/i)).not.toBeInTheDocument()
  })

  it("says when the customer has no orders yet", async () => {
    renderCustomer(() => ok(adminCustomerDetailOf(KARIM, [])))
    expect(await screen.findByText(t.noOrders)).toBeInTheDocument()
  })

  it("says Customer not found as the API does, with a way back", async () => {
    renderCustomer(() => failure(404, "NOT_FOUND", "Customer not found"))
    expect(await screen.findByRole("heading", { level: 1, name: "Customer not found" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: `← ${t.back}` })).toHaveAttribute("href", "/studio/customers")
  })
})
