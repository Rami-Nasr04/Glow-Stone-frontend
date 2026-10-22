import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub, useLocation } from "react-router"
import { CART_KEY, resetCart } from "@/features/cart/cart"
import type { Product as ProductData } from "@/features/catalog/types"
import { PRODUCTS, productOf, stubApi } from "@/test/catalog"
import Product from "./Product"

function renderAt(path: string, piece: ProductData | null = productOf(5)) {
  function Page() {
    const { pathname } = useLocation()
    return (
      <>
        <p>address: {pathname}</p>
        <Product piece={piece} products={PRODUCTS} />
      </>
    )
  }
  const Stub = createRoutesStub([{ path: "/:lang?/collection/:id/:name?", Component: Page }])
  return render(<Stub initialEntries={[path]} />)
}

describe("Product", () => {
  it("shows the piece under one h1", () => {
    renderAt("/collection/5/qadisha")
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Qadisha"])
    expect(screen.getByText("address: /collection/5/qadisha")).toBeInTheDocument()
  })

  it.each(["/collection/5", "/collection/5/old-name", "/collection/5/QADISHA"])("corrects the address %s without a 404", async (path) => {
    renderAt(path)
    expect(await screen.findByText("address: /collection/5/qadisha")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Qadisha")
  })

  // The id is the key: a link made before Omar renamed a piece still lands on it, under its current name.
  it("lands on a renamed piece under its new name from its old address", async () => {
    renderAt("/collection/5/qadisha", { ...productOf(5), name: "Qadisha Valley" })
    expect(await screen.findByText("address: /collection/5/qadisha-valley")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Qadisha Valley")
  })

  it("offers related pieces and, for available pieces, the sticky bar", () => {
    const { container } = renderAt("/collection/5/qadisha")
    expect(screen.getByRole("heading", { level: 2, name: "You may also like" })).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3)
    expect(container.querySelector("[data-sticky-bar]")).not.toBeNull()
  })

  it("has no sticky bar for a sold-out piece", () => {
    const { container } = renderAt("/collection/2/nahr", productOf(2))
    expect(container.querySelector("[data-sticky-bar]")).toBeNull()
  })

  it("turns sold out when the live stock says the last one has gone", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.test")
    const live = PRODUCTS.map((p) => (p.id === 5 ? { ...p, remaining: 0, soldOut: true } : p))
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: live }))))
    const { container } = renderAt("/collection/5/qadisha")
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeInTheDocument()
    expect(await screen.findByText("Edition of 8 — sold out")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument()
    expect(container.querySelector("[data-sticky-bar]")).toBeNull()
    vi.unstubAllEnvs()
  })

  it("tells the cart the live stock, so a sold-out line in it doesn't block this piece", async () => {
    localStorage.setItem(CART_KEY, JSON.stringify([{ productId: 2, quantity: 4 }]))
    resetCart()
    stubApi()
    const user = userEvent.setup()
    renderAt("/collection/5/qadisha")
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await user.click(screen.getByRole("button", { name: "One more" }))
    await waitFor(async () => {
      await user.click(screen.getAllByRole("button", { name: "Add to cart" })[0])
      expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toContainEqual({ productId: 5, quantity: 2 })
    })
  })

  it("shows the missing page for an unknown or unpublished piece", () => {
    renderAt("/collection/99/granite", null)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This stone hasn't been carved yet.")
  })
})
