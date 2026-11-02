import { Fragment } from "react"
import { useLocale } from "@/i18n/useLocale"

interface StanzasProps {
  stanzas: readonly (readonly string[])[]
  className?: string
}

// One paragraph per stanza, one line per verse line.
function Stanzas({ stanzas, className }: StanzasProps) {
  return stanzas.map((lines) => (
    <p key={lines[0]} data-stanza className={className}>
      {lines.map((line, i) => (
        <Fragment key={line}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </p>
  ))
}

// Omar's story opens About (Rami, 2026-11-02): the approved translation as verse, in the page's display face, signed
// Glowstone; then his Arabic as he wrote it, right to left. Below the desktop breakpoint the Arabic follows in its own
// block. From it, both blocks dissolve into one grid filled column by column, a row per stanza (6, as in en.ts), so each
// English stanza faces its Arabic stanza on a shared baseline and a longer line never puts the pairs out of step.
export default function OmarStory() {
  const { m } = useLocale()
  const verses = m.about.story.slice(0, -1)
  const signature = m.about.story.at(-1) ?? []
  return (
    <section aria-label={m.about.storyLabel} className="px-gutter pt-[clamp(3.25rem,7vw,7.25rem)]">
      <div
        data-spread
        className="mx-auto flex max-w-content flex-col gap-[clamp(2.5rem,5vw,4rem)] lg:grid lg:grid-flow-col lg:grid-cols-[minmax(0,42.5rem)_max-content] lg:grid-rows-[repeat(6,auto)] lg:items-baseline lg:justify-start lg:gap-x-[clamp(4rem,7vw,7rem)] lg:gap-y-6"
      >
        <div className="flex max-w-170 flex-col gap-6 font-display text-lead font-light leading-snug text-pretty lg:contents">
          <Stanzas stanzas={verses} />
          <p data-stanza className="mt-2 font-sans text-base">
            <span className="text-label uppercase tracking-label text-accent">{signature[0]}</span>
            <br />
            <span className="font-display text-lead italic">{signature[1]}</span>
          </p>
        </div>
        <div lang="ar" dir="rtl" className="flex max-w-170 flex-col gap-5 border-s border-border ps-[clamp(1.25rem,3vw,2.5rem)] font-arabic text-lg leading-loose text-muted-foreground lg:contents">
          <Stanzas stanzas={m.about.storyArabic} />
        </div>
      </div>
    </section>
  )
}
