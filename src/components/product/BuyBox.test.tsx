import { renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CART_KEY, resetCart, useCart } from "@/features/cart/cart"
import { productOf } from "@/test/catalog"
import { renderAt } from "@/test/render"
import BuyBox from "./BuyBox"

const NAHR = 2
const QADISHA = 5
const SANNINE = 6
const piece = productOf

describe("BuyBox", () => {
  it("names the piece, its stone and its summary under a breadcrumb back to the collection", () => {
    renderAt(<BuyBox piece={piece(SANNINE)} />)
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" })
    expect(crumbs.querySelector("a")).toHaveAttribute("href", "/collection")
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Sannine")
    expect(screen.getByText("Earth brown limestone")).toBeInTheDocument()
    expect(screen.getByText("Tall column with five half-moon notches on each side.")).toBeInTheDocument()
    expect(screen.getByText("$560")).toBeInTheDocument()
  })

  it("never mentions a lead time", () => {
    renderAt(<BuyBox piece={piece(QADISHA)} />)
    expect(screen.queryByText(/made to order|weeks|ready to deliver/i)).not.toBeInTheDocument()
  })

  it("caps the quantity at the pieces remaining", async () => {
    const user = userEvent.setup()
    renderAt(<BuyBox piece={piece(SANNINE)} />)
    const less = screen.getByRole("button", { name: "One fewer" })
    const more = screen.getByRole("button", { name: "One more" })
    expect(less).toBeDisabled()
    expect(screen.getByText("Up to 2, the pieces remaining in this edition.")).toBeInTheDocument()
    await user.click(more)
    expect(screen.getByRole("status")).toHaveTextContent("2")
    expect(more).toBeDisabled()
  })

  it("adds the chosen quantity to the cart and opens the drawer", async () => {
    const user = userEvent.setup()
    renderAt(<BuyBox piece={piece(QADISHA)} />)
    await user.click(screen.getByRole("button", { name: "One more" }))
    await user.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([{ productId: QADISHA, quantity: 2, price: 890 }])
    expect(renderHook(() => useCart()).result.current.open).toBe(true)
    // Back to one, ready for the next add.
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("1")
  })

  it("adds nothing past 5 pieces in all (the drawer says why)", async () => {
    localStorage.setItem(CART_KEY, JSON.stringify([{ productId: 3, quantity: 5 }]))
    resetCart()
    const user = userEvent.setup()
    renderAt(<BuyBox piece={piece(QADISHA)} />)
    await user.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([{ productId: 3, quantity: 5 }])
    expect(renderHook(() => useCart()).result.current.notice).toEqual({ kind: "total" })
  })

  it("replaces the button with Sold out and the new-editions sign-up when it is sold out", () => {
    renderAt(<BuyBox piece={piece(NAHR)} />)
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument()
    expect(screen.queryByText(/0 remaining/)).not.toBeInTheDocument()
    expect(screen.getByText("Edition of 15 — sold out")).toBeInTheDocument()
    expect(screen.getAllByText("Sold out")).toHaveLength(1)
    expect(screen.getByText("New editions")).toBeInTheDocument()
    expect(screen.getByText("This edition has found its homes. Be the first to know when a new edition is released.")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(screen.getByRole("button", { name: "Notify me" })).toBeInTheDocument()
    // Omar can still carve something similar on request.
    expect(screen.getByText("For a similar piece, write to Omar.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Contact Omar" })).toHaveAttribute("href", "/contact")
  })

  it("notify me asks to rejoin the news list", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetch)
    const user = userEvent.setup()
    renderAt(<BuyBox piece={piece(NAHR)} />)
    await user.type(screen.getByLabelText("Email"), "sara@example.com")
    await user.click(screen.getByRole("button", { name: "Notify me" }))
    expect(await screen.findByText("Thank you. You'll hear about new editions.")).toBeInTheDocument()
    expect(JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({ email: "sara@example.com", rejoin: true, website: "" })
  })

  it("has no sign-up while the piece is available", () => {
    renderAt(<BuyBox piece={piece(QADISHA)} />)
    expect(screen.queryByRole("button", { name: "Notify me" })).not.toBeInTheDocument()
  })
})
