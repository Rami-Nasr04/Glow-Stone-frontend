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

  it("shows both close-ups cropped to fill, with the bore captioned", () => {
    renderAt(<CraftCollage />)
    expect(screen.getByAltText(/hand-broken crest/).className).toContain("object-cover")
    expect(screen.getByAltText(/ringed wall/).className).toContain("object-cover")
    expect(screen.getByText("The bore").tagName).toBe("FIGCAPTION")
  })
})
