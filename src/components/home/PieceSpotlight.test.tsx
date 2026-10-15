import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import PieceSpotlight from "./PieceSpotlight"

const detail = 'img[src="/images/home/spotlight-detail-960.webp"]'
const full = 'img[src="/images/home/spotlight-full-960.webp"]'

describe("PieceSpotlight", () => {
  it("presents Qadisha with fixed text: placard, summary and capacity, and no price, stock or lead time", () => {
    renderAt(<PieceSpotlight />)
    expect(screen.getByRole("heading", { level: 2, name: "Qadisha" })).toBeInTheDocument()
    expect(screen.getByText("Tall slab with edge notches and central holes. Holds 14 bottles.")).toBeInTheDocument()
    // Two lines as in the prototype, never a dot left hanging at a line end.
    const placard = screen.getByText("Edition of 8").parentElement
    expect(placard?.firstChild?.textContent).toBe("Cream limestone · 118 × 36 × 20 cm")
    expect(placard?.querySelector("br")).not.toBeNull()
    expect(screen.getByText("Edition of 8")).toHaveClass("whitespace-nowrap")
    // Price and stock change in the studio; fixed text could only go stale (Rami, 2026-10-15).
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/remaining|sold out/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/made to order|weeks|ready to deliver/i)).not.toBeInTheDocument()
  })

  it("leads to the collection, never to the piece, which may be a draft or sold out", () => {
    renderAt(<PieceSpotlight />)
    expect(screen.getByRole("link", { name: "View the collection" })).toHaveAttribute("href", "/collection")
    expect(screen.getAllByRole("link")).toHaveLength(1)
    expect(document.querySelector('a[href^="/collection/"]')).toBeNull()
  })

  it("uses the site's own copies of the photos, not product photo addresses", () => {
    renderAt(<PieceSpotlight />)
    for (const img of document.querySelectorAll("img")) {
      expect(img.getAttribute("src")).toMatch(/^\/images\/home\/spotlight-/)
      expect(img.getAttribute("srcset")).not.toContain("cloudfront")
    }
  })

  it("never crops the piece", () => {
    renderAt(<PieceSpotlight />)
    for (const img of document.querySelectorAll("img")) expect(img.className).toContain("object-contain")
  })

  it("composes the landscape close-up with the full piece framed over its corner on desktop", () => {
    renderAt(<PieceSpotlight />)
    const frame = document.querySelector(detail)?.parentElement
    expect(frame?.className).toContain("aspect-3/2")
    expect(frame?.className).toMatch(/hidden.*lg:block|lg:block.*hidden/)
    expect(frame?.className).toContain("lg:col-span-8")
    expect(document.querySelector(detail)).toHaveAttribute("sizes", "62vw")
    // Phones show the full piece; desktop frames the same photo over the close-up's corner.
    const fulls = [...document.querySelectorAll(full)]
    expect(fulls.map((img) => img.parentElement?.className.includes("lg:hidden"))).toEqual([true, false])
    expect(fulls[0]).toHaveAttribute("sizes", "100vw")
    expect(fulls[1].parentElement?.className).toContain("lg:col-start-7")
    expect(fulls[1]).toHaveAttribute("sizes", "13vw")
  })
})
