import { render, screen } from "@testing-library/react"
import { createRoutesStub, useLocation } from "react-router"
import Product from "./Product"

function Page() {
  const { pathname } = useLocation()
  return (
    <>
      <p>address: {pathname}</p>
      <Product />
    </>
  )
}

function renderAt(path: string) {
  const Stub = createRoutesStub([{ path: "/:lang?/collection/:id/:name?", Component: Page }])
  return render(<Stub initialEntries={[path]} />)
}

describe("Product", () => {
  it("shows the piece under one h1", () => {
    renderAt("/collection/5/qadisha")
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Qadisha"])
    expect(screen.getByText("address: /collection/5/qadisha")).toBeInTheDocument()
  })

  it.each(["/collection/5", "/collection/5/old-name", "/collection/5/QADISHA"])("corrects the address %s without a 404", async (path) => {
    renderAt(path)
    expect(await screen.findByText("address: /collection/5/qadisha")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Qadisha")
  })

  it("offers related pieces and, for available pieces, the sticky bar", () => {
    const { container } = renderAt("/collection/5/qadisha")
    expect(screen.getByRole("heading", { level: 2, name: "You may also like" })).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3)
    expect(container.querySelector("[data-sticky-bar]")).not.toBeNull()
  })

  it("has no sticky bar for a sold-out piece", () => {
    const { container } = renderAt("/collection/2/nahr")
    expect(container.querySelector("[data-sticky-bar]")).toBeNull()
  })

  it.each(["/collection/99/granite", "/collection/abc"])("shows the missing page for %s", (path) => {
    renderAt(path)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This stone hasn't been carved yet.")
  })
})
