import { useEffect, useRef, useState } from "react"
import Picture from "@/components/media/Picture"
import { Rule } from "@/components/ui/rule"
import { CRAFT_IMAGES } from "@/config/images"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"

// One craft photo per chapter, in chapter order.
const PHOTOS = [CRAFT_IMAGES.crest, CRAFT_IMAGES.bore, CRAFT_IMAGES.notch, CRAFT_IMAGES.boreThrough]

const pad = (n: number) => String(n).padStart(2, "0")

interface ChaptersProps {
  /** The name of the piece in the crest photo (Arz), or null when it isn't published. */
  crestName: string | null
}

export default function Chapters({ crestName }: ChaptersProps) {
  const { m } = useLocale()
  // The crest photo's alt names its piece (Arz) from the data.
  const photoAlt = (i: number) => interpolate(m.about.photoAlts[i] ?? "", { name: crestName ?? m.catalog.unnamedPiece })
  const chapters = m.about.chapters
  const listRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    // The chapter in view is the last one whose top has passed the middle of the screen.
    const update = () => {
      const articles = listRef.current?.querySelectorAll("article")
      if (!articles) return
      const middle = window.innerHeight / 2
      let current = 0
      articles.forEach((article, i) => {
        if (article.getBoundingClientRect().top <= middle) current = i
      })
      setActive(current)
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  const activeTitle = chapters[active]?.title ?? ""

  return (
    <section className="px-gutter pb-[clamp(3rem,5vw,4.5rem)]">
      <div className="mx-auto grid max-w-content items-start gap-x-[clamp(2.5rem,6vw,6rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        {/* Desktop: one photo panel that stays in view and follows the chapter being read. */}
        <div aria-hidden="true" className="sticky top-27 hidden h-[calc(100svh-9rem)] min-h-130 overflow-hidden bg-dark-section lg:block">
          {PHOTOS.map((photo, i) => (
            <Picture
              key={photo.key}
              image={photo}
              alt=""
              sizes="50vw"
              fit="cover"
              className={cn("absolute inset-0 transition-opacity duration-1400 ease-slow", i === active ? "opacity-100" : "opacity-0")}
            />
          ))}
          <p data-chapter-label className="absolute start-5 bottom-5 bg-background px-3 py-2 text-label uppercase tracking-caps">
            <span className="font-medium text-accent">{pad(active + 1)}</span> {interpolate(m.about.chapterOf, { total: pad(chapters.length), title: activeTitle })}
          </p>
        </div>

        <div ref={listRef} className="flex flex-col">
          {chapters.map((chapter, i) => {
            const photo = PHOTOS[i]
            return (
              <article
                key={chapter.title}
                aria-labelledby={`chapter-${i + 1}`}
                className="flex flex-col justify-center gap-7 border-t border-border py-[clamp(2.5rem,5vw,4rem)] lg:min-h-[70vh]"
              >
                {photo && (
                  <div className="aspect-3/2 overflow-hidden bg-dark-section lg:hidden">
                    <Picture
                      image={photo}
                      alt={photoAlt(i)}
                      sizes="100vw"
                      fit="cover"
                    />
                  </div>
                )}
                <div className="flex items-baseline gap-4">
                  <span className="text-label tracking-label text-accent">{pad(i + 1)}</span>
                  <h2 id={`chapter-${i + 1}`} className="text-label uppercase tracking-label">
                    {chapter.title}
                  </h2>
                </div>
                <Rule />
                <p className="mt-2 font-display text-lead font-light text-pretty">{chapter.lead}</p>
                {chapter.body.map((paragraph) => (
                  <p key={paragraph} className={cn("leading-relaxed text-pretty", paragraph.startsWith("[") && "text-accent")}>
                    {paragraph}
                  </p>
                ))}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
