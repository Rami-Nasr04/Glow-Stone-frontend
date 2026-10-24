import { adminCustomerDetailOf, adminCustomerOf, adminOrderOf, orderSummaryOf } from "@/test/studio-orders"
import {
  callHref,
  formatDay,
  formatMoney,
  formatOrderTime,
  formatPhone,
  readAdminCustomer,
  readAdminCustomerDetail,
  readAdminOrder,
  readOrderSummary,
  whatsappHref,
} from "./orders"

describe("reading the admin order answers", () => {
  it("reads a row of the orders list", () => {
    const row = orderSummaryOf(7)
    expect(readOrderSummary(row)).toEqual(row)
  })

  it("reads one order with the admin's extra fields", () => {
    const order = adminOrderOf(7, { isGift: true, giftMessage: "Happy birthday", nextStatus: "confirmed" })
    expect(readAdminOrder(order)).toEqual(order)
  })

  it("reads a finished order (no next step, no line photo, no notes)", () => {
    const order = adminOrderOf(3, { status: "delivered", nextStatus: null, canCancel: false, canEditFee: false, deliveryNotes: null })
    order.items[0] = { ...order.items[0], image: null }
    expect(readAdminOrder(order)).toEqual(order)
  })

  it("reads the customers list and one customer with their orders", () => {
    expect(readAdminCustomer(adminCustomerOf("c1"))).toEqual(adminCustomerOf("c1"))
    const detail = adminCustomerDetailOf("c1", [orderSummaryOf(7), orderSummaryOf(5)])
    expect(readAdminCustomerDetail(detail)).toEqual(detail)
  })

  it.each([
    ["an unknown status", { status: "lost" }, "status"],
    ["a next step that isn't forward", { nextStatus: "cancelled" }, "nextStatus"],
    ["a total that isn't a number", { total: "2070" }, "total"],
    ["a missing customer", { customer: null }, "customer"],
    ["a gift message that isn't text", { giftMessage: 4 }, "giftMessage"],
  ])("refuses an order with %s, naming the field", (_, change, field) => {
    expect(() => readAdminOrder({ ...adminOrderOf(7), ...change })).toThrow(new RegExp(`order 7: .*${field}`))
  })

  it("refuses a list row without a customer phone", () => {
    const row = orderSummaryOf(7)
    expect(() => readOrderSummary({ ...row, customer: { ...row.customer, phone: "" } })).toThrow(/customer.phone/)
  })
})

describe("showing order details", () => {
  it("keeps cents only when there are some", () => {
    expect(formatMoney(1120)).toBe("$1,120")
    expect(formatMoney(0)).toBe("$0")
    expect(formatMoney(15.5)).toBe("$15.50")
    expect(formatMoney(2085.25)).toBe("$2,085.25")
  })

  it("shows times in Beirut, whatever the computer's time zone", () => {
    // 14:03 UTC on 6 November is 16:03 in Beirut (UTC+2 in winter).
    expect(formatOrderTime("2026-11-06T14:03:00Z")).toBe("6 Nov 2026, 16:03")
    expect(formatDay("2026-11-06T23:30:00Z")).toBe("7 Nov 2026")
  })

  it("spaces a Lebanese number the way it's read, and links it for calls and WhatsApp", () => {
    expect(formatPhone("+96171234567")).toBe("+961 71 234 567")
    expect(formatPhone("+9613123456")).toBe("+961 3 123 456")
    expect(formatPhone("+33612345678")).toBe("+33612345678")
    expect(callHref("+96171234567")).toBe("tel:+96171234567")
    expect(whatsappHref("+96171234567")).toBe("https://wa.me/96171234567")
  })
})
