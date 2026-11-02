import { screen } from "@testing-library/react"
import { productOf } from "@/test/catalog"
import { renderAt } from "@/test/render"
import { HERO_PORTRAIT_MEDIA } from "./home-config"
import HomeHero from "./HomeHero"

// Rami's hero never changes (2026-11-02): the scene is piece 5 (Tura, once Qadisha). Only its caption and alt text
// come from that piece's data, by id, so they stay true if Omar edits it.
const tura = { ...productOf(5), name: "Tura", stoneType: "Granite", color: "Beige & Brown", editionSize: 8 }
const ALT = "Tura wine rack in beige & brown granite, with a glass of red wine, on a stone wall above the misty Qadisha Valley"

describe("HomeHero", () => {
  it("is the page's only h1, carried by the wordmark", () => {
    renderAt(<HomeHero piece={tura} />)
    expect(screen.getByRole("heading", { level: 1, name: "Glowstone" })).toBeInTheDocument()
    expect(screen.getByText("Time is the ultimate luxury.")).toBeInTheDocument()
  })

  it("serves the portrait art to upright screens and loads the photo first", () => {
    const { container } = renderAt(<HomeHero piece={tura} />)
    const source = container.querySelector("picture source")
    expect(source).toHaveAttribute("media", HERO_PORTRAIT_MEDIA)
    expect(source?.getAttribute("srcset")).toContain("/images/hero/mobile-768.webp 768w")
    const photo = screen.getByAltText(ALT)
    expect(photo.getAttribute("srcset")).toContain("/images/hero/desktop-1376.webp 1376w")
    expect(photo).toHaveAttribute("fetchpriority", "high")
    expect(photo).not.toHaveAttribute("loading", "lazy")
  })

  it("stays one screen tall on desktop and shows the whole photo, faded into the sky where it stops", () => {
    const { container } = renderAt(<HomeHero piece={tura} />)
    const section = container.querySelector("section")!
    expect(section.className).toContain("h-svh")
    // The old min-height (photo height + header) pushed the rack's base below the fold on short laptops.
    expect(section.className).not.toContain("55.8vw")
    const frame = screen.getByAltText(ALT).closest("div")!
    expect(frame.className).toContain("h-(--hero-photo-h)")
    expect(frame.className).toContain("aspect-[1376/768]")
    expect(frame.querySelector(".bg-linear-to-r.from-hero-sky")).not.toBeNull()
    // The caption's dark band stays on the photo, not over the plain sky beside it.
    expect(frame.querySelector(".bg-linear-to-t.from-primary\\/75")).not.toBeNull()
  })

  it("links to the collection, and names the piece in the photo from its data without linking to it", () => {
    renderAt(<HomeHero piece={tura} />)
    const shop = screen.getAllByRole("link", { name: "Shop collection" })
    expect(shop).toHaveLength(2)
    for (const link of shop) expect(link).toHaveAttribute("href", "/collection")
    expect(screen.getAllByRole("link")).toHaveLength(2)
    expect(screen.getByText("Tura · Beige & Brown granite · Edition of 8")).toBeInTheDocument()
    expect(screen.getByText("Tura · Edition of 8")).toBeInTheDocument()
  })

  it("keeps the same scene, without a caption, when the piece in it isn't published", () => {
    const { container } = renderAt(<HomeHero piece={null} />)
    const photo = screen.getByAltText("A Glowstone wine rack with a glass of red wine, on a stone wall above the misty Qadisha Valley")
    expect(photo.getAttribute("srcset")).toContain("/images/hero/desktop-1376.webp 1376w")
    expect(container.textContent).not.toMatch(/Edition of/)
  })
})
