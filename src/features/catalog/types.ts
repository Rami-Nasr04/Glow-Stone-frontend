// Mirror of the products contract agreed with the backend (2026-10-13).
// Change the contract first, then the backend's src/types/catalog.ts and this file together.

export interface ProductSummary {
  /** Short number; the page address is /collection/<id>/<name made readable>. */
  id: number
  name: string
  stoneType: string
  color: string
  /** USD, 2 decimals. */
  price: number
  bottles: number
  heightCm: number | null
  widthCm: number | null
  depthCm: number | null
  weightKg: number | null
  editionSize: number
  remaining: number
  /** remaining === 0 */
  soldOut: boolean
  featured: boolean
  /** One line under the name; also the link-preview description. */
  summary: string | null
  /** ISO timestamp; lists are newest first. */
  createdAt: string
  /** In Omar's order: [0] is the cover, [1] is shown on hover. The list has the first 2, a piece's page has all. */
  images: ProductImage[]
}

export interface Product extends ProductSummary {
  /** Paragraphs separated by a blank line ("\n\n"). */
  story: string | null
}

// One photo: `${url}/${width}.webp` for width 480, 960, 1440, 2048 or 2880 (never wider than the master). No alt text
// in the API: the website writes it from the piece's name.
export interface ProductImage {
  /** Base address without extension. */
  url: string
  /** The master's size, for the aspect ratio and the reserved space. */
  width: number
  height: number
}
