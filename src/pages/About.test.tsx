import { screen } from "@testing-library/react"
import { renderAt } from "@/test/render"
import About from "./About"

describe("About", () => {
  it("reads as one page: title, four chapters, the close, and no unapproved quote", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 1000 } as DOMRect)
    renderAt(<About />, "/about")
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4)
    expect(screen.queryByText(/Stone keeps its own time/)).not.toBeInTheDocument()
    // The crest close-up is Arz (camera file _ADY1294, from the arz folder); its name comes from the data.
    expect(screen.getAllByAltText(/^The hand-broken crest of Arz/).length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: "View the collection" })).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
