import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import QuoteBand from "./QuoteBand"

describe("QuoteBand", () => {
  it("shows the line and the strapline on charcoal", () => {
    const { container } = renderAt(<QuoteBand />)
    expect(screen.getByText("From stone, form emerges.")).toBeInTheDocument()
    expect(screen.getByText("Limited objects for wine & living.")).toBeInTheDocument()
    expect(container.firstElementChild?.className).toContain("bg-dark-section")
  })
})
