import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import Home from "./Home"

describe("Home", () => {
  it("follows the agreed order with one h1", () => {
    renderAt(<Home />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Selected pieces", "The craft", "Qadisha"])
    expect(screen.getByText("From stone, form emerges.")).toBeInTheDocument()
  })

  it("starts nothing invisible except the hover photos", () => {
    const { container } = renderAt(<Home />)
    expect(container.querySelectorAll('.opacity-0:not([aria-hidden="true"])')).toHaveLength(0)
  })

  it("has no standalone newsletter section", () => {
    renderAt(<Home />)
    expect(screen.queryByText(/new editions/i)).not.toBeInTheDocument()
  })
})
