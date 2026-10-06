import { STONE_KEYS } from "@/features/catalog/types"
import { interpolate } from "@/i18n/format"
import type { Messages } from "@/i18n/messages/en"
import { AVAILABILITIES, CAPACITIES, readFilters, writeFilters, type Filters } from "./filters"

// Value of the "All stones" / "Any capacity" / "All pieces" choice.
export const ALL = "all"

export interface FilterGroup {
  key: keyof Filters
  label: string
  options: { value: string; label: string }[]
}

// The three filters as the bar and the sheet show them, with "all" first.
export function filterGroups(m: Messages): FilterGroup[] {
  const c = m.collection
  return [
    { key: "stone", label: c.stone, options: [{ value: ALL, label: c.stones.all }, ...STONE_KEYS.map((v) => ({ value: v, label: c.stones[v] }))] },
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
}

// Goes through the address format so an unexpected value can never reach the filter state.
export function setFilter(filters: Filters, key: keyof Filters, value: string): Filters {
  const params = writeFilters(filters)
  if (value === ALL) params.delete(key)
  else params.set(key, value)
  return readFilters(params)
}

export function countLabel(count: number, m: Messages): string {
  return count === 1 ? m.collection.piece : interpolate(m.collection.pieces, { count })
}
