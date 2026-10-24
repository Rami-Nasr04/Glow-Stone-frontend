import { createContext, useContext } from "react"
import type { AdminOrderSummary } from "./orders"

export interface PendingOrdersValue {
  /** A page that just read the orders list hands it over, so the count costs no second call. */
  report: (orders: readonly AdminOrderSummary[]) => void
  /** A page that changed an order (a step forward, a cancel) asks for the count again. */
  refresh: () => void
}

// The pending count next to Orders in the studio's navigation. Outside the shell (the delivery slip, tests of one
// page) there is no count to keep, so both do nothing.
export const PendingOrdersContext = createContext<PendingOrdersValue>({ report: () => {}, refresh: () => {} })

export function usePendingOrders(): PendingOrdersValue {
  return useContext(PendingOrdersContext)
}

export const pendingIn = (orders: readonly AdminOrderSummary[]) => orders.filter((order) => order.status === "pending").length
