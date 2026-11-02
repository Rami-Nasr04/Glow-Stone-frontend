import CraftCollage from "@/components/home/CraftCollage"
import HomeHero from "@/components/home/HomeHero"
import PieceSpotlight from "@/components/home/PieceSpotlight"
import QuoteBand from "@/components/home/QuoteBand"
import SelectedPieces from "@/components/home/SelectedPieces"
import { CRAFT_IMAGES } from "@/config/images"
import { useLiveStock, withLiveStock } from "@/features/catalog/live-stock"
import type { Product, ProductSummary } from "@/features/catalog/types"

interface HomeProps {
  /** GET /products, in Omar's order. */
  products: ProductSummary[]
  /** The first of them with all its photos (GET /products/{id}), or null if the build couldn't read it. */
  first: Product | null
}

// The hero and the spotlight follow the first piece in Omar's order (Rami, 2026-11-02).
export default function Home({ products, first }: HomeProps) {
  const live = useLiveStock()
  const crestName = products.find((p) => p.id === CRAFT_IMAGES.crest.pieceId)?.name ?? null
  const lead = first ?? products[0]
  return (
    <>
      {lead && <HomeHero piece={lead} />}
      <QuoteBand />
      <SelectedPieces pieces={products.map((p) => withLiveStock(p, live))} />
      <CraftCollage crestName={crestName} />
      {lead && <PieceSpotlight piece={lead} />}
    </>
  )
}
