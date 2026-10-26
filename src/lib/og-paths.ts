// Where the link-preview images live (written by the build, src/lib/og-images.ts). Node-safe and free of sharp, so
// the pages' meta can name them without pulling the image tools into the browser.

export const OG_SIZE = { width: 1200, height: 630 } as const
/** The shop's own preview, from the home page's hero. */
export const SITE_OG = "/og/glowstone.jpg"
/** The About page's, from the crest close-up. */
export const ABOUT_OG = "/og/about.jpg"

/** A piece's preview, named after its cover photo, so a new cover gets a new address (previews are cached by it). */
export function productOgPath(piece: { id: number; images: readonly { url: string }[] }): string | null {
  const cover = piece.images[0]
  return cover ? `/og/products/${piece.id}-${cover.url.split("/").pop()}.jpg` : null
}
