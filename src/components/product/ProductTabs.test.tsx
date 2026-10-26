import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { productOf } from "@/test/catalog"
import { renderAt } from "@/test/render"
import ProductTabs from "./ProductTabs"

const ARZ = 1
const BATROUN = 3
const JBEIL = 4
const QADISHA = 5
const piece = productOf

describe("ProductTabs", () => {
  it("opens on the story when a piece has one: the first paragraph as the lead, then the rest, with no quote", () => {
    // Every real story is still empty (Omar writes them in the studio), so this piece gets one for the test.
    renderAt(<ProductTabs piece={{ ...piece(QADISHA), story: "First paragraph.\n\nSecond.\n\nThird." }} />)
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Story", "Details", "Care", "Delivery"])
    const paragraphs = within(screen.getByRole("tabpanel")).getAllByText(/./, { selector: "p" })
    expect(paragraphs.map((p) => p.textContent)).toEqual(["First paragraph.", "Second.", "Third."])
    expect(paragraphs[0].className).toContain("font-display")
    expect(document.querySelector("blockquote")).toBeNull()
  })

  it("has no story tab while a piece has no story, and opens on the details", () => {
    renderAt(<ProductTabs piece={piece(ARZ)} />)
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Details", "Care", "Delivery"])
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true")
  })

  it("lists only dimensions, weight, stone, colour, capacity and edition", () => {
    renderAt(<ProductTabs piece={piece(QADISHA)} />)
    const terms = [...document.querySelectorAll("dt")].map((dt) => dt.textContent)
    expect(terms).toEqual(["Dimensions", "Net weight", "Stone", "Colour", "Capacity", "Edition"])
    const values = [...document.querySelectorAll("dd")].map((dd) => dd.textContent)
    expect(values).toEqual(["118 × 36 × 20 cm (H × W × D)", "72 kg", "Limestone", "Cream", "14 bottles", "Edition of 8"])
  })

  it("says one bottle for a single-bottle holder", () => {
    renderAt(<ProductTabs piece={piece(BATROUN)} />)
    expect(screen.getByText("1 bottle")).toBeInTheDocument()
  })

  it("has no empty rows for a piece without measurements", () => {
    renderAt(<ProductTabs piece={piece(JBEIL)} />)
    const terms = [...document.querySelectorAll("dt")].map((dt) => dt.textContent)
    expect(terms).toEqual(["Stone", "Colour", "Capacity", "Edition"])
  })

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup()
    renderAt(<ProductTabs piece={piece(QADISHA)} />)
    screen.getByRole("tab", { name: "Details" }).focus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Care" })).toHaveAttribute("aria-selected", "true")
  })

  it("shows the site-wide care text, and marks unconfirmed delivery text as a placeholder", async () => {
    const user = userEvent.setup()
    renderAt(<ProductTabs piece={piece(BATROUN)} />)
    await user.click(screen.getByRole("tab", { name: "Care" }))
    expect(screen.getByText(/Dust with a soft, dry cloth/)).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Delivery" }))
    expect(screen.getByText("[Placeholder: returns policy.]")).toHaveClass("text-accent")
  })

  it("says delivery is free, and that Omar may agree a fee for far-off areas when he calls", async () => {
    const user = userEvent.setup()
    renderAt(<ProductTabs piece={piece(BATROUN)} />)
    await user.click(screen.getByRole("tab", { name: "Delivery" }))
    expect(
      screen.getByText(
        "Delivery is free all over Lebanon. For far-off areas, Omar may agree a small delivery fee with you when he calls to confirm your order, within 2 business days. Payment is in cash on delivery; a gift is paid by the buyer, by Whish or OMT.",
      ),
    ).toBeInTheDocument()
  })

  // Omar's answers, 2026-10-26.
  it("says how long delivery takes and how the courier gets in touch", async () => {
    const user = userEvent.setup()
    renderAt(<ProductTabs piece={piece(BATROUN)} />)
    await user.click(screen.getByRole("tab", { name: "Delivery" }))
    expect(
      screen.getByText("Delivery usually takes about a week. On the delivery day, the courier calls or WhatsApps the phone number given with the order."),
    ).toBeInTheDocument()
    expect(screen.queryByText("[Placeholder: delivery times.]")).not.toBeInTheDocument()
  })
})
