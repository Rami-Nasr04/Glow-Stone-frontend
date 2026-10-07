import { interpolate } from "@/i18n/format"
import { en } from "@/i18n/messages/en"
import { BUNDLED_PHOTOS } from "./bundled-photos"
import type { ProductImage } from "./types"

type PieceRef = { id: number; name: string }

// Replaced by `images` / `cover` from the API when the product_images slice lands; until then every piece's photos
// are the bundled ones, in file order (cover first).
export function piecePhotos(piece: PieceRef): ProductImage[] {
  const photos = BUNDLED_PHOTOS[piece.id] ?? []
  return photos.map((photo, i) => ({
    ...photo,
    alt: interpolate(en.catalog.photoAlt, { name: piece.name, n: i + 1, total: photos.length }),
  }))
}

export function coverOf(piece: PieceRef): ProductImage | null {
  return piecePhotos(piece)[0] ?? null
}

/** The second photo, cross-faded in on hover. */
export function hoverOf(piece: PieceRef): ProductImage | null {
  return piecePhotos(piece)[1] ?? null
}
