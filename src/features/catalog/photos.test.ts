import { coverOf, hoverOf, piecePhotos } from "./photos"

const keys = (id: number, name: string) => piecePhotos({ id, name }).map((p) => p.key)

describe("bundled photos", () => {
  // The backend's photo order for the real pieces (2026-10-13); the old folders keep their provisional names.
  it("maps every real piece to its own photos, in order", () => {
    expect(keys(1, "Arz")).toEqual(["products/sannine-sand/1", "products/sannine-sand/2", "products/sannine-sand/3", "products/sannine-sand/4"])
    expect(keys(2, "Nahr")).toEqual(["products/byblos/1", "products/byblos/2", "products/byblos/3", "products/byblos/4"])
    expect(keys(3, "Batroun")).toEqual(["products/nahr/1", "products/nahr/2", "products/nahr/3", "products/nahr/4"])
    expect(keys(4, "Jbeil")).toEqual(["products/arz/2", "products/arz/3", "products/arz/4", "products/arz/5"])
    expect(keys(5, "Qadisha")).toEqual(["products/batroun/1", "products/batroun/2", "products/batroun/3", "products/batroun/4"])
    expect(keys(6, "Sannine")).toEqual([
      "products/qadisha-earth/1",
      "products/qadisha-earth/2",
      "products/qadisha-earth/3",
      "products/qadisha-ash/1",
      "products/qadisha-ash/2",
    ])
  })

  it("uses no photo that belongs to no real piece", () => {
    const all = [1, 2, 3, 4, 5, 6].flatMap((id) => keys(id, "x"))
    expect(all.filter((key) => key.startsWith("products/sannine-ash/") || key === "products/arz/1")).toEqual([])
  })

  it("names each photo after its piece", () => {
    expect(piecePhotos({ id: 5, name: "Qadisha" })[3].alt).toBe("Qadisha, photo 4 of 4")
  })

  it("uses the first photo as the cover and the second for the hover", () => {
    expect(coverOf({ id: 5, name: "Qadisha" })?.key).toBe("products/batroun/1")
    expect(hoverOf({ id: 5, name: "Qadisha" })?.key).toBe("products/batroun/2")
  })

  it("has nothing for a piece without bundled photos", () => {
    expect(piecePhotos({ id: 99, name: "New piece" })).toEqual([])
    expect(coverOf({ id: 99, name: "New piece" })).toBeNull()
  })
})
