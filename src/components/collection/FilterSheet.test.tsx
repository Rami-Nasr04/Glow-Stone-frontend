import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { listProducts } from "@/features/catalog/catalog"
import { renderAt } from "@/test/render"
import FilterSheet from "./FilterSheet"
import { filterOptions, NO_FILTERS } from "./filters"

const options = filterOptions(listProducts())

describe("FilterSheet", () => {
  it("is not in the page at all while closed", () => {
    renderAt(<FilterSheet filters={NO_FILTERS} options={options} count={8} onChange={vi.fn()} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("shows how many filters are active", () => {
    renderAt(<FilterSheet filters={{ ...NO_FILTERS, color: "cream", capacity: "5" }} options={options} count={1} onChange={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Filter (2)" })).toBeInTheDocument()
  })

  it("applies a choice and closes from the show button", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderAt(<FilterSheet filters={NO_FILTERS} options={options} count={8} onChange={onChange} />)
    await user.click(screen.getByRole("button", { name: "Filter" }))
    const sheet = screen.getByRole("dialog", { name: "Filters" })
    await user.click(within(within(sheet).getByRole("radiogroup", { name: "Capacity" })).getByRole("radio", { name: "1 bottle" }))
    expect(onChange).toHaveBeenCalledWith({ ...NO_FILTERS, capacity: "1" })
    await user.click(within(sheet).getByRole("button", { name: "Show 8 pieces" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("closes with Escape", async () => {
    const user = userEvent.setup()
    renderAt(<FilterSheet filters={NO_FILTERS} options={options} count={8} onChange={vi.fn()} />)
    await user.click(screen.getByRole("button", { name: "Filter" }))
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
