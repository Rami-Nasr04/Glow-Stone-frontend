import { screen } from "@testing-library/react"
import { PRODUCTS, productOf } from "@/test/catalog"
import { renderAt } from "@/test/render"
import Home from "./Home"

const first = productOf(PRODUCTS[0].id)
const page = <Home products={PRODUCTS} first={first} />

describe("Home", () => {
  it("follows the agreed order with one h1", () => {
    renderAt(page)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Selected pieces", "The craft", first.name])
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

  // Omar's #1 piece leads the spotlight (2026-11-02); Rami's hero never follows the order: its scene is piece 5, and
  // only its caption comes from piece 5's data, wherever Omar puts it.
  it("shows Omar's first piece in the spotlight, and keeps the hero on piece 5 whatever the order", () => {
    const tura = { ...productOf(5), name: "Tura" }
    const atera = { ...productOf(6), name: "Atera" }
    const order = [atera, ...PRODUCTS.filter((p) => p.id !== 5 && p.id !== 6), tura]
    const { container } = renderAt(<Home products={order} first={atera} />)
    expect(screen.getByRole("heading", { level: 2, name: "Atera" })).toBeInTheDocument()
    const hero = container.querySelector("section")!
    expect(hero.querySelector("img")?.getAttribute("srcset")).toContain("/images/hero/desktop-1376.webp")
    expect(hero).toHaveTextContent(/^.*Tura · .* · Edition of \d+/)
    expect(hero).not.toHaveTextContent("Atera")
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
