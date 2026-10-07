import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getProduct } from "@/features/catalog/catalog"
import { renderAt } from "@/test/render"
import ProductTabs from "./ProductTabs"

const ARZ = 1
const NAHR = 2
const BATROUN = 3
const QADISHA_EARTH = 6
const piece = (id: number) => getProduct(id)!

describe("ProductTabs", () => {
  it("opens on the story: the first paragraph as the lead, then the rest, with no quote", () => {
    renderAt(<ProductTabs piece={piece(QADISHA_EARTH)} />)
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Story", "Details", "Care", "Delivery"])
    const panel = screen.getByRole("tabpanel")
    const paragraphs = within(panel).getAllByText(/./, { selector: "p" })
    expect(paragraphs).toHaveLength(3)
    expect(paragraphs[0]).toHaveTextContent(/^Qadisha is named for the holy valley/)
    expect(paragraphs[0].className).toContain("font-display")
    expect(document.querySelector("blockquote")).toBeNull()
    expect(screen.queryByText(/stonemason/i)).not.toBeInTheDocument()
  })

  it("has no story tab for a piece without a story, and opens on the details", () => {
    renderAt(<ProductTabs piece={piece(ARZ)} />)
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Details", "Care", "Delivery"])
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true")
  })

  it("lists only dimensions, weight, stone, colour, capacity and edition", async () => {
    const user = userEvent.setup()
    renderAt(<ProductTabs piece={piece(BATROUN)} />)
    screen.getByRole("tab", { name: "Story" }).focus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true")
    const terms = [...document.querySelectorAll("dt")].map((dt) => dt.textContent)
    expect(terms).toEqual(["Dimensions", "Net weight", "Stone", "Colour", "Capacity", "Edition"])
    const values = [...document.querySelectorAll("dd")].map((dd) => dd.textContent)
    expect(values).toEqual(["118 × 36 × 20 cm (H × W × D)", "72 kg", "Limestone", "Cream", "14 bottles", "Edition of 8"])
  })

  it("has no empty rows for a piece without measurements", () => {
    renderAt(<ProductTabs piece={piece(ARZ)} />)
    const terms = [...document.querySelectorAll("dt")].map((dt) => dt.textContent)
    expect(terms).toEqual(["Stone", "Colour", "Capacity", "Edition"])
  })

  it("shows the site-wide care text, and marks unconfirmed delivery text as a placeholder", async () => {
    const user = userEvent.setup()
    renderAt(<ProductTabs piece={piece(NAHR)} />)
    await user.click(screen.getByRole("tab", { name: "Care" }))
    expect(screen.getByText(/Dust with a soft, dry cloth/)).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Delivery" }))
    expect(screen.getByText("[Placeholder: returns policy.]")).toHaveClass("text-accent")
  })
})
