import { Fragment } from "react"
import { Link } from "react-router"
import Picture from "@/components/media/Picture"
import { ActionLink } from "@/components/ui/action-link"
import { Rule } from "@/components/ui/rule"
import { getProduct } from "@/features/catalog/catalog"
import EditionLine from "@/features/catalog/EditionLine"
import { noBreak, placardParts } from "@/features/catalog/format"
import { coverOf, piecePhotos } from "@/features/catalog/photos"
import { productPath } from "@/features/catalog/product-path"
import { formatPrice, interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { HOME_PIECE, SPOTLIGHT_PHOTOS } from "./home-config"

export default function PieceSpotlight() {
  const { m, to } = useLocale()
  const piece = getProduct(HOME_PIECE)
  const cover = piece && coverOf(piece)
  if (!piece || !cover) return null

  const href = to(productPath(piece))
  const photos = piecePhotos(piece)
  const photo = (key: string) => photos.find((img) => img.key === key) ?? cover
  const detail = photo(SPOTLIGHT_PHOTOS.detail)
  const full = photo(SPOTLIGHT_PHOTOS.full)
  // Only what the piece's own row says: its summary and how many bottles it holds.
  const capacity = piece.bottles === 1 ? m.home.spotlightBottle : interpolate(m.home.spotlightBottles, { count: piece.bottles })
  const text = [piece.summary, capacity].filter(Boolean).join(" ")
  const parts = placardParts(piece, m)
  const edition = parts.pop()

  return (
    <section aria-labelledby="spotlight-title" className="overflow-hidden pb-section pt-[calc(var(--spacing-straddle)+var(--spacing-section))]">
      {/* The photos duplicate the "View the piece" link for pointer users; hidden from keyboard and screen readers. */}
      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:pe-gutter">
        <Link to={href} tabIndex={-1} aria-hidden="true" className="block aspect-2/3 overflow-hidden bg-photo-dark lg:hidden">
          <Picture imageKey={cover.key} width={cover.width} height={cover.height} alt="" sizes="100vw" />
        </Link>
        <Link
          to={href}
          tabIndex={-1}
          aria-hidden="true"
          className="relative z-10 hidden aspect-3/2 overflow-hidden bg-photo-dark lg:col-span-8 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:block"
        >
          <Picture imageKey={detail.key} width={detail.width} height={detail.height} alt="" sizes="62vw" />
        </Link>
        <Link
          to={href}
          tabIndex={-1}
          aria-hidden="true"
          className="relative z-20 hidden aspect-2/3 overflow-hidden border-10 border-background bg-background lg:col-span-2 lg:col-start-7 lg:row-start-2 lg:-mb-[14%] lg:block lg:self-end"
        >
          <Picture imageKey={full.key} width={full.width} height={full.height} alt="" sizes="13vw" />
        </Link>

        <h2
          id="spotlight-title"
          className="relative mt-2 px-5 font-display text-display-hero font-light tracking-[-0.01em] whitespace-nowrap lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:-ms-[calc(1.5rem+1.2vw)] lg:mt-[6%] lg:px-0"
        >
          {noBreak(piece.name)}
        </h2>
        <div className="px-5 lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:px-0">
          <div className="mt-8 flex max-w-100 flex-col gap-4.5 lg:mt-0">
            <p className="text-label uppercase leading-loose tracking-label text-muted-foreground">
              <span>
                {parts.map((part, i) => (
                  <Fragment key={part}>
                    {i > 0 && " · "}
                    <span className="whitespace-nowrap">{part}</span>
                  </Fragment>
                ))}
              </span>
              <br />
              <span className="whitespace-nowrap">{edition}</span>
            </p>
            <Rule />
            <p className="text-small text-pretty text-muted-foreground">{text}</p>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2.5 border-t border-border pt-4">
              <span className="text-label uppercase tracking-caps">
                <EditionLine product={piece} template={m.edition.remainingCount} />
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
