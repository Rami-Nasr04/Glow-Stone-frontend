import { getProduct, listProducts, newestFirst } from "./catalog"
import type { ProductSummary } from "./types"

// Field names of GET /products and GET /products/{id}, as agreed with the backend.
const SUMMARY_FIELDS = [
  "bottles",
  "color",
  "createdAt",
  "depthCm",
  "editionSize",
  "featured",
  "heightCm",
  "id",
  "name",
  "price",
  "remaining",
  "soldOut",
  "stoneType",
  "summary",
  "weightKg",
  "widthCm",
]

describe("catalog", () => {
  it("lists the published pieces newest first, like GET /products", () => {
    expect(listProducts().map((p) => p.name)).toEqual([
      "Sannine · Sand",
      "Sannine · Ash",
      "Qadisha · Earth",
      "Qadisha · Ash",
      "Byblos",
      "Batroun",
      "Nahr",
      "Arz",
    ])
    expect(listProducts().map((p) => p.id)).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
  })

  it("returns exactly the contract's fields, with no story in the list", () => {
    for (const piece of listProducts()) expect(Object.keys(piece).sort()).toEqual(SUMMARY_FIELDS)
    expect(Object.keys(getProduct(3)!).sort()).toEqual([...SUMMARY_FIELDS, "story"].sort())
  })

  it("finds a piece by id, with its story as paragraphs separated by a blank line", () => {
    const batroun = getProduct(3)
    expect(batroun).toMatchObject({ name: "Batroun", stoneType: "Limestone", color: "Cream", price: 890, editionSize: 8, remaining: 4 })
    expect(getProduct(6)?.story?.split("\n\n")).toHaveLength(3)
    expect(getProduct(99)).toBeNull()
  })

  it("keeps unknown values as null", () => {
    expect(getProduct(1)).toMatchObject({ name: "Arz", heightCm: null, widthCm: null, depthCm: null, weightKg: null, story: null })
  })

  it("marks a piece with nothing remaining as sold out", () => {
    expect(listProducts().filter((p) => p.soldOut).map((p) => p.name)).toEqual(["Byblos"])
  })

  it("orders by creation date, then by id, both newest first", () => {
    const at = (id: number, createdAt: string) => ({ id, createdAt }) as ProductSummary
    const sorted = [at(1, "2026-01-01T00:00:00Z"), at(3, "2026-02-01T00:00:00Z"), at(2, "2026-02-01T00:00:00Z")].sort(newestFirst)
    expect(sorted.map((p) => p.id)).toEqual([3, 2, 1])
  })

  it("promises no lead time and no outdoor use in any story (both dropped or unconfirmed)", () => {
    for (const piece of listProducts()) expect(getProduct(piece.id)?.story ?? "").not.toMatch(/to order|weeks|terrace|weathers/i)
  })
})
