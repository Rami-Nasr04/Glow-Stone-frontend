import { en } from "@/i18n/messages/en"
import { getProduct } from "./catalog"
import { dimensionsLabel, noBreak, placard } from "./format"

describe("catalog format", () => {
  it("keeps two-part names on one line", () => {
    expect(noBreak("Qadisha · Earth")).toBe("Qadisha · Earth")
    expect(noBreak("Nahr")).toBe("Nahr")
  })

  it("formats dimensions, or nothing when any is missing", () => {
    expect(dimensionsLabel(getProduct("batroun", "en")!.specs, en)).toBe("118 × 36 × 20 cm")
    expect(dimensionsLabel(getProduct("arz", "en")!.specs, en)).toBeNull()
  })

  it("builds the placard and skips missing parts", () => {
    expect(placard(getProduct("batroun", "en")!, en)).toBe("Cream limestone · 118 × 36 × 20 cm · Edition of 8")
    expect(placard(getProduct("arz", "en")!, en)).toBe("Grey limestone · Edition of 10")
  })
})
