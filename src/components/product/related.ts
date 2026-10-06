import type { ProductSummary } from "@/features/catalog/types"

// Arz is the collection's signature piece, suggested right after a piece's own family.
const SIGNATURE = "arz"
const COUNT = 3

// Same family first, then the signature piece, then other pieces that can still be bought.
export function relatedPieces(all: ProductSummary[], slug: string): ProductSummary[] {
  const piece = all.find((p) => p.slug === slug)
  const others = all.filter((p) => p.slug !== slug)
  const family = others.filter((p) => p.family === piece?.family)
  const signature = others.filter((p) => p.slug === SIGNATURE && p.family !== piece?.family)
  const rest = others.filter((p) => p.family !== piece?.family && p.slug !== SIGNATURE && !p.soldOut)
  return [...family, ...signature, ...rest].slice(0, COUNT)
}
