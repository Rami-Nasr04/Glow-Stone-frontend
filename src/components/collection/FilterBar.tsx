import { ChevronDown } from "lucide-react"
import { DropdownMenu } from "radix-ui"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { ALL, countLabel, filterGroups, setFilter } from "./filter-groups"
import { activeCount, NO_FILTERS, type Filters } from "./filters"

interface FilterBarProps {
  filters: Filters
  /** Pieces shown with the current filters. */
  count: number
  onChange: (next: Filters) => void
  className?: string
}

const label = "text-label uppercase tracking-label"

// From 768px: one menu per filter in a ruled bar.
export default function FilterBar({ filters, count, onChange, className }: FilterBarProps) {
  const { m } = useLocale()

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-6 border-y border-border", className)}>
      <div className="flex flex-wrap items-center gap-x-[clamp(1.25rem,3vw,2.75rem)]">
        {filterGroups(m).map((group) => {
          const current = filters[group.key]
          const chosen = current ? group.options.find((o) => o.value === current)?.label : undefined
          return (
            <DropdownMenu.Root key={group.key} modal={false}>
              <DropdownMenu.Trigger className={cn(label, "group flex min-h-14 items-center gap-2.5")}>
                <span>{group.label}</span>
                {/* The space keeps the accessible name "Stone Grey"; flex ignores it visually. */}
                {chosen && <> <span className="text-accent">{chosen}</span></>}
                <ChevronDown aria-hidden="true" strokeWidth={1.1} className="size-3.5 transition-transform duration-500 group-data-[state=open]:rotate-180" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  alignOffset={-20}
                  className="z-30 min-w-55 border border-border bg-popover py-2.5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-500"
                >
                  <DropdownMenu.RadioGroup value={current ?? ALL} onValueChange={(value) => onChange(setFilter(filters, group.key, value))}>
                    {group.options.map((option) => (
                      <DropdownMenu.RadioItem
                        key={option.value}
                        value={option.value}
                        className="flex min-h-11 cursor-pointer items-center justify-between gap-4 px-5 text-sm outline-none data-highlighted:bg-muted"
                      >
                        {option.label}
                        <DropdownMenu.ItemIndicator className="text-accent">
                          <span aria-hidden="true">—</span>
                        </DropdownMenu.ItemIndicator>
                      </DropdownMenu.RadioItem>
                    ))}
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )
        })}
      </div>

      <div className="flex min-h-14 items-center gap-5">
        {activeCount(filters) > 0 && (
          <button type="button" onClick={() => onChange(NO_FILTERS)} className={cn(label, "min-h-11 text-accent")}>
            {m.collection.clear}
          </button>
        )}
        <span aria-live="polite" className={cn(label, "text-muted-foreground")}>
          {countLabel(count, m)}
        </span>
      </div>
    </div>
  )
}
