import { useSyncExternalStore } from "react"

// The cart lives in this browser only. It keeps which pieces and how many, never a price, name or photo: those are
// read fresh from GET /products whenever the drawer opens, and the server prices and checks the order at checkout.

export interface CartLine {
  productId: number
  quantity: number
}

/** Why an add or a "+" was stopped, shown at the top of the drawer. */
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

const EMPTY: CartState = { lines: [], open: false, notice: null }

let state: CartState | null = null
const listeners = new Set<() => void>()
// The stock the shop last read (GET /products), in memory only: which lines can still be ordered. Null until then.
let stock: ReadonlyMap<number, number> | null = null

const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1

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
    const { productId, quantity } = entry as Record<string, unknown>
    if (!isCount(productId) || !isCount(quantity)) continue
    const line = lines.find((l) => l.productId === productId)
    if (line) line.quantity += quantity
    else lines.push({ productId, quantity })
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
function change(productId: number, quantity: number, remaining: number): CartChange {
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
  const next = lines.some((l) => l.productId === productId)
    ? lines.map((l) => (l.productId === productId ? { productId, quantity } : l))
    : [...lines, { productId, quantity }]
  update({ lines: next, notice: null })
  return "added"
}

/** Adds `quantity` of a piece and opens the drawer; adds nothing when it would pass a limit (the drawer says why). */
export function addToCart(productId: number, quantity: number, remaining: number): CartChange {
  update({ open: true })
  return change(productId, quantityOf(current().lines, productId) + quantity, remaining)
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

/** Empties the cart here and in storage. Signing out must call it (a shared computer). */
export function clearCart() {
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
}
