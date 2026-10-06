import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderAt } from "@/test/render"
import FilterBar from "./FilterBar"
import { NO_FILTERS } from "./filters"

describe("FilterBar", () => {
  it("offers the three filters and the piece count", () => {
    renderAt(<FilterBar filters={NO_FILTERS} count={8} onChange={vi.fn()} />)
    for (const name of ["Stone", "Capacity", "Availability"]) expect(screen.getByRole("button", { name })).toBeInTheDocument()
    expect(screen.getByText("8 pieces")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument()
  })

  it("picks an option from the keyboard", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderAt(<FilterBar filters={NO_FILTERS} count={8} onChange={onChange} />)
    screen.getByRole("button", { name: "Stone" }).focus()
    await user.keyboard("{Enter}")
    await user.click(await screen.findByRole("menuitemradio", { name: "Grey" }))
    expect(onChange).toHaveBeenCalledWith({ stone: "grey", capacity: null, availability: null })
  })

  it("shows the chosen value, closes with Escape and clears everything", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderAt(<FilterBar filters={{ stone: "grey", capacity: null, availability: "ready" }} count={1} onChange={onChange} />)
    expect(screen.getByRole("button", { name: "Stone Grey" })).toBeInTheDocument()
    expect(screen.getByText("1 piece")).toBeInTheDocument()
    screen.getByRole("button", { name: "Stone Grey" }).focus()
    await user.keyboard("{Enter}")
    expect(await screen.findByRole("menu")).toBeInTheDocument()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Clear" }))
    expect(onChange).toHaveBeenCalledWith(NO_FILTERS)
  })
})
