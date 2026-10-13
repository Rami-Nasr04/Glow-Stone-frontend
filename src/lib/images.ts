// The widths every image is offered at: bundled craft photos (scripts/build-images.ts) and the API's product photos.
export const IMAGE_WIDTHS = [480, 960, 1440, 2048, 2880] as const
export type ImageWidth = (typeof IMAGE_WIDTHS)[number]

const IMAGE_BASE: string = import.meta.env.VITE_IMAGE_BASE_URL ?? "/images"

/** A photo bundled with the site (craft, hero), by key. */
export interface BundledImage {
  key: string
  width: number
  height: number
}

/** A product photo from the API: `${url}/${width}.webp`. */
export interface ApiImage {
  url: string
  width: number
  height: number
}

// Variants are produced by scripts/build-images.ts as <key>-<width>.webp.
export function imageUrl(key: string, width: number): string {
  return `${IMAGE_BASE}/${key}-${width}.webp`
}

export function srcSetFromWidths(key: string, widths: readonly number[]): string {
  return widths.map((w) => `${imageUrl(key, w)} ${w}w`).join(", ")
}

// `intrinsicWidth` is the widest variant generated for this image, so the srcset never lists a missing file.
export function imageSrcSet(key: string, intrinsicWidth: number): string {
  return srcSetFromWidths(
    key,
    IMAGE_WIDTHS.filter((w) => w <= intrinsicWidth),
  )
}

/** A product photo at one of the allowed widths (the API answers a wider ask with the master itself). */
export function photoUrl(photo: ApiImage, width: ImageWidth): string {
  return `${photo.url}/${width}.webp`
}

// The allowed widths up to the photo's own; 480 always, since a smaller master comes back at its own size.
export function photoSrcSet(photo: ApiImage): string {
  return IMAGE_WIDTHS.filter((w, i) => i === 0 || w <= photo.width)
    .map((w) => `${photoUrl(photo, w)} ${w}w`)
    .join(", ")
}
