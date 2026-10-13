import { render, screen } from "@testing-library/react"
import { imageUrl, photoUrl } from "@/lib/images"
import Picture from "./Picture"

const PHOTO = "https://photos.test/products/5/abc"

describe("Picture", () => {
  it("builds a srcset that never asks for variants larger than the original", () => {
    render(<Picture image={{ key: "craft/bore", width: 1440, height: 2160 }} alt="Bore" sizes="50vw" />)
    const img = screen.getByAltText("Bore")
    expect(img.getAttribute("srcset")).toBe("/images/craft/bore-480.webp 480w, /images/craft/bore-960.webp 960w, /images/craft/bore-1440.webp 1440w")
    expect(img).toHaveAttribute("width", "1440")
    expect(img).toHaveAttribute("height", "2160")
  })

  it("offers the 2880 variant for full-width images that have it", () => {
    render(<Picture image={{ key: "craft/crest", width: 2880, height: 4320 }} alt="Crest" sizes="60vw" fit="cover" />)
    expect(screen.getByAltText("Crest").getAttribute("srcset")).toContain("/images/craft/crest-2880.webp 2880w")
  })

  it("serves a product photo from the API at the allowed widths up to its own", () => {
    render(<Picture image={{ url: PHOTO, width: 2880, height: 4318 }} alt="Qadisha" sizes="100vw" />)
    const img = screen.getByAltText("Qadisha")
    expect(img).toHaveAttribute("src", `${PHOTO}/960.webp`)
    expect(img.getAttribute("srcset")).toBe(
      [480, 960, 1440, 2048, 2880].map((w) => `${PHOTO}/${w}.webp ${w}w`).join(", "),
    )
    expect(img).toHaveAttribute("width", "2880")
    expect(img).toHaveAttribute("height", "4318")
    expect(img).toHaveAttribute("sizes", "100vw")
  })

  it("stops a smaller photo's srcset at its own width, and always offers 480", () => {
    render(<Picture image={{ url: PHOTO, width: 2048, height: 1365 }} alt="Wide" sizes="62vw" />)
    expect(screen.getByAltText("Wide").getAttribute("srcset")).toBe(
      [480, 960, 1440, 2048].map((w) => `${PHOTO}/${w}.webp ${w}w`).join(", "),
    )
    render(<Picture image={{ url: PHOTO, width: 300, height: 450 }} alt="Tiny" sizes="56px" />)
    expect(screen.getByAltText("Tiny").getAttribute("srcset")).toBe(`${PHOTO}/480.webp 480w`)
  })

  it("never crops by default and lazy-loads unless marked priority", () => {
    render(<Picture image={{ url: PHOTO, width: 2880, height: 4318 }} alt="Nahr" sizes="100vw" />)
    const img = screen.getByAltText("Nahr")
    expect(img.className).toContain("object-contain")
    expect(img).toHaveAttribute("loading", "lazy")
  })

  it("loads eagerly with high priority for the first image on a page", () => {
    render(<Picture image={{ key: "craft/bore", width: 2880, height: 4320 }} alt="Bore" sizes="60vw" fit="cover" priority />)
    const img = screen.getByAltText("Bore")
    expect(img.className).toContain("object-cover")
    expect(img).toHaveAttribute("loading", "eager")
    expect(img).toHaveAttribute("fetchpriority", "high")
  })

  it("resolves variant urls", () => {
    expect(imageUrl("craft/bore", 480)).toBe("/images/craft/bore-480.webp")
    expect(photoUrl({ url: PHOTO, width: 2880, height: 4318 }, 1440)).toBe(`${PHOTO}/1440.webp`)
  })
})
