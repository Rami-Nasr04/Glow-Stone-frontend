import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import PieceSpotlight from "./PieceSpotlight"

describe("PieceSpotlight", () => {
  it("presents Batroun with its placard, stock, lead time and price", () => {
    renderAt(<PieceSpotlight />)
    expect(screen.getByRole("heading", { level: 2, name: "Batroun" })).toBeInTheDocument()
    const placard = screen.getByText("Edition of 8").parentElement
    expect(placard).toHaveTextContent("Cream limestone · 118 × 36 × 20 cm · Edition of 8")
    expect(screen.getByText("Edition of 8")).toHaveClass("whitespace-nowrap")
    expect(screen.getByText("4")).toHaveClass("text-accent")
    expect(screen.getByText(/Made to order · 6 weeks/)).toBeInTheDocument()
    expect(screen.getByText("$890")).toBeInTheDocument()
  })

  it("links to the piece once for keyboard and screen-reader users", () => {
    renderAt(<PieceSpotlight />)
    expect(screen.getByRole("link", { name: "View the piece" })).toHaveAttribute("href", "/collection/batroun")
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })

  it("never crops the piece", () => {
    renderAt(<PieceSpotlight />)
    expect(document.querySelector("img")?.className).toContain("object-contain")
  })
})
