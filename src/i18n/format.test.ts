import { formatDate, formatNumber, formatPrice, interpolate } from "./format"
import { en } from "./messages/en"

describe("formatPrice", () => {
  it("uses Western digits, $ and a thousands separator", () => {
    expect(formatPrice(1120)).toBe("$1,120")
    expect(formatPrice(420)).toBe("$420")
  })

  // The orders API gives money with up to 2 decimals (a delivery fee of 12.5): never round it away.
  it("shows cents only when there are some", () => {
    expect(formatPrice(12.5)).toBe("$12.50")
    expect(formatPrice(1780.25)).toBe("$1,780.25")
    expect(formatPrice(0)).toBe("$0")
  })
})

describe("formatNumber", () => {
  it("keeps Western digits in every locale", () => {
    expect(formatNumber("ar", 12)).toBe("12")
  })
})

describe("interpolate", () => {
  it("fills placeholders", () => {
    expect(interpolate(en.edition.remaining, { edition: 12, remaining: 3 })).toBe("Edition of 12 — 3 remaining")
  })

  it("leaves unknown placeholders visible instead of dropping them", () => {
    expect(interpolate("Edition of {edition}", {})).toBe("Edition of {edition}")
  })
})

describe("dictionary", () => {
  const leaves = (o: object): unknown[] =>
    Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : leaves(v as object)))

  it("has no empty strings", () => {
    expect(leaves(en).filter((v) => v === "")).toEqual([])
  })
})

describe("formatDate", () => {
  it("says the day on Beirut's calendar", () => {
    expect(formatDate("2026-11-06T14:03:00Z")).toBe("6 November 2026")
    // 23:30 in London is already the next day in Beirut.
    expect(formatDate("2026-11-06T23:30:00Z")).toBe("7 November 2026")
  })
})
