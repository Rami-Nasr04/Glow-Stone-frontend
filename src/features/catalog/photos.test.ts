import { coverOf, hoverOf, piecePhotos } from "./photos"

describe("bundled photos", () => {
  it("gives every photo of a piece, in order, with a descriptive alt", () => {
    const photos = piecePhotos({ id: 5, name: "Qadisha · Ash" })
    expect(photos.map((p) => p.key)).toEqual(["products/qadisha-ash/1", "products/qadisha-ash/2"])
    expect(photos[1].alt).toBe("Qadisha · Ash, photo 2 of 2")
  })

  it("uses the first photo as the cover and the second for the hover", () => {
    const batroun = { id: 3, name: "Batroun" }
    expect(coverOf(batroun)?.key).toBe("products/batroun/1")
    expect(hoverOf(batroun)?.key).toBe("products/batroun/2")
  })

  it("has nothing for a piece without bundled photos", () => {
    expect(piecePhotos({ id: 99, name: "New piece" })).toEqual([])
    expect(coverOf({ id: 99, name: "New piece" })).toBeNull()
  })
})
