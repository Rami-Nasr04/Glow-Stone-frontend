import { Link } from "react-router"
import Picture from "@/components/media/Picture"
import { ActionLink } from "@/components/ui/action-link"
import { Rule } from "@/components/ui/rule"
import { getProduct } from "@/features/catalog/catalog"
import EditionLine from "@/features/catalog/EditionLine"
import { noBreak, placard } from "@/features/catalog/format"
import { formatPrice, interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { HOME_PIECE } from "./home-config"

export default function PieceSpotlight() {
  const { m, to, locale } = useLocale()
  const piece = getProduct(HOME_PIECE, locale)
  if (!piece?.cover) return null

  const href = to(`/collection/${piece.slug}`)
  const lead = piece.lead.type === "made_to_order" ? interpolate(m.edition.madeToOrder, { weeks: piece.lead.weeks }) : m.edition.ready

  return (
    <section aria-labelledby="spotlight-title" className="overflow-hidden pb-section pt-[calc(var(--spacing-straddle)+var(--spacing-section))]">
      <div className="lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        {/* Duplicate of the "View the piece" link for pointer users; hidden from keyboard and screen readers. */}
        <Link to={href} tabIndex={-1} aria-hidden="true" className="block aspect-2/3 bg-photo-dark lg:h-[85vh] lg:min-h-150">
          <Picture imageKey={piece.cover.key} width={piece.cover.width} height={piece.cover.height} alt="" sizes="(min-width: 1024px) 57vh, 100vw" />
        </Link>

        <div className="px-5 lg:ps-0 lg:pe-gutter">
          <h2
            id="spotlight-title"
            className="relative mt-2 font-display text-display-hero font-light tracking-[-0.01em] whitespace-nowrap lg:-ms-[calc(1.5rem+1.2vw)] lg:mt-0"
          >
            {noBreak(piece.name)}
          </h2>
          <div className="mt-8 flex max-w-100 flex-col gap-4.5 lg:mt-12">
            <p className="text-label uppercase leading-loose tracking-label text-muted-foreground">{placard(piece, m)}</p>
            <Rule />
            <p className="text-small text-pretty text-muted-foreground">{m.home.spotlightText}</p>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2.5 border-t border-border pt-4">
              <span className="text-label uppercase tracking-caps">
                <EditionLine product={piece} template={m.edition.remainingCount} />
                {!piece.soldOut && ` · ${lead}`}
              </span>
              <span className="text-price tracking-price">{formatPrice(piece.price)}</span>
            </div>
            <ActionLink to={href} className="mt-2 self-start">
              {m.home.viewThePiece}
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  )
}
