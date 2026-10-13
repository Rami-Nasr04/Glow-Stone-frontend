import { useRef } from "react"
import { Navigate, useParams } from "react-router"
import BuyBox from "@/components/product/BuyBox"
import Gallery from "@/components/product/Gallery"
import ProductTabs from "@/components/product/ProductTabs"
import { relatedPieces } from "@/components/product/related"
import StickyAddBar from "@/components/product/StickyAddBar"
import { useLiveStock, withLiveStock } from "@/features/catalog/live-stock"
import PieceCard from "@/features/catalog/PieceCard"
import { productPath, readableName } from "@/features/catalog/product-path"
import type { Product as ProductData, ProductSummary } from "@/features/catalog/types"
import { useLocale } from "@/i18n/useLocale"
import NotFound from "@/pages/NotFound"

const CARD_SIZES = "(min-width: 1024px) 410px, (min-width: 640px) 50vw, 100vw"

interface ProductProps {
  /** GET /products/{id}, or null for an unknown or unpublished piece. */
  piece: ProductData | null
  /** GET /products, for the related pieces. */
  products: ProductSummary[]
}

export default function Product({ piece: built, products }: ProductProps) {
  const { name } = useParams()
  const { m, to } = useLocale()
  const addButton = useRef<HTMLButtonElement>(null)
  const live = useLiveStock()
  if (!built) return <NotFound />
  // Found by id only: a missing or outdated name in the address is corrected in place, never a 404.
  if (name !== readableName(built.name)) return <Navigate replace to={to(productPath(built))} />

  const piece = withLiveStock(built, live)
  const related = relatedPieces(
    products.map((p) => withLiveStock(p, live)),
    piece.id,
  )

  return (
    <>
      <section className="px-gutter lg:pt-8">
        <div className="mx-auto grid max-w-content items-start gap-x-[clamp(2.5rem,5vw,5rem)] lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
          {/* The gallery stays in view while the (taller) buy box and tabs scroll past it on desktop. */}
          <div className="min-w-0 lg:sticky lg:top-27">
            <Gallery piece={piece} />
          </div>
          <div className="min-w-0 pt-8 lg:pt-2">
            <BuyBox piece={piece} addButtonRef={addButton} />
            <ProductTabs piece={piece} className="mt-10 max-w-130" />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="px-gutter pt-[clamp(3.5rem,6vw,6rem)] pb-[clamp(4rem,7vw,6.5rem)]">
          <div className="mx-auto max-w-content border-t border-border pt-[clamp(2.5rem,4vw,3.5rem)]">
            <h2 id="related-title" className="mb-[clamp(2rem,4vw,3.5rem)] font-display text-display-m font-light">
              {m.product.alsoLike}
            </h2>
            <ul className="grid gap-x-[clamp(1.5rem,3vw,2.5rem)] gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((other) => (
                <li key={other.id}>
                  <PieceCard product={other} sizes={CARD_SIZES} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {!piece.soldOut && <StickyAddBar piece={piece} target={addButton} />}
    </>
  )
}
