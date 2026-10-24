import type { AdminCustomer, AdminCustomerDetail, AdminOrder, AdminOrderSummary } from "@/features/studio/orders"

// Orders and customers as the admin routes answer them. Every person here is made up.

const CUSTOMER = { id: "1b5c7a2e-4d3f-4a1b-9c8d-2e6f0a1b3c4d", name: "Sara Khoury", phone: "+96171234567" }
const EMAIL = "sara@example.com"

export function orderSummaryOf(id: number, changes: Partial<AdminOrderSummary> = {}): AdminOrderSummary {
  return {
    id,
    number: `GS-${String(id).padStart(4, "0")}`,
    status: "pending",
    createdAt: "2026-11-06T14:03:00Z",
    customer: { ...CUSTOMER },
    city: "Jounieh",
    itemCount: 3,
    total: 2070,
    isGift: false,
    ...changes,
  }
}

export function adminOrderOf(id: number, changes: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id,
    number: `GS-${String(id).padStart(4, "0")}`,
    status: "pending",
    createdAt: "2026-11-06T14:03:00Z",
    items: [
      {
        productId: 2,
        name: "Arz",
        stoneType: "Limestone",
        color: "Cream",
        quantity: 1,
        unitPrice: 290,
        lineTotal: 290,
        image: { url: "https://images.test/products/2/abc", width: 2048, height: 3072 },
      },
      {
        productId: 5,
        name: "Qadisha",
        stoneType: "Limestone",
        color: "Sand",
        quantity: 2,
        unitPrice: 890,
        lineTotal: 1780,
        image: { url: "https://images.test/products/5/def", width: 2048, height: 3072 },
      },
    ],
    subtotal: 2070,
    deliveryFee: 0,
    total: 2070,
    recipient: { name: CUSTOMER.name, phone: CUSTOMER.phone, isAccountHolder: true },
    city: "Jounieh",
    address: "Main road, Haddad bldg, 3rd floor",
    deliveryNotes: "Call before coming",
    isGift: false,
    giftMessage: null,
    canCancel: true,
    customer: { ...CUSTOMER, email: EMAIL },
    nextStatus: "confirmed",
    canEditFee: true,
    ...changes,
  }
}

/** A gift for someone else, paid by the customer. */
export function giftOrderOf(id: number, changes: Partial<AdminOrder> = {}): AdminOrder {
  return adminOrderOf(id, {
    isGift: true,
    giftMessage: "Happy birthday, Rima",
    recipient: { name: "Rima Saad", phone: "+96170111222", isAccountHolder: false },
    city: "Batroun",
    address: "Old souk, blue door",
    ...changes,
  })
}

export function adminCustomerOf(id: string, changes: Partial<AdminCustomer> = {}): AdminCustomer {
  return { id, email: EMAIL, name: CUSTOMER.name, phone: CUSTOMER.phone, createdAt: "2026-10-30T08:00:00Z", orderCount: 2, ...changes }
}

export function adminCustomerDetailOf(id: string, orders: AdminOrderSummary[], changes: Partial<AdminCustomerDetail> = {}): AdminCustomerDetail {
  return { id, email: EMAIL, name: CUSTOMER.name, phone: CUSTOMER.phone, createdAt: "2026-10-30T08:00:00Z", orders, ...changes }
}
