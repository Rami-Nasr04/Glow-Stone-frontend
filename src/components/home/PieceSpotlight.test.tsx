import { screen } from "@testing-library/react"
import { productOf } from "@/test/catalog"
import { renderAt } from "@/test/render"
import PieceSpotlight from "./PieceSpotlight"

// The spotlight follows the first piece in Omar's order (Rami, 2026-11-02), all from its data.
const qadisha = productOf(5)
const landscape = qadisha.images.find((photo) => photo.width > photo.height)!

describe("PieceSpotlight", () => {
  it("presents the piece from its data: name, stone and colour, sizes, edition, summary and bottles; no price, stock or lead time", () => {
    renderAt(<PieceSpotlight piece={{ ...qadisha, name: "Tura", stoneType: "Granite", color: "Beige & Brown" }} />)
    expect(screen.getByRole("heading", { level: 2, name: "Tura" })).toBeInTheDocument()
    // One line per part, so a long stone name never leaves a dot hanging at a line end.
    const placard = screen.getByText("Edition of 8").parentElement!
    expect([...placard.children].map((line) => line.textContent)).toEqual(["Beige & Brown granite", "118 × 36 × 20 cm", "Edition of 8"])
    for (const line of placard.children) expect(line).toHaveClass("block")
    expect(screen.getByText("Tall slab with edge notches and central holes. Holds 14 bottles.")).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/remaining|sold out/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/made to order|weeks|ready to deliver|limestone/i)).not.toBeInTheDocument()
  })

  it("shows its cover and its first landscape photo, each named from the piece", () => {
    const { container } = renderAt(<PieceSpotlight piece={qadisha} />)
    const srcs = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"))
    expect(srcs).toContain(`${qadisha.images[0].url}/960.webp`)
    expect(srcs).toContain(`${landscape.url}/960.webp`)
    for (const img of container.querySelectorAll("img")) expect(img.getAttribute("alt")).toMatch(/^Qadisha limestone wine rack/)
  })

  it("crops the cover into the wide frame when the piece has no landscape photo", () => {
    const portraitsOnly = { ...qadisha, images: qadisha.images.filter((photo) => photo.height > photo.width) }
    const { container } = renderAt(<PieceSpotlight piece={portraitsOnly} />)
    expect(container.querySelectorAll(`img[src="${qadisha.images[0].url}/960.webp"]`).length).toBe(3)
  })

  it("leads to the collection, never to the piece", () => {
    renderAt(<PieceSpotlight piece={qadisha} />)
    expect(screen.getByRole("link", { name: "View the collection" })).toHaveAttribute("href", "/collection")
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })
})
