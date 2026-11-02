import { screen } from "@testing-library/react"
import { PRODUCTS } from "@/test/catalog"
import { renderAt } from "@/test/render"
import HomeHero from "./HomeHero"

// The hero follows the first piece in Omar's order (Rami, 2026-11-02): its cover, its name and stone, its edition. The
// picture is that piece's own photo, so it can never contradict the caption.
const first = PRODUCTS[0]
const cover = first.images[0]

describe("HomeHero", () => {
  it("is the page's only h1, carried by the wordmark", () => {
    renderAt(<HomeHero piece={first} />)
    expect(screen.getByRole("heading", { level: 1, name: "Glowstone" })).toBeInTheDocument()
    expect(screen.getByText("Time is the ultimate luxury.")).toBeInTheDocument()
  })

  it("shows the first piece's cover, whole, named from its data, and loads it first", () => {
    renderAt(<HomeHero piece={first} />)
    const photo = screen.getByAltText(`${first.name} ${first.stoneType.toLowerCase()} wine rack`)
    expect(photo.getAttribute("srcset")).toContain(`${cover.url}/1440.webp 1440w`)
    expect(photo).toHaveAttribute("fetchpriority", "high")
    expect(photo).not.toHaveAttribute("loading", "lazy")
    expect(photo.className).toContain("object-contain")
  })

  it("names the piece in the photo from its data, without linking to it", () => {
    renderAt(<HomeHero piece={{ ...first, name: "Tura", color: "Beige & Brown", stoneType: "Granite", editionSize: 8 }} />)
    expect(screen.getByText("Tura · Beige & Brown granite · Edition of 8")).toBeInTheDocument()
    expect(screen.getByText("Tura · Edition of 8")).toBeInTheDocument()
    const shop = screen.getAllByRole("link", { name: "Shop collection" })
    expect(shop).toHaveLength(2)
    for (const link of shop) expect(link).toHaveAttribute("href", "/collection")
    expect(screen.getAllByRole("link")).toHaveLength(2)
  })

  it("stays one screen tall on desktop", () => {
    const { container } = renderAt(<HomeHero piece={first} />)
    expect(container.querySelector("section")!.className).toContain("h-svh")
  })
})
