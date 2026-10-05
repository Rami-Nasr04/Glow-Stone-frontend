import { render, screen } from "@testing-library/react"
import { imageUrl } from "@/lib/images"
import Picture from "./Picture"

describe("Picture", () => {
  it("builds a srcset that never asks for variants larger than the original", () => {
    render(<Picture imageKey="products/batroun/1" width={1440} height={2160} alt="Batroun" sizes="50vw" />)
    const img = screen.getByAltText("Batroun")
    expect(img.getAttribute("srcset")).toBe(
      "/images/products/batroun/1-480.webp 480w, /images/products/batroun/1-960.webp 960w, /images/products/batroun/1-1440.webp 1440w",
    )
    expect(img).toHaveAttribute("width", "1440")
    expect(img).toHaveAttribute("height", "2160")
  })

  it("offers the 2880 variant for full-width images that have it", () => {
    render(<Picture imageKey="craft/crest" width={2880} height={4320} alt="Crest" sizes="60vw" fit="cover" />)
    expect(screen.getByAltText("Crest").getAttribute("srcset")).toContain("/images/craft/crest-2880.webp 2880w")
  })

  it("never crops by default and lazy-loads unless marked priority", () => {
    render(<Picture imageKey="products/nahr/1" width={2048} height={3072} alt="Nahr" sizes="100vw" />)
    const img = screen.getByAltText("Nahr")
    expect(img.className).toContain("object-contain")
    expect(img).toHaveAttribute("loading", "lazy")
    expect(img.getAttribute("srcset")).not.toContain("2880w")
  })

  it("loads eagerly with high priority for the first image on a page", () => {
    render(<Picture imageKey="craft/bore" width={2880} height={4320} alt="Bore" sizes="60vw" fit="cover" priority />)
    const img = screen.getByAltText("Bore")
    expect(img.className).toContain("object-cover")
    expect(img).toHaveAttribute("loading", "eager")
    expect(img).toHaveAttribute("fetchpriority", "high")
  })

  it("resolves variant urls", () => {
    expect(imageUrl("craft/bore", 480)).toBe("/images/craft/bore-480.webp")
  })
})
