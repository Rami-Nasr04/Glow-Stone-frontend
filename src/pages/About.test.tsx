import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import About from "./About"

describe("About", () => {
  it("reads as one page: title, four chapters, the quote, the close", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 1000 } as DOMRect)
    renderAt(<About />, "/about")
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4)
    expect(screen.getByText(/Stone keeps its own time/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View the collection" })).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
