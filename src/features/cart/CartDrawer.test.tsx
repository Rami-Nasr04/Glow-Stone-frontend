import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PRODUCTS, stubApi } from "@/test/catalog"
import { renderAt } from "@/test/render"
import { addToCart, CART_KEY, closeCart, openCart } from "./cart"
import CartDrawer from "./CartDrawer"

const SANNINE = 6 // $560, 2 remaining
const QADISHA = 5 // $890, 4 remaining
const BATROUN = 3 // $180, 9 remaining
const NAHR = 2 // sold out

function fill(lines: [number, number][]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines.map(([productId, quantity]) => ({ productId, quantity }))))
}

async function openWith(lines: [number, number][]) {
  fill(lines)
  const user = userEvent.setup()
  renderAt(<CartDrawer />)
  await user.click(screen.getByRole("button", { name: /^Cart/ }))
  return { user, drawer: screen.getByRole("dialog", { name: "Your selection" }) }
}

const lineOf = (name: string) => screen.getByRole("heading", { name }).closest("li")!

describe("CartDrawer", () => {
  it("names the cart button with the piece count, and keeps the visible number out of the name", () => {
    renderAt(<CartDrawer />)
    expect(screen.getByRole("button", { name: "Cart, empty" })).toBeInTheDocument()
    act(() => void addToCart(BATROUN, 2, 9))
    act(() => closeCart())
    expect(screen.getByRole("button", { name: "Cart, 2 pieces" })).toBeInTheDocument()
    expect(screen.getByText("2", { selector: "[aria-hidden=true]" })).toBeInTheDocument()
  })

  it("shows the empty state without asking the API anything", async () => {
    const fetch = stubApi()
    const { drawer } = await openWith([])
    expect(within(drawer).getByText("Your selection is empty.", { selector: "p:not([role=status])" })).toBeInTheDocument()
    expect(within(drawer).getByRole("link", { name: /View the collection/ })).toHaveAttribute("href", "/collection")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("reads names, photos, prices and stock from the API, and adds up the subtotal", async () => {
    stubApi()
    const { drawer } = await openWith([
      [QADISHA, 1],
      [BATROUN, 2],
    ])
    const qadisha = await screen.findByRole("heading", { name: "Qadisha" })
    expect(within(lineOf("Qadisha")).getByText("$890")).toBeInTheDocument()
    expect(within(lineOf("Qadisha")).getByText("Cream limestone")).toBeInTheDocument()
    expect(within(lineOf("Batroun")).getByText("$360")).toBeInTheDocument()
    expect(qadisha.closest("li")!.querySelector("a")).toHaveAttribute("href", "/collection/5/qadisha")
    expect(qadisha.closest("li")!.querySelector("img")).toHaveAttribute("src", expect.stringContaining("cloudfront"))
    const totals = within(drawer).getByRole("list", { name: "Totals" })
    expect(within(totals).getByText("Subtotal").nextSibling).toHaveTextContent("$1,250")
    expect(within(totals).getByText("Delivery").nextSibling).toHaveTextContent("Free")
    expect(within(totals).getByText("Total").nextSibling).toHaveTextContent("$1,250")
    expect(within(drawer).getByText("Free delivery across Lebanon · Cash on delivery")).toBeInTheDocument()
  })

  it("shows a calm loading line while the latest prices come in", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
    const { drawer } = await openWith([[BATROUN, 1]])
    expect(within(drawer).getByText("Loading the latest prices…")).toHaveAttribute("role", "status")
    expect(within(drawer).queryByRole("list", { name: "Totals" })).not.toBeInTheDocument()
  })

  it("marks a sold-out piece, dims it, leaves it out of the total, and lets it be removed", async () => {
    stubApi()
    const { user, drawer } = await openWith([
      [NAHR, 1],
      [BATROUN, 1],
    ])
    const nahr = (await screen.findByRole("heading", { name: "Nahr" })).closest("li")!
    expect(within(nahr).getByText("Sold out")).toBeInTheDocument()
    expect(nahr.querySelector(".grayscale-70")).not.toBeNull()
    expect(within(nahr).queryByRole("button", { name: /One more/ })).not.toBeInTheDocument()
    expect(within(within(drawer).getByRole("list", { name: "Totals" })).getByText("Subtotal").nextSibling).toHaveTextContent("$180")
    await user.click(within(nahr).getByRole("button", { name: "Remove Nahr" }))
    expect(screen.queryByRole("heading", { name: "Nahr" })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([{ productId: BATROUN, quantity: 1 }])
  })

  it("says a piece that left the collection is no longer available, with Remove", async () => {
    stubApi()
    const { user } = await openWith([
      [99, 1],
      [BATROUN, 1],
    ])
    await screen.findByRole("heading", { name: "Batroun" })
    const gone = screen.getByText("No longer available").closest("li")!
    expect(within(gone).getByRole("heading", { name: "A Glowstone piece" })).toBeInTheDocument()
    await user.click(within(gone).getByRole("button", { name: "Remove A Glowstone piece" }))
    expect(screen.queryByText("No longer available")).not.toBeInTheDocument()
  })

  it("lowers a line to the pieces left and says so", async () => {
    stubApi()
    await openWith([[SANNINE, 3]])
    const line = (await screen.findByRole("heading", { name: "Sannine" })).closest("li")!
    expect(within(line).getByText("Only 2 left in this edition, so your cart now holds 2.")).toBeInTheDocument()
    expect(within(line).getByRole("status")).toHaveTextContent("2")
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([{ productId: SANNINE, quantity: 2 }])
  })

  it("stops + at the pieces remaining", async () => {
    stubApi()
    const { user } = await openWith([[SANNINE, 1]])
    const line = (await screen.findByRole("heading", { name: "Sannine" })).closest("li")!
    expect(within(line).getByText("Up to 2 remaining.")).toBeInTheDocument()
    await user.click(within(line).getByRole("button", { name: "One more Sannine" }))
    expect(within(line).getByRole("status")).toHaveTextContent("2")
    expect(within(line).getByRole("button", { name: "One more Sannine" })).toBeDisabled()
    expect(within(line).getByRole("button", { name: "One fewer Sannine" })).toBeEnabled()
  })

  it("stops + at 5 pieces in all and points to Omar for larger orders", async () => {
    stubApi()
    const { user, drawer } = await openWith([
      [BATROUN, 4],
      [QADISHA, 1],
    ])
    const line = (await screen.findByRole("heading", { name: "Batroun" })).closest("li")!
    await user.click(within(line).getByRole("button", { name: "One more Batroun" }))
    expect(within(line).getByRole("status")).toHaveTextContent("4")
    expect(within(drawer).getByText("For larger orders, please contact Omar.")).toBeInTheDocument()
    expect(within(drawer).getByRole("link", { name: "Contact Omar" })).toHaveAttribute("href", "/contact")
  })

  it("shows the lines without prices or a total when the API can't be reached, and tries again", async () => {
    const fetch = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")))
    vi.stubGlobal("fetch", fetch)
    const { user, drawer } = await openWith([[BATROUN, 2]])
    expect(await within(drawer).findByText("Couldn't load the latest prices.")).toBeInTheDocument()
    expect(within(drawer).getByText("Quantity: 2")).toBeInTheDocument()
    expect(within(drawer).queryByText(/\$/)).not.toBeInTheDocument()
    expect(within(drawer).queryByRole("list", { name: "Totals" })).not.toBeInTheDocument()
    stubApi()
    await user.click(within(drawer).getByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("heading", { name: "Batroun" })).toBeInTheDocument()
    expect(within(lineOf("Batroun")).getByText("$360")).toBeInTheDocument()
    expect(within(drawer).queryByText("Couldn't load the latest prices.")).not.toBeInTheDocument()
  })

  it("keeps Checkout in view but says ordering opens soon, in the drawer", async () => {
    stubApi()
    const { user, drawer } = await openWith([[BATROUN, 1]])
    await screen.findByRole("heading", { name: "Batroun" })
    await user.click(within(drawer).getByRole("button", { name: "Checkout" }))
    expect(within(drawer).getByText("Online ordering opens soon. Write to Omar to reserve this piece.")).toBeInTheDocument()
  })

  it("disables Checkout when nothing in the cart can be ordered", async () => {
    stubApi()
    const { drawer } = await openWith([[NAHR, 1]])
    await screen.findByRole("heading", { name: "Nahr" })
    expect(within(drawer).getByRole("button", { name: "Checkout" })).toBeDisabled()
  })

  it("tells screen readers the count when it changes", async () => {
    stubApi()
    const { user, drawer } = await openWith([[BATROUN, 1]])
    const line = (await screen.findByRole("heading", { name: "Batroun" })).closest("li")!
    const count = within(drawer).getByText("1 piece in your selection.")
    expect(count).toHaveAttribute("role", "status")
    await user.click(within(line).getByRole("button", { name: "One more Batroun" }))
    expect(count).toHaveTextContent("2 pieces in your selection.")
  })

  it("keeps focus inside, closes on Escape and gives focus back to the cart button", async () => {
    stubApi()
    const { user, drawer } = await openWith([[BATROUN, 1]])
    await screen.findByRole("heading", { name: "Batroun" })
    expect(drawer).toContainElement(document.activeElement as HTMLElement)
    for (let i = 0; i < 12; i++) {
      await user.tab()
      expect(drawer).toContainElement(document.activeElement as HTMLElement)
    }
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Cart/ })).toHaveFocus()
  })

  it("gives focus back to the cart button even when Add to cart opened it", async () => {
    stubApi()
    const user = userEvent.setup()
    renderAt(<CartDrawer />)
    act(() => void addToCart(BATROUN, 1, 9))
    await screen.findByRole("heading", { name: "Batroun" })
    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.getByRole("button", { name: "Cart, 1 piece" })).toHaveFocus())
  })

  it("opens from anywhere through openCart", () => {
    stubApi()
    renderAt(<CartDrawer />)
    act(() => openCart())
    expect(screen.getByRole("dialog", { name: "Your selection" })).toBeInTheDocument()
  })

  it("uses every fixture piece's real data", () => {
    // Guards the ids above against fixture changes.
    expect(PRODUCTS.find((p) => p.id === SANNINE)).toMatchObject({ name: "Sannine", price: 560, remaining: 2 })
    expect(PRODUCTS.find((p) => p.id === NAHR)).toMatchObject({ name: "Nahr", soldOut: true })
  })
})
