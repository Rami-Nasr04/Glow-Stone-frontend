import { interpolate } from "@/i18n/format"
import { STUDIO_COPY } from "./copy"

// Counts in words, for the orders and customers lists.
/** "1 piece", "3 pieces". */
export const piecesLabel = (count: number) => (count === 1 ? STUDIO_COPY.orders.piece : interpolate(STUDIO_COPY.orders.pieces, { count }))

/** "No orders", "1 order", "3 orders". */
export function ordersLabel(count: number): string {
  if (count === 0) return STUDIO_COPY.customers.noOrderCount
  return count === 1 ? STUDIO_COPY.customers.oneOrder : interpolate(STUDIO_COPY.customers.orderCount, { count })
}
