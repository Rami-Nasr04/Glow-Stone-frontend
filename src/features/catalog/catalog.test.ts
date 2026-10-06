import { getProduct, listProducts, productSlugs } from "./catalog"

describe("catalog", () => {
  it("lists the eight published pieces in display order", () => {
    expect(listProducts("en").map((p) => p.slug)).toEqual([
      "sannine-sand",
      "sannine-ash",
      "qadisha-earth",
      "qadisha-ash",
      "byblos",
      "batroun",
      "nahr",
      "arz",
    ])
    expect(productSlugs()).toHaveLength(8)
  })

  it("derives sold out from the remaining stock", () => {
    const byblos = listProducts("en").find((p) => p.slug === "byblos")
    expect(byblos).toMatchObject({ remaining: 0, soldOut: true })
    expect(listProducts("en").filter((p) => p.soldOut)).toHaveLength(1)
  })

  it("maps the lead time", () => {
    expect(getProduct("batroun", "en")?.lead).toEqual({ type: "made_to_order", weeks: 6 })
    expect(getProduct("nahr", "en")?.lead).toEqual({ type: "ready" })
  })

  it("treats every piece as re-issuable until the admin says otherwise", () => {
    expect(listProducts("en").every((p) => p.reissuable)).toBe(true)
  })

  it("falls back to English field by field", () => {
    const ar = getProduct("qadisha-earth", "ar")
    expect(ar?.name).toBe("قاديشا · ترابي")
    expect(ar?.story[0]).toBe(getProduct("qadisha-earth", "en")?.story[0])
  })

  it("uses the first two photos as cover and hover, and every photo in order on the detail", () => {
    const ash = getProduct("qadisha-ash", "en")
    expect(ash?.images.map((i) => i.key)).toEqual(["products/qadisha-ash/1", "products/qadisha-ash/2"])
    expect(ash?.cover?.key).toBe("products/qadisha-ash/1")
    expect(ash?.hover?.key).toBe("products/qadisha-ash/2")
    expect(ash?.images[1].alt).toBe("Qadisha · Ash, photo 2 of 2")
  })

  it("keeps missing specs as null", () => {
    expect(getProduct("arz", "en")?.specs).toMatchObject({ heightCm: null, widthCm: null, depthCm: null, weightKg: null })
    expect(getProduct("arz", "en")?.quote).toBeNull()
  })

  it("gives every piece a language-independent stone key for filtering", () => {
    expect(listProducts("ar").map((p) => p.stoneKey)).toEqual(["beige", "grey", "brown", "grey", "brown", "cream", "taupe", "grey"])
  })

  it("returns null for an unknown piece", () => {
    expect(getProduct("granite", "en")).toBeNull()
  })
})
