import { en } from "@/i18n/messages/en"
import { getProduct } from "./catalog"
import { dimensionsLabel, noBreak, placard, placardParts, stoneLabel, storyParagraphs } from "./format"

const batroun = getProduct(3)!
const arz = getProduct(1)!

describe("catalog format", () => {
  it("keeps two-part names on one line", () => {
    expect(noBreak("Qadisha · Earth")).toBe("Qadisha · Earth")
    expect(noBreak("Nahr")).toBe("Nahr")
  })

  it("names the stone by its colour and type", () => {
    expect(stoneLabel(batroun)).toBe("Cream limestone")
    expect(stoneLabel(getProduct(8)!)).toBe("Warm beige limestone")
  })

  it("formats dimensions, or nothing when any is missing", () => {
    expect(dimensionsLabel(batroun, en)).toBe("118 × 36 × 20 cm")
    expect(dimensionsLabel(arz, en)).toBeNull()
  })

  it("builds the placard and skips missing parts", () => {
    expect(placard(batroun, en)).toBe("Cream limestone · 118 × 36 × 20 cm · Edition of 8")
    expect(placardParts(arz, en)).toEqual(["Grey limestone", "Edition of 10"])
  })

  it("splits a story into paragraphs on blank lines", () => {
    expect(storyParagraphs("One.\n\nTwo.\n\n\nThree.")).toEqual(["One.", "Two.", "Three."])
    expect(storyParagraphs("  \n\n ")).toEqual([])
    expect(storyParagraphs(null)).toEqual([])
  })
})
