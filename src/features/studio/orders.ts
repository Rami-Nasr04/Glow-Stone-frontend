// The studio's orders and customers, as the admin routes answer them (GET /admin/orders, /admin/orders/{id},
// /admin/customers, /admin/customers/{id}), read field by field, and how the screens show their dates, money and
// phones. The studio keeps its own types: nothing here comes from the shop's code, so the shop's build carries none of it.

export type OrderStatus = "pending" | "confirmed" | "out_for_delivery" | "delivered" | "cancelled"
export type ForwardStatus = "confirmed" | "out_for_delivery" | "delivered"

export const ORDER_STATUSES: readonly OrderStatus[] = ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"]
/** The steps an order goes through, in order; cancelled can come after any of the first three. */
export const ORDER_FLOW: readonly OrderStatus[] = ["pending", "confirmed", "out_for_delivery", "delivered"]
const FORWARD: readonly ForwardStatus[] = ["confirmed", "out_for_delivery", "delivered"]

export interface OrderImage {
  url: string
  width: number
  height: number
}

export interface AdminOrderSummary {
  id: number
  number: string
  status: OrderStatus
  createdAt: string
  customer: { id: string; name: string; phone: string }
  city: string
  /** The pieces: the sum of the quantities. */
  itemCount: number
  total: number
  isGift: boolean
}

export interface AdminOrderLine {
  productId: number
  name: string
  stoneType: string
  color: string
  quantity: number
  /** The price paid. */
  unitPrice: number
  lineTotal: number
  image: OrderImage | null
}

export interface AdminOrder {
  id: number
  number: string
  status: OrderStatus
  createdAt: string
  items: AdminOrderLine[]
  subtotal: number
  deliveryFee: number
  total: number
  /** Who receives it; isAccountHolder = the customer themself. */
  recipient: { name: string; phone: string; isAccountHolder: boolean }
  city: string
  address: string
  deliveryNotes: string | null
  isGift: boolean
  giftMessage: string | null
  /** Before delivered, and not already cancelled. */
  canCancel: boolean
  /** The buyer, who pays (for a gift too). */
  customer: { id: string; email: string; name: string; phone: string }
  /** The one step forward, or null once delivered or cancelled. */
  nextStatus: ForwardStatus | null
  /** Only while pending: the fee is agreed on Omar's call. */
  canEditFee: boolean
}

export interface AdminCustomer {
  id: string
  email: string
  name: string
  phone: string
  createdAt: string
  orderCount: number
}

export interface AdminCustomerDetail extends Omit<AdminCustomer, "orderCount"> {
  /** Newest first. */
  orders: AdminOrderSummary[]
}

type Json = Record<string, unknown>

class Invalid extends Error {}

function fail(message: string): never {
  throw new Invalid(message)
}

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value)

function object(row: Json, key: string): Json {
  const value = row[key]
  return isObject(value) ? value : fail(`${key} must be an object`)
}

function text(row: Json, key: string, label = key): string {
  const value = row[key]
  return typeof value === "string" && value.trim() !== "" ? value : fail(`${label} must be text`)
}

function textOrNull(row: Json, key: string): string | null {
  const value = row[key]
  return value === null || typeof value === "string" ? value : fail(`${key} must be text or null`)
}

function date(row: Json, key: string): string {
  const value = text(row, key)
  return Number.isNaN(Date.parse(value)) ? fail(`${key} must be a date`) : value
}

function money(row: Json, key: string, label = key): number {
  const value = row[key]
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fail(`${label} must be an amount`)
}

function count(row: Json, key: string, label = key): number {
  const value = row[key]
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : fail(`${label} must be a whole number`)
}

function positive(row: Json, key: string, label = key): number {
  const value = row[key]
  return Number.isInteger(value) && (value as number) > 0 ? (value as number) : fail(`${label} must be a positive whole number`)
}

function flag(row: Json, key: string, label = key): boolean {
  const value = row[key]
  return typeof value === "boolean" ? value : fail(`${label} must be true or false`)
}

function status(row: Json): OrderStatus {
  const value = row.status
  return ORDER_STATUSES.find((known) => known === value) ?? fail("status must be an order status")
}

function person(row: Json, key: string, withEmail: true): AdminOrder["customer"]
function person(row: Json, key: string, withEmail: false): AdminOrderSummary["customer"]
function person(row: Json, key: string, withEmail: boolean) {
  const value = object(row, key)
  const found = { id: text(value, "id", `${key}.id`), name: text(value, "name", `${key}.name`), phone: text(value, "phone", `${key}.phone`) }
  return withEmail ? { ...found, email: text(value, "email", `${key}.email`) } : found
}

function lineImage(value: unknown, label: string): OrderImage | null {
  if (value === null) return null
  if (!isObject(value)) fail(`${label} must be an object or null`)
  const url = value.url
  if (typeof url !== "string" || !/^https:\/\/[^\s/]+\/\S+$/.test(url)) fail(`${label}.url must be an https address`)
  return { url, width: positive(value, "width", `${label}.width`), height: positive(value, "height", `${label}.height`) }
}

function line(value: unknown, i: number): AdminOrderLine {
  const label = `items[${i}]`
  if (!isObject(value)) fail(`${label} must be an object`)
  return {
    productId: positive(value, "productId", `${label}.productId`),
    name: text(value, "name", `${label}.name`),
    stoneType: text(value, "stoneType", `${label}.stoneType`),
    color: text(value, "color", `${label}.color`),
    quantity: positive(value, "quantity", `${label}.quantity`),
    unitPrice: money(value, "unitPrice", `${label}.unitPrice`),
    lineTotal: money(value, "lineTotal", `${label}.lineTotal`),
    image: lineImage(value.image, `${label}.image`),
  }
}

function summary(row: Json): AdminOrderSummary {
  return {
    id: positive(row, "id"),
    number: text(row, "number"),
    status: status(row),
    createdAt: date(row, "createdAt"),
    customer: person(row, "customer", false),
    city: text(row, "city"),
    itemCount: positive(row, "itemCount"),
    total: money(row, "total"),
    isGift: flag(row, "isGift"),
  }
}

function order(row: Json): AdminOrder {
  if (!Array.isArray(row.items) || row.items.length === 0) fail("items must be a list of lines")
  const recipient = object(row, "recipient")
  const next = row.nextStatus
  if (next !== null && !FORWARD.some((step) => step === next)) fail("nextStatus must be a forward step or null")
  return {
    id: positive(row, "id"),
    number: text(row, "number"),
    status: status(row),
    createdAt: date(row, "createdAt"),
    items: row.items.map(line),
    subtotal: money(row, "subtotal"),
    deliveryFee: money(row, "deliveryFee"),
    total: money(row, "total"),
    recipient: {
      name: text(recipient, "name", "recipient.name"),
      phone: text(recipient, "phone", "recipient.phone"),
      isAccountHolder: flag(recipient, "isAccountHolder", "recipient.isAccountHolder"),
    },
    city: text(row, "city"),
    address: text(row, "address"),
    deliveryNotes: textOrNull(row, "deliveryNotes"),
    isGift: flag(row, "isGift"),
    giftMessage: textOrNull(row, "giftMessage"),
    canCancel: flag(row, "canCancel"),
    customer: person(row, "customer", true),
    nextStatus: next as ForwardStatus | null,
    canEditFee: flag(row, "canEditFee"),
  }
}

function customer(row: Json): Omit<AdminCustomer, "orderCount"> {
  return { id: text(row, "id"), email: text(row, "email"), name: text(row, "name"), phone: text(row, "phone"), createdAt: date(row, "createdAt") }
}

// A bad answer names what it is and the field: "order 7: total must be an amount".
function reading<T>(what: string, value: unknown, read: (row: Json) => T): T {
  const id = isObject(value) && (typeof value.id === "number" || typeof value.id === "string") ? ` ${value.id}` : ""
  try {
    if (!isObject(value)) fail("must be an object")
    return read(value)
  } catch (error) {
    if (error instanceof Invalid) throw new Error(`${what}${id}: ${error.message}`)
    throw error
  }
}

export const readOrderSummary = (value: unknown) => reading("order", value, summary)
export const readAdminOrder = (value: unknown) => reading("order", value, order)
export const readAdminCustomer = (value: unknown): AdminCustomer =>
  reading("customer", value, (row) => ({ ...customer(row), orderCount: count(row, "orderCount") }))
export const readAdminCustomerDetail = (value: unknown): AdminCustomerDetail =>
  reading("customer", value, (row) => {
    if (!Array.isArray(row.orders)) fail("orders must be a list")
    return { ...customer(row), orders: row.orders.map(readOrderSummary) }
  })

// Whole dollars as the shop shows them ($1,120); a fee with cents keeps both digits ($15.50).
const WHOLE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const CENTS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatMoney(amount: number): string {
  return Number.isInteger(amount) ? WHOLE.format(amount) : CENTS.format(amount)
}

// Omar works in Beirut, so times are Beirut's wherever the studio is opened.
const ZONE = "Asia/Beirut"
const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, day: "numeric", month: "short", year: "numeric" })
const TIME = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })

export function formatDay(iso: string): string {
  return DAY.format(new Date(iso))
}

export function formatOrderTime(iso: string): string {
  return `${formatDay(iso)}, ${TIME.format(new Date(iso))}`
}

// +96171234567 → +961 71 234 567; an old 7-digit number (+9613123456) → +961 3 123 456; anything else as it came.
export function formatPhone(phone: string): string {
  const local = /^\+961(\d{7,8})$/.exec(phone)?.[1]
  if (!local) return phone
  const head = local.length - 6
  return `+961 ${local.slice(0, head)} ${local.slice(head, head + 3)} ${local.slice(head + 3)}`
}

export const callHref = (phone: string) => `tel:${phone}`
export const whatsappHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`
