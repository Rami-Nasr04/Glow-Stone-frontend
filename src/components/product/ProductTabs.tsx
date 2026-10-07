import { Tabs } from "radix-ui"
import { dimensionsLabel, storyParagraphs } from "@/features/catalog/format"
import type { Product } from "@/features/catalog/types"
import { interpolate } from "@/i18n/format"
import type { Messages } from "@/i18n/messages/en"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"

interface ProductTabsProps {
  piece: Product
  className?: string
}

interface SpecRow {
  label: string
  value: string
}

const TABS = ["story", "details", "care", "delivery"] as const

// The contract's details, in this order; an unknown value never shows as an empty row.
function specRows(piece: Product, m: Messages): SpecRow[] {
  const s = m.product.specs
  const dimensions = dimensionsLabel(piece, m)
  const rows: [string, string | null][] = [
    [s.dimensions, dimensions && interpolate(s.dimensionsValue, { dimensions })],
    [s.weight, piece.weightKg === null ? null : interpolate(s.weightValue, { kg: piece.weightKg })],
    [s.stone, piece.stoneType],
    [s.color, piece.color],
    [s.capacity, piece.bottles === 1 ? s.bottle : interpolate(s.bottles, { count: piece.bottles })],
    [s.edition, interpolate(m.edition.of, { edition: piece.editionSize })],
  ]
  return rows.filter((row): row is [string, string] => Boolean(row[1])).map(([label, value]) => ({ label, value }))
}

interface ParagraphsProps {
  items: readonly string[]
}

// Unconfirmed facts are written as "[Placeholder: …]" and shown in wine until Omar replaces them.
function Paragraphs({ items }: ParagraphsProps) {
  return items.map((text) => (
    <p key={text} className={cn("text-small", text.startsWith("[") ? "text-accent" : "text-muted-foreground")}>
      {text}
    </p>
  ))
}

export default function ProductTabs({ piece, className }: ProductTabsProps) {
  const { m } = useLocale()
  const [lead, ...rest] = storyParagraphs(piece.story)
  // A piece without a story opens on its details instead of an empty tab.
  const tabs = lead ? TABS : TABS.filter((tab) => tab !== "story")

  return (
    <Tabs.Root defaultValue={tabs[0]} className={cn("flex flex-col", className)}>
      <Tabs.List className="flex gap-[clamp(1.375rem,2vw,1.75rem)] overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab}
            value={tab}
            className="-mb-px min-h-12 shrink-0 border-b border-transparent text-label uppercase tracking-label text-muted-foreground transition-colors duration-500 data-[state=active]:border-accent data-[state=active]:text-foreground"
          >
            {m.product.tabs[tab]}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {lead && (
        <Tabs.Content value="story" className="flex flex-col gap-5 pt-7">
          <p className="font-display text-2xl leading-normal font-light text-pretty">{lead}</p>
          {rest.map((paragraph) => (
            <p key={paragraph} className="text-small text-pretty">
              {paragraph}
            </p>
          ))}
        </Tabs.Content>
      )}

      <Tabs.Content value="details" className="flex flex-col gap-5 pt-7">
        <dl className="grid grid-cols-2 gap-x-6">
          {specRows(piece, m).map((row) => (
            <div key={row.label} className="flex flex-col gap-1.5 border-b border-border py-3.5">
              <dt className="text-label uppercase tracking-caps text-muted-foreground">{row.label}</dt>
              <dd className="text-sm">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="font-display text-xl font-light italic">{m.product.naturalVariation}</p>
      </Tabs.Content>

      <Tabs.Content value="care" className="flex flex-col gap-4 pt-7">
        <Paragraphs items={m.product.careBody} />
      </Tabs.Content>

      <Tabs.Content value="delivery" className="flex flex-col gap-4 pt-7">
        <Paragraphs items={m.product.deliveryBody} />
      </Tabs.Content>
    </Tabs.Root>
  )
}
