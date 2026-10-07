import { Rule } from "@/components/ui/rule"
import { SHOW_STONEMASON_QUOTES } from "@/config/content"
import { useLocale } from "@/i18n/useLocale"

export default function PullQuote() {
  const { m } = useLocale()
  if (!SHOW_STONEMASON_QUOTES) return null
  return (
    <section className="px-gutter pt-[clamp(4.5rem,9vw,8rem)] pb-[clamp(4rem,7vw,6rem)]">
      <blockquote className="mx-auto flex max-w-275 flex-col items-center gap-10 text-center">
        <Rule />
        <p className="font-display text-display-l leading-[1.08] font-light italic text-balance lg:text-display-xl">“{m.about.quote}”</p>
        <footer className="text-label uppercase tracking-label text-muted-foreground">{m.about.quoteBy}</footer>
      </blockquote>
    </section>
  )
}
