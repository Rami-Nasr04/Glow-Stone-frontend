import { act, renderHook } from "@testing-library/react"
import {
  addToCart,
  CART_KEY,
  clearCart,
  closeCart,
  MAX_PIECES,
  noteStock,
  ORDER_KEY,
  openCart,
  refreshCart,
  requestIdFor,
  pieceCount,
  removeFromCart,
  resetCart,
  setQuantity,
  useCart,
} from "./cart"

const stored = () => JSON.parse(localStorage.getItem(CART_KEY) ?? "null")

beforeEach(() => {
  localStorage.clear()
  resetCart()
})

describe("cart", () => {
  it("keeps each piece's id, quantity and the price the customer saw, never a name or photo", () => {
    expect(addToCart(3, 1, 4, 180)).toBe("added")
    expect(addToCart(5, 2, 4, 890)).toBe("added")
    expect(addToCart(3, 1, 4, 180)).toBe("added")
    expect(stored()).toEqual([
      { productId: 3, quantity: 2, price: 180 },
      { productId: 5, quantity: 2, price: 890 },
    ])
  })

  // Rami, 2026-10-24: the cart and checkout never show an old price.
  describe("refreshing from GET /products", () => {
    const piece = (id: number, price: number, remaining: number) => ({ id, price, remaining })

    it("takes each piece's newest price and says which lines changed", () => {
      addToCart(3, 1, 9, 180)
      addToCart(5, 1, 9, 890)
      expect(refreshCart([piece(3, 200, 9), piece(5, 890, 4)])).toEqual({ lowered: [], repriced: [3] })
      expect(stored()).toEqual([
        { productId: 3, quantity: 1, price: 200 },
        { productId: 5, quantity: 1, price: 890 },
      ])
      // Seen once, the new price is the one the customer knows: no note the next time.
      expect(refreshCart([piece(3, 200, 9), piece(5, 890, 4)])).toEqual({ lowered: [], repriced: [] })
    })

    it("lowers a line to what is left, and keeps sold-out and missing pieces as lines", () => {
      addToCart(3, 3, 9, 180)
      addToCart(2, 1, 9, 290)
      addToCart(9, 1, 9, 100)
      expect(refreshCart([piece(3, 180, 2), piece(2, 290, 0)])).toEqual({ lowered: [3], repriced: [] })
      expect(stored()).toEqual([
        { productId: 3, quantity: 2, price: 180 },
        { productId: 2, quantity: 1, price: 290 },
        { productId: 9, quantity: 1, price: 100 },
      ])
    })

    // A cart stored before prices were kept, or a line added without one.
    it("takes the price of a line that had none without calling it a change", () => {
      localStorage.setItem(CART_KEY, JSON.stringify([{ productId: 3, quantity: 1 }]))
      resetCart()
      expect(refreshCart([piece(3, 180, 9)])).toEqual({ lowered: [], repriced: [] })
      expect(stored()).toEqual([{ productId: 3, quantity: 1, price: 180 }])
    })
  })

  // Each order attempt carries a key, so a re-sent order is never placed twice (Rami, 2026-10-24).
  describe("the order key", () => {
    const order = (city: string) => ({ items: [{ productId: 3, quantity: 1, unitPrice: 180 }], city })

    it("keeps the same key for the same order, also after a reload", () => {
      const first = requestIdFor(order("Jounieh"))
      expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(requestIdFor(order("Jounieh"))).toBe(first)
      resetCart()
      expect(requestIdFor(order("Jounieh"))).toBe(first)
    })

    it("makes a new key whenever anything in the order changes", () => {
      const first = requestIdFor(order("Jounieh"))
      const second = requestIdFor(order("Byblos"))
      expect(second).not.toBe(first)
      expect(requestIdFor(order("Jounieh"))).not.toBe(first)
    })

    it("drops the key with the cart (an order placed, or signing out)", () => {
      const first = requestIdFor(order("Jounieh"))
      clearCart()
      expect(localStorage.getItem(ORDER_KEY)).toBeNull()
      expect(requestIdFor(order("Jounieh"))).not.toBe(first)
    })

    it("still makes a key when the browser refuses storage", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked")
      })
      expect(requestIdFor(order("Jounieh"))).toMatch(/^[0-9a-f-]{36}$/)
      vi.restoreAllMocks()
    })
  })

  it("holds at most 5 pieces in all: an add that would pass it adds nothing and says so", () => {
    expect(MAX_PIECES).toBe(5)
    addToCart(3, 4, 9)
    expect(addToCart(5, 2, 9)).toBe("total")
    expect(stored()).toEqual([{ productId: 3, quantity: 4 }])
    expect(addToCart(5, 1, 9)).toBe("added")
    expect(pieceCount(stored())).toBe(5)
    expect(setQuantity(5, 2, 9)).toBe("total")
    expect(stored()).toEqual([
      { productId: 3, quantity: 4 },
      { productId: 5, quantity: 1 },
    ])
  })

  it("never holds more of a piece than remain in its edition", () => {
    addToCart(6, 2, 2)
    expect(addToCart(6, 1, 2)).toBe("stock")
    expect(setQuantity(6, 3, 2)).toBe("stock")
    expect(stored()).toEqual([{ productId: 6, quantity: 2 }])
  })

  it("opens the drawer on every add, with a note when the add was stopped, and clears the note on close", () => {
    const { result } = renderHook(() => useCart())
    act(() => void addToCart(3, 1, 4))
    expect(result.current.open).toBe(true)
    expect(result.current.notice).toBeNull()
    act(() => void addToCart(3, 9, 20))
    expect(result.current.notice).toEqual({ kind: "total" })
    act(() => closeCart())
    expect(result.current).toMatchObject({ open: false, notice: null })
    act(() => openCart())
    expect(result.current.open).toBe(true)
  })

  it("lowers a quantity, never below 1, and removes a line", () => {
    addToCart(3, 3, 4)
    addToCart(5, 1, 4)
    expect(setQuantity(3, 2, 4)).toBe("added")
    expect(setQuantity(3, 0, 4)).toBe("added")
    expect(stored()).toEqual([
      { productId: 3, quantity: 1 },
      { productId: 5, quantity: 1 },
    ])
    removeFromCart(3)
    expect(stored()).toEqual([{ productId: 5, quantity: 1 }])
  })

  it("lowers lines to the stock the API reports and says which; a sold-out or missing piece keeps its line", () => {
    addToCart(3, 3, 9)
    addToCart(5, 1, 9)
    addToCart(2, 1, 9)
    const capped = noteStock(
      new Map([
        [3, 1],
        [5, 4],
        [2, 0],
      ]),
    )
    expect(capped).toEqual([3])
    expect(stored()).toEqual([
      { productId: 3, quantity: 1 },
      { productId: 5, quantity: 1 },
      { productId: 2, quantity: 1 },
    ])
  })

  it("counts only the lines that can still be ordered toward the 5", () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        { productId: 2, quantity: 3 },
        { productId: 99, quantity: 1 },
        { productId: 3, quantity: 1 },
      ]),
    )
    resetCart()
    // Nahr (2) is sold out and 99 isn't in the list any more: neither blocks a piece that can be bought.
    noteStock(new Map([[3, 9], [5, 4], [2, 0]]))
    expect(addToCart(5, 4, 4)).toBe("added")
    expect(addToCart(3, 1, 9)).toBe("total")
    expect(stored()).toEqual([
      { productId: 2, quantity: 3 },
      { productId: 99, quantity: 1 },
      { productId: 3, quantity: 1 },
      { productId: 5, quantity: 4 },
    ])
  })

  it("counts every line while the stock isn't known yet (the server checks again)", () => {
    localStorage.setItem(CART_KEY, JSON.stringify([{ productId: 2, quantity: 3 }]))
    resetCart()
    expect(addToCart(5, 3, 4)).toBe("total")
  })

  it("clearCart empties the cart and the stored copy", () => {
    const { result } = renderHook(() => useCart())
    act(() => void addToCart(3, 1, 4))
    act(() => clearCart())
    expect(result.current.lines).toEqual([])
    expect(stored()).toEqual([])
  })

  it("reads back what was stored, ignoring anything that isn't a valid line", () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        { productId: 3, quantity: 2, price: 180 },
        { productId: "5", quantity: 1 },
        { productId: 6, quantity: 0 },
        { productId: 3, quantity: 1 },
        null,
        { productId: 7, quantity: 1.5 },
        { productId: 8, quantity: 1, price: "free" },
      ]),
    )
    resetCart()
    const { result } = renderHook(() => useCart())
    expect(result.current.lines).toEqual([
      { productId: 3, quantity: 3, price: 180 },
      { productId: 8, quantity: 1 },
    ])
  })

  it("starts empty on a broken stored copy", () => {
    localStorage.setItem(CART_KEY, "{not json")
    resetCart()
    const { result } = renderHook(() => useCart())
    expect(result.current.lines).toEqual([])
  })

  it("still works when the browser refuses storage", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError")
    })
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError")
    })
    resetCart()
    const { result } = renderHook(() => useCart())
    expect(result.current.lines).toEqual([])
    act(() => void addToCart(3, 2, 4))
    expect(result.current.lines).toEqual([{ productId: 3, quantity: 2 }])
    get.mockRestore()
    set.mockRestore()
  })

  it("follows changes made in another tab", () => {
    const { result } = renderHook(() => useCart())
    localStorage.setItem(CART_KEY, JSON.stringify([{ productId: 4, quantity: 1 }]))
    act(() => void window.dispatchEvent(new StorageEvent("storage", { key: CART_KEY })))
    expect(result.current.lines).toEqual([{ productId: 4, quantity: 1 }])
  })
})
