import { screen, within } from "@testing-library/react"
import { Toaster } from "sonner"
import { STUDIO_COPY } from "@/features/studio/copy"
import type { AdminOrder } from "@/features/studio/orders"
import { renderStudioAt } from "@/test/render-studio"
import { failure, fakeAdminAuth, ok, setupUser } from "@/test/studio"
import { adminOrderOf, giftOrderOf } from "@/test/studio-orders"
import StudioOrder from "./StudioOrder"

const t = STUDIO_COPY.order

type Handler = (init: RequestInit) => Response | Promise<Response>

// Answers by "METHOD /path"; anything else fails the test loudly.
function serve(routes: Record<string, Handler>) {
  const fetch = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    const key = `${init.method ?? "GET"} ${new URL(String(url)).pathname}`
    const handler = routes[key]
    if (!handler) throw new Error(`unexpected call: ${key}`)
    return handler(init)
  })
  vi.stubGlobal("fetch", fetch)
  return fetch
}

const calls = (fetch: ReturnType<typeof serve>, key: string) =>
  fetch.mock.calls.filter(([url, init]) => `${init?.method ?? "GET"} ${new URL(String(url)).pathname}` === key)

function renderOrder(id = 7, state?: unknown) {
  return renderStudioAt(
    <>
      <StudioOrder />
      <Toaster />
    </>,
    `/studio/orders/${id}`,
    { auth: fakeAdminAuth({ signedInAs: "omar@example.com" }), pattern: "/studio/orders/:id", ...(state ? { state } : {}) },
  )
}

const heading = () => screen.findByRole("heading", { level: 1, name: "GS-0007" })

describe("one order in the studio", () => {
  it("shows the order: when, its status, the pieces and the totals", async () => {
    serve({ "GET /admin/orders/7": () => ok(adminOrderOf(7)) })
    renderOrder()
    await heading()
    expect(screen.getByText("Placed 6 Nov 2026, 16:03 · Cash on delivery")).toBeInTheDocument()
    const items = screen.getByRole("region", { name: t.items })
    expect(within(items).getByText("Qadisha")).toBeInTheDocument()
    expect(within(items).getByText("Limestone · Sand · Qty 2")).toBeInTheDocument()
    expect(within(items).getByText("$1,780")).toBeInTheDocument()
    const totals = within(items).getByRole("list", { name: t.totals })
    expect(totals).toHaveTextContent(`${t.subtotal}$2,070`)
    expect(totals).toHaveTextContent(`${t.delivery}${t.free}`)
    expect(totals).toHaveTextContent(`${t.total}$2,070`)
  })

  it("shows who bought it, with ways to reach them, and where it goes", async () => {
    serve({ "GET /admin/orders/7": () => ok(adminOrderOf(7)) })
    renderOrder()
    await heading()
    const customer = screen.getByRole("region", { name: t.customer })
    expect(within(customer).getByRole("link", { name: "Sara Khoury" })).toHaveAttribute("href", "/studio/customers/1b5c7a2e-4d3f-4a1b-9c8d-2e6f0a1b3c4d")
    expect(within(customer).getByText("+961 71 234 567")).toBeInTheDocument()
    expect(within(customer).getByRole("link", { name: "sara@example.com" })).toHaveAttribute("href", "mailto:sara@example.com")
    expect(within(customer).getByRole("link", { name: t.call })).toHaveAttribute("href", "tel:+96171234567")
    expect(within(customer).getByRole("link", { name: t.whatsapp })).toHaveAttribute("href", "https://wa.me/96171234567")
    const deliver = screen.getByRole("region", { name: t.deliverTo })
    expect(deliver).toHaveTextContent(t.accountHolder)
    expect(deliver).toHaveTextContent("Main road, Haddad bldg, 3rd floor")
    expect(deliver).toHaveTextContent("Jounieh")
    expect(deliver).toHaveTextContent("Call before coming")
  })

  it("says so when there are no delivery notes", async () => {
    serve({ "GET /admin/orders/7": () => ok(adminOrderOf(7, { deliveryNotes: null })) })
    renderOrder()
    await heading()
    expect(screen.getByRole("region", { name: t.deliverTo })).toHaveTextContent(t.noNotes)
  })

  it("for a gift: the recipient with their own call link, the card, and that the buyer pays by Whish or OMT", async () => {
    serve({ "GET /admin/orders/7": () => ok(giftOrderOf(7)) })
    renderOrder()
    await heading()
    const deliver = screen.getByRole("region", { name: t.deliverTo })
    expect(deliver).toHaveTextContent("Rima Saad")
    expect(deliver).toHaveTextContent("+961 70 111 222")
    expect(within(deliver).getByRole("link", { name: t.callRecipient })).toHaveAttribute("href", "tel:+96170111222")
    const gift = screen.getByRole("region", { name: t.gift })
    expect(gift).toHaveTextContent("“Happy birthday, Rima”")
    expect(gift).toHaveTextContent(t.pricesHidden)
    const payment = "Sara Khoury, the buyer, pays by Whish or OMT once you have confirmed the order. The recipient pays nothing."
    expect(screen.getAllByText(payment)).toHaveLength(2)
  })

  // Studio QA, 2026-10-25: a gift's header and total said cash on delivery, beside the line that the buyer pays.
  // Omar, 2026-10-26: the buyer pays a gift by Whish or OMT.
  it("says a gift is paid by Whish or OMT, from the buyer, never on delivery", async () => {
    serve({ "GET /admin/orders/7": () => ok(giftOrderOf(7)) })
    renderOrder()
    await heading()
    expect(screen.getByText("Placed 6 Nov 2026, 16:03 · Whish or OMT, from the buyer")).toBeInTheDocument()
    expect(screen.getByText("Total · Whish or OMT, from the buyer")).toBeInTheDocument()
    expect(screen.queryByText(/on delivery/i)).not.toBeInTheDocument()
  })

  it("says when a gift has no card message, and when an order isn't a gift", async () => {
    serve({ "GET /admin/orders/7": () => ok(giftOrderOf(7, { giftMessage: null })) })
    const { unmount } = renderOrder()
    await heading()
    expect(screen.getByRole("region", { name: t.gift })).toHaveTextContent(t.noCard)
    unmount()
    serve({ "GET /admin/orders/7": () => ok(adminOrderOf(7)) })
    renderOrder()
    await heading()
    expect(screen.getByRole("region", { name: t.gift })).toHaveTextContent(t.notGift)
    expect(screen.queryByText(/Whish or OMT/)).not.toBeInTheDocument()
  })

  it("asks on the page before a step forward, naming who gets the email, and takes the order back", async () => {
    const confirmed = adminOrderOf(7, { status: "confirmed", nextStatus: "out_for_delivery", canEditFee: false })
    const fetch = serve({ "GET /admin/orders/7": () => ok(adminOrderOf(7)), "POST /admin/orders/7/status": () => ok(confirmed) })
    renderOrder()
    await heading()
    const user = setupUser()
    await user.click(screen.getByRole("button", { name: t.steps.confirmed.action }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByText("Mark as confirmed? Sara Khoury gets an email.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: t.notNow }))
    expect(screen.queryByText("Mark as confirmed? Sara Khoury gets an email.")).not.toBeInTheDocument()
    expect(calls(fetch, "POST /admin/orders/7/status")).toHaveLength(0)

    await user.click(screen.getByRole("button", { name: t.steps.confirmed.action }))
    await user.click(screen.getByRole("button", { name: t.steps.confirmed.yes }))
    expect(await screen.findByRole("button", { name: t.steps.out_for_delivery.action })).toBeInTheDocument()
    expect(JSON.parse(String(calls(fetch, "POST /admin/orders/7/status")[0][1]?.body))).toEqual({ status: "confirmed" })
    expect(screen.getAllByText(STUDIO_COPY.status.confirmed).length).toBeGreaterThan(0)
    expect(await screen.findByText("GS-0007 marked confirmed.")).toBeInTheDocument()
  })

  it("shows the API's 409 word for word and reads the order again (another tab moved it)", async () => {
    const moved = adminOrderOf(7, { status: "confirmed", nextStatus: "out_for_delivery", canEditFee: false })
    let reads = 0
    serve({
      "GET /admin/orders/7": () => ok(reads++ === 0 ? adminOrderOf(7) : moved),
      "POST /admin/orders/7/status": () => failure(409, "CONFLICT", "This order is already confirmed."),
    })
    renderOrder()
    await heading()
    const user = setupUser()
    await user.click(screen.getByRole("button", { name: t.steps.confirmed.action }))
    await user.click(screen.getByRole("button", { name: t.steps.confirmed.yes }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/^This order is already confirmed\.$/)
    expect(await screen.findByRole("button", { name: t.steps.out_for_delivery.action })).toBeInTheDocument()
  })

  it("offers nothing to do on a finished order", async () => {
    serve({ "GET /admin/orders/7": () => ok(adminOrderOf(7, { status: "delivered", nextStatus: null, canCancel: false, canEditFee: false })) })
    renderOrder()
    await heading()
    expect(screen.queryByRole("button", { name: /^Mark/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: t.cancel })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(t.feeLabel)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: t.printSlip })).toHaveAttribute("href", "/studio/orders/7/slip")
    expect(screen.getByRole("link", { name: t.printSlip })).toHaveAttribute("target", "_blank")
  })

  it("asks on the page before cancelling, saying the pieces go back in stock and who gets the email", async () => {
    const cancelled = adminOrderOf(7, { status: "cancelled", nextStatus: null, canCancel: false, canEditFee: false })
    const fetch = serve({ "GET /admin/orders/7": () => ok(adminOrderOf(7)), "POST /admin/orders/7/cancel": () => ok(cancelled) })
    renderOrder()
    await heading()
    const user = setupUser()
    await user.click(screen.getByRole("button", { name: t.cancel }))
    expect(screen.getByText("Cancel GS-0007? Its pieces go back in stock: Arz × 1, Qadisha × 2. Sara Khoury gets an email. This can't be undone.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: t.keep }))
    expect(calls(fetch, "POST /admin/orders/7/cancel")).toHaveLength(0)
    await user.click(screen.getByRole("button", { name: t.cancel }))
    await user.click(screen.getByRole("button", { name: t.cancelYes }))
    expect(await screen.findByText(t.wasCancelled)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: t.cancel })).not.toBeInTheDocument()
    expect(await screen.findByText("GS-0007 cancelled. Its pieces are back in stock.")).toBeInTheDocument()
  })

  it("shows a cancel refused by the API word for word", async () => {
    let reads = 0
    serve({
      "GET /admin/orders/7": () => ok(reads++ === 0 ? adminOrderOf(7) : adminOrderOf(7, { status: "delivered", nextStatus: null, canCancel: false, canEditFee: false })),
      "POST /admin/orders/7/cancel": () => failure(409, "CONFLICT", "A delivered order can't be cancelled."),
    })
    renderOrder()
    await heading()
    const user = setupUser()
    await user.click(screen.getByRole("button", { name: t.cancel }))
    await user.click(screen.getByRole("button", { name: t.cancelYes }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/^A delivered order can't be cancelled\.$/)
  })

  it("changes the delivery fee of a pending order, cents included, and shows the new totals", async () => {
    const after: AdminOrder = adminOrderOf(7, { deliveryFee: 15.5, total: 2085.5 })
    const fetch = serve({ "GET /admin/orders/7": () => ok(adminOrderOf(7)), "PATCH /admin/orders/7": () => ok(after) })
    renderOrder()
    await heading()
    const user = setupUser()
    const field = screen.getByLabelText(t.feeLabel)
    expect(field).toHaveValue("0")
    await user.clear(field)
    await user.type(field, "15.50")
    await user.click(screen.getByRole("button", { name: t.feeSave }))
    expect(JSON.parse(String(calls(fetch, "PATCH /admin/orders/7")[0][1]?.body))).toEqual({ deliveryFee: 15.5 })
    const totals = screen.getByRole("list", { name: t.totals })
    expect(await within(totals).findByText("$2,085.50")).toBeInTheDocument()
    expect(totals).toHaveTextContent(`${t.delivery}$15.50`)
  })

  it("explains a fee it can't send, and sends nothing", async () => {
    const fetch = serve({ "GET /admin/orders/7": () => ok(adminOrderOf(7)) })
    renderOrder()
    await heading()
    const user = setupUser()
    for (const typed of ["abc", "-5", "10000.5", "1.005"]) {
      await user.clear(screen.getByLabelText(t.feeLabel))
      await user.type(screen.getByLabelText(t.feeLabel), typed)
      await user.click(screen.getByRole("button", { name: t.feeSave }))
      expect(screen.getByText(t.feeInvalid)).toBeInTheDocument()
    }
    expect(calls(fetch, "PATCH /admin/orders/7")).toHaveLength(0)
  })

  it("shows the API's words when the fee can no longer change", async () => {
    serve({
      "GET /admin/orders/7": () => ok(adminOrderOf(7)),
      "PATCH /admin/orders/7": () => failure(409, "CONFLICT", "The delivery fee can only change before the order is confirmed."),
    })
    renderOrder()
    await heading()
    const user = setupUser()
    await user.clear(screen.getByLabelText(t.feeLabel))
    await user.type(screen.getByLabelText(t.feeLabel), "10")
    await user.click(screen.getByRole("button", { name: t.feeSave }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/^The delivery fee can only change before the order is confirmed\.$/)
  })

  it("says Order not found as the API does, with a way back", async () => {
    serve({ "GET /admin/orders/7": () => failure(404, "NOT_FOUND", "Order not found") })
    renderOrder()
    expect(await screen.findByRole("heading", { level: 1, name: "Order not found" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: `← ${t.back}` })).toHaveAttribute("href", "/studio/orders")
  })

  it("goes back to the list with the filter it came from", async () => {
    serve({ "GET /admin/orders/7": () => ok(adminOrderOf(7)) })
    renderOrder(7, { back: "?status=pending" })
    await heading()
    expect(screen.getByRole("link", { name: `← ${t.back}` })).toHaveAttribute("href", "/studio/orders?status=pending")
  })
})
