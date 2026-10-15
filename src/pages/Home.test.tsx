import { screen } from "@testing-library/react"
import { PRODUCTS } from "@/test/catalog"
import { renderAt } from "@/test/render"
import Home from "./Home"

const page = <Home products={PRODUCTS} />

describe("Home", () => {
  it("follows the agreed order with one h1", () => {
    renderAt(page)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Selected pieces", "The craft", "Qadisha"])
    expect(screen.getByText("From stone, form emerges.")).toBeInTheDocument()
  })

  it("starts nothing invisible except the hover photos", () => {
    const { container } = renderAt(page)
    expect(container.querySelectorAll('.opacity-0:not([aria-hidden="true"])')).toHaveLength(0)
  })

  it("has no standalone newsletter section", () => {
    renderAt(page)
    expect(screen.queryByText(/new editions/i)).not.toBeInTheDocument()
  })

  it("shows the Qadisha hero and spotlight even when Qadisha is not published", () => {
    renderAt(<Home products={PRODUCTS.filter((p) => p.id !== 5)} />)
    expect(screen.getByRole("heading", { level: 2, name: "Qadisha" })).toBeInTheDocument()
    expect(screen.getByAltText(/^Qadisha rack in cream limestone/)).toBeInTheDocument()
  })

  it("shows the built stock first, then the live stock in the rail", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.test")
    const live = PRODUCTS.map((p) => (p.id === 5 ? { ...p, remaining: 0, soldOut: true } : p))
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: live }))))
    renderAt(page)
    expect(screen.queryByText(/Sold out/)).not.toBeInTheDocument()
    expect(await screen.findAllByText(/Sold out/)).toHaveLength(1)
    vi.unstubAllEnvs()
  })
})
