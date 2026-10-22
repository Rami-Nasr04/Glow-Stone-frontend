import type { ProductImage } from "@/features/catalog/types"

// The customers and orders API (contract: "API contract: customers and orders", draft 2026-10-23). Money is in USD
// with up to 2 decimals, and every total comes from the server.

/** GET /me */
export interface Me {
  email: string
  name: string
  /** E.164, "+96171234567". */
  phone: string
}

export interface OrderItemInput {
  productId: number
  quantity: number
  /** The price the cart showed: the server refuses the order if it has changed since. */
  unitPrice: number
}

/** POST /orders */
export interface PlaceOrderInput {
  items: OrderItemInput[]
  /** null: the account holder receives it. */
  recipient: { name: string; phone: string } | null
  city: string
  address: string
  deliveryNotes: string | null
  isGift: boolean
  giftMessage: string | null
}

export type OrderStatus = "pending" | "confirmed" | "out_for_delivery" | "delivered" | "cancelled"

export const ORDER_STATUSES: readonly OrderStatus[] = ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"]

/** One row of GET /me/orders. */
export interface OrderSummary {
  id: number
  number: string
  status: OrderStatus
  createdAt: string
  itemCount: number
  total: number
  /** The first line's cover photo. */
  image: ProductImage | null
}

export interface OrderItem {
  productId: number
  /** The piece's current name. */
  name: string
  quantity: number
  /** The price paid. */
  unitPrice: number
  lineTotal: number
  image: ProductImage | null
}

/** GET /me/orders/{id}, and the answer to POST /orders and to a cancel. */
export interface Order {
  id: number
  number: string
  status: OrderStatus
  createdAt: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  recipient: { name: string; phone: string; isAccountHolder: boolean }
  city: string
  address: string
  deliveryNotes: string | null
  isGift: boolean
  giftMessage: string | null
  canCancel: boolean
}

/** The API's refusal codes, plus NETWORK when no answer came and INVALID_ANSWER when it couldn't be read. */
export type OrderErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "UNAVAILABLE"
  | "PRICE_CHANGED"
  | "ORDER_LIMIT"
  | "CONFLICT"
  | "NETWORK"
  | "INVALID_ANSWER"
  | (string & {})

export class OrderError extends Error {
  readonly status: number
  readonly code: OrderErrorCode
  /** The piece a 409 UNAVAILABLE / PRICE_CHANGED is about, when the API says (not in the contract yet). */
  readonly productId: number | null

  constructor(status: number, code: OrderErrorCode, message: string, productId: number | null = null) {
    super(message)
    this.name = "OrderError"
    this.status = status
    this.code = code
    this.productId = productId
  }
}

export interface OrdersClient {
  me(): Promise<Me>
  place(input: PlaceOrderInput): Promise<Order>
  list(): Promise<OrderSummary[]>
  /** null for a 404 (not this customer's, or no such order). */
  get(id: number): Promise<Order | null>
  cancel(id: number): Promise<Order>
}
