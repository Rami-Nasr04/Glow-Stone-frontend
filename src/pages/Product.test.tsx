import { screen } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import { render } from "@testing-library/react"
import Product from "./Product"

function renderPiece(slug: string) {
  const Stub = createRoutesStub([{ path: "/:lang?/collection/:slug", Component: Product }])
  return render(<Stub initialEntries={[`/collection/${slug}`]} />)
}

describe("Product", () => {
  beforeEach(() => {
    window.IntersectionObserver = vi.fn(function () {
      return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() }
    }) as unknown as typeof IntersectionObserver
  })

  it("shows the piece under one h1", () => {
    renderPiece("batroun")
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Batroun"])
  })

  it("shows the missing page for a piece that doesn't exist", () => {
    renderPiece("granite")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("404")
  })
})
