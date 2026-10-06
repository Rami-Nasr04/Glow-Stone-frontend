import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderAt } from "@/test/render"
import Collection from "./Collection"

describe("Collection", () => {
  it("shows every piece with one h1 when nothing is filtered", () => {
    renderAt(<Collection />, "/collection")
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(8)
    expect(screen.getAllByText("8 pieces").length).toBeGreaterThan(0)
  })

  it("reads the filters from the address", () => {
    renderAt(<Collection />, "/collection?stone=grey&capacity=10")
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Qadisha · Ash"])
    expect(screen.getAllByText("1 piece").length).toBeGreaterThan(0)
  })

  it("clears the filters from the empty state", async () => {
    const user = userEvent.setup()
    renderAt(<Collection />, "/collection?stone=cream&capacity=1")
    await user.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(8)
  })
})
