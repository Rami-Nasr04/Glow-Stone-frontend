import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import SiteHeader from "./SiteHeader"

function renderAt(path: string, accountsOpen = true) {
  const Stub = createRoutesStub([{ path: "/:lang?/*", Component: () => <SiteHeader accountsOpen={accountsOpen} /> }])
  render(<Stub initialEntries={[path]} />)
}

describe("SiteHeader", () => {
  it("links the main navigation and marks the current page", () => {
    renderAt("/about")
    const nav = screen.getByRole("navigation", { name: "Main" })
    expect(within(nav).getByRole("link", { name: "Collection" })).toHaveAttribute("href", "/collection")
    expect(within(nav).getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page")
  })

  it("names icon-only links for screen readers", () => {
    renderAt("/")
    expect(screen.getByRole("link", { name: "Cart" })).toHaveAttribute("href", "/cart")
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account")
    expect(screen.getByRole("link", { name: "Glowstone home" })).toHaveAttribute("href", "/")
  })

  // Over the mobile hero the small logo is invisible, but it is still a tab stop: focus must not vanish.
  it("shows the logo over the mobile hero while it has keyboard focus", () => {
    const Stub = createRoutesStub([{ path: "/", Component: () => <SiteHeader overHero /> }])
    render(<Stub initialEntries={["/"]} />)
    const logo = screen.getByRole("link", { name: "Glowstone home" })
    expect(logo).toHaveClass("max-lg:opacity-0")
    expect(logo).toHaveClass("focus-visible:opacity-100")
  })

  it("opens a full-screen menu with numbered links and closes it again", async () => {
    const user = userEvent.setup()
    renderAt("/")
    await user.click(screen.getByRole("button", { name: "Menu" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("link", { name: /Contact/ })).toHaveAttribute("href", "/contact")
    expect(within(dialog).getByText("03")).toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: "glowstone216@gmail.com" })).toHaveAttribute("href", "mailto:glowstone216@gmail.com")
    await user.click(within(dialog).getByRole("button", { name: "Close" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("closes the menu with Escape", async () => {
    const user = userEvent.setup()
    renderAt("/")
    await user.click(screen.getByRole("button", { name: "Menu" }))
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("hides the account links while accounts are not open yet", async () => {
    const user = userEvent.setup()
    renderAt("/", false)
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Menu" }))
    expect(within(screen.getByRole("dialog")).queryByRole("link", { name: "Account" })).not.toBeInTheDocument()
  })
})
