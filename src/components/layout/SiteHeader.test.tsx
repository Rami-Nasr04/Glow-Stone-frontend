import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import SiteHeader from "./SiteHeader"

function renderAt(path: string) {
  const Stub = createRoutesStub([{ path: "/:lang?/*", Component: () => <SiteHeader /> }])
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
})
