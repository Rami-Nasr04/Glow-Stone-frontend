import { Rule } from "@/components/ui/rule"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"

interface CollectionIntroProps {
  /** Number of published pieces; the intro states it so it can't go stale when Omar adds one. */
  count: number
}

export default function CollectionIntro({ count }: CollectionIntroProps) {
  const { m } = useLocale()
  const intro = count === 1 ? m.collection.introOne : interpolate(m.collection.intro, { count: m.collection.numberWords[count] ?? count })
  return (
    <div className="flex max-w-180 flex-col gap-7">
      <h1 className="font-display text-display-xl leading-[1.15] font-light">{m.collection.title}</h1>
      <Rule />
      <p className="text-pretty text-muted-foreground">{intro}</p>
    </div>
  )
}
