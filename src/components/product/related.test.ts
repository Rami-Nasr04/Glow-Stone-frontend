import { listProducts } from "@/features/catalog/catalog"
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
  }
}

const ids = (list: ProductSummary[]) => list.map((p) => p.id)

describe("relatedPieces", () => {
  it("puts the same stone type first, then other pieces still available, each newest first", () => {
    const all = [piece(1, "Limestone"), piece(2, "Marble"), piece(3, "Limestone", true), piece(4, "Marble", true), piece(5, "Marble"), piece(6, "Limestone")]
    expect(ids(relatedPieces(all, 1))).toEqual([6, 3, 5])
  })

  it("never suggests the piece itself and stops at three", () => {
    const all = listProducts()
    const related = relatedPieces(all, 3)
    expect(ids(related)).not.toContain(3)
    expect(related).toHaveLength(3)
  })

  it("suggests nothing for an unknown piece", () => {
    expect(relatedPieces(listProducts(), 99)).toEqual([])
  })
})
