import { Fragment } from "react"
import Picture from "@/components/media/Picture"
import { ActionLink } from "@/components/ui/action-link"
import { Rule } from "@/components/ui/rule"
import { HOME_IMAGES } from "@/config/images"
import { useLocale } from "@/i18n/useLocale"

// Qadisha with fixed text and the site's own copies of its photos (Rami, 2026-10-15): nothing here reads the API, so
// the home page stays whole whatever happens to the piece in the studio. The button leads to the collection.
export default function PieceSpotlight() {
  const { m, to } = useLocale()
  const { spotlightFull: full, spotlightDetail: detail } = HOME_IMAGES

  return (
    <section aria-labelledby="spotlight-title" className="overflow-hidden pb-section pt-[calc(var(--spacing-straddle)+var(--spacing-section))]">
      {/* The photos illustrate the text beside them; the one link is "View the collection". */}
      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:pe-gutter">
        <div className="aspect-2/3 overflow-hidden bg-photo-dark lg:hidden">
          <Picture image={full} alt="" sizes="100vw" />
        </div>
        <div className="relative z-10 hidden aspect-3/2 overflow-hidden bg-photo-dark lg:col-span-8 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:block">
          <Picture image={detail} alt="" sizes="62vw" />
        </div>
        <div className="relative z-20 hidden aspect-2/3 overflow-hidden border-10 border-background bg-background lg:col-span-2 lg:col-start-7 lg:row-start-2 lg:-mb-[14%] lg:block lg:self-end">
          <Picture image={full} alt="" sizes="13vw" />
        </div>

        <h2
          id="spotlight-title"
          className="relative mt-2 px-5 font-display text-display-hero font-light tracking-[-0.01em] whitespace-nowrap lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:-ms-[calc(1.5rem+1.2vw)] lg:mt-[6%] lg:px-0"
        >
          {m.home.spotlightName}
        </h2>
        <div className="px-5 lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:px-0">
          <div className="mt-8 flex max-w-100 flex-col gap-4.5 lg:mt-0">
            <p className="text-label uppercase leading-loose tracking-label text-muted-foreground">
              <span>
                {m.home.spotlightPlacard.map((part, i) => (
                  <Fragment key={part}>
                    {i > 0 && " · "}
                    <span className="whitespace-nowrap">{part}</span>
                  </Fragment>
                ))}
              </span>
              <br />
              <span className="whitespace-nowrap">{m.home.spotlightEdition}</span>
            </p>
            <Rule />
            <p className="text-small text-pretty text-muted-foreground">{m.home.spotlightText}</p>
            <ActionLink to={to("/collection")} className="mt-2 self-start">
              {m.home.viewTheCollection}
            </ActionLink>
          </div>
        </div>
      </div>
    </section>
  )
}
