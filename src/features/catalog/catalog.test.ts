import { PRODUCTS, productOf, stubApi } from "@/test/catalog"
import { apiBase, getProduct, listProducts, newestFirst } from "./catalog"
import type { ProductSummary } from "./types"

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
  beforeEach(() => vi.stubEnv("VITE_API_URL", "https://api.test"))
  afterEach(() => vi.unstubAllEnvs())

  it("test fixture: today's live answers hold exactly the six real pieces from the database seed", () => {
    for (const row of SEED) {
      const { images, ...piece } = productOf(row.id)
      expect(piece).toEqual({ ...row, stoneType: "Limestone", soldOut: row.remaining === 0, story: null })
      expect(images.length).toBeGreaterThan(0)
    }
    expect(PRODUCTS.map((p) => p.images.length)).toEqual([2, 2, 2, 2, 2, 2])
  })

  it("reads the published pieces from GET /products at VITE_API_URL, newest first", async () => {
    const fetch = stubApi()
    expect((await listProducts()).map((p) => `${p.id} ${p.name}`)).toEqual(["6 Sannine", "5 Qadisha", "4 Jbeil", "3 Batroun", "2 Nahr", "1 Arz"])
    expect(fetch).toHaveBeenCalledWith("https://api.test/products", expect.anything())
  })

  it("reads one piece with all its photos, and nothing for an unknown id", async () => {
    stubApi()
    expect((await getProduct(4))?.images).toHaveLength(19)
    expect(await getProduct(7)).toBeNull()
  })

  it("refuses to run without the API address", async () => {
    vi.stubEnv("VITE_API_URL", "")
    expect(() => apiBase()).toThrow("VITE_API_URL is not set")
    await expect(listProducts()).rejects.toThrow("VITE_API_URL is not set")
  })

  it("orders by creation date, then by id, both newest first", () => {
    const at = (id: number, createdAt: string) => ({ id, createdAt }) as ProductSummary
    const sorted = [at(1, "2026-01-01T00:00:00Z"), at(3, "2026-02-01T00:00:00Z"), at(2, "2026-02-01T00:00:00Z")].sort(newestFirst)
    expect(sorted.map((p) => p.id)).toEqual([3, 2, 1])
  })
})
