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

// The products seeded in the database (2026-10-13).
const SEED = [
  { id: 1, name: "Arz", color: "Warm beige", price: 420, bottles: 5, heightCm: 72, widthCm: 28, depthCm: 14, weightKg: 34, editionSize: 12, remaining: 3, featured: true, summary: "Slab with a hand-broken chiselled top and staggered round holes.", createdAt: "2026-10-01T09:00:00.000Z" },
  { id: 2, name: "Nahr", color: "Earth brown", price: 290, bottles: 5, heightCm: 36, widthCm: 22, depthCm: 20, weightKg: 16, editionSize: 15, remaining: 0, featured: false, summary: "Compact brick with five through-holes.", createdAt: "2026-10-02T09:00:00.000Z" },
  { id: 3, name: "Batroun", color: "Taupe", price: 180, bottles: 1, heightCm: 26, widthCm: 18, depthCm: 18, weightKg: 9, editionSize: 15, remaining: 9, featured: true, summary: "Single-bottle holder with carved leaf strokes.", createdAt: "2026-10-03T09:00:00.000Z" },
  { id: 4, name: "Jbeil", color: "Grey", price: 640, bottles: 5, heightCm: null, widthCm: null, depthCm: null, weightKg: null, editionSize: 10, remaining: 6, featured: true, summary: "Carved rack with leaf-like chisel strokes, round openings and a notch at the top.", createdAt: "2026-10-04T09:00:00.000Z" },
  { id: 5, name: "Qadisha", color: "Cream", price: 890, bottles: 14, heightCm: 118, widthCm: 36, depthCm: 20, weightKg: 72, editionSize: 8, remaining: 4, featured: true, summary: "Tall slab with edge notches and central holes.", createdAt: "2026-10-05T09:00:00.000Z" },
  { id: 6, name: "Sannine", color: "Earth brown", price: 560, bottles: 10, heightCm: 96, widthCm: 30, depthCm: 18, weightKg: 48, editionSize: 10, remaining: 2, featured: true, summary: "Tall column with five half-moon notches on each side.", createdAt: "2026-10-06T09:00:00.000Z" },
]

describe("catalog", () => {
  it("holds exactly the six real pieces from the database seed", () => {
    for (const row of SEED) {
      expect(getProduct(row.id)).toEqual({ ...row, stoneType: "Limestone", soldOut: row.remaining === 0, story: null })
    }
    expect(listProducts()).toHaveLength(6)
  })

  it("lists the published pieces newest first, like GET /products", () => {
    expect(listProducts().map((p) => `${p.id} ${p.name}`)).toEqual(["6 Sannine", "5 Qadisha", "4 Jbeil", "3 Batroun", "2 Nahr", "1 Arz"])
  })

  it("returns exactly the contract's fields, with no story in the list", () => {
    for (const piece of listProducts()) expect(Object.keys(piece).sort()).toEqual(SUMMARY_FIELDS)
    expect(Object.keys(getProduct(5)!).sort()).toEqual([...SUMMARY_FIELDS, "story"].sort())
  })

  it("finds nothing for an unknown id", () => {
    expect(getProduct(7)).toBeNull()
  })

  it("marks a piece with nothing remaining as sold out", () => {
    expect(listProducts().filter((p) => p.soldOut).map((p) => p.name)).toEqual(["Nahr"])
  })

  it("orders by creation date, then by id, both newest first", () => {
    const at = (id: number, createdAt: string) => ({ id, createdAt }) as ProductSummary
    const sorted = [at(1, "2026-01-01T00:00:00Z"), at(3, "2026-02-01T00:00:00Z"), at(2, "2026-02-01T00:00:00Z")].sort(newestFirst)
    expect(sorted.map((p) => p.id)).toEqual([3, 2, 1])
  })
})
