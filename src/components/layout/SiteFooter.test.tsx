import { render, screen } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import SiteFooter from "./SiteFooter"

function renderFooter() {
  const Stub = createRoutesStub([{ path: "/:lang?/*", Component: () => <SiteFooter /> }])
  render(<Stub initialEntries={["/"]} />)
}

describe("SiteFooter", () => {
  it("links the legal pages and labels the signup field", () => {
    renderFooter()
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/legal/terms")
    expect(screen.getByRole("link", { name: "Delivery & Returns" })).toHaveAttribute("href", "/legal/delivery")
    expect(screen.getByLabelText("Your email, for new editions")).toHaveAttribute("type", "email")
    // Visible focus on charcoal: the line turns Frost Stone (wine is too dark there).
    expect(screen.getByLabelText("Your email, for new editions").parentElement?.className).toContain("focus-within:border-dark-section-foreground")
  })

  it("links the wordmark home and offers the contact email", () => {
    renderFooter()
    expect(screen.getByRole("link", { name: "Glowstone home" })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: "glowstone216@gmail.com" })).toHaveAttribute("href", "mailto:glowstone216@gmail.com")
  })

  it("hides social links until their addresses are set", () => {
    renderFooter()
    expect(screen.queryByRole("link", { name: "Instagram" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "WhatsApp" })).not.toBeInTheDocument()
  })
})
