import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PRODUCTS as all } from "@/test/catalog"
import { renderAt } from "@/test/render"
import CollectionGrid from "./CollectionGrid"

const cellsOf = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-cell]")].map((el) => [el.getAttribute("data-cell"), el.getAttribute("data-layouts")].filter(Boolean).join(" "))

describe("CollectionGrid", () => {
  it("shows every piece as a card under the page title", () => {
    renderAt(<CollectionGrid pieces={all} onClear={vi.fn()} />)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6)
  })

  // One rule (Rami, 2026-10-14): after the first full row that ends at or after the third piece, when more follow.
  // The grid has one column on phones, two from md and three from lg; each placement shows only in its layouts.
  it("places the craft interlude after the third piece on phones and desktop, after the fourth at two columns", () => {
    const { container } = renderAt(<CollectionGrid pieces={all} onClear={vi.fn()} />)
    expect(cellsOf(container)).toEqual(["piece", "piece", "piece", "interlude base lg", "piece", "interlude md", "piece", "piece", "commission"])
    const [afterThird, afterFourth] = container.querySelectorAll<HTMLElement>("[data-cell=interlude]")
    expect(afterThird.className).toMatch(/(^| )flex( |$)/)
    expect(afterThird.className).toContain("md:hidden")
    expect(afterThird.className).toContain("lg:flex")
    expect(afterFourth.className).toMatch(/(^| )hidden( |$)/)
    expect(afterFourth.className).toContain("md:flex")
    expect(afterFourth.className).toContain("lg:hidden")
    // Only one of them is ever displayed, so the line is read once.
    expect(screen.getAllByText("The marks of the chisel stay in the stone.")).toHaveLength(2)
  })

  // The first row is on screen at once (three across on desktop); the rest wait until they're scrolled near.
  it("loads the first row's covers straight away and the others lazily", () => {
    const { container } = renderAt(<CollectionGrid pieces={all} onClear={vi.fn()} />)
    const covers = [...container.querySelectorAll("[data-cell=piece] img:not([aria-hidden])")]
    expect(covers.map((img) => img.getAttribute("loading"))).toEqual(["eager", "eager", "eager", "lazy", "lazy", "lazy"])
    expect(covers.map((img) => img.getAttribute("fetchpriority"))).toEqual(["high", "high", "high", "auto", "auto", "auto"])
  })

  it("leaves the two-column interlude out when no piece would follow it", () => {
    const { container } = renderAt(<CollectionGrid pieces={all.slice(0, 4)} onClear={vi.fn()} />)
    expect(cellsOf(container)).toEqual(["piece", "piece", "piece", "interlude base lg", "piece", "commission"])
  })

  it("leaves the interlude out when three pieces or fewer are shown", () => {
    const { container } = renderAt(<CollectionGrid pieces={all.slice(0, 3)} onClear={vi.fn()} />)
    expect(cellsOf(container)).toEqual(["piece", "piece", "piece", "commission"])
  })

  it("sizes the commissions tile to fill the last row", () => {
    const { container } = renderAt(<CollectionGrid pieces={all} onClear={vi.fn()} />)
    const tile = container.querySelector("[data-cell=commission]")!
    expect(tile.className).toContain("md:col-span-2")
    expect(tile.className).toContain("lg:col-span-3")
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
