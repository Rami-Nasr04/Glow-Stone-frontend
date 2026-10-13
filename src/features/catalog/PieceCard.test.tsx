import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import { listProducts } from "./catalog"
import PieceCard from "./PieceCard"

const NAHR = 2
// Every bundled piece has at least two photos; pretend Nahr has one to check the card without a hover photo.
vi.mock("./photos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./photos")>()
  return { ...actual, hoverOf: (piece: { id: number; name: string }) => (piece.id === NAHR ? null : actual.hoverOf(piece)) }
})

const piece = (id: number) => listProducts().find((p) => p.id === id)!

describe("PieceCard", () => {
  it("links to the piece by id and readable name, and shows its name and price", () => {
    renderAt(<PieceCard product={piece(5)} sizes="33vw" />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/collection/5/qadisha")
    // textContent, not toHaveTextContent: the matcher collapses non-breaking spaces and would hide a regression.
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Qadisha")
    expect(link).toHaveTextContent("$890")
    expect(link).toHaveTextContent("Cream limestone")
  })

  it("cross-fades to the second photo, hidden from screen readers", () => {
    const { container } = renderAt(<PieceCard product={piece(6)} sizes="33vw" />)
    const imgs = container.querySelectorAll("img")
    expect(imgs).toHaveLength(2)
    expect(imgs[1]).toHaveAttribute("aria-hidden", "true")
    expect(imgs[1].className).toContain("group-hover:opacity-100")
  })

  it("shows a single photo when the piece has only one", () => {
    const { container } = renderAt(<PieceCard product={piece(NAHR)} sizes="33vw" />)
    expect(container.querySelectorAll("img")).toHaveLength(1)
  })

  it("marks sold-out pieces and never shows a lead time", () => {
    renderAt(
      <>
        <PieceCard product={piece(5)} sizes="33vw" />
        <PieceCard product={piece(NAHR)} sizes="33vw" />
      </>,
    )
    expect(screen.getByText("Sold out")).toBeInTheDocument()
    expect(screen.queryByText(/made to order|weeks/i)).not.toBeInTheDocument()
  })

  it("puts stone and edition on one line in the compact rail card", () => {
    renderAt(<PieceCard product={piece(1)} sizes="25vw" compact />)
    expect(screen.getByText(/Warm beige limestone · Edition of 12/)).toHaveTextContent("Warm beige limestone · Edition of 12 — 3 remaining")
  })
})
