import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import NotFound from "./NotFound"

describe("NotFound", () => {
  it("explains the page is missing and offers two ways back", () => {
    renderAt(<NotFound />, "/somewhere")
    expect(screen.getByText("404")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This stone hasn't been carved yet.")
    expect(screen.getByText("The page you were looking for doesn't exist, or has moved.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View the collection" })).toHaveAttribute("href", "/collection")
    const home = screen.getByRole("link", { name: "Home" })
    expect(home).toHaveAttribute("href", "/")
    expect(home.querySelector("svg")).toBeNull()
  })
})
