import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import PieceSpotlight from "./PieceSpotlight"

describe("PieceSpotlight", () => {
  it("presents Qadisha with its placard, its own summary and capacity, stock and price, and no lead time", () => {
    renderAt(<PieceSpotlight />)
    expect(screen.getByRole("heading", { level: 2, name: "Qadisha" })).toBeInTheDocument()
    // Built from the piece row, so it can never claim what the data does not say.
    expect(screen.getByText("Tall slab with edge notches and central holes. Holds 14 bottles.")).toBeInTheDocument()
    // Two lines as in the prototype, never a dot left hanging at a line end.
    const placard = screen.getByText("Edition of 8").parentElement
    expect(placard?.firstChild?.textContent).toBe("Cream limestone · 118 × 36 × 20 cm")
    expect(placard?.querySelector("br")).not.toBeNull()
    expect(screen.getByText("Edition of 8")).toHaveClass("whitespace-nowrap")
    expect(screen.getByText("4")).toHaveClass("text-accent")
    expect(screen.queryByText(/made to order|weeks|ready to deliver/i)).not.toBeInTheDocument()
    expect(screen.getByText("$890")).toBeInTheDocument()
  })

  it("links to the piece once for keyboard and screen-reader users", () => {
    renderAt(<PieceSpotlight />)
    expect(screen.getByRole("link", { name: "View the piece" })).toHaveAttribute("href", "/collection/5/qadisha")
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })

  it("never crops the piece", () => {
    renderAt(<PieceSpotlight />)
    for (const img of document.querySelectorAll("img")) expect(img.className).toContain("object-contain")
  })

  it("composes the landscape detail with a framed full view on desktop, as in the prototype", () => {
    renderAt(<PieceSpotlight />)
    const detail = document.querySelector('img[src*="products/batroun/4-"]')
    const frame = detail?.closest("a")
    expect(frame?.className).toContain("aspect-3/2")
    expect(frame?.className).toMatch(/hidden.*lg:block|lg:block.*hidden/)
    expect(frame?.className).toContain("lg:col-span-8")
    // Phones keep the cover; desktop frames the bright full view over the detail's corner.
    expect(document.querySelector('img[src*="products/batroun/1-"]')?.closest("a")?.className).toContain("lg:hidden")
    expect(document.querySelector('img[src*="products/batroun/3-"]')?.closest("a")?.className).toContain("lg:col-start-7")
  })
})
