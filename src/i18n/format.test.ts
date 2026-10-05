import { formatNumber, formatPrice, interpolate } from "./format"
import { en } from "./messages/en"

describe("formatPrice", () => {
  it("uses Western digits, $ and a thousands separator", () => {
    expect(formatPrice(1120)).toBe("$1,120")
    expect(formatPrice(420)).toBe("$420")
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
