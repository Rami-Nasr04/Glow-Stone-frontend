import { ActionLink } from "@/components/ui/action-link"
import { HERO_IMAGES } from "@/config/images"
import { useLocale } from "@/i18n/useLocale"
import { imageUrl, srcSetFromWidths } from "@/lib/images"
import { cn } from "@/lib/utils"
import { HERO_PORTRAIT_MEDIA } from "./home-config"

const caption = "flex min-h-11 items-center text-label uppercase text-on-photo"

export default function HomeHero() {
  const { m, to } = useLocale()
  const { desktop, mobile } = HERO_IMAGES

  return (
    // Desktop: exactly one screen. The photo keeps its whole frame, as tall as fits under the header (never wider than
    // the screen), anchored bottom-end; on short screens the sky colour fills the space left at its start edge.
    <section className="relative h-svh min-h-140 overflow-hidden bg-hero-sky [--hero-photo-h:min(max(100svh,35rem)_-_5.25rem,55.81vw)] upright:min-h-175 upright:bg-hero-sky-mobile">
      <div className="absolute end-0 bottom-0 aspect-[1376/768] overflow-hidden h-(--hero-photo-h) upright:inset-0 upright:aspect-auto upright:h-full">
        <picture>
          <source media={HERO_PORTRAIT_MEDIA} srcSet={srcSetFromWidths(mobile.key, mobile.widths)} sizes="100vw" width={mobile.width} height={mobile.height} />
          <img
            src={imageUrl(desktop.key, 960)}
            srcSet={srcSetFromWidths(desktop.key, desktop.widths)}
            sizes="(orientation: landscape) min(100vw, 179svh), 100vw"
            width={desktop.width}
            height={desktop.height}
            alt={m.home.heroAlt}
            fetchPriority="high"
            decoding="async"
            className="block size-full object-cover object-right-bottom upright:object-bottom"
          />
        </picture>
        {/* The sky fades into the photo's top, so the rack never sits right under the header... */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-linear-to-b from-hero-sky to-transparent upright:hidden" />
        {/* Soft dark band so the caption (desktop) and the buttons (upright) stay readable on the pale wall; it ends with the photo. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-primary/75 via-primary/40 to-transparent upright:h-75 upright:from-primary/60 upright:via-primary/30" />
        {/* ...and into its start edge when the screen is wider than the photo (0 wide when it fills the screen). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 w-[clamp(0px,100vw_-_var(--hero-photo-h)*1376/768,12rem)] bg-linear-to-r from-hero-sky to-transparent upright:hidden"
        />
      </div>

      <div className="absolute start-[clamp(3rem,8vw,8.75rem)] top-1/2 flex -translate-y-[42%] flex-col items-start upright:inset-x-5 upright:top-24 upright:translate-y-0 upright:items-center upright:text-center min-[600px]:upright:inset-x-10 min-[600px]:upright:top-28 min-[600px]:upright:items-start min-[600px]:upright:text-start">
        <h1 className="w-[clamp(340px,35vw,560px)] upright:w-62.5 min-[600px]:upright:w-65">
          <img src="/brand/glowstone-wordmark-header.svg" alt={m.meta.siteName} width={192} height={15} className="block h-auto w-full" />
        </h1>
        <p className="mt-7.5 text-xs uppercase tracking-display upright:mt-4.5 upright:leading-[1.8]">{m.meta.tagline}</p>
        <ActionLink to={to("/collection")} variant="solid" size="lg" className="mt-14 upright:hidden">
          {m.home.shopCollection}
        </ActionLink>
      </div>

      {/* Names the piece in the photo; not a link, so the home page never depends on that piece being for sale. */}
      <p className={cn(caption, "absolute bottom-6.5 end-12 tracking-label upright:hidden")}>{m.home.heroCaption}</p>

      <div className="absolute inset-x-5 bottom-5 hidden flex-col gap-1.5 upright:flex min-[600px]:upright:inset-x-10 min-[600px]:upright:items-start">
        <ActionLink to={to("/collection")} variant="onPhoto" size="lg">
          {m.home.shopCollection}
        </ActionLink>
        <p className={cn(caption, "self-center tracking-caps min-[600px]:self-start")}>{m.home.heroCaptionShort}</p>
      </div>
    </section>
  )
}
