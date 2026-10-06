// The craft interlude takes a full row after the sixth piece (six fills whole rows at one, two and three columns),
// so only the pieces after it decide the last row.
export const INTERLUDE_AFTER = 6

export interface TileSpans {
  md: 1 | 2
  lg: 1 | 2 | 3
}

function fill<T extends number>(tail: number, columns: T): T {
  const left = tail % columns
  return (left === 0 ? columns : columns - left) as T
}

// How many columns the commissions tile spans so it fills the last row (a whole row when the last row is full).
export function tileSpans(count: number): TileSpans {
  const tail = count > INTERLUDE_AFTER ? count - INTERLUDE_AFTER : count
  return { md: fill(tail, 2), lg: fill(tail, 3) }
}
