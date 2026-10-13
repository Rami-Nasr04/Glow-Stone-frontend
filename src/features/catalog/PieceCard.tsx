import { Link } from "react-router"
import Picture from "@/components/media/Picture"
import { formatPrice } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import EditionLine from "./EditionLine"
import { noBreak, stoneLabel } from "./format"
import NoPhoto from "./NoPhoto"
import { productPath } from "./product-path"
import type { ProductSummary } from "./types"

interface PieceCardProps {
  product: ProductSummary
  /** CSS sizes hint for the photos. */
  sizes: string
  /** Home rail: stone and edition share one line. */
  compact?: boolean
  headingLevel?: 2 | 3
  className?: string
}

export default function PieceCard({ product, sizes, compact = false, headingLevel = 3, className }: PieceCardProps) {
  const { to } = useLocale()
  const Heading = headingLevel === 2 ? "h2" : "h3"
  const [cover, hover] = product.images
  const stone = stoneLabel(product)

  return (
    <Link to={to(productPath(product))} draggable={false} className={cn("group flex flex-col", compact ? "gap-4.5" : "gap-6", className)}>
      <div className={cn("relative aspect-2/3 overflow-hidden bg-background", product.soldOut && "opacity-55 grayscale-70")}>
        {/* The name is in the link text, so the photos are decorative here. */}
        {cover ? <Picture image={cover} alt="" sizes={sizes} draggable={false} /> : <NoPhoto />}
        {hover && (
          <Picture
            image={hover}
            alt=""
            aria-hidden="true"
            sizes={sizes}
            draggable={false}
            className="absolute inset-0 bg-background opacity-0 transition-opacity duration-1200 ease-slow group-hover:opacity-100"
          />
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-4">
          <Heading className="font-display text-3xl font-light leading-tight whitespace-nowrap">{noBreak(product.name)}</Heading>
          <span className="text-price tracking-price">{formatPrice(product.price)}</span>
        </div>
        {compact ? (
          <EditionLine product={product} prefix={stone} className="text-muted-foreground" />
        ) : (
          <>
            <span className="text-label uppercase tracking-caps text-muted-foreground">{stone}</span>
            <EditionLine product={product} className="mt-1" />
          </>
        )}
      </div>
    </Link>
  )
}
