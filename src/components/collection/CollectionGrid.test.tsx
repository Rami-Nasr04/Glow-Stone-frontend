import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { listProducts } from "@/features/catalog/catalog"
import { renderAt } from "@/test/render"
import CollectionGrid from "./CollectionGrid"
import { tileSpans } from "./grid-layout"

const all = listProducts()
// The real catalog has six pieces; two copies with new ids show what happens once more follow.
const eight = [...all, ...all.slice(0, 2).map((piece, i) => ({ ...piece, id: 100 + i }))]

describe("CollectionGrid", () => {
  it("shows every piece as a card under the page title", () => {
    renderAt(<CollectionGrid pieces={all} onClear={vi.fn()} />)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6)
  })

  it("places one craft interlude after the sixth piece when more follow", () => {
    const { container } = renderAt(<CollectionGrid pieces={eight} onClear={vi.fn()} />)
    const cells = [...container.querySelectorAll("[data-cell]")].map((el) => el.getAttribute("data-cell"))
    expect(cells).toEqual(["piece", "piece", "piece", "piece", "piece", "piece", "interlude", "piece", "piece", "commission"])
    expect(screen.getByText("The marks of the chisel stay in the stone.")).toBeInTheDocument()
  })

  it("leaves the interlude out when six pieces or fewer are shown (the real catalog today)", () => {
    renderAt(<CollectionGrid pieces={all} onClear={vi.fn()} />)
    expect(screen.queryByText("The marks of the chisel stay in the stone.")).not.toBeInTheDocument()
  })

  it("sizes the commissions tile to fill the last row at two and three columns", () => {
    expect(tileSpans(6)).toEqual({ md: 2, lg: 3 })
    expect(tileSpans(8)).toEqual({ md: 2, lg: 1 })
    expect(tileSpans(7)).toEqual({ md: 1, lg: 2 })
    expect(tileSpans(3)).toEqual({ md: 1, lg: 3 })
    expect(tileSpans(1)).toEqual({ md: 1, lg: 2 })
  })

  it("invites commissions through the contact page", () => {
    renderAt(<CollectionGrid pieces={all} onClear={vi.fn()} />)
    expect(screen.getByText("For bespoke pieces or commissions, write to us.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact")
  })

  it("offers to clear the filters when nothing matches", async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    renderAt(<CollectionGrid pieces={[]} onClear={onClear} />)
    expect(screen.getByText("No pieces match these filters.")).toBeInTheDocument()
    expect(screen.queryByText(/bespoke pieces/)).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(onClear).toHaveBeenCalled()
  })
})
