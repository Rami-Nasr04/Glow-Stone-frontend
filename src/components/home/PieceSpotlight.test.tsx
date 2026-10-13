import { screen } from "@testing-library/react"
import { productOf } from "@/test/catalog"
import { renderAt } from "@/test/render"
import PieceSpotlight from "./PieceSpotlight"

const qadisha = productOf(5)
const src = (n: number) => `img[src="${qadisha.images[n].url}/960.webp"]`

describe("PieceSpotlight", () => {
  it("presents Qadisha with its placard, its own summary and capacity, stock and price, and no lead time", () => {
    renderAt(<PieceSpotlight piece={qadisha} />)
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
    renderAt(<PieceSpotlight piece={qadisha} />)
    expect(screen.getByRole("link", { name: "View the piece" })).toHaveAttribute("href", "/collection/5/qadisha")
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })

  it("never crops the piece", () => {
    renderAt(<PieceSpotlight piece={qadisha} />)
    for (const img of document.querySelectorAll("img")) expect(img.className).toContain("object-contain")
  })

  it("composes the first landscape photo with the cover framed over its corner on desktop", () => {
    renderAt(<PieceSpotlight piece={qadisha} />)
    const detail = document.querySelector(src(3))
    const frame = detail?.closest("a")
    expect(frame?.className).toContain("aspect-3/2")
    expect(frame?.className).toMatch(/hidden.*lg:block|lg:block.*hidden/)
    expect(frame?.className).toContain("lg:col-span-8")
    expect(detail).toHaveAttribute("sizes", "62vw")
    // Phones show the cover; desktop frames the same cover over the detail's corner.
    const covers = [...document.querySelectorAll(src(0))]
    expect(covers.map((img) => img.closest("a")?.className.includes("lg:hidden"))).toEqual([true, false])
    expect(covers[0]).toHaveAttribute("sizes", "100vw")
    expect(covers[1].closest("a")?.className).toContain("lg:col-start-7")
    expect(covers[1]).toHaveAttribute("sizes", "13vw")
  })

  it("shows the cover alone on desktop when the piece has no landscape photo", () => {
    const uprights = qadisha.images.filter((photo) => photo.height > photo.width)
    renderAt(<PieceSpotlight piece={{ ...qadisha, images: uprights }} />)
    const covers = [...document.querySelectorAll(`img[src="${uprights[0].url}/960.webp"]`)]
    expect(covers).toHaveLength(2)
    expect(covers[1].closest("a")?.className).toContain("lg:col-span-8")
    expect(document.querySelectorAll("img")).toHaveLength(2)
  })

  it("shows the plain stone frame with the monogram when the piece has no photo yet", () => {
    const { container } = renderAt(<PieceSpotlight piece={{ ...qadisha, images: [] }} />)
    expect(container.querySelectorAll("[data-no-photo]")).toHaveLength(2)
    expect(screen.getByRole("heading", { level: 2, name: "Qadisha" })).toBeInTheDocument()
  })
})
