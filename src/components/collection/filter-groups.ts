import { interpolate } from "@/i18n/format"
import type { Messages } from "@/i18n/messages/en"
import { AVAILABILITIES, CAPACITIES, readFilters, writeFilters, type FilterOption, type FilterOptions, type Filters } from "./filters"

// Value of the "All stones" / "Any capacity" / "All pieces" choice.
export const ALL = "all"

// A group needs at least two real choices; with one (every piece is limestone today) it would filter nothing.
const MIN_CHOICES = 2

export interface FilterGroup {
  key: keyof Filters
  label: string
  options: FilterOption[]
}

// The filters as the bar and the sheet show them, each with "all" first.
export function filterGroups(m: Messages, options: FilterOptions): FilterGroup[] {
  const c = m.collection
  const groups: FilterGroup[] = [
    { key: "stone", label: c.stone, options: [{ value: ALL, label: c.stones.all }, ...options.stone] },
    { key: "color", label: c.color, options: [{ value: ALL, label: c.colors.all }, ...options.color] },
    {
      key: "capacity",
      label: c.capacity,
      options: [{ value: ALL, label: c.capacities.all }, ...CAPACITIES.map((v) => ({ value: v, label: c.capacities[v] }))],
    },
    {
      key: "availability",
      label: c.availability,
      options: [{ value: ALL, label: c.availabilities.all }, ...AVAILABILITIES.map((v) => ({ value: v, label: c.availabilities[v] }))],
    },
  ]
  return groups.filter((group) => group.options.length > MIN_CHOICES)
}

// Goes through the address format so an unexpected value can never reach the filter state.
export function setFilter(filters: Filters, key: keyof Filters, value: string, options: FilterOptions): Filters {
  const params = writeFilters(filters)
  if (value === ALL) params.delete(key)
  else params.set(key, value)
  return readFilters(params, options)
}

export function countLabel(count: number, m: Messages): string {
  return count === 1 ? m.collection.piece : interpolate(m.collection.pieces, { count })
}
