import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderAt } from "@/test/render"
import FilterSheet from "./FilterSheet"
import { NO_FILTERS } from "./filters"

describe("FilterSheet", () => {
  it("is not in the page at all while closed", () => {
    renderAt(<FilterSheet filters={NO_FILTERS} count={8} onChange={vi.fn()} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("shows how many filters are active", () => {
    renderAt(<FilterSheet filters={{ stone: "grey", capacity: "5", availability: null }} count={1} onChange={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Filter (2)" })).toBeInTheDocument()
  })

  it("applies a choice and closes from the show button", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderAt(<FilterSheet filters={NO_FILTERS} count={8} onChange={onChange} />)
    await user.click(screen.getByRole("button", { name: "Filter" }))
    const sheet = screen.getByRole("dialog", { name: "Filters" })
    await user.click(within(within(sheet).getByRole("radiogroup", { name: "Capacity" })).getByRole("radio", { name: "1 bottle" }))
    expect(onChange).toHaveBeenCalledWith({ stone: null, capacity: "1", availability: null })
    await user.click(within(sheet).getByRole("button", { name: "Show 8 pieces" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("closes with Escape", async () => {
    const user = userEvent.setup()
    renderAt(<FilterSheet filters={NO_FILTERS} count={8} onChange={vi.fn()} />)
    await user.click(screen.getByRole("button", { name: "Filter" }))
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
