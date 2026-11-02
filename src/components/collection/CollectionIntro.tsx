import { Rule } from "@/components/ui/rule"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"

interface CollectionIntroProps {
  /** Each published piece's stone (stoneType): the intro counts them and names their stone, so it can't go stale. */
  stoneTypes: readonly string[]
}

export default function CollectionIntro({ stoneTypes }: CollectionIntroProps) {
  const { m } = useLocale()
  const count = stoneTypes.length
  const kinds = new Set(stoneTypes.map((stone) => stone.trim().toLowerCase()))
  const stone = kinds.size === 1 ? [...kinds][0] : m.collection.mixedStone
  const intro =
    count === 1 ? interpolate(m.collection.introOne, { stone }) : interpolate(m.collection.intro, { count: m.collection.numberWords[count] ?? count, stone })
  return (
    <div className="flex max-w-180 flex-col gap-7">
      <h1 className="font-display text-display-xl leading-[1.15] font-light">{m.collection.title}</h1>
      <Rule />
      <p className="text-pretty text-muted-foreground">{intro}</p>
    </div>
  )
}
