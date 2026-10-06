// Mirror of the backend contract (Glow-Stone-backend/src/types/catalog.ts). Change both together.

export interface ProductImage {
  key: string
  width: number
  height: number
  alt: string
}

export type Lead = { type: "ready" } | { type: "made_to_order"; weeks: number }

// Provisional: the Collection's stone filter. The real key comes from the agreed schema (stones/names discussion);
// until then it is derived from the English stone name in catalog.ts. Not yet part of the backend contract.
export const STONE_KEYS = ["beige", "grey", "brown", "cream", "taupe"] as const
export type StoneKey = (typeof STONE_KEYS)[number]

export interface ProductSummary {
  slug: string
  family: string
  name: string
  stone: string
  stoneKey: StoneKey | null
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
