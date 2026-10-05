import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import { ActionLink } from "./action-link"

describe("ActionLink", () => {
  it("is a link with a mirrored arrow for right-to-left pages", () => {
    renderAt(<ActionLink to="/collection">Shop collection</ActionLink>)
    const link = screen.getByRole("link", { name: "Shop collection" })
    expect(link).toHaveAttribute("href", "/collection")
    expect(link.querySelector("svg")?.getAttribute("class")).toContain("rtl:-scale-x-100")
  })

  it("can drop the arrow and is at least 44px tall", () => {
    renderAt(
      <ActionLink to="/" arrow={false} variant="solid">
        Home
      </ActionLink>,
    )
    const link = screen.getByRole("link", { name: "Home" })
    expect(link.querySelector("svg")).toBeNull()
    expect(link.className).toMatch(/min-h-1[45]/)
  })
})
