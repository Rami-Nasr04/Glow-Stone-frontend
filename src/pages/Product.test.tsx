import { screen } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import { render } from "@testing-library/react"
import Product from "./Product"

function renderPiece(slug: string) {
  const Stub = createRoutesStub([{ path: "/:lang?/collection/:slug", Component: Product }])
  return render(<Stub initialEntries={[`/collection/${slug}`]} />)
}

describe("Product", () => {
  it("shows the piece under one h1", () => {
    renderPiece("batroun")
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Batroun"])
  })

  it("offers related pieces and, for available pieces, the sticky bar", () => {
    const { container } = renderPiece("batroun")
    expect(screen.getByRole("heading", { level: 2, name: "You may also like" })).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3)
    expect(container.querySelector("[data-sticky-bar]")).not.toBeNull()
  })

  it("has no sticky bar for a sold-out piece", () => {
    const { container } = renderPiece("byblos")
    expect(container.querySelector("[data-sticky-bar]")).toBeNull()
  })

  it("shows the missing page for a piece that doesn't exist", () => {
    renderPiece("granite")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("404")
  })
})
