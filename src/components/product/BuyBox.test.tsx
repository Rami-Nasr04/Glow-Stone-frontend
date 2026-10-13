import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { getProduct } from "@/features/catalog/catalog"
import { renderAt } from "@/test/render"
import BuyBox from "./BuyBox"

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const NAHR = 2
const QADISHA = 5
const SANNINE = 6
const piece = (id: number) => getProduct(id)!

describe("BuyBox", () => {
  it("names the piece, its stone and its summary under a breadcrumb back to the collection", () => {
    renderAt(<BuyBox piece={piece(SANNINE)} />)
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" })
    expect(crumbs.querySelector("a")).toHaveAttribute("href", "/collection")
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Sannine")
    expect(screen.getByText("Earth brown limestone")).toBeInTheDocument()
    expect(screen.getByText("Tall column with five half-moon notches on each side.")).toBeInTheDocument()
    expect(screen.getByText("$560")).toBeInTheDocument()
  })

  it("never mentions a lead time", () => {
    renderAt(<BuyBox piece={piece(QADISHA)} />)
    expect(screen.queryByText(/made to order|weeks|ready to deliver/i)).not.toBeInTheDocument()
  })

  it("caps the quantity at the pieces remaining", async () => {
    const user = userEvent.setup()
    renderAt(<BuyBox piece={piece(SANNINE)} />)
    const less = screen.getByRole("button", { name: "One fewer" })
    const more = screen.getByRole("button", { name: "One more" })
    expect(less).toBeDisabled()
    expect(screen.getByText("Up to 2, the pieces remaining in this edition.")).toBeInTheDocument()
    await user.click(more)
    expect(screen.getByRole("status")).toHaveTextContent("2")
    expect(more).toBeDisabled()
  })

  it("says honestly that ordering isn't open yet, without claiming the piece was added", async () => {
    const user = userEvent.setup()
    renderAt(<BuyBox piece={piece(QADISHA)} />)
    await user.click(screen.getByRole("button", { name: "Add to cart" }))
    expect(toast.success).toHaveBeenCalledWith("Online ordering opens soon. Write to Omar to reserve this piece.")
  })

  it("invites people to ask Omar for a similar piece when it is sold out", () => {
    renderAt(<BuyBox piece={piece(NAHR)} />)
    expect(screen.queryByRole("button", { name: "Add to cart" })).not.toBeInTheDocument()
    expect(screen.queryByText(/0 remaining/)).not.toBeInTheDocument()
    expect(screen.getByText("Edition of 15 — sold out")).toBeInTheDocument()
    expect(screen.getAllByText("Sold out")).toHaveLength(1)
    expect(screen.getByText("This edition has found its homes. For a similar piece, write to Omar.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Contact Omar" })).toHaveAttribute("href", "/contact")
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })
})
