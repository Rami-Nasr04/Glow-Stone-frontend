import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { listProducts } from "@/features/catalog/catalog"
import { renderAt } from "@/test/render"
import FilterBar from "./FilterBar"
import { filterOptions, NO_FILTERS } from "./filters"

const options = filterOptions(listProducts())

describe("FilterBar", () => {
  it("offers the filters that have a real choice, and the piece count", () => {
    renderAt(<FilterBar filters={NO_FILTERS} options={options} count={8} onChange={vi.fn()} />)
    for (const name of ["Colour", "Capacity", "Availability"]) expect(screen.getByRole("button", { name })).toBeInTheDocument()
    // Every piece is limestone today, so there is nothing to choose between.
    expect(screen.queryByRole("button", { name: "Stone" })).not.toBeInTheDocument()
    expect(screen.getByText("8 pieces")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument()
  })

  it("picks an option from the keyboard", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderAt(<FilterBar filters={NO_FILTERS} options={options} count={8} onChange={onChange} />)
    screen.getByRole("button", { name: "Colour" }).focus()
    await user.keyboard("{Enter}")
    await user.click(await screen.findByRole("menuitemradio", { name: "Cream" }))
    expect(onChange).toHaveBeenCalledWith({ ...NO_FILTERS, color: "cream" })
  })

  it("shows the chosen value, closes with Escape and clears everything", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderAt(<FilterBar filters={{ ...NO_FILTERS, color: "cream", availability: "available" }} options={options} count={1} onChange={onChange} />)
    expect(screen.getByRole("button", { name: "Colour Cream" })).toBeInTheDocument()
    expect(screen.getByText("1 piece")).toBeInTheDocument()
    screen.getByRole("button", { name: "Colour Cream" }).focus()
    await user.keyboard("{Enter}")
    expect(await screen.findByRole("menu")).toBeInTheDocument()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Clear" }))
    expect(onChange).toHaveBeenCalledWith(NO_FILTERS)
  })
})
