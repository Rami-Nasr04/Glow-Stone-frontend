import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import { HERO_PORTRAIT_MEDIA } from "./home-config"
import HomeHero from "./HomeHero"

describe("HomeHero", () => {
  it("is the page's only h1, carried by the wordmark", () => {
    renderAt(<HomeHero />)
    expect(screen.getByRole("heading", { level: 1, name: "Glowstone" })).toBeInTheDocument()
    expect(screen.getByText("Time is the ultimate luxury.")).toBeInTheDocument()
  })

  it("serves the portrait art to upright screens and loads the photo first", () => {
    const { container } = renderAt(<HomeHero />)
    const source = container.querySelector("picture source")
    expect(source).toHaveAttribute("media", HERO_PORTRAIT_MEDIA)
    expect(source?.getAttribute("srcset")).toContain("/images/hero/mobile-768.webp 768w")
    const photo = screen.getByAltText(/Batroun rack in cream limestone/)
    expect(photo.getAttribute("srcset")).toContain("/images/hero/desktop-1376.webp 1376w")
    expect(photo).toHaveAttribute("fetchpriority", "high")
    expect(photo).not.toHaveAttribute("loading", "lazy")
  })

  it("links to the collection and to the piece in the photo", () => {
    renderAt(<HomeHero />)
    const shop = screen.getAllByRole("link", { name: "Shop collection" })
    expect(shop).toHaveLength(2)
    for (const link of shop) expect(link).toHaveAttribute("href", "/collection")
    expect(screen.getByRole("link", { name: "Batroun · Cream limestone · Edition of 8" })).toHaveAttribute("href", "/collection/batroun")
    expect(screen.getByRole("link", { name: "Batroun · Edition of 8" })).toHaveAttribute("href", "/collection/batroun")
  })
})
