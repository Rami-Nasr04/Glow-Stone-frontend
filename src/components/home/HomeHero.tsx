import { MoveRight } from "lucide-react"
import { Link } from "react-router"
import { ActionLink } from "@/components/ui/action-link"
import { HERO_IMAGES } from "@/config/images"
import { getProduct } from "@/features/catalog/catalog"
import { noBreak } from "@/features/catalog/format"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { imageUrl, srcSetFromWidths } from "@/lib/images"
import { cn } from "@/lib/utils"
import { HERO_PORTRAIT_MEDIA, HOME_PIECE } from "./home-config"

const captionLink = "flex min-h-11 items-center text-label uppercase text-on-photo"
const arrow = "shrink-0 rtl:-scale-x-100"

export default function HomeHero() {
  const { m, to, locale } = useLocale()
  const piece = getProduct(HOME_PIECE, locale)
  const { desktop, mobile } = HERO_IMAGES
  const edition = piece ? interpolate(m.edition.of, { edition: piece.editionSize }) : ""

  return (
    <section className="relative h-svh min-h-[max(620px,calc(55.8vw+84px))] overflow-hidden bg-hero-sky upright:min-h-175 upright:bg-hero-sky-mobile">
      <picture>
        <source media={HERO_PORTRAIT_MEDIA} srcSet={srcSetFromWidths(mobile.key, mobile.widths)} sizes="100vw" width={mobile.width} height={mobile.height} />
        <img
          src={imageUrl(desktop.key, 960)}
          srcSet={srcSetFromWidths(desktop.key, desktop.widths)}
          sizes="100vw"
          width={desktop.width}
          height={desktop.height}
          alt={m.home.heroAlt}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-x-0 top-21 bottom-0 h-[calc(100%-5.25rem)] w-full object-cover object-right-bottom upright:top-0 upright:h-full upright:object-bottom"
        />
      </picture>

      {/* The sky behind the header fades into the photo, so the rack never sits right under the header. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-21 h-14 bg-linear-to-b from-hero-sky to-transparent upright:hidden" />
      {/* Soft dark corner under the caption (desktop) and under the buttons (upright). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 end-0 h-50 w-190 max-w-[75%] bg-radial-[ellipse_100%_100%_at_100%_100%] from-primary/50 via-primary/22 via-42% to-transparent to-72% upright:hidden"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-75 bg-linear-to-t from-primary/60 to-transparent upright:block" />

      <div className="absolute start-[clamp(3rem,8vw,8.75rem)] top-1/2 flex -translate-y-[42%] flex-col items-start upright:inset-x-5 upright:top-24 upright:translate-y-0 upright:items-center upright:text-center min-[600px]:upright:inset-x-10 min-[600px]:upright:top-28 min-[600px]:upright:items-start min-[600px]:upright:text-start">
        <h1 className="w-[clamp(340px,35vw,560px)] upright:w-62.5 min-[600px]:upright:w-65">
          <img src="/brand/glowstone-wordmark-header.svg" alt={m.meta.siteName} width={192} height={15} className="block h-auto w-full" />
        </h1>
        <p className="mt-7.5 text-xs uppercase tracking-display upright:mt-4.5 upright:leading-[1.8]">{m.meta.tagline}</p>
        <ActionLink to={to("/collection")} variant="solid" size="lg" className="mt-14 upright:hidden">
          {m.home.shopCollection}
        </ActionLink>
      </div>

      {piece && (
        <Link to={to(`/collection/${piece.slug}`)} className={cn(captionLink, "absolute bottom-6.5 end-12 gap-3.5 tracking-label upright:hidden")}>
          {[noBreak(piece.name), piece.stone, edition].join(" · ")}
          <MoveRight aria-hidden="true" strokeWidth={1.1} className={cn("size-4.5", arrow)} />
        </Link>
      )}

      <div className="absolute inset-x-5 bottom-5 hidden flex-col gap-1.5 upright:flex min-[600px]:upright:inset-x-10 min-[600px]:upright:items-start">
        <ActionLink to={to("/collection")} variant="onPhoto" size="lg">
          {m.home.shopCollection}
        </ActionLink>
        {piece && (
          <Link to={to(`/collection/${piece.slug}`)} className={cn(captionLink, "gap-2.5 self-center tracking-caps min-[600px]:self-start")}>
            {[noBreak(piece.name), edition].join(" · ")}
            <MoveRight aria-hidden="true" strokeWidth={1.1} className={cn("size-3.5", arrow)} />
          </Link>
        )}
      </div>
    </section>
  )
}
