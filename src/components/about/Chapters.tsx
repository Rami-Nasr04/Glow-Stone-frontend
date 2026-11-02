import { useEffect, useRef, useState } from "react"
import Picture from "@/components/media/Picture"
import { Rule } from "@/components/ui/rule"
import { ABOUT_IMAGES, CRAFT_IMAGES } from "@/config/images"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"

// One photo per chapter, in chapter order: the Qadisha Valley for the stone (Rami, 2026-11-02), then craft photos.
const PHOTOS = [ABOUT_IMAGES.qadishaValley, CRAFT_IMAGES.bore, CRAFT_IMAGES.notch, CRAFT_IMAGES.boreThrough]
const valley = ABOUT_IMAGES.qadishaValley

const pad = (n: number) => String(n).padStart(2, "0")

// The valley photo is Evan Williams' (CC BY-SA 4.0): its licence asks for this credit wherever the photo shows.
function ValleyCredit({ className }: { className?: string }) {
  const { m } = useLocale()
  const credit = m.about.valleyCredit
  const link = "underline underline-offset-2 transition-colors duration-300 hover:text-accent"
  return (
    <p data-photo-credit className={cn("text-xs text-muted-foreground", className)}>
      {credit.place} {credit.photo}{" "}
      <a href={valley.page} target="_blank" rel="noopener noreferrer" className={link}>
        {credit.author}
      </a>
      ,{" "}
      <a href={valley.licence} target="_blank" rel="noopener noreferrer license" className={link}>
        {credit.licence}
      </a>
    </p>
  )
}

export default function Chapters() {
  const { m } = useLocale()
  const photoAlt = (i: number) => m.about.photoAlts[i] ?? ""
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
        <div className="sticky top-27 hidden flex-col gap-2 lg:flex">
        <div aria-hidden="true" className="relative h-[calc(100svh-10.5rem)] min-h-130 overflow-hidden bg-dark-section">
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
        {/* Under the valley photo while it shows; hidden (and out of the tab order) under the craft photos. */}
        <ValleyCredit className={cn("text-end", active !== 0 && "invisible")} />
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
                  <div className="flex flex-col gap-2 lg:hidden">
                    <div className="aspect-3/2 overflow-hidden bg-dark-section">
                      <Picture image={photo} alt={photoAlt(i)} sizes="100vw" fit="cover" />
                    </div>
                    {photo === valley && <ValleyCredit />}
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
