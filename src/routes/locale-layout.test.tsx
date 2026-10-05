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
})
