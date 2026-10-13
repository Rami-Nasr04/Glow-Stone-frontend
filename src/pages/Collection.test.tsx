import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PRODUCTS } from "@/test/catalog"
import { renderAt } from "@/test/render"
import Collection from "./Collection"

const page = <Collection products={PRODUCTS} />

describe("Collection", () => {
  it("shows every piece with one h1 when nothing is filtered", () => {
    renderAt(page, "/collection")
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6)
    expect(screen.getAllByText("6 pieces").length).toBeGreaterThan(0)
    expect(screen.getByText("Six pieces in Lebanese limestone, each carved by hand in a small numbered edition.")).toBeInTheDocument()
  })

  it("lists every piece newest first", () => {
    renderAt(page, "/collection")
    expect(screen.getAllByRole("heading", { level: 2 })[0].textContent).toBe("Sannine")
    expect(screen.getAllByRole("heading", { level: 2 }).at(-1)?.textContent).toBe("Arz")
  })

  it("reads the filters from the address", () => {
    renderAt(page, "/collection?color=earth-brown&capacity=10")
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Sannine"])
    expect(screen.getAllByText("1 piece").length).toBeGreaterThan(0)
  })

  it("clears the filters from the empty state", async () => {
    const user = userEvent.setup()
    renderAt(page, "/collection?color=cream&capacity=1")
    await user.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6)
  })

  it("filters on the live stock once it arrives", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.test")
    const live = PRODUCTS.map((p) => (p.id === 6 ? { ...p, remaining: 0, soldOut: true } : p))
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: live }))))
    renderAt(page, "/collection?availability=sold_out")
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Nahr"])
    expect(await screen.findByRole("heading", { level: 2, name: "Sannine" })).toBeInTheDocument()
    vi.unstubAllEnvs()
  })
})
