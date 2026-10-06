import { Tabs } from "radix-ui"
import { Rule } from "@/components/ui/rule"
import { SHOW_STONEMASON_QUOTES } from "@/config/content"
import { dimensionsLabel } from "@/features/catalog/format"
import type { ProductDetail } from "@/features/catalog/types"
import { interpolate } from "@/i18n/format"
import type { Messages } from "@/i18n/messages/en"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"

interface ProductTabsProps {
  piece: ProductDetail
  className?: string
}

interface SpecRow {
  label: string
  value: string
}

const TABS = ["story", "details", "care", "delivery"] as const

// Only the details we actually know; an unknown value never shows as an empty row.
function specRows(piece: ProductDetail, m: Messages): SpecRow[] {
  const s = m.product.specs
  const dimensions = dimensionsLabel(piece.specs, m)
  const rows: [string, string | null][] = [
    [s.dimensions, dimensions && interpolate(s.dimensionsValue, { dimensions })],
    [s.weight, piece.specs.weightKg === null ? null : interpolate(s.weightValue, { kg: piece.specs.weightKg })],
    [s.stone, piece.stone],
    [s.color, piece.specs.color],
    [s.origin, piece.specs.origin],
    [s.finish, piece.specs.finish],
    [s.capacity, piece.bottles === 1 ? s.bottle : interpolate(s.bottles, { count: piece.bottles })],
    [s.placement, piece.specs.placement],
    [s.indoorOutdoor, piece.specs.indoorOutdoor],
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
  const [lead, ...rest] = piece.story
  const quote = SHOW_STONEMASON_QUOTES ? piece.quote : null

  return (
    <Tabs.Root defaultValue="story" className={cn("flex flex-col", className)}>
      <Tabs.List className="flex gap-[clamp(1.375rem,2vw,1.75rem)] overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <Tabs.Trigger
            key={tab}
            value={tab}
            className="-mb-px min-h-12 shrink-0 border-b border-transparent text-label uppercase tracking-label text-muted-foreground transition-colors duration-500 data-[state=active]:border-accent data-[state=active]:text-foreground"
          >
            {m.product.tabs[tab]}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="story" className="flex flex-col gap-5 pt-7">
        {lead && <p className="font-display text-2xl leading-normal font-light text-pretty">{lead}</p>}
        {quote && (
          <blockquote className="my-3 flex flex-col gap-4.5">
            <Rule />
            <p className="font-display text-quote font-light italic text-balance">“{quote}”</p>
            <footer className="text-label uppercase tracking-label text-muted-foreground">{m.product.stonemason}</footer>
          </blockquote>
        )}
        {rest.map((paragraph) => (
          <p key={paragraph} className="text-small text-pretty">
            {paragraph}
          </p>
        ))}
      </Tabs.Content>

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
        <Paragraphs items={piece.care ? [piece.care] : m.product.careBody} />
      </Tabs.Content>

      <Tabs.Content value="delivery" className="flex flex-col gap-4 pt-7">
        <Paragraphs items={m.product.deliveryBody} />
      </Tabs.Content>
    </Tabs.Root>
  )
}
