import { en } from "@/i18n/messages/en"
import { productOf } from "@/test/catalog"
import { dimensionsLabel, noBreak, placard, placardParts, stoneLabel, storyParagraphs } from "./format"

const qadisha = productOf(5)
const jbeil = productOf(4)

describe("catalog format", () => {
  it("keeps two-part names on one line", () => {
    expect(noBreak("Qadisha · Earth")).toBe("Qadisha · Earth")
    expect(noBreak("Nahr")).toBe("Nahr")
  })

  it("names the stone by its colour and type", () => {
    expect(stoneLabel(qadisha)).toBe("Cream limestone")
    expect(stoneLabel(productOf(1))).toBe("Warm beige limestone")
  })

  it("formats dimensions, or nothing when any is missing", () => {
    expect(dimensionsLabel(qadisha, en)).toBe("118 × 36 × 20 cm")
    expect(dimensionsLabel(jbeil, en)).toBeNull()
  })

  it("builds the placard and skips missing parts", () => {
    expect(placard(qadisha, en)).toBe("Cream limestone · 118 × 36 × 20 cm · Edition of 8")
    expect(placardParts(jbeil, en)).toEqual(["Grey limestone", "Edition of 10"])
  })

  it("splits a story into paragraphs on blank lines", () => {
    expect(storyParagraphs("One.\n\nTwo.\n\n\nThree.")).toEqual(["One.", "Two.", "Three."])
    expect(storyParagraphs("  \n\n ")).toEqual([])
    expect(storyParagraphs(null)).toEqual([])
  })
})
