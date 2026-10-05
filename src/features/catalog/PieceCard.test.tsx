import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import { listProducts } from "./catalog"
import PieceCard from "./PieceCard"

const piece = (slug: string) => listProducts("en").find((p) => p.slug === slug)!

describe("PieceCard", () => {
  it("links to the piece and shows its name and price", () => {
    renderAt(<PieceCard product={piece("qadisha-earth")} sizes="33vw" />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/collection/qadisha-earth")
    // textContent, not toHaveTextContent: the matcher collapses non-breaking spaces and would hide a regression.
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Qadisha · Earth")
    expect(link).toHaveTextContent("$560")
  })

  it("cross-fades to the second photo, hidden from screen readers", () => {
    const { container } = renderAt(<PieceCard product={piece("sannine-sand")} sizes="33vw" />)
    const imgs = container.querySelectorAll("img")
    expect(imgs).toHaveLength(2)
    expect(imgs[1]).toHaveAttribute("aria-hidden", "true")
    expect(imgs[1].className).toContain("group-hover:opacity-100")
  })

  it("shows a single photo when the piece has only one", () => {
    const single = { ...piece("nahr"), hover: null }
    const { container } = renderAt(<PieceCard product={single} sizes="33vw" />)
    expect(container.querySelectorAll("img")).toHaveLength(1)
  })

  it("marks made-to-order pieces and sold-out pieces", () => {
    renderAt(
      <>
        <PieceCard product={piece("qadisha-ash")} sizes="33vw" />
        <PieceCard product={piece("byblos")} sizes="33vw" />
      </>,
    )
    expect(screen.getByText("Made to order · 4 weeks")).toBeInTheDocument()
    expect(screen.getByText("Sold out")).toBeInTheDocument()
  })

  it("puts stone and edition on one line in the compact rail card", () => {
    renderAt(<PieceCard product={piece("sannine-sand")} sizes="25vw" compact />)
    expect(screen.getByText(/Warm beige limestone · Edition of 12/)).toHaveTextContent(
      "Warm beige limestone · Edition of 12 — 3 remaining",
    )
  })
})
