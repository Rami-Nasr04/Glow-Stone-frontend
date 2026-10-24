import { useSyncExternalStore } from "react"

// The cart lives in this browser only. It keeps which pieces, how many, and the price the customer last saw, never a
// name or photo. Whenever the drawer opens or checkout loads, everything is read fresh from GET /products: the newest
// price replaces the one kept (and the screen says so), and the server checks the prices again when the order is placed.

export interface CartLine {
  productId: number
  quantity: number
  /** The price last shown to the customer for this piece; unknown for a cart stored before prices were kept. */
  price?: number
}

/** Why an add or a "+" was stopped; shown at the top of the drawer. */
export type CartNotice = { kind: "total" } | { kind: "stock"; remaining: number }

export interface CartState {
  lines: readonly CartLine[]
  open: boolean
  notice: CartNotice | null
}

export type CartChange = "added" | "total" | "stock"

/** The most pieces one cart holds; the server checks it again with the customer's other pending orders. */
export const MAX_PIECES = 5
export const CART_KEY = "glowstone.cart"
/** This cart's order attempt: its key (`requestId`) and the order it was made for. */
export const ORDER_KEY = "glowstone.cart.order"

const EMPTY: CartState = { lines: [], open: false, notice: null }

let state: CartState | null = null
const listeners = new Set<() => void>()
// The stock the shop last read (GET /products), in memory only: which lines can still be ordered. Null until then.
let stock: ReadonlyMap<number, number> | null = null

const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1
const isPrice = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0

// Anything that isn't a whole positive id and quantity is dropped; repeated ids are added together.
function readLines(): CartLine[] {
  let raw: unknown
  try {
    raw = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  const lines: CartLine[] = []
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue
    const { productId, quantity, price } = entry as Record<string, unknown>
    if (!isCount(productId) || !isCount(quantity)) continue
    const line = lines.find((l) => l.productId === productId)
    if (line) line.quantity += quantity
    else lines.push(isPrice(price) ? { productId, quantity, price } : { productId, quantity })
  }
  return lines
}

// Storage can be full, blocked or missing (private windows): the cart then lasts as long as the page.
function writeLines(lines: readonly CartLine[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines))
  } catch {
    // Nothing to do: the cart in memory still works.
  }
}

function current(): CartState {
  state ??= { ...EMPTY, lines: readLines() }
  return state
}

function update(next: Partial<CartState>) {
  const before = current()
  state = { ...before, ...next }
  if (next.lines) writeLines(next.lines)
  for (const listener of listeners) listener()
}

function onStorage(event: StorageEvent) {
  if (event.key !== CART_KEY && event.key !== null) return
  state = { ...current(), lines: readLines() }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener("storage", onStorage)
  }
}

/** The cart as React sees it. Prerendered pages start empty and read the browser's copy once hydrated. */
export function useCart(): CartState {
  return useSyncExternalStore(subscribe, current, () => EMPTY)
}

export function pieceCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0)
}

// Sold-out lines and pieces gone from the list can't be bought, so they don't count toward MAX_PIECES. Until the
// stock is known every line counts; the server checks again at checkout.
const orderable = (line: CartLine) => stock === null || (stock.get(line.productId) ?? 0) > 0

const quantityOf = (lines: readonly CartLine[], productId: number) => lines.find((l) => l.productId === productId)?.quantity ?? 0

// The one rule for every change: never more of a piece than remain, never more than MAX_PIECES in all.
function change(productId: number, quantity: number, remaining: number, price?: number): CartChange {
  const lines = current().lines
  if (quantity > remaining) {
    update({ notice: { kind: "stock", remaining } })
    return "stock"
  }
  const others = lines.filter((line) => line.productId !== productId && orderable(line))
  if (pieceCount(others) + quantity > MAX_PIECES) {
    update({ notice: { kind: "total" } })
    return "total"
  }
  const priced = (line: CartLine): CartLine => (price === undefined ? line : { ...line, price })
  const next = lines.some((l) => l.productId === productId)
    ? lines.map((l) => (l.productId === productId ? priced({ ...l, quantity }) : l))
    : [...lines, priced({ productId, quantity })]
  update({ lines: next, notice: null })
  return "added"
}

/**
 * Adds `quantity` of a piece at the `price` its page showed, and opens the drawer; adds nothing when it would pass a
 * limit (the drawer says why).
 */
export function addToCart(productId: number, quantity: number, remaining: number, price?: number): CartChange {
  update({ open: true })
  return change(productId, quantityOf(current().lines, productId) + quantity, remaining, price)
}

/** Sets a line's quantity (at least 1), within the same limits. */
export function setQuantity(productId: number, quantity: number, remaining: number): CartChange {
  return change(productId, Math.max(1, quantity), remaining)
}

export function removeFromCart(productId: number) {
  update({ lines: current().lines.filter((l) => l.productId !== productId), notice: null })
}

/**
 * Takes the stock from a fresh GET /products (every published piece: an id missing from it can't be ordered),
 * lowers every line to what remains (pieces sold since they were added) and returns the ids it lowered.
 * Sold-out (0) and missing pieces keep their lines, so the drawer can say what happened.
 */
export function noteStock(remaining: ReadonlyMap<number, number>): number[] {
  stock = remaining
  const lowered: number[] = []
  const next = current().lines.map((line) => {
    const left = remaining.get(line.productId)
    if (left === undefined || left === 0 || line.quantity <= left) return line
    lowered.push(line.productId)
    return { ...line, quantity: left }
  })
  if (lowered.length > 0) update({ lines: next })
  return lowered
}

export interface CartRefresh {
  /** Lines lowered to what is left. */
  lowered: number[]
  /** Lines whose price changed since the customer last saw it. */
  repriced: number[]
}

/**
 * Takes a fresh GET /products: the stock (see noteStock) and each piece's newest price, which becomes the one the
 * customer has now seen. Says which lines were lowered and which changed price, for the screen showing them.
 */
export function refreshCart(pieces: readonly { id: number; price: number; remaining: number }[]): CartRefresh {
  const lowered = noteStock(new Map(pieces.map((piece) => [piece.id, piece.remaining])))
  const prices = new Map(pieces.map((piece) => [piece.id, piece.price]))
  const repriced: number[] = []
  let changed = false
  const next = current().lines.map((line) => {
    const price = prices.get(line.productId)
    if (price === undefined || price === line.price) return line
    if (line.price !== undefined) repriced.push(line.productId)
    changed = true
    return { ...line, price }
  })
  if (changed) update({ lines: next })
  return { lowered, repriced }
}

interface OrderAttempt {
  requestId: string
  order: string
}

function readAttempt(): OrderAttempt | null {
  try {
    const value = JSON.parse(localStorage.getItem(ORDER_KEY) ?? "null") as Partial<OrderAttempt> | null
    return typeof value?.requestId === "string" && typeof value.order === "string" ? { requestId: value.requestId, order: value.order } : null
  } catch {
    return null
  }
}

// In memory too, so a browser that refuses storage still re-sends with the same key.
let attempt: OrderAttempt | null = null

/**
 * The key (`requestId`) for this exact order: the same while nothing changes, so a re-sent order is the same order to
 * the server; a new one as soon as the pieces, prices or delivery details change. Kept with the cart until the order
 * is placed (clearCart drops it).
 */
export function requestIdFor(order: unknown): string {
  const text = JSON.stringify(order)
  const known = attempt ?? readAttempt()
  if (known?.order === text) {
    attempt = known
    return known.requestId
  }
  attempt = { requestId: crypto.randomUUID(), order: text }
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(attempt))
  } catch {
    // Kept in memory for this page.
  }
  return attempt.requestId
}

/** Empties the cart here and in storage, with its order key. Signing out must call it (a shared computer). */
export function clearCart() {
  attempt = null
  try {
    localStorage.removeItem(ORDER_KEY)
  } catch {
    // Nothing kept to drop.
  }
  update({ lines: [], notice: null })
}

export function openCart() {
  update({ open: true })
}

export function closeCart() {
  update({ open: false, notice: null })
}

/** Forgets the cart in memory so the next read comes from storage again (tests, and a fresh page). */
export function resetCart() {
  state = null
  stock = null
  attempt = null
}
