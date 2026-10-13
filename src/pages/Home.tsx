import CraftCollage from "@/components/home/CraftCollage"
import HomeHero from "@/components/home/HomeHero"
import PieceSpotlight from "@/components/home/PieceSpotlight"
import QuoteBand from "@/components/home/QuoteBand"
import SelectedPieces from "@/components/home/SelectedPieces"
import { CRAFT_IMAGES } from "@/config/images"
import { useLiveStock, withLiveStock } from "@/features/catalog/live-stock"
import type { Product, ProductSummary } from "@/features/catalog/types"

interface HomeProps {
  /** GET /products, newest first. */
  products: ProductSummary[]
  /** The home piece (HOME_PIECE) with all its photos: the hero caption and the spotlight. */
  piece: Product
}

export default function Home({ products, piece }: HomeProps) {
  const live = useLiveStock()
  const crestName = products.find((p) => p.id === CRAFT_IMAGES.crest.pieceId)?.name ?? null
  return (
    <>
      <HomeHero piece={piece} />
      <QuoteBand />
      <SelectedPieces pieces={products.map((p) => withLiveStock(p, live))} />
      <CraftCollage crestName={crestName} />
      <PieceSpotlight piece={withLiveStock(piece, live)} />
    </>
  )
}
