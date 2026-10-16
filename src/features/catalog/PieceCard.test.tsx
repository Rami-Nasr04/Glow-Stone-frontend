import { screen } from "@testing-library/react"
import { summaryOf } from "@/test/catalog"
import { renderAt } from "@/test/render"
import PieceCard from "./PieceCard"

const NAHR = 2
const QADISHA = 5

describe("PieceCard", () => {
  it("links to the piece by id and readable name, and shows its name and price", () => {
    renderAt(<PieceCard product={summaryOf(QADISHA)} sizes="33vw" />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/collection/5/qadisha")
    // textContent, not toHaveTextContent: the matcher collapses non-breaking spaces and would hide a regression.
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Qadisha")
    expect(link).toHaveTextContent("$890")
    expect(link).toHaveTextContent("Cream limestone")
  })

  it("shows the cover from the API and cross-fades to the second photo, both decorative", () => {
    const piece = summaryOf(6)
    const { container } = renderAt(<PieceCard product={piece} sizes="33vw" />)
    const imgs = container.querySelectorAll("img")
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute("src", `${piece.images[0].url}/960.webp`)
    expect(imgs[0]).toHaveAttribute("alt", "")
    expect(imgs[0]).toHaveAttribute("sizes", "(min-resolution: 2.5dppx) 22vw, 33vw")
    expect(imgs[1]).toHaveAttribute("src", `${piece.images[1].url}/960.webp`)
    expect(imgs[1]).toHaveAttribute("aria-hidden", "true")
    expect(imgs[1].className).toContain("group-hover:opacity-100")
  })

  it("shows a single photo, with nothing to cross-fade to, when the piece has only one", () => {
    const piece = summaryOf(QADISHA)
    const { container } = renderAt(<PieceCard product={{ ...piece, images: piece.images.slice(0, 1) }} sizes="33vw" />)
    expect(container.querySelectorAll("img")).toHaveLength(1)
  })

  it("shows the plain stone frame with the monogram when the piece has no photo yet", () => {
    const { container } = renderAt(<PieceCard product={{ ...summaryOf(QADISHA), images: [] }} sizes="33vw" />)
    const imgs = container.querySelectorAll("img")
    expect(imgs).toHaveLength(1)
    expect(imgs[0]).toHaveAttribute("src", "/brand/glowstone-monogram.svg")
    expect(imgs[0]).toHaveAttribute("alt", "")
    expect(container.querySelector("[data-no-photo]")?.closest(".aspect-2\\/3")).not.toBeNull()
  })

  it("marks sold-out pieces and never shows a lead time", () => {
    renderAt(
      <>
        <PieceCard product={summaryOf(QADISHA)} sizes="33vw" />
        <PieceCard product={summaryOf(NAHR)} sizes="33vw" />
      </>,
    )
    expect(screen.getByText("Sold out")).toBeInTheDocument()
    expect(screen.queryByText(/made to order|weeks/i)).not.toBeInTheDocument()
  })

  it("puts stone and edition on one line in the compact rail card", () => {
    renderAt(<PieceCard product={summaryOf(1)} sizes="25vw" compact />)
    expect(screen.getByText(/Warm beige limestone · Edition of 12/)).toHaveTextContent("Warm beige limestone · Edition of 12 — 3 remaining")
  })
})
