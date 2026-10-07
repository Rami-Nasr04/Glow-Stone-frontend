import { SlidersHorizontal } from "lucide-react"
import { Dialog } from "radix-ui"
import { useState } from "react"
import { actionVariants } from "@/components/ui/action-link"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { ALL, countLabel, filterGroups, setFilter } from "./filter-groups"
import { activeCount, NO_FILTERS, type FilterOptions, type Filters } from "./filters"

interface FilterSheetProps {
  filters: Filters
  /** Stone and colour choices, built from the pieces. */
  options: FilterOptions
  /** Pieces shown with the current filters. */
  count: number
  onChange: (next: Filters) => void
  className?: string
}

const label = "text-label uppercase tracking-label"

// Below 768px: a FILTER button opening a bottom sheet. The sheet is unmounted while closed, so it is never focusable.
export default function FilterSheet({ filters, options, count, onChange, className }: FilterSheetProps) {
  const { m } = useLocale()
  const [open, setOpen] = useState(false)
  const active = activeCount(filters)

  return (
    <div className={cn("flex min-h-14 items-center justify-between border-y border-border", className)}>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className={cn(label, "flex min-h-14 items-center gap-3")}>
          <SlidersHorizontal aria-hidden="true" strokeWidth={1.1} className="size-4" />
          <span>{m.collection.filter}</span>
          {/* The space keeps the accessible name "Filter (2)"; flex ignores it visually. */}
          {active > 0 && <> <span className="text-accent">({active})</span></>}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-primary/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-500" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[86svh] flex-col bg-background data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-700"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
              <Dialog.Title className="text-xs uppercase tracking-label">{m.collection.filters}</Dialog.Title>
              <Dialog.Close className={cn(label, "flex min-h-11 min-w-11 items-center justify-end")}>{m.collection.close}</Dialog.Close>
            </div>

            <div className="overflow-y-auto px-5 pt-2">
              {filterGroups(m, options).map((group) => (
                <div key={group.key} role="radiogroup" aria-labelledby={`sheet-${group.key}`} className="border-b border-border pt-6 pb-3">
                  <p id={`sheet-${group.key}`} className={cn(label, "text-muted-foreground")}>
                    {group.label}
                  </p>
                  <div className="mt-2 flex flex-col">
                    {group.options.map((option) => (
                      <label key={option.value} className="flex min-h-12 cursor-pointer items-center justify-between text-small">
                        {option.label}
                        <input
                          type="radio"
                          name={`sheet-${group.key}`}
                          value={option.value}
                          checked={(filters[group.key] ?? ALL) === option.value}
                          onChange={() => onChange(setFilter(filters, group.key, option.value, options))}
                          className="size-3.5 cursor-pointer appearance-none rounded-full border border-primary/40 transition-colors duration-500 checked:border-primary checked:bg-accent checked:shadow-[inset_0_0_0_3px_var(--background)]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid shrink-0 grid-cols-[1fr_2fr] gap-3 p-5">
              <button type="button" onClick={() => onChange(NO_FILTERS)} className={actionVariants({ variant: "outline" })}>
                {m.collection.clear}
              </button>
              <Dialog.Close className={actionVariants({ variant: "solid" })}>
                {interpolate(m.collection.show, { count: countLabel(count, m) })}
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <span aria-live="polite" className={cn(label, "text-muted-foreground")}>
        {countLabel(count, m)}
      </span>
    </div>
  )
}
