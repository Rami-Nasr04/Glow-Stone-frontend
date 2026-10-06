import Picture from "@/components/media/Picture"
import { ActionLink } from "@/components/ui/action-link"
import { Rule } from "@/components/ui/rule"
import { CRAFT_IMAGES } from "@/config/images"
import { useLocale } from "@/i18n/useLocale"

export default function AboutClose() {
  const { m, to } = useLocale()
  const photo = CRAFT_IMAGES.boreThrough

  return (
    <>
      {/* Crosses from the stone page into the charcoal close: About's straddling photo (build notes 1.5). */}
      <div className="relative z-10 -mb-straddle px-gutter">
        <div className="mx-auto aspect-3/2 max-w-224 bg-photo-dark">
          <Picture
            imageKey={photo.key}
            width={photo.width}
            height={photo.height}
            alt={m.about.photoAlts[3] ?? ""}
            sizes="(min-width: 1024px) 56rem, 100vw"
            fit="cover"
          />
        </div>
      </div>
      <section className="bg-dark-section px-gutter pt-[calc(var(--spacing-straddle)+clamp(4.5rem,9vw,7.5rem))] text-dark-section-foreground">
        <div className="flex flex-col items-center gap-9 text-center">
          <img src="/brand/glowstone-monogram-on-dark.svg" alt="" width={48} height={48} className="size-12" />
          <p className="font-display text-display-l font-light italic">{m.about.closing}</p>
          <Rule onDark />
          <ActionLink to={to("/collection")} variant="outlineOnDark">
            {m.about.viewCollection}
          </ActionLink>
        </div>
        <div className="mx-auto mt-[clamp(4.5rem,9vw,7.5rem)] max-w-content border-t border-dark-border" />
      </section>
    </>
  )
}
