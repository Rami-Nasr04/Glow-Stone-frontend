import { Eyebrow } from "@/components/ui/rule"
import { useLocale } from "@/i18n/useLocale"

export default function AboutIntro() {
  const { m } = useLocale()
  return (
    <section className="px-gutter pt-[clamp(3.25rem,7vw,7.25rem)] pb-[clamp(3.5rem,6vw,6rem)]">
      <div className="mx-auto flex max-w-content flex-col gap-8">
        <Eyebrow>{m.about.label}</Eyebrow>
        <h1 className="max-w-245 font-display text-display-xl leading-[1.02] font-light tracking-[-0.01em] text-balance">
          {m.about.title} <em>{m.about.titleEmphasis}</em>
        </h1>
        <p className="mt-4 max-w-140 text-lg leading-relaxed text-pretty lg:ms-auto">{m.about.intro}</p>
      </div>
    </section>
  )
}
