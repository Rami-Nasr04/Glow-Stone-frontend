import type { ProductImage } from "@/features/catalog/types"

export interface SpotlightPhotos {
  /** Phones, and desktop when there is no detail: the cover, alone. */
  cover: ProductImage | null
  /** Desktop: the big landscape close-up. */
  detail: ProductImage | null
  /** Desktop: the full piece framed over the detail's corner. */
  inset: ProductImage | null
}

// Rami, 2026-10-14: the detail is the first landscape photo after the cover, in Omar's order, and the inset is the
// cover, so Omar steers both by ordering the photos. No landscape photo → the cover alone.
export function spotlightPhotos(images: ProductImage[]): SpotlightPhotos {
  const [cover = null, ...rest] = images
  const detail = rest.find((photo) => photo.width > photo.height) ?? null
  return { cover, detail, inset: detail && cover }
}
