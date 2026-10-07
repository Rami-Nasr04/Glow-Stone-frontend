// Mirror of the products contract agreed with the backend (2026-10-08).
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
}

export interface Product extends ProductSummary {
  /** Paragraphs separated by a blank line ("\n\n"). */
  story: string | null
}

// Not in the contract until the product_images slice: the website's own bundled photos (see photos.ts).
export interface ProductImage {
  key: string
  width: number
  height: number
  alt: string
}
