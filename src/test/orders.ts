import { createMockAuth, DEMO_USER } from "@/features/auth/mock-auth"
import { ordersFor } from "@/features/orders/client"
import type { Order, PlaceOrderInput } from "@/features/orders/types"
import { stubApi } from "./catalog"

/** The demo customer, signed in, with GET /products answered from the fixtures. */
export async function demoCustomer() {
  stubApi()
  const auth = createMockAuth(localStorage)
  await auth.signIn(DEMO_USER.email, DEMO_USER.password)
  return { auth, orders: ordersFor(auth) }
}

export const ADDRESS = { city: "Jounieh", address: "Main road, Haddad bldg, 3rd floor", deliveryNotes: "Call before coming" }

/** Places an order through the demo orders API (the contract's rules), as checkout would. */
export function placeOrder(orders: ReturnType<typeof ordersFor>, change: Partial<PlaceOrderInput> = {}): Promise<Order> {
  return orders.place({
    // A new attempt each time, as the shop makes one per order.
    requestId: crypto.randomUUID(),
    items: [
      { productId: 5, quantity: 1, unitPrice: 890 },
      { productId: 3, quantity: 2, unitPrice: 180 },
    ],
    recipient: null,
    ...ADDRESS,
    isGift: false,
    giftMessage: null,
    ...change,
  })
}
