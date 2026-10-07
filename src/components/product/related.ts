import { newestFirst } from "@/features/catalog/catalog"
import type { ProductSummary } from "@/features/catalog/types"

const COUNT = 3

// Same stone type first, then other pieces that can still be bought; newest first within each group.
export function relatedPieces(all: ProductSummary[], id: number): ProductSummary[] {
  const piece = all.find((p) => p.id === id)
  if (!piece) return []
  const others = all.filter((p) => p.id !== id).sort(newestFirst)
  const sameStone = others.filter((p) => p.stoneType === piece.stoneType)
  const available = others.filter((p) => p.stoneType !== piece.stoneType && !p.soldOut)
  return [...sameStone, ...available].slice(0, COUNT)
}
