import Picture from "@/components/media/Picture"
import { ActionLink } from "@/components/ui/action-link"
import { Eyebrow } from "@/components/ui/rule"
import { CRAFT_IMAGES } from "@/config/images"
import { getProduct } from "@/features/catalog/catalog"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"

export default function CraftCollage() {
  const { m, to } = useLocale()
  const { crest, bore } = CRAFT_IMAGES
  const crestPiece = getProduct(crest.pieceId)?.name ?? m.catalog.unnamedPiece

  return (
    <section aria-labelledby="craft-title" className="relative flow-root bg-dark-section text-dark-section-foreground">
      <div className="lg:grid lg:grid-cols-[60%_minmax(0,1fr)] lg:items-center">
        {/* Rises out of the stone section above: one of the two photos that cross a section edge. */}
        <figure className="relative z-10 -mt-straddle aspect-4/5 overflow-hidden bg-photo-dark lg:aspect-auto lg:h-[80vh] lg:min-h-140">
          <Picture
            imageKey={crest.key}
            width={crest.width}
            height={crest.height}
            alt={interpolate(m.home.crestAlt, { name: crestPiece })}
            sizes="(min-width: 1024px) 60vw, 100vw"
            fit="cover"
          />
        </figure>

        <div className="relative z-20 mx-5 -mt-12 flex flex-col gap-5 bg-background p-[clamp(1.75rem,3vw,2.75rem)] text-foreground lg:mx-0 lg:-ms-30 lg:me-gutter lg:mt-0 lg:max-w-115">
          <Eyebrow as="h2" id="craft-title">
            {m.home.craftLabel}
          </Eyebrow>
          <p className="font-display text-lead font-light text-pretty">{m.home.craftLead}</p>
          <p className="text-small text-pretty text-muted-foreground">{m.home.craftBody}</p>
          <ActionLink to={to("/about")} className="mt-1 self-start">
            {m.home.ourStory}
          </ActionLink>
        </div>
      </div>

      {/* Overlaps the bottom of the crest and crosses down into the next stone section. */}
      <figure className="relative z-10 ms-auto me-5 mt-10 -mb-straddle w-3/5 lg:ms-[42%] lg:me-0 lg:-mt-[12vh] lg:w-[30%]">
        <div className="aspect-3/2 overflow-hidden bg-photo-dark">
          <Picture imageKey={bore.key} width={bore.width} height={bore.height} alt={m.home.boreAlt} sizes="(min-width: 1024px) 30vw, 60vw" fit="cover" />
        </div>
        <figcaption className="absolute top-full mt-3 text-label uppercase tracking-caps text-muted-foreground">{m.home.boreCaption}</figcaption>
      </figure>
    </section>
  )
}
