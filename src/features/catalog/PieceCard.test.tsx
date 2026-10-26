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

  // Both photos say what they show, for image search (Rami, 2026-10-26); the hover one stays hidden from screen readers.
  it("shows the cover from the API and cross-fades to the second photo, each with its own alt text", () => {
    const piece = summaryOf(6)
    const { container } = renderAt(<PieceCard product={piece} sizes="33vw" />)
    const imgs = container.querySelectorAll("img")
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute("src", `${piece.images[0].url}/960.webp`)
    expect(imgs[0]).toHaveAttribute("alt", `${piece.name} limestone wine rack`)
    expect(imgs[1]).toHaveAttribute("alt", `${piece.name} limestone wine rack, another view`)
    expect(imgs[0]).toHaveAttribute("sizes", "(min-resolution: 2.5dppx) 22vw, 33vw")
    expect(imgs[1]).toHaveAttribute("aria-hidden", "true")
    expect(imgs[1].className).toContain("group-hover:opacity-100")
  })

  // A phone can't hover, so it never downloads the second photo: only a screen with hover picks the source.
  it("downloads the second photo only where hover exists", () => {
    const piece = summaryOf(6)
    const { container } = renderAt(<PieceCard product={piece} sizes="33vw" />)
    const hover = container.querySelectorAll("img")[1]
    const source = hover.closest("picture")?.querySelector("source")
    expect(source).toHaveAttribute("media", "(hover: hover)")
    expect(source?.getAttribute("srcset")).toContain(`${piece.images[1].url}/960.webp`)
    expect(source).toHaveAttribute("sizes", "(min-resolution: 2.5dppx) 22vw, 33vw")
    expect(hover.getAttribute("src")).not.toContain(piece.images[1].url)
    expect(hover).not.toHaveAttribute("srcset")
    expect(hover).toHaveAttribute("loading", "lazy")
  })

  it("loads the cover lazily unless it is asked first, and the second photo always lazily", () => {
    const piece = summaryOf(6)
    const lazy = renderAt(<PieceCard product={piece} sizes="33vw" />).container.querySelectorAll("img")
    expect(lazy[0]).toHaveAttribute("loading", "lazy")
    const first = renderAt(<PieceCard product={piece} sizes="33vw" priority />).container.querySelectorAll("img")
    expect(first[0]).toHaveAttribute("loading", "eager")
    expect(first[0]).toHaveAttribute("fetchpriority", "high")
    expect(first[1]).toHaveAttribute("loading", "lazy")
    expect(first[1]).not.toHaveAttribute("fetchpriority", "high")
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
