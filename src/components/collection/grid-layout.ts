// The craft interlude takes a full row after the first full row that ends at or after the third piece, and only when
// more pieces follow (Rami, 2026-10-14): after 3 on phones (one column), after 4 at two columns, after 3 at three.
const INTERLUDE_FROM = 3

/** The grid's column count per breakpoint: base, md, lg. */
export const COLUMNS = { base: 1, md: 2, lg: 3 } as const

export function interludeAfter(columns: number, count: number): number | null {
  const after = Math.ceil(INTERLUDE_FROM / columns) * columns
  return count > after ? after : null
}

export interface TileSpans {
  md: 1 | 2
  lg: 1 | 2 | 3
}

function fill<T extends number>(count: number, columns: T): T {
  // Only the pieces after the interlude decide the last row.
  const tail = count - (interludeAfter(columns, count) ?? 0)
  const left = tail % columns
  return (left === 0 ? columns : columns - left) as T
}

// How many columns the commissions tile spans so it fills the last row (a whole row when the last row is full).
export function tileSpans(count: number): TileSpans {
  return { md: fill(count, COLUMNS.md), lg: fill(count, COLUMNS.lg) }
}
