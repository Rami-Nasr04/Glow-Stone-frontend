import { readableName } from "@/features/catalog/product-path"
import type { ProductSummary } from "@/features/catalog/types"

export const CAPACITIES = ["1", "5", "10"] as const
export type Capacity = (typeof CAPACITIES)[number]

export const AVAILABILITIES = ["available", "sold_out"] as const
export type Availability = (typeof AVAILABILITIES)[number]

export interface Filters {
  /** Readable stone type, e.g. "limestone". */
  stone: string | null
  /** Readable colour, e.g. "ash-grey". */
  color: string | null
  capacity: Capacity | null
  availability: Availability | null
}

export const NO_FILTERS: Filters = { stone: null, color: null, capacity: null, availability: null }

export interface FilterOption {
  value: string
  label: string
}

// Stone and colour choices come from the pieces themselves, so a new stone or colour in the admin appears here.
export interface FilterOptions {
  stone: FilterOption[]
  color: FilterOption[]
}

function distinct(labels: string[]): FilterOption[] {
  const byValue = new Map(labels.map((label) => [readableName(label), label]))
  return [...byValue].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
}

export function filterOptions(pieces: ProductSummary[]): FilterOptions {
  return { stone: distinct(pieces.map((p) => p.stoneType)), color: distinct(pieces.map((p) => p.color)) }
}

function pick<T extends string>(allowed: readonly T[], value: string | null): T | null {
  return allowed.find((option) => option === value) ?? null
}

// Filters live in the address (?color=ash-grey&capacity=5) so a filtered view can be shared; a value that no piece
// has (an old link) is ignored rather than showing an empty page.
export function readFilters(params: URLSearchParams, options: FilterOptions): Filters {
  return {
    stone: pick(options.stone.map((o) => o.value), params.get("stone")),
    color: pick(options.color.map((o) => o.value), params.get("color")),
    capacity: pick(CAPACITIES, params.get("capacity")),
    availability: pick(AVAILABILITIES, params.get("availability")),
  }
}

export function writeFilters(filters: Filters): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  return params
}

function matchesCapacity(bottles: number, capacity: Capacity): boolean {
  return capacity === "10" ? bottles >= 10 : bottles === Number(capacity)
}

export function filterPieces(pieces: ProductSummary[], filters: Filters): ProductSummary[] {
  return pieces.filter(
    (piece) =>
      (!filters.stone || readableName(piece.stoneType) === filters.stone) &&
      (!filters.color || readableName(piece.color) === filters.color) &&
      (!filters.capacity || matchesCapacity(piece.bottles, filters.capacity)) &&
      (!filters.availability || (filters.availability === "sold_out") === piece.soldOut),
  )
}

export function activeCount(filters: Filters): number {
  return Object.values(filters).filter(Boolean).length
}
