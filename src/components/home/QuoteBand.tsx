import { Rule } from "@/components/ui/rule"
import { useLocale } from "@/i18n/useLocale"

export default function QuoteBand() {
  const { m } = useLocale()
  return (
    <section className="flex min-h-50 flex-col items-center justify-center gap-4.5 bg-dark-section px-5 pb-13 pt-11 text-center text-dark-section-foreground">
      <p className="font-display text-quote font-light italic">{m.home.quote}</p>
      <Rule onDark />
      <p className="max-w-130 text-xs uppercase leading-loose tracking-display text-balance">{m.home.quoteLine}</p>
    </section>
  )
}
