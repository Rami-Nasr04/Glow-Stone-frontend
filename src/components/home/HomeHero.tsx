import Picture from "@/components/media/Picture"
import { ActionLink } from "@/components/ui/action-link"
import { noBreak, stoneLabel } from "@/features/catalog/format"
import type { ProductSummary } from "@/features/catalog/types"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { pieceAlt } from "@/lib/structured-data"

const caption = "text-label uppercase tracking-label text-muted-foreground"

interface HomeHeroProps {
  /** The first published piece in Omar's order (Rami, 2026-11-02): its cover, name, stone and edition. */
  piece: ProductSummary
}

// The cover is shown whole, as a framed print beside the wordmark: covers are portrait studio shots, so the picture is
// always the named piece and the caption can never contradict it. When Omar arranges and publishes, the hero follows.
export default function HomeHero({ piece }: HomeHeroProps) {
  const { m, to } = useLocale()
  const cover = piece.images[0]
  const edition = interpolate(m.edition.of, { edition: piece.editionSize })
  const name = noBreak(piece.name)

  return (
    <section className="flex h-svh min-h-140 items-center justify-between gap-12 bg-background ps-[clamp(3rem,8vw,8.75rem)] pe-[clamp(1.5rem,6vw,7rem)] pt-21 pb-6 upright:h-auto upright:min-h-svh upright:flex-col upright:justify-start upright:gap-7 upright:px-5 upright:pt-24 upright:pb-8">
      <div className="flex flex-col items-start upright:items-center upright:text-center">
        <h1 className="w-[clamp(340px,35vw,560px)] upright:w-62.5 min-[600px]:upright:w-65">
          <img src="/brand/glowstone-wordmark-header.svg" alt={m.meta.siteName} width={192} height={15} className="block h-auto w-full" />
        </h1>
        <p className="mt-7.5 text-xs uppercase tracking-display upright:mt-4.5 upright:leading-[1.8]">{m.meta.tagline}</p>
        <ActionLink to={to("/collection")} variant="solid" size="lg" className="mt-14 upright:hidden">
          {m.home.shopCollection}
        </ActionLink>
      </div>

      {/* Names the piece in the photo; not a link, so the home page never depends on that piece being for sale. */}
      <figure className="flex flex-col items-end gap-3 upright:items-center">
        <div className="aspect-2/3 h-[min(calc(100svh-11rem),60rem)] overflow-hidden bg-photo-dark upright:h-auto upright:w-[min(78vw,26rem)]">
          {cover && <Picture image={cover} alt={pieceAlt(piece, m)} sizes="(orientation: landscape) 34vw, 78vw" priority />}
        </div>
        <figcaption className={caption}>
          <span className="upright:hidden">{`${name} · ${stoneLabel(piece)} · ${edition}`}</span>
          <span className="hidden upright:inline">{`${name} · ${edition}`}</span>
        </figcaption>
      </figure>

      <ActionLink to={to("/collection")} variant="solid" size="lg" className="hidden w-full max-w-[26rem] upright:flex">
        {m.home.shopCollection}
      </ActionLink>
    </section>
  )
}
