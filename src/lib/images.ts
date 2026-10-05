// Product photos are generated up to 2048px; full-width craft photos also get 2880px for large retina screens.
export const IMAGE_WIDTHS = [480, 960, 1440, 2048, 2880] as const
export type ImageWidth = (typeof IMAGE_WIDTHS)[number]

const IMAGE_BASE: string = import.meta.env.VITE_IMAGE_BASE_URL ?? "/images"

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
