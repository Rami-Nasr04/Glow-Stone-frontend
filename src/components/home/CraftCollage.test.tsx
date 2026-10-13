import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import CraftCollage from "./CraftCollage"

describe("CraftCollage", () => {
  it("introduces the craft and links to the story", () => {
    renderAt(<CraftCollage />)
    expect(screen.getByRole("heading", { level: 2, name: "The craft" })).toBeInTheDocument()
    expect(screen.getByText(/Every piece begins as a single block/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Our story" })).toHaveAttribute("href", "/about")
  })

  it("keeps its own margins so the photos can cross both section edges", () => {
    // Without a new block formatting context the negative margins collapse through the section and nothing straddles.
    const { container } = renderAt(<CraftCollage />)
    expect(container.querySelector("section")).toHaveClass("flow-root")
  })

  it("shows both close-ups cropped to fill, with the bore captioned", () => {
    renderAt(<CraftCollage />)
    expect(screen.getByAltText(/hand-broken limestone crest/).className).toContain("object-cover")
    expect(screen.getByAltText(/ringed wall/).className).toContain("object-cover")
    expect(screen.getByText("The bore").tagName).toBe("FIGCAPTION")
  })
})
