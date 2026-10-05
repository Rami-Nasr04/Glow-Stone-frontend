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
  it("renders the page for a known locale", () => {
    renderAt("/ar")
    expect(screen.getByRole("heading", { name: "Home page" })).toBeInTheDocument()
  })

  it("renders the page with no locale prefix", () => {
    renderAt("/")
    expect(screen.getByRole("heading", { name: "Home page" })).toBeInTheDocument()
  })

  it("treats an unknown first segment as a missing page", () => {
    renderAt("/de")
    expect(screen.queryByRole("heading", { name: "Home page" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument()
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
})
