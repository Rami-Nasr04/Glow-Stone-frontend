import { listProducts } from "@/features/catalog/catalog"
import { relatedPieces } from "./related"

const all = listProducts("en")
const related = (slug: string) => relatedPieces(all, slug).map((p) => p.slug)

describe("relatedPieces", () => {
  it("puts the same family first, then Arz, then other available pieces", () => {
    expect(related("sannine-sand")).toEqual(["sannine-ash", "arz", "qadisha-earth"])
    expect(related("batroun")).toEqual(["arz", "sannine-sand", "sannine-ash"])
  })

  it("never suggests the piece itself or a sold-out piece from another family", () => {
    expect(related("arz")).toEqual(["sannine-sand", "sannine-ash", "qadisha-earth"])
    expect(related("qadisha-earth")).not.toContain("byblos")
  })
})
