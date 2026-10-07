import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { getProduct } from "@/features/catalog/catalog"
import { renderAt } from "@/test/render"
import BuyBox from "./BuyBox"

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const piece = (slug: string) => getProduct(slug, "en")!

describe("BuyBox", () => {
  it("names the piece under a breadcrumb back to the collection", () => {
    renderAt(<BuyBox piece={piece("qadisha-earth")} />)
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" })
    expect(crumbs.querySelector("a")).toHaveAttribute("href", "/collection")
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Qadisha · Earth")
    expect(screen.getByText("$560")).toBeInTheDocument()
    expect(screen.getByText("Ready to deliver")).toBeInTheDocument()
  })

  it("caps the quantity at the pieces remaining", async () => {
    const user = userEvent.setup()
    renderAt(<BuyBox piece={piece("qadisha-earth")} />)
    const less = screen.getByRole("button", { name: "One fewer" })
    const more = screen.getByRole("button", { name: "One more" })
    expect(less).toBeDisabled()
    expect(screen.getByText("Up to 2, the pieces remaining in this edition.")).toBeInTheDocument()
    await user.click(more)
    expect(screen.getByRole("status")).toHaveTextContent("2")
    expect(more).toBeDisabled()
  })

  it("confirms the piece was added", async () => {
    const user = userEvent.setup()
    renderAt(<BuyBox piece={piece("batroun")} />)
    expect(screen.getByText("Made to order · 6 weeks")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(toast.success).toHaveBeenCalledWith("Added to your selection")
  })

  it("invites a new-edition signup when a re-issuable piece is sold out", () => {
    renderAt(<BuyBox piece={piece("byblos")} />)
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument()
    expect(screen.queryByText(/0 remaining/)).not.toBeInTheDocument()
    expect(screen.getByText("Edition of 15 — sold out")).toBeInTheDocument()
    expect(screen.getAllByText("Sold out")).toHaveLength(1)
    expect(screen.getByText(/This edition has found its homes/)).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    // Keyboard users see where they are: the line turns wine while the field has focus.
    expect(screen.getByLabelText("Email").closest("form")?.className).toContain("focus-within:border-accent")
    expect(screen.getByRole("button", { name: "Notify me" })).toBeInTheDocument()
  })

  it("says a one-of-a-kind piece won't be carved again", () => {
    renderAt(<BuyBox piece={{ ...piece("byblos"), reissuable: false }} />)
    expect(screen.getByText("One of a kind. This piece won't be carved again.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument()
  })
})
