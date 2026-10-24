import { screen, within } from "@testing-library/react"
import { CONTACT_EMAIL } from "@/config/site"
import { STUDIO_COPY } from "@/features/studio/copy"
import { renderStudioAt } from "@/test/render-studio"
import { failure, fakeAdminAuth, ok, setupUser } from "@/test/studio"
import { adminOrderOf, giftOrderOf } from "@/test/studio-orders"
import StudioOrderSlip from "./StudioOrderSlip"

const t = STUDIO_COPY.slip

function renderSlip(answer: Response) {
  vi.stubGlobal("fetch", vi.fn(async () => answer))
  return renderStudioAt(<StudioOrderSlip />, "/studio/orders/7/slip", {
    auth: fakeAdminAuth({ signedInAs: "omar@example.com" }),
    pattern: "/studio/orders/:id/slip",
  })
}

const slip = async () => screen.findByRole("article", { name: `${t.title} GS-0007` })

describe("the delivery slip", () => {
  it("prints who receives it, where, the notes and the pieces with their prices and the cash to collect", async () => {
    renderSlip(ok(adminOrderOf(7)))
    const page = await slip()
    for (const text of ["GS-0007", "6 Nov 2026", "Sara Khoury", "+961 71 234 567", "Main road, Haddad bldg, 3rd floor", "Jounieh", "Call before coming"]) {
      expect(page).toHaveTextContent(text)
    }
    const pieces = within(page).getByRole("table", { name: t.pieces })
    expect(within(pieces).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([t.piece, t.qty, t.price])
    expect(within(pieces).getByRole("row", { name: /Qadisha/ })).toHaveTextContent("Limestone · Sand2$1,780")
    expect(page).toHaveTextContent(`${t.payment}${t.cash}$2,070`)
    expect(page).toHaveTextContent(CONTACT_EMAIL)
  })

  it("leaves every price out of a gift's slip, prints the card, and asks the recipient for nothing", async () => {
    renderSlip(ok(giftOrderOf(7)))
    const page = await slip()
    expect(page.textContent).not.toContain("$")
    expect(within(page).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([t.piece, t.qty])
    expect(page).not.toHaveTextContent(t.payment)
    expect(page).toHaveTextContent("Rima Saad")
    expect(page).toHaveTextContent("+961 70 111 222")
    expect(within(page).getByRole("region", { name: t.giftTitle })).toHaveTextContent("“Happy birthday, Rima”")
  })

  it("prints no card section for a gift without a message", async () => {
    renderSlip(ok(giftOrderOf(7, { giftMessage: null })))
    const page = await slip()
    expect(within(page).queryByRole("region", { name: t.giftTitle })).not.toBeInTheDocument()
    expect(page.textContent).not.toContain("$")
  })

  it("leaves out the notes line when there are none", async () => {
    renderSlip(ok(adminOrderOf(7, { deliveryNotes: null })))
    expect(await slip()).not.toHaveTextContent(t.notes)
  })

  it("prints on request, with a way back to the order", async () => {
    const print = vi.fn()
    vi.stubGlobal("print", print)
    renderSlip(ok(adminOrderOf(7)))
    await slip()
    await setupUser().click(screen.getByRole("button", { name: t.print }))
    expect(print).toHaveBeenCalledOnce()
    expect(screen.getByRole("link", { name: `← ${t.back}` })).toHaveAttribute("href", "/studio/orders/7")
  })

  it("says Order not found as the API does", async () => {
    renderSlip(failure(404, "NOT_FOUND", "Order not found"))
    expect(await screen.findByRole("heading", { level: 1, name: "Order not found" })).toBeInTheDocument()
  })
})
