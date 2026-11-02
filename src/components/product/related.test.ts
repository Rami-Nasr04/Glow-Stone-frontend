import { PRODUCTS } from "@/test/catalog"
import type { ProductSummary } from "@/features/catalog/types"
import { relatedPieces } from "./related"

function piece(id: number, stoneType: string, soldOut = false): ProductSummary {
  return {
    id,
    name: `Piece ${id}`,
    stoneType,
    color: "Grey",
    price: 100,
    bottles: 5,
    heightCm: null,
    widthCm: null,
    depthCm: null,
    weightKg: null,
    editionSize: 10,
    remaining: soldOut ? 0 : 3,
    soldOut,
    featured: false,
    summary: null,
    createdAt: `2026-10-0${id}T09:00:00.000Z`,
    images: [],
  }
}

const ids = (list: ProductSummary[]) => list.map((p) => p.id)

describe("relatedPieces", () => {
  // The list comes in Omar's order (contract, "Arrange the pieces", 2026-11-02): nothing is re-sorted by date.
  it("puts the same stone type first, then other pieces still available, each in Omar's order", () => {
    const all = [piece(6, "Granite"), piece(2, "Marble"), piece(3, "Granite", true), piece(4, "Marble", true), piece(5, "Marble"), piece(1, "Granite")]
    expect(ids(relatedPieces(all, 1))).toEqual([6, 3, 2])
  })

  it("never suggests the piece itself and stops at three", () => {
    const related = relatedPieces(PRODUCTS, 3)
    expect(ids(related)).not.toContain(3)
    expect(related).toHaveLength(3)
  })

  it("suggests nothing for an unknown piece", () => {
    expect(relatedPieces(PRODUCTS, 99)).toEqual([])
  })
})
