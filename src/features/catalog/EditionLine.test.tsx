import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import EditionLine from "./EditionLine"

const available = { editionSize: 12, remaining: 3, soldOut: false }

describe("EditionLine", () => {
  it("shows the edition with the remaining count in wine", () => {
    renderAt(<EditionLine product={available} />)
    expect(screen.getByText(/Edition of 12 —/)).toHaveTextContent("Edition of 12 — 3 remaining")
    expect(screen.getByText("3")).toHaveClass("text-accent")
  })

  it("never says 0 remaining", () => {
    renderAt(<EditionLine product={{ editionSize: 15, remaining: 0, soldOut: true }} prefix="Brown limestone" />)
    expect(screen.getByText("Brown limestone · Sold out")).toBeInTheDocument()
    expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()
  })

  it("uses Frost Stone for the count on charcoal", () => {
    renderAt(<EditionLine product={available} template="{remaining} remaining" onDark />)
    expect(screen.getByText("3")).toHaveClass("text-dark-section-foreground")
  })
})
