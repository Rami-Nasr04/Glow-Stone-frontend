import { screen, within } from "@testing-library/react"
import { useLocation } from "react-router"
import { STUDIO_COPY } from "@/features/studio/copy"
import StudioShell from "@/features/studio/StudioShell"
import { renderStudioAt } from "@/test/render-studio"
import { failure, fakeAdminAuth, ok, setupUser } from "@/test/studio"
import { orderSummaryOf } from "@/test/studio-orders"
import StudioOrders from "./StudioOrders"

const t = STUDIO_COPY.orders
const auth = () => fakeAdminAuth({ signedInAs: "omar@example.com" })

const rows = () => [
  orderSummaryOf(9, { createdAt: "2026-11-06T14:03:00Z", isGift: true, itemCount: 1, total: 560, city: "Batroun" }),
  orderSummaryOf(8, { status: "confirmed", createdAt: "2026-11-05T09:00:00Z", customer: { id: "c2", name: "Karim Nassar", phone: "+96176543210" } }),
  orderSummaryOf(7, { status: "delivered", createdAt: "2026-11-01T09:00:00Z", total: 15.5 }),
  orderSummaryOf(6, { createdAt: "2026-10-30T09:00:00Z" }),
]

function answer(list = rows()) {
  const fetch = vi.fn(async () => ok(list))
  vi.stubGlobal("fetch", fetch)
  return fetch
}

function Address() {
  const { search } = useLocation()
  return <p>address: {search}</p>
}

function renderList(path = "/studio/orders") {
  return renderStudioAt(
    <>
      <StudioOrders />
      <Address />
    </>,
    path,
    { auth: auth(), pattern: "/studio/orders" },
  )
}

const listRows = async () => within(await screen.findByRole("list", { name: t.title })).getAllByRole("listitem")

describe("the studio's orders list", () => {
  it("lists every order newest first, each row one link to the order with what Omar needs to see", async () => {
    answer()
    renderList()
    const [first, second] = await listRows()
    const link = within(first).getByRole("link")
    expect(link).toHaveAttribute("href", "/studio/orders/9")
    for (const text of ["GS-0009", "6 Nov 2026, 16:03", "Sara Khoury", "+961 71 234 567", "Batroun", "1 piece", "$560", t.gift, STUDIO_COPY.status.pending]) {
      expect(within(first).getAllByText(text).length).toBeGreaterThan(0)
    }
    expect(within(second).getAllByText("Karim Nassar").length).toBeGreaterThan(0)
    expect(within(second).getAllByText("3 pieces").length).toBeGreaterThan(0)
    expect(within(second).queryByText(t.gift)).not.toBeInTheDocument()
  })

  it("keeps a fee's cents in the total", async () => {
    answer()
    renderList()
    const rowsShown = await listRows()
    expect(within(rowsShown[2]).getAllByText("$15.50").length).toBeGreaterThan(0)
  })

  it("highlights the pending orders, with the word in the badge so colour isn't the only sign", async () => {
    answer()
    renderList()
    const shown = await listRows()
    expect(shown.map((row) => row.hasAttribute("data-pending"))).toEqual([true, false, false, true])
    expect(within(shown[0]).getByText(STUDIO_COPY.status.pending)).toBeInTheDocument()
  })

  it("filters by status with a count on each choice, keeping the choice in the address", async () => {
    answer()
    renderList()
    const user = setupUser()
    const filters = await screen.findByRole("navigation", { name: t.filterLabel })
    expect(within(filters).getAllByRole("link").map((link) => link.textContent)).toEqual([
      `${t.all}4`,
      `${STUDIO_COPY.status.pending}2`,
      `${STUDIO_COPY.status.confirmed}1`,
      `${STUDIO_COPY.status.out_for_delivery}0`,
      `${STUDIO_COPY.status.delivered}1`,
      `${STUDIO_COPY.status.cancelled}0`,
    ])
    expect(within(filters).getByRole("link", { name: new RegExp(`^${t.all}`) })).toHaveAttribute("aria-current", "page")
    await user.click(within(filters).getByRole("link", { name: new RegExp(`^${STUDIO_COPY.status.pending}`) }))
    expect(await screen.findByText("address: ?status=pending")).toBeInTheDocument()
    expect((await listRows()).map((row) => within(row).getByRole("link").getAttribute("href"))).toEqual(["/studio/orders/9", "/studio/orders/6"])
  })

  it("opens on the filter in the address", async () => {
    answer()
    renderList("/studio/orders?status=delivered")
    expect(await listRows()).toHaveLength(1)
  })

  it("shows every order for a status it doesn't know", async () => {
    answer()
    renderList("/studio/orders?status=lost")
    expect(await listRows()).toHaveLength(4)
  })

  it("says when there are no orders yet, or none with the chosen status", async () => {
    answer([])
    const { unmount } = renderList()
    expect(await screen.findByText(t.empty)).toBeInTheDocument()
    unmount()
    answer()
    renderList("/studio/orders?status=cancelled")
    expect(await screen.findByText(t.emptyBy.cancelled)).toBeInTheDocument()
  })

  // As on Products: a list that can't be read has nothing to act on, so it says so and offers to try again.
  it("says when the orders couldn't be loaded, and tries again", async () => {
    const fetch = vi.fn(async () => failure(500, "INTERNAL", "Something went wrong"))
    vi.stubGlobal("fetch", fetch)
    renderList()
    expect(await screen.findByRole("alert")).toHaveTextContent(t.loadFailed)
    fetch.mockImplementation(async () => ok(rows()))
    await setupUser().click(screen.getByRole("button", { name: t.retry }))
    expect(await listRows()).toHaveLength(4)
  })

  it("reads the orders once inside the shell: the list hands the pending count over", async () => {
    const fetch = answer()
    renderStudioAt(
      <StudioShell>
        <StudioOrders />
      </StudioShell>,
      "/studio/orders",
      { auth: auth() },
    )
    expect(await screen.findAllByRole("link", { name: `${STUDIO_COPY.shell.orders}, 2 pending` })).toHaveLength(3)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
