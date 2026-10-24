import { screen, within } from "@testing-library/react"
import Landed from "@/test/Landed"
import { renderStudioAt } from "@/test/render-studio"
import { fakeAdminAuth, ok } from "@/test/studio"
import { orderSummaryOf } from "@/test/studio-orders"
import { STUDIO_COPY } from "./copy"
import { usePendingOrders } from "./pending-orders"
import StudioShell from "./StudioShell"

const s = STUDIO_COPY.shell
const signedIn = () => fakeAdminAuth({ signedInAs: "omar@example.com" })
const routes = [{ path: "/studio/sign-in", Component: Landed }]

function renderShell(auth = signedIn(), path = "/studio/products", body: React.ReactNode = <p>page body</p>) {
  return renderStudioAt(<StudioShell>{body}</StudioShell>, path, { auth, routes })
}

function answerOrders(rows: ReturnType<typeof orderSummaryOf>[]) {
  const fetch = vi.fn(async () => ok(rows))
  vi.stubGlobal("fetch", fetch)
  return fetch
}

const three = () => [orderSummaryOf(9), orderSummaryOf(8), orderSummaryOf(7, { status: "confirmed" })]


describe("the studio shell", () => {
  it("frames the page with the studio's navigation, the admin's email and a way to the shop", async () => {
    renderShell()
    expect(screen.getByRole("main")).toHaveTextContent("page body")
    const nav = screen.getAllByRole("navigation", { name: s.navLabel })[0]
    expect(within(nav).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/studio/orders", "/studio/products", "/studio/customers"])
    expect(within(nav).getByRole("link", { name: s.products })).toHaveAttribute("aria-current", "page")
    expect(await screen.findAllByText("omar@example.com")).not.toHaveLength(0)
    for (const shop of screen.getAllByRole("link", { name: new RegExp(`^(${s.viewShop}|${s.shop})`) })) {
      expect(shop).toHaveAttribute("href", "/")
      expect(shop).toHaveAttribute("target", "_blank")
      expect(shop).toHaveAttribute("rel", "noopener noreferrer")
    }
  })

  // Its height is a token the page's scroll padding uses too (tests/theme.test.ts), so it never covers a control.
  it("marks the phone header, sized by the token the page keeps clear", () => {
    renderShell()
    const header = document.querySelector("[data-studio-header]")
    expect(header?.tagName).toBe("HEADER")
    expect(header?.className).toContain("h-(--studio-header)")
  })

  it("offers a skip link to the page", () => {
    renderShell()
    expect(screen.getAllByRole("link", { name: "Skip to content" })[0]).toHaveAttribute("href", "#main")
  })

  it("signs out through the sign-out page, so an open form can ask first", () => {
    renderShell()
    for (const link of screen.getAllByRole("link", { name: s.signOut })) expect(link).toHaveAttribute("href", "/studio/sign-out")
  })

  it("shows how many orders are pending next to Orders, everywhere the navigation is", async () => {
    answerOrders(three())
    renderShell()
    const links = await screen.findAllByRole("link", { name: `${s.orders}, 2 pending` })
    expect(links).toHaveLength(3)
  })

  it("shows no count when nothing is pending, or when the orders couldn't be read", async () => {
    const fetch = answerOrders([orderSummaryOf(7, { status: "delivered" })])
    renderShell()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.getAllByRole("link", { name: s.orders })).toHaveLength(3)
  })

  it("counts the orders a page already has instead of asking again (the Orders list)", async () => {
    const fetch = answerOrders([])
    function ListPage() {
      const { report } = usePendingOrders()
      return <button onClick={() => report(three())}>loaded</button>
    }
    renderShell(signedIn(), "/studio/orders", <ListPage />)
    screen.getByRole("button", { name: "loaded" }).click()
    expect(await screen.findAllByRole("link", { name: `${s.orders}, 2 pending` })).toHaveLength(3)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("asks again when a page changed an order (a step forward, a cancel)", async () => {
    const fetch = answerOrders([orderSummaryOf(9)])
    function OrderPage() {
      const { refresh } = usePendingOrders()
      return <button onClick={refresh}>changed</button>
    }
    renderShell(signedIn(), "/studio/orders/9", <OrderPage />)
    expect(await screen.findAllByRole("link", { name: `${s.orders}, 1 pending` })).toHaveLength(3)
    fetch.mockImplementation(async () => ok([orderSummaryOf(9, { status: "confirmed" })]))
    screen.getByRole("button", { name: "changed" }).click()
    await vi.waitFor(() => expect(screen.getAllByRole("link", { name: s.orders })).toHaveLength(3))
  })

  // Phones get the prototype's bottom tab bar; its height is a token the page keeps clear, like the header's.
  it("gives phones a bottom tab bar, sized by its token", () => {
    renderShell()
    const bar = document.querySelector("[data-studio-tab-bar]")
    expect(bar?.tagName).toBe("NAV")
    expect(bar?.className).toContain("h-(--studio-tab-bar)")
    expect(bar?.className).toContain("sm:hidden")
  })

  it("opens the studio's home on Orders from the logo", () => {
    renderShell()
    for (const home of screen.getAllByRole("link", { name: s.home })) expect(home).toHaveAttribute("href", "/studio/orders")
  })
})
