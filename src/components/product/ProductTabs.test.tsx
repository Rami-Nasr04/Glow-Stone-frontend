import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getProduct } from "@/features/catalog/catalog"
import { renderAt } from "@/test/render"
import ProductTabs from "./ProductTabs"

const piece = (slug: string) => getProduct(slug, "en")!

describe("ProductTabs", () => {
  it("opens on the story: lead paragraph, the quote, then the rest", () => {
    renderAt(<ProductTabs piece={piece("batroun")} />)
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Story", "Details", "Care", "Delivery"])
    const panel = screen.getByRole("tabpanel")
    expect(within(panel).getByText(/Batroun is the largest piece/)).toBeInTheDocument()
    expect(within(panel).getByText("“I wanted a piece that could stand outside and face the valley.”")).toBeInTheDocument()
    expect(within(panel).getByText("Omar, stonemason")).toBeInTheDocument()
  })

  it("leaves the quote out when a piece has none", () => {
    renderAt(<ProductTabs piece={piece("arz")} />)
    expect(screen.queryByText("Omar, stonemason")).not.toBeInTheDocument()
    expect(document.querySelector("blockquote")).toBeNull()
  })

  it("moves between tabs with the arrow keys and lists only the details that exist", async () => {
    const user = userEvent.setup()
    renderAt(<ProductTabs piece={piece("batroun")} />)
    screen.getByRole("tab", { name: "Story" }).focus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("118 × 36 × 20 cm (H × W × D)")).toBeInTheDocument()
    expect(screen.getByText("72 kg")).toBeInTheDocument()
    expect(screen.getByText("14 bottles")).toBeInTheDocument()
  })

  it("has no empty spec rows for a piece without measurements", async () => {
    const user = userEvent.setup()
    renderAt(<ProductTabs piece={piece("arz")} />)
    await user.click(screen.getByRole("tab", { name: "Details" }))
    expect(screen.queryByText("Dimensions")).not.toBeInTheDocument()
    expect(screen.queryByText("Net weight")).not.toBeInTheDocument()
    expect(screen.getByText("Edition of 10")).toBeInTheDocument()
  })

  it("shows general care, and marks unconfirmed delivery text as a placeholder", async () => {
    const user = userEvent.setup()
    renderAt(<ProductTabs piece={piece("nahr")} />)
    await user.click(screen.getByRole("tab", { name: "Care" }))
    expect(screen.getByText(/Dust with a soft, dry cloth/)).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Delivery" }))
    expect(screen.getByText("[Placeholder: returns policy.]")).toHaveClass("text-accent")
  })
})
