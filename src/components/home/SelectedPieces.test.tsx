import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderAt } from "@/test/render"
import SelectedPieces from "./SelectedPieces"

describe("SelectedPieces", () => {
  // jsdom defines these on Element, does no layout and has no scrollBy.
  beforeEach(() => {
    vi.spyOn(Element.prototype, "scrollWidth", "get").mockReturnValue(2000)
    vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1000)
    Element.prototype.scrollBy = vi.fn()
  })
  afterEach(() => vi.restoreAllMocks())

  it("lists the featured pieces newest first under an h2", () => {
    renderAt(<SelectedPieces />)
    expect(screen.getByRole("heading", { level: 2, name: "Selected pieces" })).toBeInTheDocument()
    const names = screen.getAllByRole("listitem").map((li) => within(li).getByRole("heading", { level: 3 }).textContent)
    expect(names).toEqual(["Sannine", "Qadisha", "Jbeil", "Batroun", "Arz"])
  })

  it("links to the whole collection", () => {
    renderAt(<SelectedPieces />)
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/collection")
  })

  it("disables the previous arrow at the start and scrolls one card forward", async () => {
    const user = userEvent.setup()
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width: 300 } as DOMRect)
    renderAt(<SelectedPieces />)
    expect(screen.getByRole("button", { name: "Previous pieces" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Next pieces" }))
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 300 }))
  })
})
