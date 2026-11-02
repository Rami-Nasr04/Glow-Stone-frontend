import Picture from "@/components/media/Picture"
import { ActionLink } from "@/components/ui/action-link"
import { Rule } from "@/components/ui/rule"
import { dimensionsLabel, stoneLabel } from "@/features/catalog/format"
import type { ProductSummary } from "@/features/catalog/types"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { pieceAlt } from "@/lib/structured-data"

interface PieceSpotlightProps {
  /** The first published piece in Omar's order, with all its photos when the build could read them (Rami, 2026-11-02). */
  piece: ProductSummary
}

// The first piece in Omar's order, from its data: name, stone, sizes, edition, summary and bottles, its cover and its
// first landscape photo (the cover, cropped, when it has none). Price and stock are left out: they change between
// builds. The one link leads to the collection.
export default function PieceSpotlight({ piece }: PieceSpotlightProps) {
  const { m, to } = useLocale()
  const full = piece.images[0]
  const detail = piece.images.find((photo) => photo.width > photo.height)
  const placard = [stoneLabel(piece), dimensionsLabel(piece, m)].filter((part): part is string => Boolean(part))
  const bottles = piece.bottles === 1 ? m.product.specs.bottle : interpolate(m.product.specs.bottles, { count: piece.bottles })
  const holds = interpolate(m.home.spotlightHolds, { bottles })
  const alt = pieceAlt(piece, m)

  return (
    <section aria-labelledby="spotlight-title" className="overflow-hidden pb-section pt-[calc(var(--spacing-straddle)+var(--spacing-section))]">
      {/* The photos show Qadisha, named beside them; the one link is "View the collection". */}
      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:pe-gutter">
        <div className="aspect-2/3 overflow-hidden bg-photo-dark lg:hidden">
          {full && <Picture image={full} alt={alt} sizes="100vw" />}
        </div>
        <div className="relative z-10 hidden aspect-3/2 overflow-hidden bg-photo-dark lg:col-span-8 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:block">
          {detail ? (
            <Picture image={detail} alt={pieceAlt(piece, m, m.home.spotlightDetailAlt)} sizes="62vw" />
          ) : (
            full && <Picture image={full} alt={pieceAlt(piece, m, m.home.spotlightDetailAlt)} sizes="62vw" fit="cover" />
          )}
        </div>
        <div className="relative z-20 hidden aspect-2/3 overflow-hidden border-10 border-background bg-background lg:col-span-2 lg:col-start-7 lg:row-start-2 lg:-mb-[14%] lg:block lg:self-end">
          {full && <Picture image={full} alt={alt} sizes="13vw" />}
        </div>

        <h2
          id="spotlight-title"
          className="relative mt-2 px-5 font-display text-display-hero font-light tracking-[-0.01em] whitespace-nowrap lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:-ms-[calc(1.5rem+1.2vw)] lg:mt-[6%] lg:px-0"
        >
          {piece.name}
        </h2>
        <div className="px-5 lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:px-0">
          <div className="mt-8 flex max-w-100 flex-col gap-4.5 lg:mt-0">
            {/* One line per part, so a long stone name never leaves a dot hanging at a line end. */}
            <p className="text-label uppercase leading-loose tracking-label text-muted-foreground">
              {[...placard, interpolate(m.edition.of, { edition: piece.editionSize })].map((part) => (
                <span key={part} className="block">
                  {part}
                </span>
              ))}
            </p>
            <Rule />
            <p className="text-small text-pretty text-muted-foreground">{piece.summary ? `${piece.summary} ${holds}` : holds}</p>
            <ActionLink to={to("/collection")} className="mt-2 self-start">
              {m.home.viewTheCollection}
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  )
}
