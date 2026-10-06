import { MoveRight } from "lucide-react"
import { Link } from "react-router"
import Picture from "@/components/media/Picture"
import { actionVariants } from "@/components/ui/action-link"
import { Rule } from "@/components/ui/rule"
import { CRAFT_IMAGES } from "@/config/images"
import PieceCard from "@/features/catalog/PieceCard"
import type { ProductSummary } from "@/features/catalog/types"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { INTERLUDE_AFTER, tileSpans } from "./grid-layout"

interface CollectionGridProps {
  pieces: ProductSummary[]
  onClear: () => void
}

interface CommissionTileProps {
  /** Pieces shown, to size the tile so it fills the last row. */
  count: number
}

const CARD_SIZES = "(min-width: 1024px) 410px, (min-width: 768px) 50vw, 100vw"
// Static class names so Tailwind generates them.
const MD_SPAN = { 1: "md:col-span-1", 2: "md:col-span-2" } as const
const LG_SPAN = { 1: "lg:col-span-1", 2: "lg:col-span-2", 3: "lg:col-span-3" } as const

function Interlude() {
  const { m } = useLocale()
  const photo = CRAFT_IMAGES.boreThrough
  return (
    <li data-cell="interlude" className="relative col-span-full flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-[clamp(2.5rem,6vw,6rem)]">
      {/* Full-bleed charcoal band starting partway down the photo, so the photo straddles the edge. */}
      <div aria-hidden="true" className="absolute start-[calc(50%-50vw)] end-[calc(50%-50vw)] top-straddle bottom-0 bg-dark-section" />
      <div className="relative aspect-video overflow-hidden bg-photo-dark lg:w-[65%]">
        <Picture
          imageKey={photo.key}
          width={photo.width}
          height={photo.height}
          alt={m.collection.interludeAlt}
          sizes="(min-width: 1024px) 65vw, 100vw"
          fit="cover"
        />
      </div>
      <div className="relative flex max-w-110 flex-col gap-5 pb-10 text-dark-section-foreground lg:pb-[clamp(2.5rem,5vw,4rem)]">
        <Rule onDark />
        <p className="font-display text-quote font-light italic text-balance">{m.collection.interludeLine}</p>
        <p className="text-label uppercase tracking-caps text-dark-muted-foreground">{m.collection.interludeBy}</p>
      </div>
    </li>
  )
}

function CommissionTile({ count }: CommissionTileProps) {
  const { m, to } = useLocale()
  const span = tileSpans(count)
  return (
    <li
      data-cell="commission"
      className={cn(
        "flex min-h-90 flex-col items-center justify-center gap-6 self-start border border-border px-8 py-12 text-center",
        MD_SPAN[span.md],
        LG_SPAN[span.lg],
      )}
    >
      <img src="/brand/glowstone-monogram.svg" alt="" width={36} height={36} className="size-9" />
      <p className="max-w-85 font-display text-lead font-light italic text-balance">{m.collection.bespoke}</p>
      <Link
        to={to("/contact")}
        className="flex min-h-11 items-center gap-3.5 text-label uppercase tracking-label transition-colors duration-500 hover:text-accent"
      >
        {m.collection.contact}
        <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 rtl:-scale-x-100" />
      </Link>
    </li>
  )
}

export default function CollectionGrid({ pieces, onClear }: CollectionGridProps) {
  const { m } = useLocale()

  if (pieces.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 py-16">
        <p className="font-display text-3xl font-light">{m.collection.none}</p>
        <button type="button" onClick={onClear} className={actionVariants({ variant: "outline" })}>
          {m.collection.clearAll}
        </button>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-x-[clamp(1.5rem,3.4vw,3rem)] gap-y-[clamp(4.5rem,7vw,7rem)] md:grid-cols-2 lg:grid-cols-3">
      {pieces.flatMap((piece, i) => {
        const card = (
          <li key={piece.slug} data-cell="piece">
            <PieceCard product={piece} sizes={CARD_SIZES} headingLevel={2} />
          </li>
        )
        return i === INTERLUDE_AFTER - 1 && pieces.length > INTERLUDE_AFTER ? [card, <Interlude key="interlude" />] : [card]
      })}
      <CommissionTile count={pieces.length} />
    </ul>
  )
}
