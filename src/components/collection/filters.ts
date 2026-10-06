import { STONE_KEYS, type ProductSummary, type StoneKey } from "@/features/catalog/types"

export const CAPACITIES = ["1", "5", "10"] as const
export type Capacity = (typeof CAPACITIES)[number]

export const AVAILABILITIES = ["ready", "made_to_order", "sold_out"] as const
export type Availability = (typeof AVAILABILITIES)[number]

export interface Filters {
  stone: StoneKey | null
  capacity: Capacity | null
  availability: Availability | null
}

export const NO_FILTERS: Filters = { stone: null, capacity: null, availability: null }

function pick<T extends string>(allowed: readonly T[], value: string | null): T | null {
  return allowed.find((option) => option === value) ?? null
}

// Filters live in the address (?stone=grey&capacity=5&availability=ready) so a filtered view can be shared.
export function readFilters(params: URLSearchParams): Filters {
  return {
    stone: pick(STONE_KEYS, params.get("stone")),
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

function availabilityOf(piece: ProductSummary): Availability {
  if (piece.soldOut) return "sold_out"
  return piece.lead.type === "made_to_order" ? "made_to_order" : "ready"
}

export function filterPieces(pieces: ProductSummary[], filters: Filters): ProductSummary[] {
  return pieces.filter(
    (piece) =>
      (!filters.stone || piece.stoneKey === filters.stone) &&
      (!filters.capacity || matchesCapacity(piece.bottles, filters.capacity)) &&
      (!filters.availability || availabilityOf(piece) === filters.availability),
  )
}

export function activeCount(filters: Filters): number {
  return Object.values(filters).filter(Boolean).length
}
