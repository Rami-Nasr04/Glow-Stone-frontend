import { interludeAfter, tileSpans } from "./grid-layout"

describe("collection grid layout", () => {
  // Rami, 2026-10-14: after the first full row that ends at or after the third piece, only when more pieces follow.
  it("places the interlude after the first full row that ends at or after the third piece", () => {
    expect(interludeAfter(1, 6)).toBe(3)
    expect(interludeAfter(2, 6)).toBe(4)
    expect(interludeAfter(3, 6)).toBe(3)
  })

  it("leaves it out when no piece would follow it", () => {
    expect(interludeAfter(1, 3)).toBeNull()
    expect(interludeAfter(2, 4)).toBeNull()
    expect(interludeAfter(2, 5)).toBe(4)
    expect(interludeAfter(3, 3)).toBeNull()
    expect(interludeAfter(3, 4)).toBe(3)
  })

  it("sizes the commissions tile to fill the last row at two and three columns", () => {
    // Only the pieces after the interlude decide the last row: 4 before it at two columns, 3 at three.
    expect(tileSpans(6)).toEqual({ md: 2, lg: 3 })
    expect(tileSpans(5)).toEqual({ md: 1, lg: 1 })
    expect(tileSpans(4)).toEqual({ md: 2, lg: 2 })
    expect(tileSpans(3)).toEqual({ md: 1, lg: 3 })
    expect(tileSpans(1)).toEqual({ md: 1, lg: 2 })
  })
})
