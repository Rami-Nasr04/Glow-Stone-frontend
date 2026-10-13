import { screen } from "@testing-library/react"
import { summaryOf } from "@/test/catalog"
import { renderAt } from "@/test/render"
import { HERO_PORTRAIT_MEDIA } from "./home-config"
import HomeHero from "./HomeHero"

describe("HomeHero", () => {
  it("is the page's only h1, carried by the wordmark", () => {
    renderAt(<HomeHero piece={summaryOf(5)} />)
    expect(screen.getByRole("heading", { level: 1, name: "Glowstone" })).toBeInTheDocument()
    expect(screen.getByText("Time is the ultimate luxury.")).toBeInTheDocument()
  })

  it("serves the portrait art to upright screens and loads the photo first", () => {
    const { container } = renderAt(<HomeHero piece={summaryOf(5)} />)
    const source = container.querySelector("picture source")
    expect(source).toHaveAttribute("media", HERO_PORTRAIT_MEDIA)
    expect(source?.getAttribute("srcset")).toContain("/images/hero/mobile-768.webp 768w")
    const photo = screen.getByAltText(/^Qadisha rack in cream limestone/)
    expect(photo.getAttribute("srcset")).toContain("/images/hero/desktop-1376.webp 1376w")
    expect(photo).toHaveAttribute("fetchpriority", "high")
    expect(photo).not.toHaveAttribute("loading", "lazy")
  })

  it("stays one screen tall on desktop and shows the whole photo, faded into the sky where it stops", () => {
    const { container } = renderAt(<HomeHero piece={summaryOf(5)} />)
    const section = container.querySelector("section")!
    expect(section.className).toContain("h-svh")
    // The old min-height (photo height + header) pushed the rack's base below the fold on short laptops.
    expect(section.className).not.toContain("55.8vw")
    const frame = screen.getByAltText(/^Qadisha rack in cream limestone/).closest("div")!
    expect(frame.className).toContain("h-(--hero-photo-h)")
    expect(frame.className).toContain("aspect-[1376/768]")
    expect(frame.querySelector(".bg-linear-to-r.from-hero-sky")).not.toBeNull()
    // The caption's dark band stays on the photo, not over the plain sky beside it.
    expect(frame.querySelector(".bg-linear-to-t.from-primary\\/75")).not.toBeNull()
  })

  it("links to the collection and to the piece in the photo", () => {
    renderAt(<HomeHero piece={summaryOf(5)} />)
    const shop = screen.getAllByRole("link", { name: "Shop collection" })
    expect(shop).toHaveLength(2)
    for (const link of shop) expect(link).toHaveAttribute("href", "/collection")
    expect(screen.getByRole("link", { name: "Qadisha · Cream limestone · Edition of 8" })).toHaveAttribute("href", "/collection/5/qadisha")
    expect(screen.getByRole("link", { name: "Qadisha · Edition of 8" })).toHaveAttribute("href", "/collection/5/qadisha")
  })
})
