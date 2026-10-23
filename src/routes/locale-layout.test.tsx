import { render, screen } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import LocaleLayout from "./locale-layout"

function renderAt(path: string) {
  const Stub = createRoutesStub([
    {
      path: "/:lang?",
      Component: LocaleLayout,
      children: [{ index: true, Component: () => <h1>Home page</h1> }],
    },
  ])
  render(<Stub initialEntries={[path]} />)
}

describe("LocaleLayout", () => {
  it("shows the missing page for Arabic and French until they are published", () => {
    renderAt("/ar")
    expect(screen.queryByRole("heading", { name: "Home page" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This stone hasn't been carved yet.")
  })

  it("renders the page with no locale prefix", () => {
    renderAt("/")
    expect(screen.getByRole("heading", { name: "Home page" })).toBeInTheDocument()
  })

  it("treats an unknown first segment as a missing page", () => {
    renderAt("/de")
    expect(screen.queryByRole("heading", { name: "Home page" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This stone hasn't been carved yet.")
  })

  it("keeps the site header and footer on the missing page", () => {
    renderAt("/de")
    expect(screen.getByRole("banner")).toBeInTheDocument()
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
  })

  it("offers a skip link to the main content", () => {
    renderAt("/")
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main")
    expect(screen.getByRole("main")).toHaveAttribute("id", "main")
  })

  it("keeps page content clear of the fixed header, except under the home hero", () => {
    const Stub = createRoutesStub([
      {
        path: "/:lang?",
        Component: LocaleLayout,
        children: [
          { index: true, Component: () => <h1>Home page</h1> },
          { path: "about", Component: () => <h1>About page</h1> },
        ],
      },
    ])
    const { unmount } = render(<Stub initialEntries={["/about"]} />)
    expect(screen.getByRole("main").className).toContain("pt-16")
    unmount()
    render(<Stub initialEntries={["/"]} />)
    expect(screen.getByRole("main").className).not.toContain("pt-16")
  })

  it("shows full-screen pages without the site header and footer", () => {
    const Stub = createRoutesStub([
      {
        path: "/:lang?",
        Component: LocaleLayout,
        children: [{ path: "sign-in", Component: () => <h1>Sign in</h1>, handle: { bare: true } }],
      },
    ])
    render(<Stub initialEntries={["/sign-in"]} />)
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByRole("banner")).not.toBeInTheDocument()
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument()
    expect(screen.getByRole("main").className).not.toContain("pt-16")
  })

  it("keeps the missing page, inside the site frame, for full-screen pages in unpublished languages", () => {
    const Stub = createRoutesStub([
      {
        path: "/:lang?",
        Component: LocaleLayout,
        children: [{ path: "sign-in", Component: () => <h1>Sign in</h1>, handle: { bare: true } }],
      },
    ])
    render(<Stub initialEntries={["/ar/sign-in"]} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This stone hasn't been carved yet.")
    expect(screen.getByRole("banner")).toBeInTheDocument()
  })

  // The 404 under /ar must not send the visitor to /ar again: the logo and every other link lead to the English pages.
  it("links to the published pages from the missing page under an unpublished prefix", () => {
    renderAt("/ar")
    for (const logo of screen.getAllByRole("link", { name: "Glowstone home" })) expect(logo).toHaveAttribute("href", "/")
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "")
    expect(hrefs.filter((href) => href === "/ar" || href.startsWith("/ar/"))).toEqual([])
  })
})
