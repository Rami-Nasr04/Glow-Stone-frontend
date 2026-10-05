// Mirror of the backend contract (Glow-Stone-backend/src/types/catalog.ts). Change both together.

export interface ProductImage {
  key: string
  width: number
  height: number
  alt: string
}

export type Lead = { type: "ready" } | { type: "made_to_order"; weeks: number }

export interface ProductSummary {
  slug: string
  family: string
  name: string
  stone: string
  form: string
  price: number
  editionSize: number
  remaining: number
  soldOut: boolean
  /** D7: when sold out, a re-issuable piece invites a new-edition signup; otherwise it is one of a kind. */
  reissuable: boolean
  lead: Lead
  bottles: number
  tone: "light" | "dark"
  featured: boolean
  cover: ProductImage | null
  hover: ProductImage | null
}

export interface ProductSpecs {
  heightCm: number | null
  widthCm: number | null
  depthCm: number | null
  weightKg: number | null
  origin: string | null
  color: string | null
  finish: string | null
  placement: string | null
  indoorOutdoor: string | null
}

export interface ProductDetail extends ProductSummary {
  story: string[]
  quote: string | null
  care: string | null
  specs: ProductSpecs
  images: ProductImage[]
}
