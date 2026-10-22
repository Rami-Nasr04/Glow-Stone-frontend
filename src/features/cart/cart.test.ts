import { act, renderHook } from "@testing-library/react"
import {
  addToCart,
  CART_KEY,
  clearCart,
  closeCart,
  fitToStock,
  MAX_PIECES,
  openCart,
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
  it("keeps only the piece ids and quantities in the browser: never a price, name or photo", () => {
    expect(addToCart(3, 1, 4)).toBe("added")
    expect(addToCart(5, 2, 4)).toBe("added")
    expect(addToCart(3, 1, 4)).toBe("added")
    expect(stored()).toEqual([
      { productId: 3, quantity: 2 },
      { productId: 5, quantity: 2 },
    ])
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
    const capped = fitToStock(
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
      JSON.stringify([{ productId: 3, quantity: 2 }, { productId: "5", quantity: 1 }, { productId: 6, quantity: 0 }, { productId: 3, quantity: 1 }, null, { productId: 7, quantity: 1.5 }]),
    )
    resetCart()
    const { result } = renderHook(() => useCart())
    expect(result.current.lines).toEqual([{ productId: 3, quantity: 3 }])
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
